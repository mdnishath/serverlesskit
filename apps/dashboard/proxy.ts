import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'sk_session';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register'];

/**
 * Next.js 16 proxy — protects dashboard routes.
 * Redirects to /login if no session cookie is present.
 * Redirects to / if authenticated user visits login/register.
 */
export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasSession = request.cookies.has(SESSION_COOKIE);

	const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
	const isApi = pathname.startsWith('/api/');

	if (!hasSession && !isPublic) {
		if (isApi) {
			return NextResponse.json(
				{ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 },
			);
		}
		return NextResponse.redirect(new URL('/login', request.url));
	}

	if (hasSession && (pathname === '/login' || pathname === '/register')) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next|favicon\\.ico|uploads).*)'],
};
