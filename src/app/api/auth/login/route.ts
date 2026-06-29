import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateEnv } from '@/lib/validateEnv';
import { getAdminSettings } from '@/lib/adminSettings';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const BCRYPT_ROUNDS = Math.min(Math.max(parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10), 10), 14);

export async function POST(request: NextRequest) {
  validateEnv();
  // Rate limit: 5 attempts per IP per 15 minutes
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { ok, retryAfter } = await checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
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
    if (password.length > 128) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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

    const dbClientForAdmin = await clientPromise;
    const adminSettings = await getAdminSettings(dbClientForAdmin.db(DB_NAME));

    const effectiveAdminEmail = adminSettings?.email ?? adminEmail;

    if (normalisedEmail === effectiveAdminEmail.toLowerCase()) {
      let valid = false;

      if (adminSettings?.passwordHash) {
        valid = await bcrypt.compare(password, adminSettings.passwordHash);
      } else {
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const adminPassword = process.env.ADMIN_PASSWORD;

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
      }

      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOpts);
      const adminName = adminSettings?.name ?? 'Admin';

      session.isLoggedIn = true;
      session.userId = 'admin';
      session.email = normalisedEmail;
      session.name = adminName;
      session.role = 'Admin';
      await session.save();

      return NextResponse.json({ name: adminName, email: normalisedEmail, role: 'Admin' });
    }

    // ── Worker login ───────────────────────────────────────────────────────
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const worker = await db.collection('workers').findOne({ email: normalisedEmail });

    if (!worker) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!worker.password) {
      // Worker has no password (invited but never set one) — auto-send a sign-in link
      // so they can get back in without hunting for "Forgot Password".
      try {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await db.collection('password_resets').findOneAndReplace(
          { email: normalisedEmail },
          { email: normalisedEmail, token, expiresAt, used: false, createdAt: new Date() },
          { upsert: true },
        );
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `House of Oath <${fromAddress}>`,
          to: normalisedEmail,
          subject: 'Your sign-in link for House of Oath',
          html: buildSignInLinkEmail(worker.name ?? 'Team Member', resetUrl),
        });
      } catch {
        // Email failure is non-fatal — fall through to generic message
      }
      return NextResponse.json(
        { message: "We've sent a sign-in link to your email. Check your inbox.", signInLinkSent: true },
        { status: 200 },
      );
    }

    let valid = false;
    const storedPw: string = worker.password;

    if (storedPw.startsWith('$2')) {
      valid = await bcrypt.compare(password, storedPw);
    } else {
      // Legacy plain-text — compare then upgrade to bcrypt
      valid = storedPw === password;
      if (valid) {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await db.collection('workers').updateOne({ _id: worker._id }, { $set: { password: hash } });
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (worker.status === 'Archived') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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

function buildSignInLinkEmail(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your sign-in link</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#d4af35;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">House of Oath</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">Your Sign-In Link</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#2d2d2d;font-size:16px;">Hi ${name},</p>
              <p style="margin:0 0 28px;color:#555555;font-size:15px;line-height:1.6;">
                You tried to sign in but haven't set a password yet. Click the button below to set one and access the studio. This link expires in <strong>1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}" style="display:inline-block;background:#d4af35;color:#1a1a1a;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:10px;">
                      Set My Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888888;font-size:13px;">If the button doesn't work, paste this link into your browser:</p>
              <p style="margin:0 0 28px;word-break:break-all;"><a href="${resetUrl}" style="color:#d4af35;font-size:12px;">${resetUrl}</a></p>
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;" />
              <p style="margin:0;color:#aaaaaa;font-size:12px;line-height:1.6;">Didn't try to sign in? You can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f5;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#bbbbbb;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">© 2026 House of Oath Fashion. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
