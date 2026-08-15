import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ??
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ??
  'https://not-configured.neonauth.invalid/neondb/auth';

const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ??
  'development-only-neon-auth-secret-change-before-deploying';

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
  logLevel: process.env.NODE_ENV === 'test' ? 'silent' : 'warn',
});
