import { createClient } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const pathname = request.nextUrl.pathname;

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/');

  // Allow API routes to handle their own authentication
  const isApiRoute = pathname.startsWith('/api/');

  // getUser() validates the token with Supabase instead of trusting a stale
  // session cookie left behind by a different or reset Supabase project.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublicRoute && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // If the user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
