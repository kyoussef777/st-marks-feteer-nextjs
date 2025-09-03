import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, isAdmin } from '@/lib/middleware-auth';

// Define routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/check',
];

// Define admin-only routes
const adminRoutes = [
  '/admin',
  '/api/admin',
  '/analytics',
];

// Define cashier-accessible routes
const cashierRoutes = [
  '/',
  '/orders',
  '/menu',
  '/api/orders',
  '/api/menu',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow label printing and debug endpoints without auth for development
  if (pathname.match(/^\/api\/orders\/\d+\/label$/) || pathname.startsWith('/api/debug')) {
    return NextResponse.next();
  }

  // Check for auth token and get user info
  const user = await isAuthenticated(request);

  // Handle unauthenticated users
  if (!user) {
    if (pathname.startsWith('/api/')) {
      // For API routes, return 401 JSON response
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    } else {
      // For page routes, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check admin-only routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!isAdmin(user)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      } else {
        // Redirect non-admin users to home
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
      }
    }
  }

  // For cashier routes, both admin and cashier can access
  if (cashierRoutes.some(route => pathname.startsWith(route))) {
    if (user.role !== 'admin' && user.role !== 'cashier') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      } else {
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}