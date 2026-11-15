import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { user as userTable } from '../../lib/auth-schema';
import { blocks } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { blockActionSchema } from '../../lib/validation';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = blockActionSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid block action.');

    const me = context.profile.id;
    const target = parsed.data.userId;
    if (target === me) return badRequest('You cannot block yourself.');

    if (parsed.data.action === 'block') {
      const rows = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, target))
        .limit(1);
      if (!rows[0]) return badRequest('That account could not be found.');

      await db
        .insert(blocks)
        .values({ blockerId: me, blockedId: target })
        .onConflictDoNothing();
      return json({ ok: true, blocked: true });
    }

    await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, me), eq(blocks.blockedId, target)));
    return json({ ok: true, blocked: false });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update blocked contacts.') }, 500);
  }
}
