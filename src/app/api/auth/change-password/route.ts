import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const BCRYPT_ROUNDS = Math.min(Math.max(parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10), 10), 14);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the superuser's password is env/admin_settings-managed. A team
    // member holding the Admin role still has a real workers-collection
    // record and changes their password the same way a Worker does.
    if (session.userId === 'admin') {
      return NextResponse.json(
        { error: 'This account\'s password is managed from Account Settings.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'New password must be between 8 and 128 characters' }, { status: 400 });
    }
    if (currentPassword.length > 128) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const worker = await db.collection('workers').findOne({ email: session.email });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Invite-only worker setting their password for the first time
    if (!worker.password) {
      const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await db.collection('workers').updateOne(
        { email: session.email },
        { $set: { password: hashed } }
      );
      return NextResponse.json({ message: 'Password set successfully' });
    }

    // Existing password — require current password before changing
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, worker.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.collection('workers').updateOne(
      { email: session.email },
      { $set: { password: hashed } }
    );

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
