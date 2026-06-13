'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
 error: Error & { digest?: string };
 reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
 useEffect(() => {
 console.error('Route error:', error);
 }, [error]);

 return (
 <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
 <div className="flex flex-col items-center gap-4 max-w-sm w-full">
 {/* Logo */}
 <div className="flex items-center justify-center size-14 rounded-2xl border border-primary/20 bg-card shadow-sm overflow-hidden mb-2">
 <img src="/ho_logo.png" alt="House of Oath" className="h-full w-full object-contain p-1.5" />
 </div>

 {/* Icon */}
 <div className="flex items-center justify-center size-16 rounded-full bg-danger/8">
 <span className="material-symbols-outlined text-[32px] text-danger">error</span>
 </div>

 <div className="space-y-2">
 <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
 Something went wrong
 </h1>
 <p className="text-sm text-gray leading-relaxed">
 An unexpected error occurred. Your data is safe — please try again.
 </p>
 </div>

 <div className="flex gap-3 mt-4 w-full justify-center">
 <button
 onClick={reset}
 className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-charcoal font-bold text-sm tracking-wide rounded-xl shadow-md hover:bg-[#E5C04A] transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">refresh</span>
 Try again
 </button>
 <Link
 href="/"
 className="inline-flex items-center gap-2 px-6 py-3 bg-canvas text-gray font-bold text-sm tracking-wide rounded-xl shadow-sm hover:bg-border/60 transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">home</span>
 Home
 </Link>
 </div>
 </div>
 </div>
 );
}
