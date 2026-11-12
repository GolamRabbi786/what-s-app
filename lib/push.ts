import { inArray } from 'drizzle-orm';
import { db } from './db';
import { pushTokens } from './schema';

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export async function sendPush(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const unique = Array.from(new Set(userIds));
    if (unique.length === 0) return;

    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(inArray(pushTokens.userId, unique));

    const tokens = rows
      .map((row) => row.token)
      .filter((token) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));

    if (tokens.length === 0) return;

    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      sound: 'notification.wav',
      title,
      body: body.length > 180 ? `${body.slice(0, 177)}…` : body,
      data,
      channelId: 'messages',
      priority: 'high',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Push delivery is best-effort; messaging must never fail because of it.
  }
}
