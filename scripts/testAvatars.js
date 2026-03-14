const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('kente-couture');
    const clients = await db.collection('clients').find({ avatarUrl: { $exists: true } }).limit(2).toArray();
    
    console.log(`Found ${clients.length} seeded clients.`);
    clients.forEach((c, i) => {
      console.log(`\nClient ${i+1}: ${c.name}`);
      console.log(`avatarUrl: ${c.avatarUrl}`);
      console.log(`clientPhoto: ${c.clientPhoto}`);
    });
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
