import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'todo_session';

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isProtected = pathname === '/' || pathname.startsWith('/calendar');
  const isLoginRoute = pathname.startsWith('/login');

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && token) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/calendar/:path*', '/login'],
};
