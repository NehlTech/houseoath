'use client';

import { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useStudio, Client } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';

// ─── ClientRow ──────────────────────────────────────────────────
// Extracted OUTSIDE Sidebar so React preserves instance identity across re-renders.

interface ClientRowProps {
  client: Client;
  isActive: boolean;
  isArchived: boolean;
  isNearlyDue: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

function ClientRow({ client, isActive, isArchived, isNearlyDue, onSelect, onArchive, onRestore }: ClientRowProps) {
  const [showAction, setShowAction] = useState(false);
  const [rowSwipeStart, setRowSwipeStart] = useState<number | null>(null);
  const [rowSwipeEnd, setRowSwipeEnd] = useState<number | null>(null);
  const [rowIsSwiping, setRowIsSwiping] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const swipeThreshold = 50;

  const initials = (client.name || 'U C').split(' ').map(n => n[0]).join('').slice(0, 2);

  // Clean up long press timer
  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  const handleAction = useCallback((e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isArchived) {
      onRestore();
    } else {
      onArchive();
    }
    setShowAction(false);
  }, [isArchived, onArchive, onRestore]);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();

    if (showAction) {
      setShowAction(false);
      return;
    }

    setRowSwipeEnd(null);
    setRowSwipeStart(e.clientX);
    setRowIsSwiping(false);

