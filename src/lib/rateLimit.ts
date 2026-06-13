interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function cleanup() {
 const now = Date.now();
 for (const [key, entry] of store) {
 if (entry.resetAt < now) store.delete(key);
 }
}

export function checkRateLimit(
 key: string,
 limit: number,
 windowMs: number
): { ok: boolean; retryAfter: number } {
 cleanup();
 const now = Date.now();
 const entry = store.get(key);

 if (!entry || entry.resetAt < now) {
 store.set(key, { count: 1, resetAt: now + windowMs });
 return { ok: true, retryAfter: 0 };
 }
 if (entry.count >= limit) {
 return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
 }
 entry.count++;
 return { ok: true, retryAfter: 0 };
}
