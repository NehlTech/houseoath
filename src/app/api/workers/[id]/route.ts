import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Filter, Document } from 'mongodb';
import { requireApiAuth } from '@/lib/apiAuth';
import { deepStripMongoOperators } from '@/lib/mongoSanitize';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';
const MAX_BODY_BYTES = 1_048_576;

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

  const { id } = await params;

  if (session.role !== 'Admin' && session.userId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const doc = await db.collection(COLLECTION).findOne(buildFilter(id), { projection: { password: 0 } });
    if (!doc) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch worker' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const raw = await request.json();
    const cleaned = deepStripMongoOperators(raw) as Record<string, unknown>;
    const { id: _omitId, _id: _omitMongoId, ...updates } = cleaned;

    if (typeof updates.password === 'string' && updates.password.length > 0) {
      if (updates.password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      updates.password = await bcrypt.hash(updates.password as string, 12);
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

    // Get worker name + id before deleting for cascade + session revocation
    const worker = await db.collection(COLLECTION).findOne(buildFilter(id), { projection: { name: 1, id: 1 } });
    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    // Cascade: unassign this worker from Active clients only.
    // Completed and Archived clients keep the assignment as a historical record
    // of who made the garment.
    await db.collection('clients').updateMany(
      {
        status: { $nin: ['Completed', 'Archived'] },
        $or: [{ assignedWorkerId: id }, ...(worker.name ? [{ assignedWorker: worker.name }] : [])],
      },
      { $set: { assignedWorker: '', assignedWorkerId: '' } }
    );

    await db.collection(COLLECTION).deleteOne(buildFilter(id));

    // Revoke active session so the deleted worker can't keep using the app.
    // The session userId matches worker.id (UUID) if set, otherwise the _id string.
    const sessionUserId = (worker.id as string | undefined) ?? worker._id.toString();
    await db.collection('revoked_sessions').insertOne({ userId: sessionUserId, revokedAt: new Date() });
    // TTL index — auto-removes entries after 30 days (max session lifetime). No-op if already exists.
    db.collection('revoked_sessions')
      .createIndex({ revokedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })
      .catch(() => {});

    return NextResponse.json({ message: 'Worker removed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to remove worker' }, { status: 500 });
  }
}
