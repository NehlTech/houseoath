'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-canvas overflow-y-auto overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="layout-container flex h-full grow flex-col relative z-10">
        <header className="flex items-center justify-between whitespace-nowrap px-6 md:px-20 py-5 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3 text-charcoal">
            <div className="flex items-center justify-center size-9 rounded-full border-2 border-charcoal/80 overflow-hidden bg-white">
              <img src="/hoo_logo.png" alt="House of Oath Logo" className="h-full w-full object-contain p-0.5" />
            </div>
            <h2 className="text-charcoal text-xl font-display font-bold leading-tight tracking-widest ml-1">House of Oath Fashion</h2>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-[480px] bg-card rounded-2xl shadow-2xl border-none p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />

            {success ? (
              <div className="text-center relative z-10">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-success/10 mb-6">
                  <span className="material-symbols-outlined text-success text-3xl">check_circle</span>
                </div>
                <h1 className="text-charcoal text-2xl font-display font-bold tracking-wide mb-3">Password Updated</h1>
                <p className="text-gray text-sm leading-relaxed mb-8">Your password has been reset successfully. Redirecting you to sign in...</p>
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold tracking-widest text-sm h-12 rounded-xl transition-all hover:bg-[#E5C04A]"
                >
                  Sign In Now
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-10 text-center relative z-10">
                  <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl">key</span>
                  </div>
                  <h1 className="text-charcoal text-3xl font-display font-bold tracking-wide mb-2">New Password</h1>
                  <p className="text-gray text-sm font-medium">Choose a strong password for your account</p>
                </div>

                {error && (
                  <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
                  <div className="flex flex-col gap-2">
                    <label className="text-gray text-xs font-bold tracking-wider">New Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xl">lock</span>
                      <input
                        className="flex w-full rounded-xl text-charcoal focus:outline-0 focus:ring-1 focus:ring-primary shadow-sm border-none bg-canvas h-14 placeholder:text-muted pl-12 pr-12 text-base font-medium transition-all"
                        placeholder="Min. 8 characters"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray text-xs font-bold tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xl">lock_clock</span>
                      <input
                        className="flex w-full rounded-xl text-charcoal focus:outline-0 focus:ring-1 focus:ring-primary shadow-sm border-none bg-canvas h-14 placeholder:text-muted pl-12 pr-4 text-base font-medium transition-all"
                        placeholder="Repeat your password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full bg-primary text-white font-bold tracking-widest text-sm h-14 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-[#E5C04A] flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
                  >
                    {loading ? 'Updating...' : 'Set New Password'}
                    {!loading && <span className="material-symbols-outlined">lock_open</span>}
                  </button>

                  <Link
                    href="/forgot-password"
                    className="flex items-center justify-center gap-1 text-gray text-sm font-medium hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Request a new link
                  </Link>
                </form>
              </>
            )}
          </div>
        </main>

        <footer className="px-6 py-8 flex flex-col items-center gap-4 text-muted relative z-10">
          <div className="flex gap-6 text-xs font-bold tracking-wider">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="#">Contact Support</a>
          </div>
          <p className="text-[10px] tracking-widest font-bold text-muted">© 2026 House of Oath Fashion. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
