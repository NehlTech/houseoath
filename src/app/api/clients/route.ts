import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';

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

// GET all clients
export async function GET(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Workers only see clients assigned to them
    const filter = session.role === 'Worker'
      ? { assignedWorker: session.name }
      : {};

    const clients = await db.collection(COLLECTION)
      .find(filter)
      .sort({ lastActivity: -1 })
      .toArray();

    const formatted = clients.map((c) => ({
      ...c,
      id: (c.id as string | undefined) || c._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST create client — idempotent upsert by id
export async function POST(request: NextRequest) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const raw = await request.json();
    const body = deepStripMongoOperators(raw) as Record<string, unknown>;

    if (
      typeof body.name !== 'string' ||
      body.name.trim().length === 0 ||
      body.name.length > 500
    ) {
      return NextResponse.json({ error: 'Invalid or missing field: name' }, { status: 400 });
    }

    await db.collection(COLLECTION).updateOne(
      { id: body.id },
      { $setOnInsert: body },
      { upsert: true }
    );

    return NextResponse.json({ ...body }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
