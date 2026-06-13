import clientPromise from '@/lib/mongodb';

const DB_NAME = 'kente-couture';
const COLLECTION = 'rate_limits';

// One-time index setup — idempotent, no-op if index already exists.
let indexEnsured = false;
async function ensureIndex() {
  if (indexEnsured) return;
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400, background: true },
    );
    indexEnsured = true;
  } catch {
    // Non-fatal — rate limiting still works without the TTL cleanup index
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    await ensureIndex();
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const count = await db.collection(COLLECTION).countDocuments({
      key,
      createdAt: { $gt: windowStart },
    });

    if (count >= limit) {
      // Find the oldest entry in the window to tell the caller how long to wait
      const oldest = await db.collection(COLLECTION).findOne(
        { key, createdAt: { $gt: windowStart } },
        { sort: { createdAt: 1 } },
      );
      const resetAt = oldest
        ? (oldest.createdAt as Date).getTime() + windowMs
        : now.getTime() + windowMs;
      const retryAfter = Math.max(Math.ceil((resetAt - now.getTime()) / 1000), 1);
      return { ok: false, retryAfter };
    }

    await db.collection(COLLECTION).insertOne({ key, createdAt: now });
    return { ok: true, retryAfter: 0 };
  } catch {
    // Fail open on transient DB errors — never block legitimate users
    return { ok: true, retryAfter: 0 };
  }
}
