import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';

// One-time migration: backfill assignedWorkerId on client records that only have
// assignedWorker (name). Safe to run multiple times — skips already-migrated records.
export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth(request);
  if (error) return error;

  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const workers = await db.collection('workers').find({}, { projection: { id: 1, _id: 1, name: 1 } }).toArray();
    const nameToId = new Map<string, string>();
    for (const w of workers) {
      const wid = (w.id as string | undefined) || w._id.toString();
      if (w.name) nameToId.set(w.name as string, wid);
    }

    // Only touch records that have assignedWorker but no assignedWorkerId
    const unmigratedClients = await db.collection('clients')
      .find({ assignedWorker: { $ne: '' }, assignedWorkerId: { $exists: false } })
      .toArray();

    let updated = 0;
    for (const c of unmigratedClients) {
      const wid = nameToId.get(c.assignedWorker as string);
      if (wid) {
        await db.collection('clients').updateOne(
          { _id: c._id },
          { $set: { assignedWorkerId: wid } }
        );
        updated++;
      }
    }

    return NextResponse.json({
      message: `Migration complete. ${updated} of ${unmigratedClients.length} records updated.`,
      updated,
      skipped: unmigratedClients.length - updated,
    });
  } catch {
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
