import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './session';

type AuthResult =
  | { error: NextResponse; session: null }
  | { error: null; session: SessionData };

/**
 * Verifies the httpOnly session cookie on every API route.
 * Returns { error } if unauthenticated (caller must return it immediately).
 * Returns { session } with the verified session data on success.
 */
export async function requireApiAuth(_request: Request): Promise<AuthResult> {
  // SESSION_SECRET must be configured — fail closed if missing
  if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is not set.');
    return {
      error: NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }),
      session: null,
    };
  }

  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return {
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        session: null,
      };
    }

    return { error: null, session };
  } catch {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    };
  }
}
