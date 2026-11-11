import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from './db';
import { session as sessionTable, user as userTable } from './auth-schema';

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
  phone: string | null;
  phoneFull: string | null;
  countryCode: string | null;
  countryName: string | null;
  about: string | null;
  role: string | null;
  status: string | null;
  verified: boolean | null;
  createdAt: Date;
  lastActiveAt: Date | null;
}

export interface AuthContext {
  profile: SessionProfile;
  token: string;
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

export const unauthorized = () => json({ error: 'Please sign in to continue.' }, 401);
export const forbidden = (message = 'You do not have access to this action.') =>
  json({ error: message }, 403);
export const badRequest = (message: string) => json({ error: message }, 400);

export function errorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const current = await auth.api.getSession({ headers: request.headers });
  if (!current) return null;

  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, current.user.id))
    .limit(1);

  const profile = rows[0];
  if (!profile) return null;

  return { profile, token: current.session.token };
}

export async function touchUser(userId: string) {
  await db
    .update(userTable)
    .set({ lastActiveAt: new Date() })
    .where(eq(userTable.id, userId));
}

export async function revokeSessions(userId: string) {
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
}
