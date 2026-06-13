const REQUIRED: string[] = [
  'SESSION_SECRET',
  'MONGODB_URI',
  'ADMIN_EMAIL',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
];

let validated = false;

export function validateEnv() {
  if (validated) return;
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    const list = missing.join(', ');
    throw new Error(`Missing required environment variables: ${list}. Check your .env.local file.`);
  }
  validated = true;
}
