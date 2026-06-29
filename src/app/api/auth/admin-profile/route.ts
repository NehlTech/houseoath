import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import clientPromise from '@/lib/mongodb';
import { sessionOptions, type SessionData } from '@/lib/session';
import { ADMIN_SETTINGS_ID, type AdminSettingsDoc } from '@/lib/adminSettings';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const MAX_NAME_LENGTH = 100;

// Display-name-only update for the superuser — deliberately separate from
// /api/auth/admin-settings, which requires the current password because it
// changes login credentials. Renaming yourself isn't security-sensitive, so
// this mirrors how a worker can rename themselves without re-entering a password.
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.userId !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection<AdminSettingsDoc>('admin_settings').updateOne(
      { _id: ADMIN_SETTINGS_ID },
      { $set: { name, updatedAt: new Date() } },
      { upsert: true },
    );

    session.name = name;
    await session.save();

    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
  }
}
