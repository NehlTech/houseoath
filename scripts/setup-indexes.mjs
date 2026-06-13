/**
 * Run once to set up MongoDB indexes:
 *   node scripts/setup-indexes.mjs
 *
 * Requires MONGODB_URI in .env.local (loaded via dotenv or set in shell).
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (dotenv not available as a dep by default)
const envPath = resolve(__dirname, '../.env.local');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on shell env
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Export it or add it to .env.local');
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('kente-couture');

  // ── password_resets ────────────────────────────────────────────────────
  const resets = db.collection('password_resets');

  // TTL index: MongoDB automatically removes expired reset docs
  await resets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_expiresAt' });
  console.log('✓ password_resets: TTL index on expiresAt');

  // Token lookup index (used on every reset-password request)
  await resets.createIndex({ token: 1 }, { name: 'idx_token' });
  console.log('✓ password_resets: index on token');

  // Email unique index (one active reset per email — enforced at DB level)
  await resets.createIndex({ email: 1 }, { unique: true, name: 'uniq_email' });
  console.log('✓ password_resets: unique index on email');

  // ── workers ────────────────────────────────────────────────────────────
  const workers = db.collection('workers');

  // Unique email index — prevents duplicate worker accounts
  await workers.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'uniq_email' });
  console.log('✓ workers: unique index on email');

  // ── clients ────────────────────────────────────────────────────────────
  const clients = db.collection('clients');

  // Sort by lastActivity (default list view)
  await clients.createIndex({ lastActivity: -1 }, { name: 'idx_lastActivity' });
  console.log('✓ clients: index on lastActivity');

  // Worker filter (Workers see only their assigned clients)
  await clients.createIndex({ assignedWorker: 1 }, { name: 'idx_assignedWorker' });
  console.log('✓ clients: index on assignedWorker');

  console.log('\nAll indexes set up successfully.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => client.close());
