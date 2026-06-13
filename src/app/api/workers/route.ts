import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
      .find({}, { projection: { password: 0 } })
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
    if (typeof body.role !== 'string' || body.role.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid or missing field: role' }, { status: 400 });
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    body.password = await bcrypt.hash(body.password, 12);

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).insertOne(body);

    const { password: _pw, ...workerWithoutPassword } = body;
    return NextResponse.json(workerWithoutPassword, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}
