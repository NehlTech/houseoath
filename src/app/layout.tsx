import type { Metadata } from 'next';
import './globals.css';
import { StudioProvider } from '@/context/StudioContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
 title: 'House of Oath Fashion | Client Management',
 description: 'Luxury tailoring studio management system for custom garments',
 manifest: '/manifest.json',
 robots: { index: false, follow: false },
 appleWebApp: {
 capable: true,
 title: 'HoOath Studio',
 statusBarStyle: 'default',
 },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
 <html lang="en" suppressHydrationWarning>
 <head>
 {/* Explicit viewport tag — required for env(safe-area-inset-*) to work on Safari */}
 <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
 <meta name="theme-color" content="#d4af35" />
 <meta name="apple-mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-status-bar-style" content="default" />
 <link rel="apple-touch-icon" href="/ho_logo.png" />
 {/* Preload the workspace header image so it is fetched at top priority before the app renders */}
 <link rel="preload" as="image" href="/workerspaceheader-bg.jpg" />
 {/* Connect early — the font CSS + the actual font files come from two different origins */}
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" crossOrigin="anonymous" />
 {/* display=block (not swap) — icon glyphs are ligature text under the hood ("lock_open" etc.),
 so swap would render that literal text until the font loads. Block shows nothing instead. */}
 <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" crossOrigin="anonymous" />
 </head>
 <body
 className="bg-canvas text-charcoal min-h-screen font-display selection:bg-primary/30 selection:text-white"
 >
 <ErrorBoundary>
 <StudioProvider>{children}</StudioProvider>
 </ErrorBoundary>
 <ServiceWorkerRegistration />
 </body>
 </html>
 );
}
