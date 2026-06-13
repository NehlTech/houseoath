import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token : '';

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid invite link.' }, { status: 400 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db(DB_NAME);

    const worker = await db.collection('workers').findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() },
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'This invite link has expired or has already been used.' },
        { status: 400 },
      );
    }

    // One-time use — remove token after successful verification
    await db.collection('workers').updateOne(
      { _id: worker._id },
      { $unset: { inviteToken: '', inviteTokenExpiry: '' } },
    );

    const cookieStore = await cookies();
    // Magic-link sessions last 30 days
    const session = await getIronSession<SessionData>(cookieStore, {
      ...sessionOptions,
      cookieOptions: { ...sessionOptions.cookieOptions, maxAge: 30 * 24 * 60 * 60 },
    });
    session.isLoggedIn = true;
    session.userId = worker._id.toString();
    session.email = worker.email as string;
    session.name = worker.name as string;
    session.role = worker.role === 'Admin' ? 'Admin' : 'Worker';
    await session.save();

    return NextResponse.json({ ok: true, name: worker.name, role: session.role });
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
