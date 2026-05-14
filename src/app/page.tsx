'use client';

import { useStudio } from '@/context/StudioContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ClientWorkspace from '@/components/ClientWorkspace';
import EmptyState from '@/components/EmptyState';
import NewClientModal from '@/components/NewClientModal';
import SettingsModal from '@/components/SettingsModal';

export default function Dashboard() {
  const { isAuthenticated, activeClient, setActiveClient } = useStudio();
  const router = useRouter();
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileShowWorkspace, setMobileShowWorkspace] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // When a client becomes active (including via addClient in the modal),
  // always show the workspace — handles both sidebar tap and new-client flow.
  useEffect(() => {
    if (activeClient) setMobileShowWorkspace(true);
  }, [activeClient?.id]);

  const handleSelectClient = (id: string) => {
    setActiveClient(id);
    setMobileShowWorkspace(true);
  };

  const handleBack = () => {
    setMobileShowWorkspace(false);
    setActiveClient(null);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative flex w-full overflow-hidden bg-canvas" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Sidebar — acts as a toggleable drawer on desktop */}
      <aside className={`relative flex h-full w-full flex-col overflow-hidden bg-card shadow-sm z-10 transition-all duration-300 ease-in-out
        ${mobileShowWorkspace ? 'hidden md:flex' : 'flex'}
        ${sidebarOpen ? 'md:w-[380px] md:min-w-[380px]' : 'md:w-0 md:min-w-0'}`}>
        <Sidebar
          onSelectClient={handleSelectClient}
          onNewClient={() => setShowNewClient(true)}
          onOpenSettings={() => setShowSettings(true)}
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
    </div>
  );
}
