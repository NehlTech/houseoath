'use client';

import { useState, useRef, useEffect } from 'react';
import { Client, useStudio } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';
import { uploadToImageKit } from '@/lib/imagekit';
import OverviewTab from './tabs/OverviewTab';
import MeasurementsTab from './tabs/MeasurementsTab';
import FabricTab from './tabs/FabricTab';
import IllustrationTab from './tabs/IllustrationTab';
import ClientPhotosTab from './tabs/ClientPhotosTab';
import FittingsTab from './tabs/FittingsTab';
import PaymentsTab from './tabs/PaymentsTab';
import TimelineTab from './tabs/TimelineTab';
import ConsultationModal from './ConsultationModal';

interface ClientWorkspaceProps {
  client: Client;
  onBack: () => void;
}

const tabs = ['Dashboard', 'Measurements', 'Fabric', 'Illustration', 'Photos', 'Fittings', 'Payments', 'Timeline'];

export default function ClientWorkspace({ client, onBack }: ClientWorkspaceProps) {
  const { updateClient, deleteClient, addTimelineEvent } = useStudio();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initials = (client.name || 'U C').split(' ').map(n => n[0] || '').join('').slice(0, 2);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleMarkDelivered = () => {
    const today = new Date().toISOString().split('T')[0];
    updateClient(client.id, { delivered: true, deliveryDate: today, status: 'Completed' });
    addTimelineEvent(client.id, 'Order Delivered', `Order completed and delivered to ${client.name}.`);
  };

  const handleMarkFittingDone = () => {
    updateClient(client.id, { fittingDone: true });
    addTimelineEvent(client.id, 'Fitting Completed', 'Client fitting session completed successfully.');
  };

  const minSwipeDistance = 50;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      // Use the standard ImageKit upload helper
      const result = await uploadToImageKit(file, `avatar-${client.name}-${Date.now()}`);

      // Update the client directly via context
      updateClient(client.id, {
        clientPhoto: result.url
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input value so the same file can be selected again if needed
      if (e.target) {
        e.target.value = '';
      }
    }
  };

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
      case 'Dashboard': return <OverviewTab client={client} />;
      case 'Measurements': return <MeasurementsTab client={client} />;
      case 'Fabric': return <FabricTab client={client} />;
      case 'Illustration': return <IllustrationTab client={client} setActiveTab={setActiveTab} />;
      case 'Photos': return <ClientPhotosTab client={client} />;
      case 'Fittings': return <FittingsTab client={client} />;
      case 'Payments': return <PaymentsTab client={client} />;
      case 'Timeline': return <TimelineTab client={client} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
      {/* Client Header */}
      <div className="bg-card shadow-sm relative px-4 pt-3 pb-3 md:px-6 md:pb-4">
        {/* Delete button — top right */}
        <div className="absolute top-3 right-3 z-10">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-card border border-danger/30 rounded-xl px-3 py-2 shadow-lg">
              <span className="text-xs text-danger font-semibold">Delete client?</span>
              <button
                onClick={() => { deleteClient(client.id); onBack(); }}
                className="px-3 py-1 rounded-lg bg-danger text-white text-xs font-bold hover:brightness-110 transition-all"
              >Yes</button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 rounded-lg bg-canvas text-gray text-xs font-bold hover:bg-border transition-all"
              >No</button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-danger text-xs font-bold hover:bg-danger/10 transition-colors"
              title="Delete client"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>

        {/* Layout: flex-row on desktop, stacked on mobile */}
        <div className="flex items-start gap-4 pr-20 md:pr-28">
          {/* Back button (mobile) */}
          <button onClick={onBack} className="md:hidden flex items-center justify-center p-1 -ml-1 mt-0.5 text-muted hover:text-charcoal shrink-0 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          {/* Avatar */}
          <div className="relative group shrink-0">
            <label className="cursor-pointer block relative rounded-full overflow-hidden size-12 md:size-16 shadow-md transition-transform hover:scale-[1.02]">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
              {client.clientPhoto ? (
                <div className="w-full h-full bg-center bg-no-repeat bg-cover" style={{ backgroundImage: `url('${client.clientPhoto}')` }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ background: getAvatarColor(client.name) }}>
                  {initials}
                </div>
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              {!isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-sm">photo_camera</span>
                </div>
              )}
            </label>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-md shadow-md flex items-center justify-center pointer-events-none z-10">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>
            </div>
          </div>

          {/* All info — flows naturally next to avatar on both mobile and desktop */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + package badge */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-charcoal text-lg md:text-xl font-display font-bold tracking-wide">{client.name}</h1>
              {client.clientPackage && (() => {
                const pkgStyles: Record<string, string> = {
                  Lux:      'bg-primary/10 text-primary',
                  Classic:  'bg-blue-500/10 text-blue-600',
                  Essential:'bg-success/10 text-success',
                  Delux:    'bg-purple-500/10 text-purple-600',
                };
                const cls = pkgStyles[client.clientPackage] ?? 'bg-primary/10 text-primary';
                return (
                  <span className={`${cls} px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                    {client.clientPackage} Client
                  </span>
                );
              })()}
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowConsultation(true)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  client.consultationDone
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger animate-pulse'
                }`}
              >
                <span
                  className="material-symbols-outlined leading-none"
                  style={{ fontSize: 12, fontVariationSettings: client.consultationDone ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
                >
                  {client.consultationDone ? 'mark_chat_read' : 'pending'}
                </span>
                {client.consultationDone ? 'Consulted' : 'Consultation'}
              </button>

              {client.fittingDone ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1, 'wght' 600" }}>checkroom</span>
                  Fitted
                </span>
              ) : client.noFitting ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12 }}>event_busy</span>
                  No Fitting
                </span>
              ) : (client.nextFittingDate || client.fittings?.firstFitting) ? (
                <button
                  onClick={handleMarkFittingDone}
                  title="Tap to mark fitting as done"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors animate-pulse"
                >
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12 }}>checkroom</span>
                  Fitting: {new Date(client.nextFittingDate || client.fittings?.firstFitting || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              ) : null}
            </div>

            {/* Contact / event info — single column so nothing truncates */}
            <div className="flex flex-col gap-y-1 pt-0.5">
              {client.phone && (
                <div className="flex items-center gap-1.5 text-gray">
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 14 }}>call</span>
                  <span className="text-xs font-medium">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5 text-gray">
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 14 }}>mail</span>
                  <span className="text-xs font-medium break-all">{client.email}</span>
                </div>
              )}
              {client.eventDate && (
                <div className="flex items-center gap-1.5 text-gray">
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 14 }}>event</span>
                  <span className="text-xs font-medium">
                    {new Date(client.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
              {client.eventLocation && (
                <div className="flex items-center gap-1.5 text-gray">
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 14 }}>location_on</span>
                  <span className="text-xs font-medium">{client.eventLocation}</span>
                </div>
              )}

              {/* Delivery */}
              <div className="pt-0.5">
                {client.delivered ? (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-success shrink-0" style={{ fontSize: 16 }}>task_alt</span>
                    <span className="text-xs font-semibold text-success">
                      Delivered{client.deliveryDate ? `: ${new Date(client.deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleMarkDelivered}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>local_shipping</span>
                    Mark Delivered
                  </button>
                )}
              </div>
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
              className={`group relative flex flex-col items-center justify-center px-1 sm:px-1.5 md:px-2 pb-2.5 pt-1 font-medium transition-all ${
                activeTab === tab
                  ? 'text-primary font-bold'
                  : 'text-gray hover:text-charcoal'
              }`}
            >
              <span className="text-[12px] md:text-[13px] lg:text-[14px] tracking-wide font-medium">{tab}</span>
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
          {['Dashboard', 'Measurements', 'Fittings', 'Fabric'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`group relative flex items-center justify-center p-2 px-1 sm:px-1 font-medium transition-all ${
                activeTab === tab
                  ? 'text-primary font-bold'
                  : 'text-gray hover:text-charcoal'
              }`}
            >
              <span className="text-[12px] tracking-wide font-medium">{tab}</span>
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

      {showConsultation && (
        <ConsultationModal client={client} onClose={() => setShowConsultation(false)} />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card z-50 flex items-center justify-between px-1 pb-safe">
          {['Fabric', 'Illustration', 'Photos', 'Payments', 'Timeline'].map(tab => {
            const icons: Record<string, string> = {
              'Fabric': 'texture',
              'Illustration': 'draw',
              'Photos': 'photo_library',
              'Payments': 'payments',
              'Timeline': 'history'
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 flex-1 transition-colors ${
                  activeTab === tab ? 'text-primary' : 'text-muted hover:text-gray'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${activeTab === tab ? 'bg-primary/10' : 'hover:bg-canvas'}`}>
                  <span className={`material-symbols-outlined text-[20px] ${activeTab === tab ? 'text-primary' : 'text-muted'}`}>{icons[tab]}</span>
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">{tab.split(' ')[0]}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
