import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { chatMembers, typingStates } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { typingSchema } from '../../lib/validation';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = typingSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid typing update.');

    const { chatId, mode } = parsed.data;
    const member = await db
      .select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, context.profile.id)))
      .limit(1);

    if (member.length === 0) return forbidden('You are not part of this chat.');

    if (mode === 'idle') {
      await db
        .delete(typingStates)
        .where(
          and(
            eq(typingStates.chatId, chatId),
            eq(typingStates.userId, context.profile.id),
          ),
        );
      return json({ ok: true });
    }

    const now = new Date();
    await db
      .insert(typingStates)
      .values({ chatId, userId: context.profile.id, mode, updatedAt: now })
      .onConflictDoUpdate({
        target: [typingStates.chatId, typingStates.userId],
        set: { mode, updatedAt: now },
      });

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update typing state.') }, 500);
  }
}
