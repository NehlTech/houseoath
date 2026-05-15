import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Filter, Document } from 'mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';

/** Strip keys beginning with '$' to prevent MongoDB operator injection */
function stripMongoOperators(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !k.startsWith('$'))
  );
}

// GET a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter: Filter<Document> = {
      $or: [
        { id: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const doc = await db.collection(COLLECTION).findOne(filter);
    if (!doc) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ ...doc, id: doc.id || doc._id.toString(), _id: undefined });
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

// PUT update a client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const raw = await request.json();
    const cleaned = stripMongoOperators(raw);

    // Remove id and _id from updates to avoid conflicts
    const { id: _omitId, _id: _omitMongoId, ...updates } = cleaned;

    const filter: Filter<Document> = {
      $or: [
        { id: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const result = await db.collection(COLLECTION).updateOne(
      filter,
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

// DELETE a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter: Filter<Document> = {
      $or: [
        { id: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ]
    };

    const result = await db.collection(COLLECTION).deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
