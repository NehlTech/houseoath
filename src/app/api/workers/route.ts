import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const DB_NAME = 'kente-couture';
const COLLECTION = 'workers';

// GET all workers
export async function GET() {
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
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const result = await db.collection(COLLECTION).insertOne(body);
    
    return NextResponse.json({ ...body, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create worker:', error);
    return NextResponse.json({ error: 'Failed to create worker' }, { status: 500 });
  }
}
