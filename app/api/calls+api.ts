import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { user as userTable } from '../../lib/auth-schema';
import { callLogs } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { callCreateSchema } from '../../lib/validation';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = callCreateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid call.');

    const me = context.profile.id;
    const now = new Date();

    let peer:
      | { id: string; name: string; image: string | null }
      | undefined;

    if (parsed.data.peerId) {
      const rows = await db
        .select({ id: userTable.id, name: userTable.name, image: userTable.image })
        .from(userTable)
        .where(eq(userTable.id, parsed.data.peerId))
        .limit(1);
      peer = rows[0];
      if (!peer) return badRequest('That account could not be found.');
    }

    await db.insert(callLogs).values({
      id: newId('call'),
      ownerId: me,
      peerId: peer?.id,
      name: parsed.data.name,
      avatar: parsed.data.avatar,
      direction: parsed.data.direction,
      type: parsed.data.type,
      at: now,
      duration: parsed.data.duration,
    });

    if (peer && parsed.data.direction !== 'missed') {
      await db.insert(callLogs).values({
        id: newId('call'),
        ownerId: peer.id,
        peerId: me,
        name: context.profile.name,
        avatar: context.profile.image ?? undefined,
        direction: parsed.data.direction === 'outgoing' ? 'incoming' : 'outgoing',
        type: parsed.data.type,
        at: now,
        duration: parsed.data.duration,
      });
    }

    return json({ ok: true }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to save the call.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    await db.delete(callLogs).where(eq(callLogs.ownerId, context.profile.id));
    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to clear call history.') }, 500);
  }
}
