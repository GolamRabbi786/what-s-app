import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../lib/db';
import { user as userTable } from '../../lib/auth-schema';
import { blocks, callLogs, callSessions, messages } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { callSignalSchema } from '../../lib/validation';
import type { CallSession } from '../../lib/types';

const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const ACTIVE_STATUSES = ['calling', 'ringing', 'connected'] as const;

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

type SessionRow = {
  session: typeof callSessions.$inferSelect;
  calleeName: string;
  calleeAvatar: string | null;
};

function toSession(row: SessionRow): CallSession {
  const { session } = row;
  return {
    id: session.id,
    chatId: session.chatId,
    callerId: session.callerId,
    calleeId: session.calleeId,
    callerName: session.callerName,
    callerAvatar: session.callerAvatar ?? undefined,
    calleeName: row.calleeName,
    calleeAvatar: row.calleeAvatar ?? undefined,
    type: session.type,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    connectedAt: session.connectedAt?.toISOString(),
    endedAt: session.endedAt?.toISOString(),
    durationSeconds: session.durationSeconds ?? undefined,
  };
}

const baseQuery = () =>
  db
    .select({
      session: callSessions,
      calleeName: userTable.name,
      calleeAvatar: userTable.image,
    })
    .from(callSessions)
    .innerJoin(userTable, eq(userTable.id, callSessions.calleeId));

async function loadSession(id: string) {
  const rows = await baseQuery().where(eq(callSessions.id, id)).limit(1);
  return rows[0] ?? null;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      const rows = await baseQuery().where(eq(callSessions.id, id)).limit(1);
      const row = rows[0];
      if (!row) return json({ session: null });
      if (row.session.callerId !== context.profile.id && row.session.calleeId !== context.profile.id) {
        return forbidden();
      }
      return json({ session: toSession(row) });
    }

    const rows = await baseQuery()
      .where(
        and(
          eq(callSessions.calleeId, context.profile.id),
          inArray(callSessions.status, ['calling', 'ringing']),
        ),
      )
      .orderBy(desc(callSessions.createdAt))
      .limit(1);

    return json({ session: rows[0] ? toSession(rows[0]) : null });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load call state.') }, 500);
  }
}

async function finishSession(
  row: SessionRow,
  finalStatus: 'ended' | 'declined' | 'missed',
) {
  const { session } = row;
  if (!ACTIVE_STATUSES.includes(session.status as (typeof ACTIVE_STATUSES)[number])) {
    return toSession(row);
  }

  const endedAt = new Date();
  const answered = Boolean(session.connectedAt) && finalStatus === 'ended';
  const durationSeconds = session.connectedAt
    ? Math.max(1, Math.round((endedAt.getTime() - session.connectedAt.getTime()) / 1000))
    : undefined;

  await db
    .update(callSessions)
    .set({ status: finalStatus, endedAt, durationSeconds })
    .where(eq(callSessions.id, session.id));

  const duration = durationSeconds ? formatDuration(durationSeconds) : undefined;
  const callerName = session.callerName;
  const calleeName = row.calleeName;

  await db.insert(callLogs).values([
    {
      id: newId('call'),
      ownerId: session.callerId,
      peerId: session.calleeId,
      name: calleeName,
      avatar: row.calleeAvatar ?? undefined,
      direction: 'outgoing',
      type: session.type,
      at: session.createdAt,
      duration,
    },
    {
      id: newId('call'),
      ownerId: session.calleeId,
      peerId: session.callerId,
      name: callerName,
      avatar: session.callerAvatar ?? undefined,
      direction: answered ? 'incoming' : 'missed',
      type: session.type,
      at: session.createdAt,
      duration,
    },
  ]);

  if (session.chatId) {
    const label =
      answered
        ? `${session.type === 'video' ? 'Video' : 'Voice'} call · ${duration}`
        : session.type === 'video'
          ? 'Missed video call'
          : 'Missed voice call';
    await db.insert(messages).values({
      id: newId('msg'),
      chatId: session.chatId,
      senderId: session.callerId,
      text: label,
      kind: 'call',
      createdAt: endedAt,
    });
  }

  const updated = await loadSession(session.id);
  return updated ? toSession(updated) : { ...toSession(row), status: finalStatus };
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = callSignalSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid call action.');
    const body = parsed.data;
    const me = context.profile.id;

    if (body.action === 'start') {
      if (body.peerId === me) return badRequest('You cannot call yourself.');

      const peers = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
          lastActiveAt: userTable.lastActiveAt,
        })
        .from(userTable)
        .where(eq(userTable.id, body.peerId))
        .limit(1);
      const peer = peers[0];
      if (!peer) return badRequest('That account could not be found.');

      const blockRows = await db
        .select({ blockerId: blocks.blockerId })
        .from(blocks)
        .where(
          or(
            and(eq(blocks.blockerId, me), eq(blocks.blockedId, peer.id)),
            and(eq(blocks.blockerId, peer.id), eq(blocks.blockedId, me)),
          ),
        )
        .limit(1);
      if (blockRows[0]) {
        return forbidden(
          blockRows[0].blockerId === me
            ? 'You blocked this contact. Unblock them to call.'
            : 'You cannot call this contact right now.',
        );
      }

      const existing = await baseQuery()
        .where(
          and(
            or(
              and(eq(callSessions.callerId, me), eq(callSessions.calleeId, peer.id)),
              and(eq(callSessions.callerId, peer.id), eq(callSessions.calleeId, me)),
            ),
            inArray(callSessions.status, ['calling', 'ringing', 'connected']),
          ),
        )
        .limit(1);
      if (existing[0]) {
        return json({ session: toSession(existing[0]), reused: true });
      }

      const online = peer.lastActiveAt
        ? Date.now() - new Date(peer.lastActiveAt).getTime() < ONLINE_WINDOW_MS
        : false;

      const id = newId('callsess');
      await db.insert(callSessions).values({
        id,
        chatId: body.chatId,
        callerId: me,
        calleeId: peer.id,
        callerName: context.profile.name,
        callerAvatar: context.profile.image ?? undefined,
        type: body.type,
        status: online ? 'ringing' : 'calling',
      });

      const created = await loadSession(id);
      return json({ session: created ? toSession(created) : null }, 201);
    }

    const row = await loadSession(body.id);
    if (!row) return json({ session: null }, 404);

    const { session } = row;
    const isCaller = session.callerId === me;
    const isCallee = session.calleeId === me;
    if (!isCaller && !isCallee) return forbidden();

    if (body.action === 'accept') {
      if (!isCallee) return badRequest('Only the person being called can answer.');
      if (session.status === 'connected') return json({ session: toSession(row) });
      if (session.status !== 'calling' && session.status !== 'ringing') {
        return badRequest('This call is no longer available.');
      }
      const connectedAt = new Date();
      await db
        .update(callSessions)
        .set({ status: 'connected', connectedAt })
        .where(eq(callSessions.id, session.id));
      const updated = await loadSession(session.id);
      return json({ session: updated ? toSession(updated) : null });
    }

    if (body.action === 'decline') {
      if (!isCallee) return badRequest('Only the person being called can decline.');
      const finished = await finishSession(row, 'declined');
      return json({ session: finished });
    }

    const finalStatus = session.connectedAt ? 'ended' : 'missed';
    const finished = await finishSession(row, finalStatus);
    return json({ session: finished });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the call.') }, 500);
  }
}
