import { db } from './db';
import { appStates } from './schema';
import { seedState } from './data';
import type { AppState } from './types';

interface SeedProfile {
  name?: string | null;
  about?: string | null;
  phone?: string | null;
}

export function buildSeedState(profile: SeedProfile = {}): AppState {
  const fresh = JSON.parse(JSON.stringify(seedState)) as AppState;

  fresh.user = {
    ...fresh.user,
    name: profile.name?.trim() || fresh.user.name,
    about: profile.about?.trim() || fresh.user.about,
    phone: profile.phone?.trim() || fresh.user.phone,
  };

  return fresh;
}

export async function seedUserState(userId: string, profile: SeedProfile = {}) {
  const data = buildSeedState(profile);

  await db
    .insert(appStates)
    .values({ userId, data })
    .onConflictDoNothing({ target: appStates.userId });

  return data;
}
