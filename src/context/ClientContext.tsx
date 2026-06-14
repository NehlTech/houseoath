'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { useAuditContext } from './AuditContext';
import { useAuthContext } from './AuthContext';
import { UserProfile } from './AuthContext';

// ── Types (re-exported so ClientContext is self-contained) ──
export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  receiptNumber?: string;
}

export interface Fitting {
  startDate: string;
  firstFitting: string;
  secondFitting: string;
  finalFitting: string;
  deliveryDate: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  action?: string;
  title?: string;
  type?: string;
  description: string;
}

export interface Measurements {
  bust: string;
  shoulder: string;
  shoulderToNipple: string;
  shoulderToWaist: string;
  blouseLength: string;
  waist: string;
  hip: string;
  thigh: string;
  knee: string;
  trouser: string;
  bass: string;
  dressLength: string;
  slitLength: string;
  sleeveLength: string;
  aroundArm: string;
  waistToHip: string;
  kabaLength: string;
  waistToKnee: string;
  underbust: string;
}

export interface FabricItem {
  id: string;
  name: string;
  vendor: string;
  type: string;
  description: string;
  image: string;
  addedAt: string;
  receivedDate?: string;
}

export interface FeedbackComment {
  id: string;
  authorName: string;
  authorInitials: string;
  date: string;
  content: string;
}

export interface ProductionNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface DesignIllustration {
  id: string;
  name: string;
  version: string;
  type: string;
  image: string;
  status: string;
  notes: string;
  colors: string[];
  timeline: { start: string; lastRevised: string; revisions: number };
  comments: FeedbackComment[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  profession: string;
  address: string;
  state: string;
  country: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventMonth: string;
  kenteVendor: string;
  fabricVendor: string;
  howDidYouHear: string;
  referralSource: string;
  comments: string;
  notes: string;
  fabricNotes: string;
  clientPhoto: string;
  fabricPhotos: string[];
  illustrations: DesignIllustration[];
  clientPhotos: string[];
  measurements: Measurements;
  fittings: Fitting;
  payments: Payment[];
  totalCost: number;
  timeline: TimelineEvent[];
  status?: 'Active' | 'Completed' | 'Archived';
  createdAt: string;
  lastActivity: string;
  startDate: string;
  nextFittingDate: string;
  deliveryDate: string;
  assignedWorker?: string;
  assignedWorkerId?: string;
  productionNotes: ProductionNote[];
  consultationDone?: boolean;
  consultationNotes?: string;
  clientPackage?: string;
  measurementsTaken?: boolean;
  fabricReceived?: boolean;
  fabrics?: FabricItem[];
  fittingDone?: boolean;
  noFitting?: boolean;
  fittingRescheduleHistory?: { id: string; date: string; note: string; newDate: string }[];
  delivered?: boolean;
  updatedAt?: string;
  fullName?: string;
}

export const defaultMeasurements: Measurements = {
  bust: '', shoulder: '', shoulderToNipple: '', shoulderToWaist: '',
  blouseLength: '', waist: '', hip: '', thigh: '', knee: '', trouser: '',
  bass: '', dressLength: '', slitLength: '', sleeveLength: '', aroundArm: '',
  waistToHip: '', kabaLength: '', waistToKnee: '', underbust: '',
};

export const defaultFittings: Fitting = {
  startDate: '', firstFitting: '', secondFitting: '', finalFitting: '', deliveryDate: '',
};

export const LOADING_MESSAGES = [
  'Threading the needle…',
  'Pressing the fabric…',
  'Measuring twice, cutting once…',
  'Laying out the patterns…',
  'Checking client fittings…',
  'Ironing out the details…',
  'Setting up the studio…',
  'Welcoming clients in…',
  'Sharpening the scissors…',
  'Pinning the seams…',
  'Chalking the lines…',
  'Hanging the garments…',
  'Stitching it all together…',
  'Getting everything ready for you…',
];

interface ClientContextType {
  clients: Client[];
  activeClientId: string | null;
  searchQuery: string;
  isLoaded: boolean;
  loadingMsgIdx: number;
  filteredClients: Client[];
  activeClient: Client | null;
  setSearchQuery: (query: string) => void;
  setActiveClientId: (id: string | null) => void;
  mergeWithLocal: (apiResponse: Client[] | { clients: Client[]; deletedIds?: string[] }) => void;
  retryLoad: () => void;
  addClient: (
    client: Omit<
      Client,
      | 'id'
      | 'createdAt'
      | 'lastActivity'
      | 'timeline'
      | 'payments'
      | 'measurements'
      | 'fittings'
      | 'totalCost'
      | 'startDate'
      | 'nextFittingDate'
      | 'deliveryDate'
      | 'fabricPhotos'
      | 'illustrations'
      | 'clientPhotos'
      | 'productionNotes'
      | 'howDidYouHear'
      | 'comments'
      | 'dateOfBirth'
    >,
  ) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addPayment: (clientId: string, payment: Omit<Payment, 'id'>) => void;
  addTimelineEvent: (clientId: string, action: string, description: string) => void;
  updateMeasurements: (clientId: string, measurements: Measurements) => void;
  updateFittings: (clientId: string, fittings: Fitting) => void;
  addProductionNote: (clientId: string, noteText: string) => void;
  getActiveClient: () => Client | undefined;
  cascadeWorkerRemoval: (workerId: string, workerName: string) => void;
  /** Callback wired by StudioFacadeProvider so the initial sync can populate workers */
  onWorkersData?: (workers: UserProfile[]) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClientContext must be used within ClientProvider');
  return ctx;
}

interface ClientProviderProps {
  children: ReactNode;
  /** Called when the initial /api/workers fetch succeeds so WorkerContext can be seeded */
  onWorkersData?: (workers: UserProfile[]) => void;
}

export function ClientProvider({ children, onWorkersData }: ClientProviderProps) {
  const { addAuditLog } = useAuditContext();
  const { useApi, setUseApi, setApiError, userProfile } = useAuthContext();

  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const layoutInit = useRef(false);
  const hasFetched = useRef(false);
  const hasLocalDataRef = useRef(false);
  const silentRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Synchronous localStorage restore ──
  useLayoutEffect(() => {
    if (layoutInit.current) return;
    layoutInit.current = true;

    let hasLocalClients = false;
    try {
      const savedClients = safeGetItem('studio_clients');
      if (savedClients) {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
          hasLocalClients = true;
        }
      }
    } catch { /* ignore */ }

    if (hasLocalClients) {
      hasLocalDataRef.current = true;
      setIsLoaded(true);
    }
  }, []);

