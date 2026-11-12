import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { appStates } from '../../lib/schema';
import { seedUserState } from '../../lib/seed';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  touchUser,
  unauthorized,
} from '../../lib/api';
import { statePayloadSchema } from '../../lib/validation';
import type { AppState } from '../../lib/types';

const MAX_STATE_BYTES = 3_000_000;

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') {
      return forbidden('This account is suspended. Please contact the administrator.');
    }

    const rows = await db
      .select()
      .from(appStates)
      .where(eq(appStates.userId, context.profile.id))
      .limit(1);

    let row = rows[0];

    if (!row) {
      const data = await seedUserState(context.profile.id, {
        name: context.profile.name,
        about: context.profile.about,
        phone: context.profile.phone ?? undefined,
      });
      row = {
        userId: context.profile.id,
        data,
        updatedAt: new Date(),
      };
    }

    await touchUser(context.profile.id);

    return json({ state: row.data, updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load your data.') }, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') {
      return forbidden('This account is suspended. Please contact the administrator.');
    }

    const raw = await request.text();
    if (raw.length > MAX_STATE_BYTES) {
      return json({ error: 'This account has too much data to sync.' }, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return badRequest('Malformed sync payload.');
    }

    const parsed = statePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest('The data sent to the server was not valid.');
    }

    const updatedAt = new Date();
    const nextState = parsed.data.state as unknown as AppState;

    await db
      .insert(appStates)
      .values({ userId: context.profile.id, data: nextState, updatedAt })
      .onConflictDoUpdate({
        target: appStates.userId,
        set: { data: nextState, updatedAt },
      });

    await db
      .update(appStates)
      .set({ updatedAt })
      .where(eq(appStates.userId, context.profile.id));

    return json({ ok: true, updatedAt: updatedAt.toISOString() });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to save your changes.') }, 500);
  }
}
