const { MongoClient, ObjectId } = require('mongodb');

// Ensure we load environment variables if run outside Next.js
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const client = new MongoClient(uri);

const firstNames = ['Amina', 'Efua', 'Nana', 'Abena', 'Akua', 'Yaa', 'Afia', 'Ama', 'Chiamaka', 'Ngozi', 'Zainab', 'Fatima', 'Aisha', 'Zuri', 'Nala', 'Sade', 'Serwaa', 'Kesi', 'Adwoa', 'Mansa', 'Ohemaa', 'Dede', 'Esi', 'Naa', 'Baaba'];
const lastNames = ['Mensah', 'Osei', 'Appiah', 'Owusu', 'Boateng', 'Asante', 'Agyemang', 'Boakye', 'Danquah', 'Ofori', 'Amoah', 'Opoku', 'Acheampong', 'Frimpong', 'Okafor', 'Adeyemi', 'Okeke', 'Abubakar', 'Diallo', 'Traore', 'Keita', 'Diop', 'Sow', 'Fall', 'Ndiaye'];

const eventNames = ['Wedding Gown', 'Bridesmaid Dress', 'Evening Gown', 'Engagement Dress', 'Gala Gown', 'Prom Dress', 'Pageant Gown', 'Dinner Reception Dress', 'Mother of the Bride Dress', 'Red Carpet Dress'];
const stagesNames = ['Consultation', 'Fabric Sourcing', 'First Fitting', 'Second Fitting', 'Final Adjustments', 'Ready for Pickup', 'Completed'];

// Helper to get diverse unsplash avatars
const getAvatar = (seed) => `https://i.pravatar.cc/150?u=${seed}`;
// Helper to get fashion illustrations
const getIllustration = (idx) => `https://images.unsplash.com/photo-1558769132-cb1fac0840c2?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3`;
const getIllustration2 = (idx) => `https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&q=80&w=800`;
// Helper to get fabric images
const getFabric = (idx) => `https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=800`;
const getFabric2 = (idx) => `https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800`;
// Reference images
const getReference = (idx) => `https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800`;
const getBodyForm = (idx) => `https://images.unsplash.com/photo-1581287053822-fd7bf4f4bfec?auto=format&fit=crop&q=80&w=800`;

const generateMeasurements = () => ({
  chest: Math.floor(Math.random() * 10) + 36,
  waist: Math.floor(Math.random() * 10) + 30,
  hips: Math.floor(Math.random() * 10) + 38,
  shoulder: Math.floor(Math.random() * 4) + 16,
  sleeve: Math.floor(Math.random() * 5) + 24,
  length: Math.floor(Math.random() * 20) + 40,
  neck: Math.floor(Math.random() * 3) + 14,
  inseam: Math.floor(Math.random() * 5) + 28,
  thigh: Math.floor(Math.random() * 5) + 22,
  calf: Math.floor(Math.random() * 4) + 14,
});

