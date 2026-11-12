import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { pushTokens } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { pushTokenSchema } from '../../lib/validation';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = pushTokenSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid push token.');

    await db
      .insert(pushTokens)
      .values({
        userId: context.profile.id,
        token: parsed.data.token,
        platform: parsed.data.platform,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.token],
        set: { platform: parsed.data.platform, updatedAt: new Date() },
      });

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to register for notifications.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();

    const body = (await request.json().catch(() => null)) as { token?: string } | null;
    if (!body?.token) return badRequest('Missing push token.');

    await db
      .delete(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, context.profile.id),
          eq(pushTokens.token, body.token),
        ),
      );

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to remove the push token.') }, 500);
  }
}
