'use client';

import { useState, useRef, useEffect } from 'react';
import { Client } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';
import OverviewTab from './tabs/OverviewTab';
import MeasurementsTab from './tabs/MeasurementsTab';
import FabricTab from './tabs/FabricTab';
import IllustrationTab from './tabs/IllustrationTab';
import ClientPhotosTab from './tabs/ClientPhotosTab';
import FittingsTab from './tabs/FittingsTab';
import PaymentsTab from './tabs/PaymentsTab';
import TimelineTab from './tabs/TimelineTab';
import ProductionNotesTab from './tabs/ProductionNotesTab';

interface ClientWorkspaceProps {
  client: Client;
  onBack: () => void;
}

const tabs = ['Overview', 'Progress', 'Measurements', 'Fabric', 'Illustration', 'Client Photos', 'Fittings', 'Payments', 'Timeline'];

export default function ClientWorkspace({ client, onBack }: ClientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const minSwipeDistance = 50;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsSwiping(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (touchStart !== null) {
      setTouchEnd(e.clientX);
      if (Math.abs(e.clientX - touchStart) > 15) {
        setIsSwiping(true);
      }
    }
  };

  const handlePointerUp = () => {
    if (touchStart === null || touchEnd === null) {
      setTouchStart(null);
      setTouchEnd(null);
      setTimeout(() => setIsSwiping(false), 0);
      return;
    }
    const distance = touchStart - touchEnd;
    
    setTouchStart(null);
    setTouchEnd(null);

    if (Math.abs(distance) < minSwipeDistance) {
      setTimeout(() => setIsSwiping(false), 0);
      return;
    }

    const currentIndex = tabs.indexOf(activeTab);

    if (distance > minSwipeDistance && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
    
    setTimeout(() => setIsSwiping(false), 0);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'Overview': return <OverviewTab client={client} />;
      case 'Measurements': return <MeasurementsTab client={client} />;
      case 'Fabric': return <FabricTab client={client} />;
      case 'Illustration': return <IllustrationTab client={client} setActiveTab={setActiveTab} />;
      case 'Client Photos': return <ClientPhotosTab client={client} />;
      case 'Fittings': return <FittingsTab client={client} />;
      case 'Payments': return <PaymentsTab client={client} />;
      case 'Timeline': return <TimelineTab client={client} />;
      case 'Progress': return <ProductionNotesTab client={client} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
      {/* Client Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-card  shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Back button (mobile) */}
          <button onClick={onBack} className="md:hidden flex items-center justify-center p-2 -ml-2 text-muted hover:text-charcoal shrink-0 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          {/* Avatar */}
          <div className="relative">
            {client.clientPhoto ? (
              <div className="bg-center bg-no-repeat bg-cover rounded-full size-20 shadow-md border-none shadow-sm" style={{ backgroundImage: `url('${client.clientPhoto}')` }} />
            ) : (
              <div className="flex items-center justify-center rounded-full size-20 text-white font-bold text-2xl shadow-md border-none shadow-sm" style={{ background: getAvatarColor(client.name) }}>
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-lg shadow-md flex items-center justify-center">
              <span className="material-symbols-outlined text-xs">verified</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
              <h1 className="text-charcoal text-2xl font-display font-bold tracking-wide">{client.name}</h1>
              <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit">Premium Client</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 mt-1">
              {client.phone && (
                <div className="flex items-center gap-2 text-gray">
                  <span className="material-symbols-outlined text-primary text-lg">call</span>
                  <span className="text-sm font-medium">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-gray">
                  <span className="material-symbols-outlined text-primary text-lg">mail</span>
                  <span className="text-sm font-medium">{client.email}</span>
                </div>
              )}
              {client.eventDate && (
                <div className="flex items-center gap-2 text-gray">
                  <span className="material-symbols-outlined text-primary text-lg">event</span>
                  <span className="text-sm font-medium">Event: {new Date(client.eventDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {client.eventLocation && (
                <div className="flex items-center gap-2 text-gray">
                  <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                  <span className="text-sm font-medium">{client.eventLocation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:block w-full overflow-x-auto bg-card ">
        <nav className="flex min-w-max px-6">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`group relative flex flex-col items-center justify-center px-6 pb-4 pt-2 font-medium transition-all ${
                activeTab === tab
                  ? 'text-primary font-bold'
                  : 'text-gray hover:text-charcoal'
              }`}
            >
              <span className="text-[14px] tracking-wide font-medium">{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden w-full bg-card  overflow-x-auto no-scrollbar">
        <nav className="flex px-2 min-w-max">
          {['Overview', 'Progress', 'Measurements', 'Fittings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`group relative flex items-center justify-center p-3 px-5 font-medium transition-all ${
                activeTab === tab
                  ? 'text-primary font-bold'
                  : 'text-gray hover:text-charcoal'
              }`}
            >
              <span className="text-[13px] tracking-wide font-medium">{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4 md:p-6 mx-auto w-full max-w-[1200px] mb-16 md:mb-0 select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'pan-y' }}
        onClickCapture={(e) => {
          if (isSwiping) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {renderTab()}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card  z-50 flex items-center justify-between px-2 pb-safe">
          {['Fabric', 'Illustration', 'Client Photos', 'Payments', 'Timeline'].map(tab => {
            const icons: Record<string, string> = {
              'Fabric': 'texture',
              'Illustration': 'draw',
              'Client Photos': 'photo_library',
              'Payments': 'payments',
              'Timeline': 'history'
            };
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${
                  activeTab === tab ? 'text-primary' : 'text-muted hover:text-gray'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${activeTab === tab ? 'bg-primary/10' : 'hover:bg-canvas'}`}>
                  <span className={`material-symbols-outlined ${activeTab === tab ? 'text-primary' : 'text-muted'}`}>{icons[tab]}</span>
                </div>
                <span className="text-[11px] font-medium tracking-wide truncate w-full text-center">{tab.split(' ')[0]}</span>
              </button>
            )
          })}
      </div>
    </div>
  );
}
