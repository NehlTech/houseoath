const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('kente-couture');
    const clients = await db.collection('clients').find({ avatarUrl: { $exists: true } }).toArray();
    
    let count = 0;
    for (const c of clients) {
      if (c.avatarUrl && c.clientPhoto !== c.avatarUrl) {
        await db.collection('clients').updateOne(
          { _id: c._id },
          { $set: { clientPhoto: c.avatarUrl } }
        );
        count++;
      }
    }
    console.log(`Explicitly copied avatarUrl to clientPhoto for ${count} clients.`);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
