import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';

// PUT update a worker
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Remove id and _id from updates to avoid conflicts
    const { id: _id, _id: __id, ...updates } = body;
    
    const filter: any = { 
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
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Worker updated successfully' });
  } catch (error) {
    console.error('Failed to update worker:', error);
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 });
  }
}

// DELETE a worker
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const filter: any = { 
      $or: [
        { id: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])
      ] 
    };
    
    const result = await db.collection(COLLECTION).deleteOne(filter);
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Worker removed successfully' });
  } catch (error) {
    console.error('Failed to remove worker:', error);
    return NextResponse.json({ error: 'Failed to remove worker' }, { status: 500 });
  }
}
