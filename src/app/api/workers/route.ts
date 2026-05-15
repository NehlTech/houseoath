import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';

/** Strip keys beginning with '$' to prevent MongoDB operator injection */
function stripMongoOperators(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !k.startsWith('$'))
  );
}

// GET all workers
export async function GET(request: NextRequest) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const workers = await db.collection(COLLECTION).find({}).toArray();

    return NextResponse.json(workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
}

// POST create a new worker
export async function POST(request: NextRequest) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
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
    if (
      typeof body.role !== 'string' ||
      body.role.trim().length === 0 ||
      body.role.length > 500
    ) {
      return NextResponse.json({ error: 'Invalid or missing field: role' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const result = await db.collection(COLLECTION).insertOne(body);

    return NextResponse.json({ ...body, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create worker:', error);
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}
