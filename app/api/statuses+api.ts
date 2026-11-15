import { and, eq, gt, inArray } from 'drizzle-orm';
import { db } from '../../lib/db';
import { statusViews, statuses } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { statusActionSchema, statusCreateSchema } from '../../lib/validation';
import { STATUS_COLORS } from '../../lib/theme';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function userFromGroup(groupId: string) {
  if (!groupId.startsWith('status-')) return null;
  return groupId.slice('status-'.length);
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = statusCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid status.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const background =
      parsed.data.background || STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)];
    const type = parsed.data.video ? 'video' : parsed.data.image ? 'image' : 'text';
    const media = parsed.data.image ?? parsed.data.video;

    const id = newId('status');
    await db.insert(statuses).values({
      id,
      userId: context.profile.id,
      type,
      image: media,
      caption: parsed.data.caption.trim(),
      background,
      duration: parsed.data.duration ?? 5,
      createdAt: now,
      expiresAt,
    });

    return json({ id }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to publish your status.') }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = statusActionSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid status action.');

    const me = context.profile.id;
    const data = parsed.data;

    if (data.action === 'view') {
      if (data.groupId === 'my-status') return json({ ok: true });
      const ownerId = userFromGroup(data.groupId);
      if (!ownerId) return badRequest('Unknown status.');

      const active = await db
        .select({ id: statuses.id })
        .from(statuses)
        .where(
          and(eq(statuses.userId, ownerId), gt(statuses.expiresAt, new Date())),
        );

      if (active.length > 0) {
        await db
          .insert(statusViews)
          .values(
            active.map((row) => ({
              statusId: row.id,
              viewerId: me,
              viewedAt: new Date(),
            })),
          )
          .onConflictDoNothing();
      }

      return json({ ok: true });
    }

    const ownerId = data.groupId === 'my-status' ? me : userFromGroup(data.groupId);
    if (!ownerId || ownerId !== me) {
      return forbidden('You can only delete your own status updates.');
    }

    await db.delete(statuses).where(eq(statuses.userId, me));
    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the status.') }, 500);
  }
}
