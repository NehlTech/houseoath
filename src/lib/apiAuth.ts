import { NextRequest, NextResponse } from 'next/server';

export function requireApiAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET;
  if (!secret) return null; // not configured, skip in dev
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // auth passed
}
