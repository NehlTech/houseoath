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

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

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
    <div className="relative flex h-screen w-full overflow-hidden bg-canvas">
      {/* Sidebar */}
      <aside className={`relative flex h-full w-full md:w-[380px] md:min-w-[380px] flex-col  bg-card shadow-sm z-10 ${mobileShowWorkspace ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar onSelectClient={handleSelectClient} onNewClient={() => setShowNewClient(true)} onOpenSettings={() => setShowSettings(true)} />
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 flex-col bg-canvas relative ${mobileShowWorkspace ? 'flex' : 'hidden md:flex'}`}>
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
