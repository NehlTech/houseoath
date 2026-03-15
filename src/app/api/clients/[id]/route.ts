import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';

// PUT update a client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const body = await request.json();
    
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
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
