import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types/clerk';

// Route matchers
const isAdminRoute = createRouteMatcher(['/backend(.*)']);
const isPosRoute = createRouteMatcher(['/pos(.*)']);
const isKdsRoute = createRouteMatcher(['/kds(.*)']);
const isProtectedRoute = createRouteMatcher([
  '/backend(.*)',
  '/pos(.*)',
  '/kds(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // All protected routes require authentication first
  if (isProtectedRoute(req)) {
    await auth.protect();

    const { sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: UserRole })?.role;

    // /backend — admin only
    if (isAdminRoute(req)) {
      if (role !== 'admin') {
        const url = new URL('/sign-in', req.url);
        url.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(url);
      }
    }

    // /pos — admin or cashier only
    if (isPosRoute(req)) {
      if (role !== 'admin' && role !== 'cashier') {
        const url = new URL('/sign-in', req.url);
        url.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(url);
      }
    }

    // /kds — admin or kitchen-staff only
    if (isKdsRoute(req)) {
      if (role !== 'admin' && role !== 'kitchen-staff') {
        const url = new URL('/sign-in', req.url);
        url.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(url);
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[\\w]+$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
