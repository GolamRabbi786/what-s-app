import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, usernameClient } from 'better-auth/client/plugins';
import type { auth } from './auth';

const baseURL =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:4000';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  phone?: string | null;
  phoneFull?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  about?: string | null;
  role?: string | null;
  status?: string | null;
  verified?: boolean | null;
  createdAt: string | Date;
  lastActiveAt?: string | Date | null;
}