    longPressTimer.current = setTimeout(() => {
      setShowAction(true);
    }, 600);
  }, [showAction]);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    e.stopPropagation();
    if (rowSwipeStart !== null) {
      setRowSwipeEnd(e.clientX);
      if (Math.abs(e.clientX - rowSwipeStart) > 15) {
        setRowIsSwiping(true);
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  }, [rowSwipeStart]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (rowSwipeStart === null || rowSwipeEnd === null) {
      setRowSwipeStart(null);
      setRowSwipeEnd(null);
      setTimeout(() => setRowIsSwiping(false), 0);
      return;
    }

    const distance = rowSwipeStart - rowSwipeEnd;
    setRowSwipeStart(null);
    setRowSwipeEnd(null);

    if (distance > swipeThreshold) {
      setShowAction(true);
    } else if (distance < -swipeThreshold) {
      setShowAction(false);
    }

    setTimeout(() => setRowIsSwiping(false), 0);
  }, [rowSwipeStart, rowSwipeEnd]);

  const handleContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setShowAction(true);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (rowIsSwiping) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!showAction) {
      onSelect();
    } else {
      setShowAction(false);
    }
  }, [rowIsSwiping, showAction, onSelect]);

  return (
    <div className="relative overflow-hidden">
      {/* Action Button revealed behind the row */}
      <div className={`absolute top-0 bottom-0 right-0 flex items-center justify-end ${isArchived ? 'bg-success' : 'bg-danger'} transition-opacity duration-300 w-full z-0`}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleAction}
          className="text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 h-full px-6 min-w-[100px] z-50"
        >
          {isArchived ? (
            <><span className="material-symbols-outlined text-[18px]">restore</span> Restore</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">archive</span> Archive</>
          )}
        </button>
      </div>

      {/* Main Item Row */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        style={{ transform: showAction ? 'translateX(-100px)' : 'translateX(0px)', touchAction: 'pan-y' }}
        className={`relative z-10 flex cursor-pointer items-center gap-3 px-4 py-3 transition-all duration-300 select-none ${
          isActive && !showAction
            ? 'bg-[#FAF7ED] border-l-4 border-l-primary'
            : 'bg-card hover:bg-canvas'
        }`}
      >
        {client.clientPhoto ? (
          <div className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center shadow-sm border-none" style={{ backgroundImage: `url('${client.clientPhoto}')` }} />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold text-lg text-white shadow-sm border-none" style={{ background: getAvatarColor(client.name || 'Unknown Client') }}>
            {initials}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center  pb-3 -mb-3 h-full">
          <div className="flex items-center justify-between mb-0.5">
            <p className="truncate font-bold font-display text-charcoal text-[17px] tracking-wide">{client.name}</p>
            <span className="text-[11px] text-muted font-medium shrink-0 ml-2">
              {new Date((client as any).updatedAt || client.lastActivity || client.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="truncate text-[13px] text-gray font-medium">
              {client.eventName || 'No event specified'}
            </p>
            {isNearlyDue && !isArchived && (
              <span className="material-symbols-outlined text-warning text-[14px]">error</span>
            )}
            {client.status === 'Completed' && (
              <span className="material-symbols-outlined text-success text-[16px]">check_circle</span>
            )}
            {isArchived && (
              <span className="material-symbols-outlined text-danger text-[16px]">archive</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Sidebar ────────────────────────────────────────────────────

interface SidebarProps {
  onSelectClient: (id: string) => void;
  onNewClient: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ onSelectClient, onNewClient, onOpenSettings }: SidebarProps) {
  const { clients, activeClient, searchQuery, setSearchQuery, updateClient, logout, filteredClients } = useStudio();
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'due' | 'completed' | 'archived'>('all');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close desktop menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDesktopMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNearlyDue = (client: Client) => {
    if (client.status === 'Completed') return false;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const checkDate = (d: string) => {
      if (!d) return false;
      const parsed = new Date(d);
      return parsed >= today && parsed <= nextWeek;
    };
    
    return checkDate(client.deliveryDate) || checkDate(client.eventDate) || checkDate(client.nextFittingDate);
  };

  const searchedClients = filteredClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.eventName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categorizedClients = searchedClients.filter(c => {
    if (activeTab === 'all') return c.status !== 'Archived';
    if (activeTab === 'due') return isNearlyDue(c) && c.status !== 'Archived';
    if (activeTab === 'completed') return c.status === 'Completed';
    if (activeTab === 'archived') return c.status === 'Archived';
    return true;
  });

  const dueCount = searchedClients.filter(c => isNearlyDue(c) && c.status !== 'Archived').length;
  const completedCount = searchedClients.filter(c => c.status === 'Completed').length;
  const archivedCount = searchedClients.filter(c => c.status === 'Archived').length;
  const allCount = searchedClients.filter(c => c.status !== 'Archived').length;

  const minSwipeDistance = 50;

  // Tab swiping handlers
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

    const tabs: ('all' | 'due' | 'completed' | 'archived')[] = ['all', 'due', 'completed', 'archived'];
    const currentIndex = tabs.indexOf(activeTab);

    if (distance > minSwipeDistance && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
    
    setTimeout(() => setIsSwiping(false), 0);
  };

  return (
    <>
      <div className="flex flex-col  bg-card">
        {/* Top Header */}
        <div className="flex items-center gap-3 p-3">
          {/* Hamburger Menu Wrapper */}
          <div className="relative hidden md:block" ref={menuRef}>
            <button 
              onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray hover:bg-canvas transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            
            {/* Dropdown Menu */}
            {desktopMenuOpen && (
              <div className="absolute top-12 left-0 w-56 bg-card rounded-xl shadow-lg shadow-sm border-none py-2 z-50 animate-fade-in origin-top-left">
                <button 
                  onClick={() => {
                    setDesktopMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-canvas text-charcoal transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                  <span className="font-semibold text-sm">Settings</span>
                </button>
                <div className="h-px bg-border my-1"></div>
                <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-canvas text-danger transition-colors">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="font-semibold text-sm">Log out</span>
                </button>
              </div>
            )}
          </div>

          {/* Header Title for Mobile */}
          <div className="md:hidden flex items-center gap-2 mr-2">
            <span className="material-symbols-outlined text-primary text-2xl">grid_view</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[20px]">search</span>
            <input
              className="h-10 w-full rounded-full shadow-sm border-none bg-canvas pl-10 pr-4 text-sm text-charcoal focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-muted font-medium outline-none"
              placeholder="Search clients..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 w-full overflow-x-auto no-scrollbar ">
          <button
            onClick={() => setActiveTab('all')}
            className={`group relative flex-1 flex items-center justify-center gap-2 p-3 font-semibold transition-all min-w-[max-content] ${
              activeTab === 'all' ? 'text-primary' : 'text-muted hover:text-gray hover:bg-canvas rounded-t-lg'
            }`}
          >
            <span className="text-[14px] tracking-wide font-medium">All</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'all' ? 'bg-primary/15 text-primary' : 'bg-canvas text-muted'}`}>
              {allCount}
            </span>
            {activeTab === 'all' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-full"></div>}
          </button>
          
          <button
            onClick={() => setActiveTab('due')}
            className={`group relative flex-1 flex items-center justify-center gap-2 p-3 font-semibold transition-all min-w-[max-content] ${
              activeTab === 'due' ? 'text-warning' : 'text-muted hover:text-gray hover:bg-canvas rounded-t-lg'
            }`}
          >
            <span className="text-[14px] tracking-wide font-medium">Due</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'due' ? 'bg-warning/15 text-warning' : 'bg-canvas text-muted'}`}>
              {dueCount}
            </span>
            {activeTab === 'due' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-warning rounded-t-full"></div>}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`group relative flex-1 flex items-center justify-center gap-2 p-3 font-semibold transition-all min-w-[max-content] ${
              activeTab === 'completed' ? 'text-success' : 'text-muted hover:text-gray hover:bg-canvas rounded-t-lg'
            }`}
          >
            <span className="text-[14px] tracking-wide font-medium">Finished</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'completed' ? 'bg-success/15 text-success' : 'bg-canvas text-muted'}`}>
              {completedCount}
            </span>
            {activeTab === 'completed' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-success rounded-t-full"></div>}
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`group relative flex-1 flex items-center justify-center gap-2 p-3 font-semibold transition-all min-w-[max-content] ${
              activeTab === 'archived' ? 'text-danger' : 'text-muted hover:text-gray hover:bg-canvas rounded-t-lg'
            }`}
          >
            <span className="text-[14px] tracking-wide font-medium">Archive</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'archived' ? 'bg-danger/15 text-danger' : 'bg-canvas text-muted'}`}>
              {archivedCount}
            </span>
            {activeTab === 'archived' && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-danger rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {/* Client List Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden min-h-0 group/list bg-card">
        {/* Client List */}
        <div 
          className="flex-1 overflow-y-auto relative select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'pan-y' }}
        >
          {categorizedClients.map((client) => (
            <ClientRow 
              key={client.id}
              client={client}
              isActive={activeClient?.id === client.id}
              isArchived={client.status === 'Archived'}
              isNearlyDue={isNearlyDue(client)}
              onSelect={() => onSelectClient(client.id)}
              onArchive={() => updateClient(client.id, { status: 'Archived' })}
              onRestore={() => updateClient(client.id, { status: 'Active' })}
            />
          ))}
          
          {categorizedClients.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center h-40">
              <span className="material-symbols-outlined text-4xl text-border mb-2">search_off</span>
              <p className="text-muted text-sm font-medium">No clients found</p>
            </div>
          )}
        </div>

        {/* FAB */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-center md:opacity-0 md:scale-50 md:translate-y-4 md:pointer-events-none md:group-hover/list:opacity-100 md:group-hover/list:scale-100 md:group-hover/list:translate-y-0 md:group-hover/list:pointer-events-auto">
          <button 
            onClick={onNewClient}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:bg-[#E5C04A] active:scale-90 transition-transform duration-200 outline-none focus:outline-none"
            title="New Client"
          >
            <span className="material-symbols-outlined text-2xl font-medium">edit</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex items-center justify-between  bg-card p-2 z-20">
        <button onClick={onOpenSettings} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-primary w-20 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
        </button>

        <button className="flex flex-col items-center gap-1 p-2 text-primary w-20 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="material-symbols-outlined text-[22px]">group</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Clients</span>
        </button>

        <button onClick={logout} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-danger w-20 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Log out</span>
        </button>
      </div>
    </>
  );
}
