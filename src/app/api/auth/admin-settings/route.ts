import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';
import { getAdminSettings, ADMIN_SETTINGS_ID, type AdminSettingsDoc } from '@/lib/adminSettings';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const BCRYPT_ROUNDS = Math.min(Math.max(parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10), 10), 14);
const MAX_PASSWORD_LENGTH = 128;

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newEmailRaw = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || currentPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (!newEmailRaw && !newPassword) {
      return NextResponse.json({ error: 'Provide a new email or new password' }, { status: 400 });
    }
    if (newEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmailRaw)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (newPassword && (newPassword.length < 8 || newPassword.length > MAX_PASSWORD_LENGTH)) {
      return NextResponse.json({ error: 'New password must be between 8 and 128 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const adminSettings = await getAdminSettings(db);
    const effectiveEmail = adminSettings?.email ?? process.env.ADMIN_EMAIL ?? '';

    // ── Verify current password against whichever source is authoritative right now ──
    let currentValid = false;
    if (adminSettings?.passwordHash) {
      currentValid = await bcrypt.compare(currentPassword, adminSettings.passwordHash);
    } else {
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminPasswordHash) {
        currentValid = await bcrypt.compare(currentPassword, adminPasswordHash);
      } else if (adminPassword && process.env.NODE_ENV !== 'production') {
        currentValid = currentPassword === adminPassword;
      }
    }

    if (!currentValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // ── New email can't collide with an existing worker ──
    if (newEmailRaw && newEmailRaw !== effectiveEmail.toLowerCase()) {
      const existingWorker = await db.collection('workers').findOne({ email: newEmailRaw });
      if (existingWorker) {
        return NextResponse.json({ error: 'This email is already in use by a team member' }, { status: 409 });
      }
    }

    const finalEmail = newEmailRaw || effectiveEmail;
    // If no new password was given, carry forward the existing DB hash, or — on first-ever
    // update — re-hash the just-verified current password so admin_settings becomes authoritative.
    const finalPasswordHash = newPassword
      ? await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
      : adminSettings?.passwordHash ?? (await bcrypt.hash(currentPassword, BCRYPT_ROUNDS));

    await db.collection<AdminSettingsDoc>('admin_settings').updateOne(
      { _id: ADMIN_SETTINGS_ID },
      { $set: { email: finalEmail, passwordHash: finalPasswordHash, updatedAt: new Date() } },
      { upsert: true },
    );

    // Keep the active session valid under the new email
    session.email = finalEmail;
    await session.save();

    await db.collection('audit_logs').insertOne({
      action: 'Admin Account Updated',
      description:
        newEmailRaw && newPassword
          ? 'Admin email and password were changed.'
          : newEmailRaw
            ? 'Admin email was changed.'
            : 'Admin password was changed.',
      actorId: 'admin',
      actorName: 'Admin',
      actorRole: 'Admin',
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Account settings updated successfully', email: finalEmail });
  } catch {
    return NextResponse.json({ error: 'Failed to update account settings' }, { status: 500 });
  }
}
