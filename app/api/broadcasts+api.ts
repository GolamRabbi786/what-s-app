import { desc, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { broadcasts } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { broadcastSchema } from '../../lib/validation';
import type { Broadcast } from '../../lib/types';

function toBroadcast(row: typeof broadcasts.$inferSelect): Broadcast {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience,
    sentBy: row.sentBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();

    const rows = await db
      .select()
      .from(broadcasts)
      .orderBy(desc(broadcasts.createdAt))
      .limit(50);

    const isAdmin = context.profile.role === 'admin';
    const visible = isAdmin
      ? rows
      : rows.filter(
          (row) =>
            row.audience === 'everyone' || row.audience === (context.profile.status ?? 'active'),
        );

    return json({ broadcasts: visible.map(toBroadcast) });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load broadcasts.') }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const parsed = broadcastSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Check the broadcast details.');
    }

    const row = {
      id: `broadcast-${crypto.randomUUID()}`,
      title: parsed.data.title,
      message: parsed.data.message,
      audience: parsed.data.audience,
      sentBy: context.profile.name,
      createdAt: new Date(),
    };

    await db.insert(broadcasts).values(row);

    return json({ broadcast: toBroadcast(row) }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to send the broadcast.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    if (!body || typeof body.id !== 'string' || !body.id) {
      return badRequest('Which broadcast should be removed?');
    }

    await db.delete(broadcasts).where(eq(broadcasts.id, body.id));

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to remove the broadcast.') }, 500);
  }
}
