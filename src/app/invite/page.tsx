'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InviteVerifier() {
 const searchParams = useSearchParams();
 const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
 const [message, setMessage] = useState('');

 useEffect(() => {
 const token = searchParams.get('token');
 if (!token) {
 setStatus('error');
 setMessage('This invite link is invalid — no token found.');
 return;
 }

 fetch('/api/auth/verify-invite', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ token }),
 })
 .then(res => res.json())
 .then(data => {
 if (data.ok) {
 setMessage(`Welcome, ${data.name}! Redirecting you to the studio…`);
 setStatus('success');
 setTimeout(() => { window.location.replace('/'); }, 2000);
 } else {
 setStatus('error');
 setMessage(data.error || 'This invite link is invalid or has already been used.');
 }
 })
 .catch(() => {
 setStatus('error');
 setMessage('Network error — please check your connection and try again.');
 });
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 return (
 <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
 <div className="bg-card rounded-2xl shadow-2xl p-10 max-w-md w-full text-center space-y-6">
 <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
 {status === 'verifying' && (
 <span className="material-symbols-outlined text-primary text-3xl" style={{ animation: 'spin 1.2s linear infinite' }}>
 progress_activity
 </span>
 )}
 {status === 'success' && (
 <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
 )}
 {status === 'error' && (
 <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
 )}
 </div>

 <div>
 <h1 className="text-2xl font-display font-bold tracking-wide text-charcoal mb-2">
 {status === 'verifying' && 'Verifying your invite…'}
 {status === 'success' && 'Access granted!'}
 {status === 'error' && 'Invite invalid'}
 </h1>
 <p className="text-sm text-gray">
 {message || (status === 'verifying' ? 'Please wait while we verify your link.' : '')}
 </p>
 </div>

 {status === 'error' && (
 <a
 href="/login"
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-[#E5C04A] transition-all"
 >
 Go to Login
 </a>
 )}

 <p className="text-xs text-muted">House of Oath Fashion Studio</p>
 </div>

 <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
 </div>
 );
}

export default function InvitePage() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen flex items-center justify-center bg-canvas">
 <span className="material-symbols-outlined text-primary text-4xl" style={{ animation: 'spin 1.2s linear infinite' }}>
 progress_activity
 </span>
 </div>
 }
 >
 <InviteVerifier />
 </Suspense>
 );
}
