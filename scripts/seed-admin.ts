import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { db } from '../lib/db';
import { user } from '../lib/auth-schema';
import { appStates } from '../lib/schema';
import { buildSeedState } from '../lib/seed';

const ADMIN = {
  name: 'Golam Rabbi',
  username: 'GolamRabbi786',
  email: 'admin@whatsapp.app',
  password: 'G.rabbi3046',
  phone: '1700000000',
  phoneFull: '+8801700000000',
  countryCode: '+880',
  countryName: 'Bangladesh',
  about: 'Platform administrator',
};

async function main() {
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, ADMIN.email))
    .limit(1);

  if (!existing[0]) {
    await auth.api.signUpEmail({
      body: {
        name: ADMIN.name,
        email: ADMIN.email,
        password: ADMIN.password,
        username: ADMIN.username,
        displayUsername: ADMIN.username,
        phone: ADMIN.phone,
        phoneFull: ADMIN.phoneFull,
        countryCode: ADMIN.countryCode,
        countryName: ADMIN.countryName,
        about: ADMIN.about,
      },
    });
    console.log('Created administrator account.');
  } else {
    console.log('Administrator account already exists.');
  }

  const rows = await db
    .select()
    .from(user)
    .where(eq(user.email, ADMIN.email))
    .limit(1);
  const admin = rows[0];
  if (!admin) throw new Error('Administrator account could not be created.');

  await db
    .update(user)
    .set({
      role: 'admin',
      status: 'active',
      banned: false,
      verified: true,
      emailVerified: true,
      about: ADMIN.about,
      phone: ADMIN.phone,
      phoneFull: ADMIN.phoneFull,
      countryCode: ADMIN.countryCode,
      countryName: ADMIN.countryName,
    })
    .where(eq(user.id, admin.id));

  const states = await db
    .select()
    .from(appStates)
    .where(eq(appStates.userId, admin.id))
    .limit(1);

  if (!states[0]) {
    await db.insert(appStates).values({
      userId: admin.id,
      data: buildSeedState({
        name: ADMIN.name,
        about: ADMIN.about,
        phone: `${ADMIN.countryCode} ${ADMIN.phone}`,
      }),
    });
  }

  console.log(`Administrator ready: @${ADMIN.username}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
