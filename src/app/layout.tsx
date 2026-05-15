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
        {/* Explicit viewport tag — required for env(safe-area-inset-*) to work on Safari */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Preload the workspace header image so it is fetched at top priority before the app renders */}
        <link rel="preload" as="image" href="/header-bg.jpg" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" crossOrigin="anonymous" />
      </head>
      <body
        className="bg-canvas text-charcoal min-h-screen font-display selection:bg-primary/30 selection:text-white"
      >
        <ErrorBoundary>
          <StudioProvider>{children}</StudioProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
