import { createClient } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession();

  // For auth protected routes
  const pathname = request.nextUrl.pathname;
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();

  // Define public routes that don't require authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If the user is not authenticated and the route is not public, redirect to login
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is authenticated and trying to access login page, redirect to home
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.svg).*)'],
};