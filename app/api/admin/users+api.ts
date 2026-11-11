import { desc, eq } from 'drizzle-orm';
import { auth } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { user } from '../../../lib/auth-schema';
import { appStates } from '../../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  revokeSessions,
  unauthorized,
} from '../../../lib/api';
import { adminUpdateSchema } from '../../../lib/validation';
import type { Account, AccountRole, AccountStatus } from '../../../lib/types';

const TOAST_DEFAULT_PASSWORD = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let value = '';
  for (let index = 0; index < 8; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `wa-${value}`;
};

function toAccount(row: typeof user.$inferSelect): Account {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? row.email.split('@')[0],
    email: row.email,
    phone: row.phone ?? '',
    countryCode: row.countryCode ?? '',
    countryName: row.countryName ?? '',
    passwordHash: '',
    role: (row.role === 'admin' ? 'admin' : 'user') as AccountRole,
    status: (row.status === 'suspended' ? 'suspended' : 'active') as AccountStatus,
    verified: Boolean(row.verified ?? row.emailVerified),
    about: row.about ?? '',
    avatar: row.image ?? undefined,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: (row.lastActiveAt ?? row.updatedAt).toISOString(),
  };
}

async function loadUser(id: string) {
  const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const rows = await db.select().from(user).orderBy(desc(user.createdAt)).limit(500);

    return json({ accounts: rows.map(toAccount) });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load accounts.') }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const parsed = adminUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid account update.');
    }

    const target = await loadUser(parsed.data.id);
    if (!target) return json({ error: 'Account not found.' }, 404);

    if (parsed.data.action === 'update') {
      const { updates } = parsed.data;
      if (updates.role && target.id === context.profile.id) {
        return badRequest('You cannot change your own role.');
      }
      if (target.role === 'admin' && updates.role === 'user') {
        return badRequest('Administrator roles are managed from the security panel.');
      }

      const next: Partial<typeof user.$inferInsert> = {};
      if (updates.name) next.name = updates.name;
      if (updates.username) {
        next.username = updates.username;
        next.displayUsername = updates.username;
      }
      if (updates.phone !== undefined) next.phone = updates.phone;
      if (updates.about !== undefined) next.about = updates.about;
      if (updates.role) next.role = updates.role;

      if (Object.keys(next).length === 0) return badRequest('Nothing to update.');

      try {
        await db.update(user).set(next).where(eq(user.id, target.id));
      } catch (error) {
        const message = errorMessage(error, '');
        if (message.includes('duplicate key') || message.includes('unique')) {
          return badRequest('That username is already taken.');
        }
        throw error;
      }

      const updated = await loadUser(target.id);
      return json({ account: updated ? toAccount(updated) : null });
    }

    if (parsed.data.action === 'verify') {
      const nextVerified = !(target.verified ?? target.emailVerified);
      await db
        .update(user)
        .set({ verified: nextVerified, emailVerified: nextVerified })
        .where(eq(user.id, target.id));
      const updated = await loadUser(target.id);
      return json({ account: updated ? toAccount(updated) : null });
    }

    if (parsed.data.action === 'status') {
      if (target.role === 'admin') {
        return badRequest('The administrator account cannot be suspended.');
      }
      const nextStatus = target.status === 'suspended' ? 'active' : 'suspended';
      await db
        .update(user)
        .set({ status: nextStatus, banned: nextStatus === 'suspended' })
        .where(eq(user.id, target.id));
      if (nextStatus === 'suspended') {
        await revokeSessions(target.id);
      }
      const updated = await loadUser(target.id);
      return json({ account: updated ? toAccount(updated) : null });
    }

    if (target.role === 'admin') {
      return badRequest('Use the administrator security panel to change this password.');
    }

    const temporary = TOAST_DEFAULT_PASSWORD();
    await auth.api.setUserPassword({
      body: { userId: target.id, newPassword: temporary },
      headers: request.headers,
    });

    return json({ ok: true, temporaryPassword: temporary });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the account.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    if (!body || typeof body.id !== 'string' || !body.id) {
      return badRequest('Which account should be removed?');
    }

    const target = await loadUser(body.id);
    if (!target) return json({ error: 'Account not found.' }, 404);
    if (target.id === context.profile.id) {
      return badRequest('You cannot delete the account you are signed in with.');
    }
    if (target.role === 'admin') {
      return badRequest('Administrator accounts cannot be deleted.');
    }

    await db.delete(appStates).where(eq(appStates.userId, target.id));
    await db.delete(user).where(eq(user.id, target.id));

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to delete the account.') }, 500);
  }
}
