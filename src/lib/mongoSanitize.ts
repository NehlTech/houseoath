export function deepStripMongoOperators(obj: unknown): unknown {
 if (Array.isArray(obj)) return obj.map(deepStripMongoOperators);
 if (obj !== null && typeof obj === 'object') {
 return Object.fromEntries(
 Object.entries(obj as Record<string, unknown>)
 .filter(([k]) => !k.startsWith('$') && !k.includes('.'))
 .map(([k, v]) => [k, deepStripMongoOperators(v)])
 );
 }
 return obj;
}
