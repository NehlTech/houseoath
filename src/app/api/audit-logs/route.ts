import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'audit_logs';

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action.slice(0, 200) : '';
    const description = typeof body.description === 'string' ? body.description.slice(0, 1000) : '';

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection(COLLECTION).insertOne({
      action,
      description,
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save audit log' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const logs = await db.collection(COLLECTION)
      .find({})
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json(logs.map(l => ({ ...l, _id: undefined })));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
