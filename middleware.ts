import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

const protectedRoutes = ['/backend', '/pos', '/kds'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const session = await verifySession(sessionCookie);

    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Role-based protection check within middleware
    if (pathname.startsWith('/backend') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    if (pathname.startsWith('/pos') && session.role !== 'admin' && session.role !== 'cashier') {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    if (pathname.startsWith('/kds') && session.role !== 'admin' && session.role !== 'kitchen-staff') {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.[\\w]+$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
