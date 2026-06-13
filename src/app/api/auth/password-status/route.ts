import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin password lives in env vars — treat as always having a password
    if (session.role === 'Admin') {
      return NextResponse.json({ hasPassword: true });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const worker = await db.collection('workers').findOne(
      { email: session.email },
      { projection: { password: 1 } }
    );

    return NextResponse.json({ hasPassword: !!(worker?.password) });
  } catch {
    return NextResponse.json({ error: 'Failed to check password status' }, { status: 500 });
  }
}
