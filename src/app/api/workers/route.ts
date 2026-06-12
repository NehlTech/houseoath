import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';

function deepStripMongoOperators(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(deepStripMongoOperators);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([k]) => !k.startsWith('$'))
        .map(([k, v]) => [k, deepStripMongoOperators(v)])
    );
  }
  return obj;
}

// GET all workers — Admin only; passwords never returned
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

// POST create a new worker — Admin only; hashes password before storing
export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Hash password before storing
    if (typeof body.password === 'string' && body.password.length > 0) {
      body.password = await bcrypt.hash(body.password, 12);
    } else {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).insertOne(body);

    // Return worker without password
    const { password: _pw, ...workerWithoutPassword } = body;
    return NextResponse.json(workerWithoutPassword, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}
