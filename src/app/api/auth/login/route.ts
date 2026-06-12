import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();

    // ── Admin login ────────────────────────────────────────────────────────
    const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@houseofoath.com').toLowerCase();
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? '';

    if (normalisedEmail === adminEmail) {
      const valid = adminPasswordHash
        ? await bcrypt.compare(password, adminPasswordHash)
        : password === process.env.ADMIN_PASSWORD; // plain-text fallback for initial setup

      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      session.isLoggedIn = true;
      session.userId = 'admin';
      session.email = normalisedEmail;
      session.name = 'Admin';
      session.role = 'Admin';
      await session.save();

      return NextResponse.json({ name: 'Admin', email: normalisedEmail, role: 'Admin' });
    }

    // ── Worker login ───────────────────────────────────────────────────────
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const worker = await db.collection('workers').findOne({ email: normalisedEmail });

    if (!worker || !worker.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let valid = false;
    const storedPw: string = worker.password;

    if (storedPw.startsWith('$2')) {
      // bcrypt hash
      valid = await bcrypt.compare(password, storedPw);
    } else {
      // plain-text (legacy) — compare then upgrade
      valid = storedPw === password;
      if (valid) {
        const hash = await bcrypt.hash(password, 12);
        await db.collection('workers').updateOne({ _id: worker._id }, { $set: { password: hash } });
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.isLoggedIn = true;
    session.userId = worker.id ?? worker._id.toString();
    session.email = normalisedEmail;
    session.name = worker.name;
    session.role = 'Worker';
    await session.save();

    return NextResponse.json({ name: worker.name, email: normalisedEmail, role: 'Worker' });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
