import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per IP per 15 minutes
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { ok, retryAfter } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: `Too many login attempts. Please try again in ${retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();
    // rememberMe=true → 30 days; false/default → 8 hours
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
    const sessionOpts = {
      ...sessionOptions,
      cookieOptions: { ...sessionOptions.cookieOptions, maxAge },
    };

    // ── Admin login ────────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (normalisedEmail === adminEmail.toLowerCase()) {
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      const adminPassword = process.env.ADMIN_PASSWORD;

      let valid = false;
      if (adminPasswordHash) {
        valid = await bcrypt.compare(password, adminPasswordHash);
      } else if (adminPassword) {
        // Plain-text fallback — only active in development when ADMIN_PASSWORD_HASH is not set
        if (process.env.NODE_ENV === 'production') {
          console.error('SECURITY: ADMIN_PASSWORD_HASH must be set in production.');
          return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }
        valid = password === adminPassword;
      } else {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
      }

      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOpts);
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
      // Worker exists but has no password — they must use their invite link
      if (worker && !worker.password) {
        return NextResponse.json({ error: 'Please use the invite link sent to your email to sign in.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let valid = false;
    const storedPw: string = worker.password;

    if (storedPw.startsWith('$2')) {
      valid = await bcrypt.compare(password, storedPw);
    } else {
      // Legacy plain-text — compare then upgrade to bcrypt
      valid = storedPw === password;
      if (valid) {
        const hash = await bcrypt.hash(password, 12);
        await db.collection('workers').updateOne({ _id: worker._id }, { $set: { password: hash } });
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (worker.status === 'Archived') {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact your Admin.' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOpts);
    session.isLoggedIn = true;
    session.userId = worker.id ?? worker._id.toString();
    session.email = normalisedEmail;
    session.name = worker.name;
    session.role = worker.role === 'Admin' ? 'Admin' : 'Worker';
    await session.save();

    return NextResponse.json({ name: worker.name, email: normalisedEmail, role: session.role });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
