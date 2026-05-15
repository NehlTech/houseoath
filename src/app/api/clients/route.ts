import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';

/** Strip keys beginning with '$' to prevent MongoDB operator injection */
function stripMongoOperators(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !k.startsWith('$'))
  );
}

// GET all clients
export async function GET(request: NextRequest) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const clients = await db.collection(COLLECTION).find({}).sort({ lastActivity: -1 }).toArray();

    // Convert _id to string id for frontend compatibility
    const formatted = clients.map((c: any) => ({
      ...c,
      id: c.id || c._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST create client — idempotent: upsert by client id so retries never
// create duplicates
export async function POST(request: NextRequest) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const raw = await request.json();
    const body = stripMongoOperators(raw);

    // Validate required fields
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
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