async function run() {
  try {
    await client.connect();
    const database = client.db('kente-couture');
    const collection = database.collection('clients');

    // Make sure we have a clean slate to avoid clutter (Optional, but good for testing)
    // await collection.deleteMany({});
    
    console.log('Generating 20 rich client profiles...');
    const newClients = [];

    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${firstName} ${lastName}`;
      
      const totalCost = Math.floor(Math.random() * 4000) * 10 + 10000; // 10,000 to 50,000
      const paidAmount1 = totalCost * 0.5; // 50% deposit
      const paidAmount2 = [0, totalCost * 0.25, totalCost * 0.5][Math.floor(Math.random() * 3)]; // 0%, 25%, or 50% second payment

      const payments = [
        {
          id: `pay-${new ObjectId().toString()}`,
          amount: paidAmount1,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          method: ['Bank Transfer', 'Momo', 'Cash'][Math.floor(Math.random() * 3)],
          receiptNumber: `HOF-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`,
        }
      ];

      if (paidAmount2 > 0) {
        payments.push({
          id: `pay-${new ObjectId().toString()}`,
          amount: paidAmount2,
          date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
          method: ['Bank Transfer', 'Momo', 'Cash'][Math.floor(Math.random() * 3)],
          receiptNumber: `HOF-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`,
        });
      }

      const clientObj = {
        name: fullName,
        phone: `+233 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        progress: Math.floor(Math.random() * 100),
        stage: stagesNames[Math.floor(Math.random() * stagesNames.length)],
        eventName: eventNames[Math.floor(Math.random() * eventNames.length)],
        eventDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avatarUrl: getAvatar(fullName),
        totalCost: totalCost,
        fabricVendor: ['VLISCO', 'Woodin', 'GTP', 'Printex', 'Imported Silk', 'Italian Wool'][Math.floor(Math.random() * 6)],
        measurements: generateMeasurements(),
        
        illustrations: [
          {
            id: new ObjectId().toString(),
            image: getIllustration(i),
            title: 'Initial Concept',
            status: 'Archived',
            notes: 'First draft concept focusing on the silhouette.',
            date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: new ObjectId().toString(),
            image: getIllustration2(i),
            title: 'Final Design',
            status: 'Approved',
            notes: 'Approved design featuring detailed lacework and specific fabric placement.',
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ],

        fabrics: [
          {
            id: new ObjectId().toString(),
            image: getFabric(i),
            type: 'Main Fabric',
            name: 'Premium Silk Lace',
            vendor: 'VLISCO',
            yards: Math.floor(Math.random() * 4) + 4,
            status: 'Sourced',
            dateSourced: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: new ObjectId().toString(),
            image: getFabric2(i + 1),
            type: 'Lining',
            name: 'Cotton Silk Blend',
            vendor: 'Local Market',
            yards: Math.floor(Math.random() * 2) + 2,
            status: 'Purchased',
            dateSourced: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ],

        fittings: [
          {
            id: new ObjectId().toString(),
            title: 'First Baste Fitting',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '14:00',
            status: 'Completed',
            notes: 'Adjusted waistline and confirmed neckline depth. Bodice fits well.',
            completed: true,
          },
          {
            id: new ObjectId().toString(),
            title: 'Second Fitting',
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '11:00',
            status: 'Scheduled',
            notes: 'Testing with lining and finalized hem length.',
            completed: false,
          }
        ],
        
        payments: payments,

        clientPhotos: {
          styleInspo: [
             { id: new ObjectId().toString(), url: getReference(i), description: 'Client provided reference for back detailing', uploadedAt: new Date().toISOString() }
          ],
          fabricDraping: [
             { id: new ObjectId().toString(), url: getFabric(i), description: 'Draping test on mannequin', uploadedAt: new Date().toISOString() }
          ],
          bodyForm: [
             { id: new ObjectId().toString(), url: getBodyForm(i), description: 'Custom body form padded to measurements', uploadedAt: new Date().toISOString() }
          ],
          archive: []
        },

        timeline: [
          {
            id: new ObjectId().toString(),
            title: 'Consultation Completed',
            description: 'Client measurements taken, fabrics discussed, and 50% deposit paid.',
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'milestone'
          },
          {
            id: new ObjectId().toString(),
            title: 'Design Approved',
            description: 'Client approved the second illustration rendering.',
            date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'update'
          },
          {
            id: new ObjectId().toString(),
            title: 'First Fitting Completed',
            description: 'Major structural adjustments noted. Moving to final assembly.',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'milestone'
          }
        ],

        notes: 'VIP Client. Requires specific attention to the train length. Prefers communication via WhatsApp.',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if ((paidAmount1 + paidAmount2) >= totalCost) {
          clientObj.timeline.push({
            id: new ObjectId().toString(),
            title: 'Payment Completed',
            description: 'Client has paid the full balance in full.',
            date: new Date().toISOString(),
            type: 'payment',
          });
      }

      newClients.push(clientObj);
    }

    const result = await collection.insertMany(newClients);
    console.log(`Successfully seeded ${result.insertedCount} new clients into the database.`);

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
