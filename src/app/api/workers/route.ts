import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';
import { deepStripMongoOperators } from '@/lib/mongoSanitize';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';
const MAX_BODY_BYTES = 1_048_576;

export async function GET(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const workers = await db.collection(COLLECTION)
      .find({}, { projection: { password: 0, inviteToken: 0 } })
      .toArray();
    return NextResponse.json(workers);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  try {
    const raw = await request.json();
    const body = deepStripMongoOperators(raw) as Record<string, unknown>;

    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 500) {
      return NextResponse.json({ error: 'Invalid or missing field: name' }, { status: 400 });
    }

    const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }
    body.email = emailRaw;

    // Role: only 'Worker' or 'Admin' allowed
    body.role = body.role === 'Admin' ? 'Admin' : 'Worker';

    const dbClient = await clientPromise;
    const db = dbClient.db(DB_NAME);

    // Prevent duplicate email
    const existing = await db.collection(COLLECTION).findOne({ email: emailRaw });
    if (existing) {
      return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
    }

    let inviteToken: string | null = null;

    if (typeof body.password === 'string' && body.password.length >= 8) {
      body.password = await bcrypt.hash(body.password, 12);
    } else {
      delete body.password;
      inviteToken = crypto.randomBytes(32).toString('hex');
      body.inviteToken = inviteToken;
      body.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await db.collection(COLLECTION).insertOne(body);

    let inviteEmailSent = false;
    if (inviteToken) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.houseofoath.com';
        const inviteUrl = `${appUrl}/invite?token=${inviteToken}`;
        const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `House of Oath <${fromAddress}>`,
          to: emailRaw,
          subject: `You've been invited to House of Oath Studio`,
          html: buildInviteEmail(body.name as string, body.role as string, inviteUrl),
        });
        inviteEmailSent = true;
      } catch {
        // Email failure is non-fatal — worker is created, admin can add a password manually
      }
    }

    const { password: _pw, inviteToken: _tok, inviteTokenExpiry: _exp, ...workerSafe } = body;
    return NextResponse.json({ ...workerSafe, inviteEmailSent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}

function buildInviteEmail(name: string, role: string, inviteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#d4af35;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">House of Oath</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">Studio Access Invite</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#2d2d2d;font-size:16px;">Hi ${name},</p>
              <p style="margin:0 0 28px;color:#555555;font-size:15px;line-height:1.6;">
                You have been added to the <strong>House of Oath Fashion Studio</strong> as a <strong>${role}</strong>. Click the button below to access your account — no password needed.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${inviteUrl}" style="display:inline-block;background:#d4af35;color:#1a1a1a;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:10px;">
                      Access My Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888888;font-size:13px;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 28px;word-break:break-all;"><a href="${inviteUrl}" style="color:#d4af35;font-size:12px;">${inviteUrl}</a></p>
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;" />
              <p style="margin:0;color:#aaaaaa;font-size:12px;line-height:1.6;">This link expires in <strong>7 days</strong>. Once signed in, you can set a personal password in your Settings. If you didn't expect this invitation, please ignore this email.</p>
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
