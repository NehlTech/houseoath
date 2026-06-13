import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';
import { deepStripMongoOperators } from '@/lib/mongoSanitize';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';
const MAX_BODY_BYTES = 5_242_880; // 5 MB (clients can have large fabric/photo data)

export async function GET(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter = session.role === 'Worker' ? { assignedWorker: session.name } : {};

    const [rawClients, tombstones] = await Promise.all([
      db.collection(COLLECTION).find(filter).sort({ lastActivity: -1 }).toArray(),
      db.collection('deleted_clients').find({}, { projection: { id: 1, _id: 0 } }).toArray(),
    ]);

    const formatted = rawClients.map((c) => ({
      ...c,
      id: (c.id as string | undefined) || c._id.toString(),
      _id: undefined,
    }));

    const deletedIds = tombstones.map((t) => t.id as string);

    return NextResponse.json({ clients: formatted, deletedIds });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const raw = await request.json();
    const body = deepStripMongoOperators(raw) as Record<string, unknown>;

    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 500) {
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
