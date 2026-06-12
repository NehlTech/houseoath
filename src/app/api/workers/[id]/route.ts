import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Filter, Document } from 'mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

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

function buildFilter(id: string): Filter<Document> {
  return {
    $or: [
      { id },
      ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
    ]
  };
}

// GET a single worker — password never returned
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
    const doc = await db.collection(COLLECTION).findOne(buildFilter(id), { projection: { password: 0 } });
    if (!doc) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch worker' }, { status: 500 });
  }
}

// PUT update a worker — hash new password if provided
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  try {
    const { id } = await params;
    const raw = await request.json();
    const cleaned = deepStripMongoOperators(raw) as Record<string, unknown>;
    const { id: _omitId, _id: _omitMongoId, ...updates } = cleaned;

    // Hash new password if provided
    if (typeof updates.password === 'string' && updates.password.length > 0) {
      if (!updates.password.startsWith('$2')) {
        updates.password = await bcrypt.hash(updates.password as string, 12);
      }
    } else {
      delete updates.password;
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION).updateOne(buildFilter(id), { $set: updates });
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    return NextResponse.json({ message: 'Worker updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 });
  }
}

// DELETE a worker — Admin only
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
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    return NextResponse.json({ message: 'Worker removed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to remove worker' }, { status: 500 });
  }
}
