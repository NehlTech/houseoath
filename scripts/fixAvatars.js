const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db('kente-couture');
    const collection = database.collection('clients');

    console.log('Finding clients with avatarUrl but no clientPhoto...');
    const result = await collection.updateMany(
      { avatarUrl: { $exists: true }, clientPhoto: { $exists: false } },
      [{ $set: { clientPhoto: "$avatarUrl" } }]
    );
    
    console.log(`Successfully updated ${result.modifiedCount} clients to display their profile photos.`);

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
