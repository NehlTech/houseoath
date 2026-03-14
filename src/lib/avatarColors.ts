// Telegram-style deterministic avatar colors from client name
// These are the same vibrant colors Telegram uses for its chat avatars

const AVATAR_COLORS = [
  '#FF885E', // warm orange
  '#FF516A', // coral pink
  '#FF6DA0', // hot pink
  '#CB86DB', // soft purple
  '#868CFF', // periwinkle
  '#5BB6D9', // sky blue
  '#63D2A3', // mint green
  '#85C95E', // lime green
];

/**
 * Generates a deterministic color index from a client name.
 * Same name always produces the same color.
 */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

export function getAvatarGradient(name: string): string {
  const idx = hashName(name) % AVATAR_COLORS.length;
  const nextIdx = (idx + 1) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[idx]}, ${AVATAR_COLORS[nextIdx]})`;
}
