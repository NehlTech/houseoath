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
  const { updateClient, addTimelineEvent } = useStudio();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initials = (client.name || 'U C').split(' ').map(n => n[0] || '').join('').slice(0, 2);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);

  const handleMarkDelivered = () => {
    const today = new Date().toISOString().split('T')[0];
    updateClient(client.id, { delivered: true, deliveryDate: today, status: 'Completed' });
    addTimelineEvent(client.id, 'Order Delivered', `Order completed and delivered to ${client.name}.`);
  };

  const handleMarkUndelivered = () => {
    updateClient(client.id, { delivered: false, deliveryDate: '', status: 'Active' });
    addTimelineEvent(client.id, 'Delivery Reversed', `Delivery reversed for ${client.name}.`);
  };

  const handleMarkFittingDone = () => {
    updateClient(client.id, { fittingDone: true });
    addTimelineEvent(client.id, 'Fitting Completed', 'Client fitting session completed successfully.');
  };

  const handleMarkUnfitted = () => {
    updateClient(client.id, { fittingDone: false });
    addTimelineEvent(client.id, 'Fitting Reversed', 'Fitting status reversed. Client requires re-fitting.');
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
      {/* Client Header — Deep Emerald Silk */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #02200f 0%, #06401f 30%, #085230 55%, #053620 80%, #021a0c 100%)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Silk sheen — radial highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 22% 55%, rgba(52,211,153,0.13) 0%, transparent 62%)' }} />
        {/* Second sheen — subtle top-right glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(16,185,129,0.07) 0%, transparent 50%)' }} />

        {/* Gold wave accent — soft glow + sharp line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M -60 100 C 180 28, 480 118, 780 65 C 1020 22, 1270 92, 1540 50"
                stroke="rgba(212,175,53,0.20)" strokeWidth="18" strokeLinecap="round" fill="none" />
          <path d="M -60 100 C 180 28, 480 118, 780 65 C 1020 22, 1270 92, 1540 50"
                stroke="#d4af35" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>

        {/* Bottom wave — flows into white tab bar */}
        <svg className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 1440 34" preserveAspectRatio="none" style={{ width: '100%', height: 34 }}>
          <path d="M0,34 C280,4 600,32 960,14 C1160,4 1320,26 1440,18 L1440,34 Z" fill="white" />
        </svg>

        {/* HOA Logo Badge — top right */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center justify-center size-10 rounded-full border-2 border-primary overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <img src="/ho_logo.png" alt="House of Oath" className="h-full w-full object-contain p-0.5" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-start gap-4 px-4 pt-3 pb-10 md:px-6 md:pb-12 pr-16 md:pr-20">
          {/* Back button (mobile) */}
          <button onClick={onBack} className="md:hidden flex items-center justify-center p-1 -ml-1 mt-0.5 text-white/70 hover:text-white shrink-0 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          {/* Avatar */}
          <div className="relative group shrink-0">
            <label className="cursor-pointer block relative rounded-full overflow-hidden size-14 md:size-16 shadow-xl ring-2 ring-white/25 transition-transform hover:scale-[1.02]">
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

          {/* All info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + package badge */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-white text-lg md:text-xl font-display font-bold tracking-wide" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{client.name}</h1>
              {client.clientPackage && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
                  {client.clientPackage} Client
                </span>
              )}
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowConsultation(true)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  client.consultationDone
                    ? 'text-white'
                    : 'text-red-200 animate-pulse'
                }`}
                style={{ background: client.consultationDone ? 'rgba(255,255,255,0.18)' : 'rgba(248,113,113,0.25)', backdropFilter: 'blur(6px)' }}
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
                <button
                  onClick={handleMarkUnfitted}
                  title="Tap to undo fitting"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}
                >
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1, 'wght' 600" }}>checkroom</span>
                  Fitted
                </button>
              ) : client.noFitting ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/55" style={{ background: 'rgba(255,255,255,0.10)' }}>
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12 }}>event_busy</span>
                  No Fitting
                </span>
              ) : (client.nextFittingDate || client.fittings?.firstFitting) ? (
                <button
                  onClick={handleMarkFittingDone}
                  title="Tap to mark fitting as done"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary transition-colors animate-pulse"
                  style={{ background: 'rgba(212,175,53,0.22)', backdropFilter: 'blur(6px)', border: '1px solid #d4af35' }}
                >
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: 12 }}>checkroom</span>
                  Fitting: {new Date(client.nextFittingDate || client.fittings?.firstFitting || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              ) : null}
            </div>

            {/* Contact / event info */}
            <div className="flex flex-col gap-y-1 pt-0.5">
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, color: '#d4af35' }}>call</span>
                  <span className="text-xs font-medium text-white/80">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, color: '#d4af35' }}>mail</span>
                  <span className="text-xs font-medium text-white/80 break-all">{client.email}</span>
                </div>
              )}
              {client.eventDate && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, color: '#d4af35' }}>event</span>
                  <span className="text-xs font-medium text-white/80">
                    {new Date(client.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
              {client.eventLocation && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, color: '#d4af35' }}>location_on</span>
                  <span className="text-xs font-medium text-white/80">{client.eventLocation}</span>
                </div>
              )}

              {/* Delivery */}
              <div className="pt-0.5">
                {client.delivered ? (
                  <button
                    onClick={handleMarkUndelivered}
                    title="Tap to undo delivery"
                    className="flex items-center gap-1.5 group hover:opacity-75 transition-opacity"
                  >
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: '#6ee7b7' }}>task_alt</span>
                    <span className="text-xs font-semibold" style={{ color: '#6ee7b7' }}>
                      Delivered{client.deliveryDate ? `: ${new Date(client.deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </span>
                    <span className="material-symbols-outlined text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 12 }}>undo</span>
                  </button>
                ) : (
                  <button
                    onClick={handleMarkDelivered}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-primary transition-colors"
                    style={{ background: 'rgba(212,175,53,0.20)', border: '1px solid #d4af35' }}
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
