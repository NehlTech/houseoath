'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
 error: Error & { digest?: string };
 reset: () => void;
}

// Global error boundary — replaces the root layout on catastrophic failure.
// Must include <html> and <body> since layout.tsx is bypassed.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
 useEffect(() => {
 console.error('Global error:', error);
 }, [error]);

 return (
 <html lang="en">
 <head>
 <meta charSet="UTF-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>Error — House of Oath</title>
 <style>{`
 *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 body {
 min-height: 100dvh;
 background: #f8f9fa;
 font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
 display: flex;
 align-items: center;
 justify-content: center;
 padding: 24px;
 text-align: center;
 }
 .card {
 background: #fff;
 border-radius: 20px;
 padding: 48px 36px;
 max-width: 400px;
 width: 100%;
 box-shadow: 0 4px 40px rgba(0,0,0,0.06);
 }
 .logo-badge {
 width: 48px; height: 48px;
 border-radius: 12px;
 overflow: hidden;
 border: 1.5px solid rgba(212,175,53,0.25);
 margin: 0 auto 28px;
 }
 .logo-badge img { width: 100%; height: 100%; object-fit: contain; }
 .icon {
 width: 64px; height: 64px;
 border-radius: 50%;
 background: rgba(220,53,69,0.08);
 display: flex;
 align-items: center;
 justify-content: center;
 margin: 0 auto 20px;
 font-size: 30px;
 }
 h1 { font-size: 20px; font-weight: 700; color: #212529; margin-bottom: 8px; }
 p { font-size: 14px; color: #495057; line-height: 1.65; margin-bottom: 28px; }
 .btn {
 display: inline-block;
 padding: 12px 28px;
 background: #d4af35;
 color: #1a1a1a;
 border: none;
 border-radius: 12px;
 font-size: 13px;
 font-weight: 700;
 letter-spacing: 0.05em;
 text-transform: uppercase;
 cursor: pointer;
 text-decoration: none;
 }
 .btn:hover { background: #e8c84a; }
 `}</style>
 </head>
 <body>
 <div className="card">
 <div className="logo-badge">
 <img src="/ho_logo.png" alt="House of Oath" />
 </div>
 <div className="icon">⚠️</div>
 <h1>Something went wrong</h1>
 <p>
 A critical error occurred. Please refresh the page or contact support if the problem persists.
 </p>
 <button className="btn" onClick={reset}>
 Reload app
 </button>
 </div>
 </body>
 </html>
 );
}
