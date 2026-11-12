import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username } from 'better-auth/plugins';
import { db } from './db';
import * as authSchema from './auth-schema';
import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  appName: 'WhatsApp',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema: { ...schema, ...authSchema } }),
  baseURL: process.env.BETTER_AUTH_URL
    ? process.env.BETTER_AUTH_URL
    : {
        allowedHosts: ['*'],
        fallback: 'http://localhost:4000',
        protocol: 'auto',
      },
  trustedProxyHeaders: true,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
      },
      phoneFull: {
        type: 'string',
        required: false,
        unique: true,
        index: true,
      },
      countryCode: {
        type: 'string',
        required: false,
      },
      countryName: {
        type: 'string',
        required: false,
      },
      about: {
        type: 'string',
        required: false,
        defaultValue: 'Hey there! I am using WhatsApp.',
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: false,
      },
      verified: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      lastActiveAt: {
        type: 'date',
        required: false,
        defaultValue: () => new Date(),
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 24,
      usernameValidator: (value) => /^[a-zA-Z0-9._]{3,24}$/.test(value),
    }),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
    },
    ...(isProduction
      ? {}
      : {
          defaultCookieAttributes: {
            sameSite: 'none',
            secure: true,
            partitioned: true,
          },
        }),
  },
});

export type Session = typeof auth.$Infer.Session;
