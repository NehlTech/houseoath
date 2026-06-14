import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }

  // Treat a revoked session the same as logged-out so the client redirects to login.
  if (session.userId && session.userId !== 'admin') {
    try {
      const mongo = await clientPromise;
      const db = mongo.db(DB_NAME);
      const revoked = await db.collection('revoked_sessions').findOne({ userId: session.userId });
      if (revoked) {
        return NextResponse.json({ isLoggedIn: false }, { status: 401 });
      }
    } catch {
      // Fail open — keep session valid if DB is temporarily unreachable
    }
  }

  return NextResponse.json({
    isLoggedIn: true,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  });
}
