import type { Metadata } from 'next';
import './globals.css';
import { StudioProvider } from '@/context/StudioContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'House of Oath Fashion | Client Management',
  description: 'Luxury tailoring studio management system for custom garments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.__APP_ERRORS = [];
          window.onerror = function(msg, src, line, col, err) {
            window.__APP_ERRORS.push({msg:msg, src:src, line:line, col:col, stack: err ? err.stack : 'no stack'});
            var d = document.getElementById('__error_overlay');
            if (!d) {
              d = document.createElement('div');
              d.id = '__error_overlay';
              d.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:99999;padding:24px;overflow:auto;font-family:monospace;font-size:13px;color:#333;';
              d.innerHTML = '<h2 style="color:red;margin-bottom:12px;">Debug: JS Error Caught</h2>';
              document.body ? document.body.appendChild(d) : document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(d); });
            }
            d.innerHTML += '<div style="background:#fee;padding:12px;margin-bottom:8px;border-radius:8px;border:1px solid #fcc;word-break:break-all;">'
              + '<b>Error:</b> ' + msg + '<br>'
              + '<b>Source:</b> ' + src + '<br>'
              + '<b>Line:</b> ' + line + ':' + col + '<br>'
              + '<b>Stack:</b> ' + (err ? err.stack : 'N/A')
              + '</div>';
            return true;
          };
          window.addEventListener('unhandledrejection', function(e) {
            var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
            var stack = e.reason ? (e.reason.stack || '') : '';
            window.__APP_ERRORS.push({msg: msg, stack: stack});
            var d = document.getElementById('__error_overlay');
            if (!d) {
              d = document.createElement('div');
              d.id = '__error_overlay';
              d.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:99999;padding:24px;overflow:auto;font-family:monospace;font-size:13px;color:#333;';
              d.innerHTML = '<h2 style="color:red;margin-bottom:12px;">Debug: JS Error Caught</h2>';
              document.body ? document.body.appendChild(d) : document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(d); });
            }
            d.innerHTML += '<div style="background:#fef;padding:12px;margin-bottom:8px;border-radius:8px;border:1px solid #fcf;word-break:break-all;">'
              + '<b>Unhandled Rejection:</b> ' + msg + '<br>'
              + '<b>Stack:</b> ' + stack
              + '</div>';
          });
        `}} />
      </head>
      <body className="bg-canvas text-charcoal min-h-screen font-display selection:bg-primary/30 selection:text-white">
        <ErrorBoundary>
          <StudioProvider>{children}</StudioProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
