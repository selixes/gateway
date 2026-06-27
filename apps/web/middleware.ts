import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/workflows(.*)', '/runs(.*)', '/traces(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url);
  const hostname = req.headers.get('host') || '';

  // Host-based routing: redirect root '/' to '/dashboard' for the dashboard subdomain
  if (hostname.includes('dashboard.selixes.com') && url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const bypassParam = url.searchParams.get('bypassAuth');
  const bypassCookie = req.cookies.get('bypassAuth')?.value;

  if (process.env.NODE_ENV !== 'production' && (bypassParam === 'true' || bypassCookie === 'true')) {
    const res = NextResponse.next();
    if (bypassParam === 'true' && bypassCookie !== 'true') {
      res.cookies.set('bypassAuth', 'true', { path: '/' });
    }
    return res;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
