import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'clients';

// GET all clients
export async function GET() {
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

// POST create client
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const body = await request.json();
    
    const result = await db.collection(COLLECTION).insertOne(body);
    
    return NextResponse.json({ 
      ...body, 
      _id: result.insertedId.toString() 
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
