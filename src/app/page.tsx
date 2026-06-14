'use client';

import { useStudio } from '@/context/StudioContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ClientWorkspace from '@/components/ClientWorkspace';
import EmptyState from '@/components/EmptyState';
import NewClientModal from '@/components/NewClientModal';
import SettingsModal from '@/components/SettingsModal';
import ProfileModal from '@/components/ProfileModal';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import OnboardingTour from '@/components/OnboardingTour';

export default function Dashboard() {
 const { isAuthenticated, sessionChecked, activeClient, setActiveClient, userProfile } = useStudio();
 const router = useRouter();
 const [showNewClient, setShowNewClient] = useState(false);
 const [showSettings, setShowSettings] = useState(false);
 const [showProfile, setShowProfile] = useState(false);
 const [mobileShowWorkspace, setMobileShowWorkspace] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [inactiveSecsLeft, setInactiveSecsLeft] = useState(0);

 const handleInactiveLogout = useCallback(async () => {
 await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
 router.push('/login?reason=inactive');
 }, [router]);

 useInactivityTimer(isAuthenticated, setInactiveSecsLeft, handleInactiveLogout);

 useEffect(() => {
 // Only redirect after the server has confirmed the session is invalid.
 // The middleware already blocks unauthenticated requests server-side,
 // so we wait for sessionChecked before acting on isAuthenticated=false.
 if (sessionChecked && !isAuthenticated) router.push('/login');
 }, [isAuthenticated, sessionChecked, router]);

 // When a client becomes active (including via addClient in the modal),
 // always show the workspace — handles both sidebar tap and new-client flow.
 useEffect(() => {
 if (activeClient) setMobileShowWorkspace(true);
 }, [activeClient?.id]);

 // Push a history entry when the workspace opens so the phone's back button
 // navigates back inside the app instead of leaving to the previous URL.
 useEffect(() => {
 if (mobileShowWorkspace) {
   history.pushState({ view: 'workspace' }, '');
 }
 }, [mobileShowWorkspace]);

 // Intercept the browser back gesture while in workspace view.
 useEffect(() => {
 const handlePop = (e: PopStateEvent) => {
   // Only intercept when we're showing the workspace on mobile.
   // On desktop both panels are visible side-by-side — do nothing.
   const isMobile = window.innerWidth < 768;
   if (isMobile && mobileShowWorkspace) {
     e.preventDefault?.();
     setMobileShowWorkspace(false);
     setActiveClient(null);
   }
 };
 window.addEventListener('popstate', handlePop);
 return () => window.removeEventListener('popstate', handlePop);
 }, [mobileShowWorkspace, setActiveClient]);

 const handleSelectClient = (id: string) => {
 setActiveClient(id);
 setMobileShowWorkspace(true);
 };

 const handleBack = () => {
 setMobileShowWorkspace(false);
 setActiveClient(null);
 };

 // Wait for the server session check before rendering the dashboard.
 // The StudioContext spinner covers this period, so the user never sees a blank.
 // Without this check, a stale localStorage profile could flash the admin UI
 // briefly before the session-expired redirect fires.
 if (!sessionChecked || !isAuthenticated) return null;

 return (
 <div className="relative flex w-full overflow-hidden bg-canvas" style={{ height: '100dvh' }}>
 {/* Sidebar — acts as a toggleable drawer on desktop */}
 <aside className={`relative flex h-full w-full flex-col overflow-hidden bg-card shadow-sm z-10 transition-all duration-300 ease-in-out
 ${mobileShowWorkspace ? 'hidden md:flex' : 'flex'}
 ${sidebarOpen ? 'md:w-[380px] md:min-w-[380px]' : 'md:w-0 md:min-w-0'}`}>
 <Sidebar
 onSelectClient={handleSelectClient}
 onNewClient={() => setShowNewClient(true)}
 onOpenSettings={() => setShowSettings(true)}
 onOpenProfile={() => setShowProfile(true)}
 onToggleSidebar={() => setSidebarOpen(false)}
 />
 </aside>

 {/* Main Content */}
 <main className={`flex-1 min-w-0 flex-col bg-canvas relative ${mobileShowWorkspace ? 'flex' : 'hidden md:flex'}`}>
 {/* Floating reopen button — visible on desktop when sidebar is collapsed */}
 {!sidebarOpen && (
 <button
 onClick={() => setSidebarOpen(true)}
 className="hidden md:flex absolute top-3 left-3 z-20 h-10 w-10 items-center justify-center rounded-full text-gray bg-card shadow hover:bg-canvas transition-colors"
 title="Open sidebar"
 >
 <span className="material-symbols-outlined text-2xl">menu</span>
 </button>
 )}
 {/* Decorative ambient glow */}
 <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
 {activeClient ? (
 <ClientWorkspace client={activeClient} onBack={handleBack} />
 ) : (
 <div className="flex flex-1 items-center justify-center h-full">
 <EmptyState />
 </div>
 )}
 </main>

 {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} />}
 {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
 {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

 <OnboardingTour userId={userProfile.id ?? userProfile.email} role={userProfile.role} />

 {/* Inactivity warning banner */}
 {inactiveSecsLeft > 0 && (
 <div className="fixed bottom-20 md:bottom-4 right-4 z-[9999] bg-orange-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in max-w-xs">
 <span className="material-symbols-outlined text-white text-xl shrink-0">timer</span>
 <div>
 <p className="font-bold text-sm leading-tight">
 Auto-logout in {Math.floor(inactiveSecsLeft / 60)}:{String(inactiveSecsLeft % 60).padStart(2, '0')}
 </p>
 <p className="text-xs opacity-80 mt-0.5">Move your mouse to stay logged in</p>
 </div>
 </div>
 )}
 </div>
 );
}
