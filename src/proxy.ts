import { auth } from '@/lib/auth/server';

export const proxy = auth.middleware({ loginUrl: '/login' });

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/study/:path*',
    '/analytics/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
};
