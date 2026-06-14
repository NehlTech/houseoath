import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Filter, Document } from 'mongodb';
import { requireApiAuth } from '@/lib/apiAuth';
import { deepStripMongoOperators } from '@/lib/mongoSanitize';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';
const MAX_BODY_BYTES = 5_242_880;

function buildFilter(id: string): Filter<Document> {
  return {
    $or: [
      { id },
      ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
    ]
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const doc = await db.collection(COLLECTION).findOne(buildFilter(id));
    if (!doc) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Workers can only read clients assigned to them — check ID first, fall back to name for legacy records
    if (session.role !== 'Admin') {
      const matchesById = doc.assignedWorkerId === session.userId;
      const matchesByName = !doc.assignedWorkerId && doc.assignedWorker === session.name;
      if (!matchesById && !matchesByName) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ ...doc, id: doc.id || doc._id.toString(), _id: undefined });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch the existing doc first to verify worker assignment
    const existing = await db.collection(COLLECTION).findOne(buildFilter(id));
    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Workers can only update clients assigned to them
    if (session.role !== 'Admin') {
      const matchesById = existing.assignedWorkerId === session.userId;
      const matchesByName = !existing.assignedWorkerId && existing.assignedWorker === session.name;
      if (!matchesById && !matchesByName) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Workers cannot change assignment fields
    const raw = await request.json();
    const cleaned = deepStripMongoOperators(raw) as Record<string, unknown>;
    const { id: _omitId, _id: _omitMongoId, ...updates } = cleaned;

    if (session.role !== 'Admin') {
      delete updates.assignedWorker;
      delete updates.assignedWorkerId;
    }

    const result = await db.collection(COLLECTION).updateOne(buildFilter(id), { $set: updates });
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

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

    const result = await db.collection(COLLECTION).deleteOne(buildFilter(id));
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Record a tombstone so other devices don't re-sync this client from localStorage
    await db.collection('deleted_clients').updateOne(
      { id },
      { $setOnInsert: { id, deletedAt: new Date() } },
      { upsert: true },
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
