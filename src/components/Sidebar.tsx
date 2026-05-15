'use client';

import { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useStudio, Client } from '@/context/StudioContext';
import { getAvatarColor } from '@/lib/avatarColors';

// ─── ClientRow ──────────────────────────────────────────────────
// Extracted OUTSIDE Sidebar so React preserves instance identity across re-renders.

interface DueInfo {
  days: number;
  source: 'eventDate' | 'deliveryDate' | 'nextFittingDate';
  date: string;
}

interface ClientRowProps {
  client: Client;
  isActive: boolean;
  isArchived: boolean;
  isNearlyDue: boolean;
  dueInfo: DueInfo | null;
  onSelect: () => void;
  onArchive: () => void;
  onRestore: () => void;
  isSelected: boolean;
  selectionMode: boolean;
  onLongPress: () => void;
  onToggleSelect: () => void;
}

function ClientRow({ client, isActive, isArchived, isNearlyDue, dueInfo, onSelect, onArchive, onRestore, isSelected, selectionMode, onLongPress, onToggleSelect }: ClientRowProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const rowSwipeStart = useRef<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const didSwipe = useRef(false);
  const longPressActivated = useRef(false);

  const initials = (client.name || 'U C').split(' ').map(n => n[0]).join('').slice(0, 2);

  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isAnimatingOut) return;
    e.stopPropagation();
    // In selection mode skip swipe tracking
    if (!selectionMode) {
      rowSwipeStart.current = e.clientX;
    }
    setIsDragging(false);
    didSwipe.current = false;

    longPressTimer.current = setTimeout(() => {
      if (!didSwipe.current) {
        longPressActivated.current = true;
        onLongPress();
      }
    }, 600);
  }, [isAnimatingOut, selectionMode, onLongPress]);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (selectionMode) return;
    if (rowSwipeStart.current === null || isAnimatingOut) return;
    e.stopPropagation();
    const diff = e.clientX - rowSwipeStart.current;
    // Only allow swiping left (negative offset)
    const offset = Math.min(0, diff);

    if (Math.abs(diff) > 10) {
      didSwipe.current = true;
      setIsDragging(true);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    setDragOffset(offset);
  }, [isAnimatingOut, selectionMode]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (selectionMode) {
      rowSwipeStart.current = null;
      return;
    }

    if (isAnimatingOut) return;

    const rowWidth = rowRef.current?.offsetWidth || 300;
    const threshold = rowWidth * 0.4;

    if (Math.abs(dragOffset) > threshold) {
      // Full swipe: animate off-screen, then execute action
      setIsAnimatingOut(true);
      setDragOffset(-rowWidth);
      setTimeout(() => {
        if (isArchived) onRestore(); else onArchive();
        setDragOffset(0);
        setIsAnimatingOut(false);
        setIsDragging(false);
      }, 300);
    } else {
      // Snap back
      setDragOffset(0);
      setIsDragging(false);
    }

    rowSwipeStart.current = null;
  }, [dragOffset, isAnimatingOut, isArchived, onArchive, onRestore, selectionMode]);

  const handleContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    if (isArchived) onRestore(); else onArchive();
  }, [isArchived, onArchive, onRestore]);

  const handleClick = useCallback(() => {
    if (didSwipe.current || isAnimatingOut) return;
    if (longPressActivated.current) {
      longPressActivated.current = false;
      return;
    }
    if (selectionMode) {
      onToggleSelect();
      return;
    }
    onSelect();
  }, [isAnimatingOut, onSelect, selectionMode, onToggleSelect]);

  const swipeProgress = rowRef.current ? Math.min(1, Math.abs(dragOffset) / (rowRef.current.offsetWidth * 0.4)) : 0;

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      {/* Action Background revealed behind the row */}
      <div
        className={`absolute inset-0 flex items-center justify-end px-6 z-0 transition-opacity ${isArchived ? 'bg-success' : 'bg-danger'}`}
        style={{ opacity: isDragging || isAnimatingOut ? Math.max(0.5, swipeProgress) : 0 }}
      >
        <div className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">{isArchived ? 'restore' : 'archive'}</span>
          {isArchived ? 'Restore' : 'Archive'}
        </div>
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
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          touchAction: 'pan-y',
        }}
        className={`relative z-10 flex cursor-pointer items-center gap-3 px-4 py-3 select-none ${
          isSelected
            ? 'bg-[#FAF7ED] border-l-4 border-l-primary'
            : isActive
            ? 'bg-[#FAF7ED] border-l-4 border-l-primary'
            : 'bg-card hover:bg-canvas'
        }`}
      >
        {selectionMode && (
          <span
            className="material-symbols-outlined shrink-0 text-[22px] transition-colors"
            style={isSelected ? { color: '#d4af35', fontVariationSettings: "'FILL' 1" } : { color: '#9ca3af' }}
          >
            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        )}
        {client.clientPhoto ? (
          <div className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center shadow-sm border-none" style={{ backgroundImage: `url('${client.clientPhoto}')` }} />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold text-lg text-white shadow-sm border-none" style={{ background: getAvatarColor(client.name || 'Unknown Client') }}>
            {initials}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center pb-3 -mb-3 h-full border-b border-border/40">
          {/* Row 1: name + date only (no ticks here) */}
          <div className="flex items-center justify-between mb-0.5">
            <p className="truncate font-bold font-display text-charcoal text-[17px] tracking-wide">{client.name}</p>
            <span className="text-[11px] text-muted font-medium shrink-0 ml-2">
              {(() => {
                const dateStr = (client as any).updatedAt || client.lastActivity || client.createdAt;
                if (!dateStr) return 'Recent';
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              })()}
            </span>
          </div>
          {/* Row 2: event name — ticks then status icons, all horizontal */}
          <div className="flex items-center gap-1">
            <p className="truncate flex-1 text-[13px] text-gray font-medium">
              {client.eventName || 'No event specified'}
            </p>
            {/* Ticks — green task_alt when delivered, else blue done */}
            {(() => {
              const delivered = client.delivered;
              const tickStyle = delivered
                ? { fontSize: '14px', lineHeight: 1, verticalAlign: 'middle', color: '#22C55E', fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }
                : { fontSize: '14px', lineHeight: 1, verticalAlign: 'middle', color: '#3B82F6', fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" };
              const tickIcon = delivered ? 'task_alt' : 'done';
              return (
                <>
                  <span className="material-symbols-outlined shrink-0" style={tickStyle}>{tickIcon}</span>
                  {client.consultationDone && <span className="material-symbols-outlined shrink-0" style={tickStyle}>{tickIcon}</span>}
                  {client.measurementsTaken && <span className="material-symbols-outlined shrink-0" style={tickStyle}>{tickIcon}</span>}
                  {client.fabricReceived && <span className="material-symbols-outlined shrink-0" style={tickStyle}>{tickIcon}</span>}
                  {client.fittingDone && <span className="material-symbols-outlined shrink-0" style={tickStyle}>{tickIcon}</span>}
                </>
              );
            })()}
            {/* Flashing red days-remaining pill — icon shows which date is driving it */}
            {dueInfo !== null && client.status !== 'Completed' && !isArchived && (
              <span
                className="shrink-0 bg-danger text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse leading-none flex items-center gap-0.5"
                title={
                  dueInfo.source === 'eventDate' ? `Event date: ${dueInfo.date}` :
                  dueInfo.source === 'deliveryDate' ? `Delivery date: ${dueInfo.date}` :
                  `Fitting date: ${dueInfo.date}`
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: 9, lineHeight: 1 }}>
                  {dueInfo.source === 'eventDate' ? 'event' : dueInfo.source === 'deliveryDate' ? 'local_shipping' : 'checkroom'}
                </span>
                <span style={{ fontSize: 9 }}>{dueInfo.days}d</span>
              </span>
            )}
            {client.status === 'Completed' && (
              <span className="material-symbols-outlined text-success text-[16px] shrink-0">check_circle</span>
            )}
            {isArchived && (
              <span className="material-symbols-outlined text-danger text-[16px] shrink-0">archive</span>
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
  onToggleSidebar: () => void;
}

export default function Sidebar({ onSelectClient, onNewClient, onOpenSettings, onToggleSidebar }: SidebarProps) {
  const { clients: _clients, activeClient, searchQuery, setSearchQuery, updateClient, deleteClient, logout, filteredClients, userProfile, isRetrying, retryLoad } = useStudio();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'due' | 'completed' | 'archived'>('all');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const pullStartYRef = useRef<number | null>(null);
  const pullPointerIdRef = useRef<number | null>(null);
  const pullYRef = useRef(0);
  const PULL_THRESHOLD = 65;
  const PULL_MAX = 80;

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

  const getDaysUntilDue = (client: Client): DueInfo | null => {
    if (client.status === 'Completed') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() + 3);
    // Append T00:00:00 so ISO date strings are parsed as local midnight, not UTC midnight
    const parseDays = (d: string) => {
      if (!d) return null;
      const parsed = new Date(d.length === 10 ? d + 'T00:00:00' : d);
      if (isNaN(parsed.getTime())) return null;
      if (parsed < today || parsed > cutoff) return null;
      return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
    };
    const sources: Array<{ key: DueInfo['source']; val: string }> = [
      { key: 'deliveryDate',    val: client.deliveryDate    || '' },
      { key: 'eventDate',       val: client.eventDate       || '' },
      { key: 'nextFittingDate', val: client.nextFittingDate || '' },
    ];
    let best: DueInfo | null = null;
    for (const { key, val } of sources) {
      const days = parseDays(val);
      if (days !== null && (best === null || days < best.days)) {
        best = { days, source: key, date: val };
      }
    }
    return best;
  };

  const isNearlyDue = (client: Client) => getDaysUntilDue(client) !== null;

  const searchedClients = filteredClients.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Selection helpers (defined after categorizedClients so handleSelectAll can reference it)
  const handleLongPressClient = (id: string) => setSelectedIds(prev => new Set([...prev, id]));
  const handleToggleClient = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleDeleteSelected = () => { selectedIds.forEach(id => deleteClient(id)); setSelectedIds(new Set()); };
  const handleClearSelection = () => setSelectedIds(new Set());
  const handleSelectAll = () => setSelectedIds(new Set(categorizedClients.map(c => c.id)));

  const minSwipeDistance = 50;

  // Tab swiping handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsSwiping(false);
    // Initiate pull-to-refresh tracking on touch when list is scrolled to top
    if (e.pointerType !== 'mouse' && (listScrollRef.current?.scrollTop ?? 1) === 0) {
      pullStartYRef.current = e.clientY;
      pullPointerIdRef.current = e.pointerId;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (touchStart !== null) {
      setTouchEnd(e.clientX);
      if (Math.abs(e.clientX - touchStart) > 15) setIsSwiping(true);
    }
    if (pullStartYRef.current !== null && e.pointerId === pullPointerIdRef.current) {
      const dy = e.clientY - pullStartYRef.current;
      if (dy > 0) {
        // Capture the pointer the first time we confirm a downward pull
        if (pullYRef.current === 0 && dy > 8) {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        const d = Math.min(dy * 0.42, PULL_MAX);
        pullYRef.current = d;
        setPullY(d);
      } else if (dy < -5) {
        pullStartYRef.current = null;
        pullPointerIdRef.current = null;
        pullYRef.current = 0;
        setPullY(0);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Pull-to-refresh release
    if (pullPointerIdRef.current === e.pointerId && pullStartYRef.current !== null) {
      pullStartYRef.current = null;
      pullPointerIdRef.current = null;
      const dist = pullYRef.current;
      pullYRef.current = 0;
      setPullY(0);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (dist >= PULL_THRESHOLD) retryLoad();
    }
    // Tab swipe release
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
    const tabs: ('all' | 'due' | 'completed')[] = ['all', 'due', 'completed'];
    const currentIndex = tabs.indexOf(activeTab as 'all' | 'due' | 'completed');
    if (distance > minSwipeDistance && currentIndex !== -1 && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
    setTimeout(() => setIsSwiping(false), 0);
  };

  return (
    <div className="flex-1 min-h-0" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100%', overflow: 'hidden' }}>
      {/* ── STATIC TOP: always visible ── */}
      <div className="bg-card" style={{ minHeight: 0, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Top Header */}
        <div className="flex items-center gap-3 p-3">
          {/* Hamburger — toggles sidebar drawer (desktop only) */}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full text-gray hover:bg-canvas transition-colors"
            title="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          {/* Options menu — Archive, Settings, Logout (desktop only) */}
          <div className="relative hidden md:block" ref={menuRef}>
            <button
              onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray hover:bg-canvas transition-colors"
              title="More options"
            >
              <span className="material-symbols-outlined text-2xl">more_vert</span>
            </button>

            {desktopMenuOpen && (
              <div className="absolute top-12 left-0 w-56 bg-card rounded-xl shadow-lg border-none py-2 z-50 animate-fade-in origin-top-left">
                <button
                  onClick={() => { setDesktopMenuOpen(false); setActiveTab('archived'); }}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-canvas text-danger transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  <span className="font-semibold text-sm">Archive</span>
                  {archivedCount > 0 && (
                    <span className="ml-auto text-[10px] bg-danger/15 text-danger px-1.5 py-0.5 rounded-full font-bold">{archivedCount}</span>
                  )}
                </button>
                <div className="h-px bg-border my-1"></div>
                <button
                  onClick={() => { setDesktopMenuOpen(false); onOpenSettings(); }}
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

          <div className="md:hidden flex items-center justify-center size-9 rounded-full border-2 border-charcoal/80 mr-2 overflow-hidden bg-white">
            <img src="/ho_logo.png" alt="House of Oath Logo" className="h-full w-full object-contain p-0.5" />
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

        {/* Tabs / Selection Action Bar */}
        {selectionMode ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal text-white animate-fade-in">
            <button onClick={handleClearSelection} title="Cancel">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <span className="flex-1 text-sm font-bold ml-1">{selectedIds.size} selected</span>
            <button onClick={handleSelectAll} className="text-xs font-semibold px-3 py-1 rounded-full border border-white/30 hover:bg-white/10 transition-colors">
              All
            </button>
            <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-danger rounded-lg text-sm font-bold hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          </div>
        ) : (
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
          </div>
        )}
      </div>

      {/* ── SCROLLABLE MIDDLE: grows to fill all remaining space ── */}
      <div className="relative overflow-hidden bg-card group/list">
        <div
          ref={listScrollRef}
          className="h-full overflow-y-auto relative select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}
        >
          {/* Pull-to-refresh indicator */}
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              height: isRetrying && pullY === 0 ? 44 : pullY,
              transition: !isRetrying && pullY === 0 ? 'height 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
            }}
          >
            {(pullY > 0 || isRetrying) && (
              <div className={`flex items-center gap-2 ${pullY >= PULL_THRESHOLD || isRetrying ? 'text-primary' : 'text-muted'}`}>
                <span
                  className={`material-symbols-outlined text-xl ${isRetrying ? 'animate-spin' : ''}`}
                  style={!isRetrying ? { transform: `rotate(${(pullY / PULL_MAX) * 360}deg)`, transition: 'none' } : undefined}
                >
                  {isRetrying ? 'sync' : 'refresh'}
                </span>
                <span className="text-xs font-medium">
                  {isRetrying ? 'Refreshing...' : pullY >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </div>
            )}
          </div>

          {categorizedClients.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              isActive={activeClient?.id === client.id}
              isArchived={client.status === 'Archived'}
              isNearlyDue={isNearlyDue(client)}
              dueInfo={getDaysUntilDue(client)}
              onSelect={() => onSelectClient(client.id)}
              onArchive={() => updateClient(client.id, { status: 'Archived' })}
              onRestore={() => updateClient(client.id, { status: 'Active' })}
              isSelected={selectedIds.has(client.id)}
              selectionMode={selectionMode}
              onLongPress={() => handleLongPressClient(client.id)}
              onToggleSelect={() => handleToggleClient(client.id)}
            />
          ))}

          {categorizedClients.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center h-48">
              <span className="material-symbols-outlined text-4xl text-border mb-3">search_off</span>
              <p className="text-muted text-sm font-medium leading-relaxed">
                {userProfile.role === 'Worker' && !searchQuery ? 'Assigned customer will appear here' : 'No clients found'}
              </p>
            </div>
          )}
        </div>

        {/* FAB */}
        <div className="fab-touch-visible absolute bottom-6 right-6 md:bottom-8 md:right-8 z-30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-center md:opacity-0 md:scale-50 md:translate-y-4 md:pointer-events-none md:group-hover/list:opacity-100 md:group-hover/list:scale-100 md:group-hover/list:translate-y-0 md:group-hover/list:pointer-events-auto">
          <button 
            onClick={onNewClient}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:bg-[#E5C04A] active:scale-90 transition-transform duration-200 outline-none focus:outline-none"
            title="New Client"
          >
            <span className="material-symbols-outlined text-2xl font-medium">edit</span>
          </button>
        </div>
      </div>

      {/* ── STATIC BOTTOM: always visible on mobile ── */}
      <div className="md:hidden flex items-center justify-between bg-card p-2 z-20" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={onOpenSettings} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-primary w-16 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'archived' ? 'text-danger' : 'text-muted hover:text-danger'}`}
        >
          <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${activeTab === 'archived' ? 'bg-danger/10' : 'hover:bg-canvas'}`}>
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            {archivedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{archivedCount}</span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Archive</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab !== 'archived' ? 'text-primary' : 'text-muted hover:text-primary'}`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${activeTab !== 'archived' ? 'bg-primary/10' : 'hover:bg-canvas'}`}>
            <span className="material-symbols-outlined text-[22px]">group</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Clients</span>
        </button>

        <button onClick={logout} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-danger w-16 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Log out</span>
        </button>
      </div>
    </div>
  );
}
