import type { SessionOptions } from 'iron-session';

export interface SessionData {
 isLoggedIn: boolean;
 userId: string;
 email: string;
 name: string;
 role: 'Admin' | 'Worker';
}

export const sessionOptions: SessionOptions = {
 password: process.env.SESSION_SECRET!,
 cookieName: 'hoath-session',
 cookieOptions: {
 secure: process.env.NODE_ENV === 'production',
 httpOnly: true,
 sameSite: 'strict',
 maxAge: 60 * 60 * 24 * 7, // 7 days
 },
};