  // ── Merge API data with local clients ──
  const mergeWithLocal = useCallback(
    (apiResponse: Client[] | { clients: Client[]; deletedIds?: string[] }) => {
      const apiData = Array.isArray(apiResponse) ? apiResponse : apiResponse.clients;
      const deletedSet = new Set<string>(
        Array.isArray(apiResponse) ? [] : (apiResponse.deletedIds ?? []),
      );

      if (apiData.length === 0 && deletedSet.size === 0) {
        setClients([]);
        safeSetItem('studio_clients', JSON.stringify([]));
        return;
      }

      let localClients: Client[] = [];
      try {
        const saved = safeGetItem('studio_clients');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) localClients = parsed;
        }
      } catch { /* ignore */ }

      const apiIds = new Set(apiData.map(c => c.id));
      const unsynced = localClients.filter(c => !apiIds.has(c.id) && !deletedSet.has(c.id));

      unsynced.forEach(c => {
        fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c),
        }).catch(() => {});
      });

      const merged = [...apiData, ...unsynced];
      setClients(merged);
    },
    [],
  );

  // ── Silent background retry ──
  const startSilentBackgroundRetry = useCallback(() => {
    if (silentRetryTimerRef.current) return;
    const doRetry = async () => {
      silentRetryTimerRef.current = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/clients', {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('non-ok');
        const data = await res.json();
        setUseApi(true);
        setApiError(false);
        mergeWithLocal(data);
        setIsLoaded(true);
      } catch {
        silentRetryTimerRef.current = setTimeout(doRetry, 5000);
      }
    };
    silentRetryTimerRef.current = setTimeout(doRetry, 5000);
  }, [mergeWithLocal, setUseApi, setApiError]);

  // ── Initial sync from MongoDB ──
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const syncFromApi = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const clientRes = await fetch('/api/clients', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (clientRes.ok) {
          const data = await clientRes.json();
          setUseApi(true);
          setApiError(false);
          mergeWithLocal(data);
        } else {
          throw new Error('Client API returned non-ok');
        }

        const workerRes = await fetch('/api/workers', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (workerRes.ok) {
          const wData = await workerRes.json();
          if (Array.isArray(wData) && onWorkersData) {
            onWorkersData(wData);
          }
        }
        setIsLoaded(true);
      } catch (err) {
        console.warn('API unreachable on initial load:', err);
        setIsLoaded(true);
        startSilentBackgroundRetry();
      } finally {
        clearTimeout(timeoutId);
      }
    };
    syncFromApi();
  }, [startSilentBackgroundRetry, mergeWithLocal, onWorkersData, setUseApi, setApiError]);

  // ── Persist clients to localStorage ──
  useEffect(() => {
    if (isLoaded) {
      safeSetItem('studio_clients', JSON.stringify(clients));
    }
  }, [clients, isLoaded]);

  // ── Cycle loading messages ──
  useEffect(() => {
    if (isLoaded) return;
    const t = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, [isLoaded]);

  // ── Keyboard scroll fix (iOS Safari + Chrome mobile) ──
  useEffect(() => {
    const resetScroll = () => window.scrollTo(0, 0);

    let prevVpHeight = window.visualViewport?.height ?? 0;
    const handleVpResize = () => {
      const h = window.visualViewport?.height ?? 0;
      if (h > prevVpHeight) resetScroll();
      prevVpHeight = h;
    };
    window.visualViewport?.addEventListener('resize', handleVpResize);

    let blurTimer: ReturnType<typeof setTimeout>;
    const handleFocusOut = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const a = document.activeElement;
        const isEditable =
          a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
        if (!isEditable) resetScroll();
      }, 150);
    };
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVpResize);
      document.removeEventListener('focusout', handleFocusOut);
      clearTimeout(blurTimer);
    };
  }, []);

  const retryLoad = useCallback(async () => {
    setApiError(false);
    // setIsRetrying is handled in AuthContext; call via setIsRetrying from auth
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const clientRes = await fetch('/api/clients', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (clientRes.ok) {
        const data = await clientRes.json();
        setUseApi(true);
        setApiError(false);
        mergeWithLocal(data);
        setIsLoaded(true);
      } else {
        throw new Error('API non-ok');
      }
    } catch {
      startSilentBackgroundRetry();
    }
  }, [startSilentBackgroundRetry, mergeWithLocal, setUseApi, setApiError]);

  const addClient = useCallback(
    (
      clientData: Omit<
        Client,
        | 'id'
        | 'createdAt'
        | 'lastActivity'
        | 'timeline'
        | 'payments'
        | 'measurements'
        | 'fittings'
        | 'totalCost'
        | 'startDate'
        | 'nextFittingDate'
        | 'deliveryDate'
        | 'fabricPhotos'
        | 'illustrations'
        | 'clientPhotos'
        | 'productionNotes'
        | 'howDidYouHear'
        | 'comments'
        | 'dateOfBirth'
      >,
    ) => {
      const now = new Date().toISOString();
      const newClient: Client = {
        ...clientData,
        id: crypto.randomUUID(),
        measurements: defaultMeasurements,
        fittings: defaultFittings,
        payments: [],
        clientPhoto: clientData.clientPhoto || '',
        fabricPhotos: [],
        illustrations: [],
        clientPhotos: [],
        productionNotes: [],
        howDidYouHear: '',
        comments: '',
        dateOfBirth: '',
        totalCost: 0,
        timeline: [
          {
            id: `t-${Date.now()}`,
            date: now,
            action: 'Booking',
            description: `${clientData.name} was booked as a new client.`,
          },
        ],
        status: 'Active',
        createdAt: now,
        lastActivity: now,
        startDate: '',
        nextFittingDate: '',
        deliveryDate: '',
        consultationDone: false,
        consultationNotes: '',
        clientPackage: clientData.clientPackage || '',
        measurementsTaken: false,
        fabricReceived: false,
        fabrics: [],
      };
      setClients(prev => {
        const next = [newClient, ...prev];
        safeSetItem('studio_clients', JSON.stringify(next));
        return next;
      });
      setActiveClientId(newClient.id);

      if (useApi) {
        fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClient),
        })
          .then(res => {
            if (res.ok) {
              addAuditLog('Client Added', `Created new client record for ${newClient.name}.`);
            } else {
              setClients(prev => {
                const rolled = prev.filter(c => c.id !== newClient.id);
                safeSetItem('studio_clients', JSON.stringify(rolled));
                return rolled;
              });
              setActiveClientId(null);
            }
          })
          .catch(() => {
            setClients(prev => {
              const rolled = prev.filter(c => c.id !== newClient.id);
              safeSetItem('studio_clients', JSON.stringify(rolled));
              return rolled;
            });
            setActiveClientId(null);
          });
      } else {
        addAuditLog('Client Added', `Created new client record for ${newClient.name}.`);
      }
    },
    [useApi, addAuditLog],
  );

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      const now = new Date().toISOString();
      let prevClient: Client | undefined;
      setClients(prev => {
        prevClient = prev.find(c => c.id === id);
        return prev.map(c => (c.id === id ? { ...c, ...updates, lastActivity: now } : c));
      });

      if (useApi && prevClient) {
        const captured = prevClient;
        fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updates, lastActivity: now }),
        })
          .then(res => {
            if (res.ok) {
              addAuditLog('Client Updated', `Modified record for ${captured.name || 'a client'}.`);
            } else {
              setClients(prev => prev.map(c => (c.id === id ? captured : c)));
            }
          })
          .catch(() => {
            setClients(prev => prev.map(c => (c.id === id ? captured : c)));
          });
      } else if (!useApi && prevClient) {
        addAuditLog('Client Updated', `Modified record for ${prevClient.name || 'a client'}.`);
      }
    },
    [useApi, addAuditLog],
  );

  const addPayment = useCallback(
    (clientId: string, payment: Omit<Payment, 'id'>) => {
      const randomHash = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
      const receiptNumber = `HOF-${randomHash}`;
      const paymentWithId: Payment = { ...payment, id: `pay-${Date.now()}`, receiptNumber };
      const now = new Date().toISOString();

      let prevClient: Client | undefined;
      let newUpdates: Partial<Client> | undefined;

      setClients(prev =>
        prev.map(c => {
          if (c.id !== clientId) return c;
          prevClient = c;

          const newTimelineEvent: TimelineEvent = {
            id: `t-${Date.now()}`,
            date: now,
            action: 'Payment Recorded',
            description: `Payment of GH₵${payment.amount.toLocaleString()} via ${payment.method}.`,
          };
          const updatedTimeline = [...c.timeline, newTimelineEvent];
          const newTotalPaid = [...c.payments, paymentWithId].reduce((sum, p) => sum + p.amount, 0);
          if (newTotalPaid >= c.totalCost && newTotalPaid - payment.amount < c.totalCost) {
            updatedTimeline.push({
              id: `t-${Date.now()}-cleared`,
              date: now,
              action: 'Paid in Full',
              description: 'Client balance cleared. Garment ready for final delivery.',
            });
          }
          newUpdates = {
            payments: [...c.payments, paymentWithId],
            timeline: updatedTimeline,
            lastActivity: now,
          };
          return { ...c, ...newUpdates };
        }),
      );

      if (useApi && prevClient && newUpdates) {
        const captured = prevClient;
        const updates = newUpdates;
        fetch(`/api/clients/${clientId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
          .then(res => {
            if (res.ok) {
              addAuditLog(
                'Payment Added',
                `Recorded payment of GH₵${payment.amount} for a client.`,
              );
            } else {
              setClients(prev => prev.map(c => (c.id === clientId ? captured : c)));
            }
          })
          .catch(() => {
            setClients(prev => prev.map(c => (c.id === clientId ? captured : c)));
          });
      } else if (!useApi) {
        addAuditLog('Payment Added', `Recorded payment of GH₵${payment.amount} for a client.`);
      }
    },
    [useApi, addAuditLog],
  );

  const addTimelineEvent = useCallback(
    (clientId: string, action: string, description: string) => {
      const now = new Date().toISOString();
      const event: TimelineEvent = { id: `t-${Date.now()}`, date: now, action, description };
      setClients(prev =>
        prev.map(c => {
          if (c.id === clientId) {
            const updatedTimeline = [...c.timeline, event];
            if (useApi) {
              fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeline: updatedTimeline, lastActivity: now }),
              }).catch(e => console.warn('API Error:', e));
            }
            return { ...c, timeline: updatedTimeline, lastActivity: now };
          }
          return c;
        }),
      );
    },
    [useApi],
  );

  const updateMeasurements = useCallback(
    (clientId: string, measurements: Measurements) => {
      const now = new Date().toISOString();
      setClients(prev =>
        prev.map(c => {
          if (c.id === clientId) {
            const isFirst = !c.measurementsTaken;
            const newTimelineEvent: TimelineEvent = {
              id: `t-${Date.now()}`,
              date: now,
              action: isFirst ? 'Measurements Taken' : 'Measurements Updated',
              description: isFirst
                ? 'Client measurements recorded.'
                : 'Client measurements were updated.',
            };
            const updatedTimeline = [...c.timeline, newTimelineEvent];
            const updates = {
              measurements,
              timeline: updatedTimeline,
              lastActivity: now,
              measurementsTaken: true,
            };
            if (useApi) {
              fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              }).catch(e => console.warn('API Error:', e));
            }
            return { ...c, ...updates };
          }
          return c;
        }),
      );
      addAuditLog('Measurements Updated', `Updated measurements for a client.`);
    },
    [useApi, addAuditLog],
  );

  const updateFittings = useCallback(
    (clientId: string, fittings: Fitting) => {
      const now = new Date().toISOString();
      setClients(prev =>
        prev.map(c => {
          if (c.id === clientId) {
            const newTimelineEvent: TimelineEvent = {
              id: `t-${Date.now()}`,
              date: now,
              action: 'Fitting Scheduled',
              description: 'Fitting schedule was updated.',
            };
            const updatedTimeline = [...c.timeline, newTimelineEvent];
            if (useApi) {
              fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fittings, timeline: updatedTimeline, lastActivity: now }),
              }).catch(e => console.warn('API Error:', e));
            }
            return { ...c, fittings, timeline: updatedTimeline, lastActivity: now };
          }
          return c;
        }),
      );
      addAuditLog('Fitting Updated', `Updated fitting schedule for a client.`);
    },
    [useApi, addAuditLog],
  );

  const addProductionNote = useCallback(
    (clientId: string, noteText: string) => {
      const now = new Date().toISOString();
      setClients(prev =>
        prev.map(c => {
          if (c.id === clientId) {
            const newNote: ProductionNote = {
              id: `n-${Date.now()}`,
              author: userProfile.name,
              text: noteText,
              timestamp: now,
            };
            const updatedNotes = [...(c.productionNotes || []), newNote];
            if (useApi) {
              fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productionNotes: updatedNotes, lastActivity: now }),
              }).catch(e => console.warn('API Error:', e));
            }
            return { ...c, productionNotes: updatedNotes, lastActivity: now };
          }
          return c;
        }),
      );
    },
    [useApi, userProfile.name],
  );

  const deleteClient = useCallback(
    (id: string) => {
      let deletedClient: Client | undefined;
      setClients(prev => {
        deletedClient = prev.find(c => c.id === id);
        return prev.filter(c => c.id !== id);
      });
      const prevActiveId = activeClientId;
      setActiveClientId(prev => (prev === id ? null : prev));

      if (useApi) {
        fetch(`/api/clients/${id}`, { method: 'DELETE' })
          .then(res => {
            if (res.ok) {
              addAuditLog('Client Deleted', 'A client record was permanently deleted.');
            } else if (deletedClient) {
              setClients(prev => [...prev, deletedClient!]);
              setActiveClientId(prevActiveId);
            }
          })
          .catch(() => {
            if (deletedClient) {
              setClients(prev => [...prev, deletedClient!]);
              setActiveClientId(prevActiveId);
            }
          });
      } else {
        addAuditLog('Client Deleted', 'A client record was permanently deleted.');
      }
    },
    [useApi, addAuditLog, activeClientId],
  );

  const getActiveClient = useCallback(() => {
    return clients.find(c => c.id === activeClientId);
  }, [clients, activeClientId]);

  const cascadeWorkerRemoval = useCallback((workerId: string, workerName: string) => {
    setClients(prev =>
      prev.map(c =>
        c.assignedWorkerId === workerId || (workerName && c.assignedWorker === workerName)
          ? { ...c, assignedWorker: '', assignedWorkerId: undefined }
          : c,
      ),
    );
  }, []);

  const filteredClients = clients.filter(c => {
    if (userProfile.role === 'Worker') {
      const matchesById = userProfile.id && c.assignedWorkerId === userProfile.id;
      const matchesByName = !c.assignedWorkerId && c.assignedWorker === userProfile.name;
      if (!matchesById && !matchesByName) return false;
    }

    const nameStr = (c.name || c.fullName || '').toLowerCase();
    const emailStr = (c.email || '').toLowerCase();
    const eventMonthStr = (c.eventMonth || '').toLowerCase();
    const searchStr = searchQuery.toLowerCase();

    return (
      nameStr.includes(searchStr) ||
      emailStr.includes(searchStr) ||
      eventMonthStr.includes(searchStr)
    );
  });

  const activeClient = clients.find(c => c.id === activeClientId) ?? null;

  return (
    <ClientContext.Provider
      value={{
        clients,
        activeClientId,
        searchQuery,
        isLoaded,
        loadingMsgIdx,
        filteredClients,
        activeClient,
        setSearchQuery,
        setActiveClientId,
        mergeWithLocal,
        retryLoad,
        addClient,
        updateClient,
        deleteClient,
        addPayment,
        addTimelineEvent,
        updateMeasurements,
        updateFittings,
        addProductionNote,
        getActiveClient,
        cascadeWorkerRemoval,
        onWorkersData,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}
