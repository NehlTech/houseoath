'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudio } from '@/context/StudioContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useStudio();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      login(email, password);
      router.push('/');
    }, 800);
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-canvas overflow-x-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="layout-container flex h-full grow flex-col relative z-10">
        <header className="flex items-center justify-between whitespace-nowrap  px-6 md:px-20 py-5 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3 text-charcoal">
            <div className="flex items-center justify-center size-9 rounded-full border-2 border-charcoal/80">
              <div className="flex items-center text-[15px] italic font-light tracking-tighter -mr-0.5" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: '#1a0f08' }}>
                <span>h</span>
                <span className="-ml-[3px]">o</span>
              </div>
            </div>
            <h2 className="text-charcoal text-xl font-display font-bold leading-tight tracking-widest uppercase ml-1">House of Oath Fashion</h2>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-[480px] bg-card rounded-2xl shadow-2xl shadow-sm border-none p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />

            <div className="mb-10 text-center relative z-10">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">lock_open</span>
              </div>
              <h1 className="text-charcoal text-3xl font-display font-bold tracking-wide mb-2">Welcome Back</h1>
              <p className="text-gray text-sm font-medium">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
              <div className="flex flex-col gap-2">
                <label className="text-gray text-xs font-bold uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xl">mail</span>
                  <input
                    id="login-email"
                    className="flex w-full rounded-xl text-charcoal focus:outline-0 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm border-none bg-canvas h-14 placeholder:text-muted pl-12 pr-4 text-base font-medium transition-all"
                    placeholder="your@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray text-xs font-bold uppercase tracking-wider">Password</label>
                  <a className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/70 transition-colors" href="#">Forgot password?</a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xl">lock</span>
                  <input
                    id="login-password"
                    className="flex w-full rounded-xl text-charcoal focus:outline-0 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm border-none bg-canvas h-14 placeholder:text-muted pl-12 pr-12 text-base font-medium transition-all"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input className="rounded border-none text-primary focus:ring-primary bg-transparent" id="remember" type="checkbox" />
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray" htmlFor="remember">Keep me logged in</label>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold tracking-widest uppercase text-sm h-14 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-[#E5C04A] flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
            </form>

            <div className="mt-8 text-center text-xs font-medium text-muted relative z-10 space-y-1">
              <p>Admin: admin@houseofoath.com / admin123</p>
              <p>Worker: worker@houseofoath.com / 123</p>
            </div>
          </div>
        </main>

        <footer className="px-6 py-8 flex flex-col items-center gap-4 text-muted relative z-10">
          <div className="flex gap-6 text-xs font-bold uppercase tracking-wider">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="#">Contact Support</a>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">© 2026 House of Oath Fashion. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
