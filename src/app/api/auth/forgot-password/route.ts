import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

const SUCCESS_RESPONSE = NextResponse.json({
  message: 'If that email is registered, you will receive a reset link shortly.',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const worker = await db.collection('workers').findOne({ email });
    // Always return the same response to prevent email enumeration
    if (!worker) return SUCCESS_RESPONSE;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Remove any previous unused tokens for this email
    await db.collection('password_resets').deleteMany({ email });
    await db.collection('password_resets').insertOne({
      email,
      token,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `House of Oath <${fromAddress}>`,
      to: email,
      subject: 'Reset your password — House of Oath',
      html: buildResetEmail(worker.name ?? 'Team Member', resetUrl),
    });

    return SUCCESS_RESPONSE;
  } catch {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

function buildResetEmail(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#d4af35;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">House of Oath</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">Password Reset</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#2d2d2d;font-size:16px;">Hi ${name},</p>
              <p style="margin:0 0 28px;color:#555555;font-size:15px;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}" style="display:inline-block;background:#d4af35;color:#1a1a1a;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:10px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#888888;font-size:13px;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#d4af35;font-size:12px;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;" />
              <p style="margin:0;color:#aaaaaa;font-size:12px;line-height:1.6;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
            </td>
          </tr>
          <!-- Footer -->
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
