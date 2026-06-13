import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import type { SessionData } from './lib/session';

const COOKIE_NAME = 'hoath-session';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Security headers applied to every response.
// CSP uses unsafe-inline for scripts/styles — nonce-based CSP requires
// Next.js to inject nonces into every generated script tag, which is not
// wired up here. The remaining directives (frame-ancestors, form-action,
// base-uri) still provide meaningful clickjacking and injection protection.
const SECURITY_HEADERS: [string, string][] = [
  [
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://ik.imagekit.io",
      "connect-src 'self' https://ik.imagekit.io https://upload.imagekit.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  ],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
];

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|html|json|txt|mjs|js)$/.test(pathname);

  if (isPublic) {
    return applySecurityHeaders(NextResponse.next());
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
    if (!cookieValue) throw new Error('No session cookie');

    const session = await unsealData<SessionData>(cookieValue, { password: secret });
    if (!session.isLoggedIn) throw new Error('Not authenticated');
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
