import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const MAX_PASSWORD_LENGTH = 128;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json({ error: 'Reset token is missing' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer` }, { status: 400 });
    }

    // Hash before the DB round-trip so we hold the token open for minimum time
    const hashedPassword = await bcrypt.hash(password, 12);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Atomically claim the token — sets used:true only if it's still valid.
    // A second concurrent request with the same token gets null back.
    const record = await db.collection('password_resets').findOneAndUpdate(
      { token, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
    );

    if (!record) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    await db.collection('workers').updateOne(
      { email: record.email },
      { $set: { password: hashedPassword } }
    );

    return NextResponse.json({ message: 'Password reset successfully.' });
  } catch {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
