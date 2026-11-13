import { count, eq, gt, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { user } from '../../../lib/auth-schema';
import {
  callLogs,
  chats,
  communities,
  messages,
  statuses,
} from '../../../lib/schema';
import {
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../../lib/api';
import type { AdminStats } from '../../../lib/types';

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const notAdmin = sql`${user.role} is distinct from 'admin'`;

    const [
      memberRows,
      adminRows,
      chatRows,
      groupRows,
      messageRows,
      callRows,
      statusRows,
      communityRows,
    ] = await Promise.all([
      db
        .select({
          total: count(),
          active: sql`count(*) filter (where ${user.status} is distinct from 'suspended')`,
          suspended: sql`count(*) filter (where ${user.status} = 'suspended')`,
          verified: sql`count(*) filter (where ${user.verified} or ${user.emailVerified})`,
          countries: sql`count(distinct ${user.countryName})`,
        })
        .from(user)
        .where(notAdmin),
      db.select({ total: count() }).from(user).where(eq(user.role, 'admin')),
      db.select({ total: count() }).from(chats),
      db.select({ total: count() }).from(chats).where(eq(chats.kind, 'group')),
      db.select({ total: count() }).from(messages),
      db.select({ total: count() }).from(callLogs),
      db
        .select({ total: count() })
        .from(statuses)
        .where(gt(statuses.expiresAt, new Date())),
      db.select({ total: count() }).from(communities),
    ]);

    const members = memberRows[0];

    const stats: AdminStats = {
      totalUsers: asNumber(members?.total),
      active: asNumber(members?.active),
      suspended: asNumber(members?.suspended),
      verified: asNumber(members?.verified),
      admins: asNumber(adminRows[0]?.total),
      countries: asNumber(members?.countries),
      chats: asNumber(chatRows[0]?.total),
      groups: asNumber(groupRows[0]?.total),
      messages: asNumber(messageRows[0]?.total),
      calls: asNumber(callRows[0]?.total),
      statuses: asNumber(statusRows[0]?.total),
      communities: asNumber(communityRows[0]?.total),
      updatedAt: new Date().toISOString(),
    };

    return json({ stats });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load platform stats.') }, 500);
  }
}
