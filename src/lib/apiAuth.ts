import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './session';
import clientPromise from './mongodb';

const DB_NAME = 'kente-couture';

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

 // Check if this worker's session was revoked (e.g. deleted by admin).
 // Skip for admin — admin is env-var based and can never be deleted.
 if (session.userId && session.userId !== 'admin') {
 try {
   const mongo = await clientPromise;
   const db = mongo.db(DB_NAME);
   const revoked = await db.collection('revoked_sessions').findOne({ userId: session.userId });
   if (revoked) {
     return {
       error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
       session: null,
     };
   }
 } catch {
   // Fail open — don't block auth if DB is temporarily unreachable
 }
 }

 return { error: null, session };
 } catch {
 return {
 error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
 session: null,
 };
 }
}
