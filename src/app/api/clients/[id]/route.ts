import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Filter, Document } from 'mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

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

// GET a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter: Filter<Document> = {
      $or: [
        { id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const doc = await db.collection(COLLECTION).findOne(filter);
    if (!doc) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ ...doc, id: doc.id || doc._id.toString(), _id: undefined });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

// PUT update a client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const raw = await request.json();
    const cleaned = deepStripMongoOperators(raw) as Record<string, unknown>;
    const { id: _omitId, _id: _omitMongoId, ...updates } = cleaned;

    const filter: Filter<Document> = {
      $or: [
        { id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const result = await db.collection(COLLECTION).updateOne(filter, { $set: updates });
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

// DELETE a client — Admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter: Filter<Document> = {
      $or: [
        { id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const result = await db.collection(COLLECTION).deleteOne(filter);
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
