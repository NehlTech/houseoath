'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, ReactNode, useRef } from 'react';

// Types
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

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  password?: string;
  avatar: string | null;
  role: 'Admin' | 'Worker';
}

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
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
  // Client Information
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  profession: string;
  address: string;
  state: string;
  country: string;
  // Event Information
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventMonth: string;
  // Vendor Information
  kenteVendor: string;
  fabricVendor: string;
  // Discovery
  howDidYouHear: string;
  referralSource: string;
  // Notes
  comments: string;
  notes: string;
  fabricNotes: string;
  // Uploads
  clientPhoto: string;
  fabricPhotos: string[];
  illustrations: DesignIllustration[];
  clientPhotos: string[];
  // Production
  measurements: Measurements;
  fittings: Fitting;
  payments: Payment[];
  totalCost: number;
  // Timeline
  timeline: TimelineEvent[];
  // Metadata
  status?: 'Active' | 'Completed' | 'Archived';
  createdAt: string;
  lastActivity: string;
  // Production Timeline
  startDate: string;
  nextFittingDate: string;
  deliveryDate: string;
  assignedWorker?: string;
  productionNotes: ProductionNote[];
  // Consultation
  consultationDone?: boolean;
  consultationNotes?: string;
  // Package tier
  clientPackage?: string;
  // Progress tracking
  measurementsTaken?: boolean;
  fabricReceived?: boolean;
  // Fabric items (replaces plain fabricPhotos URLs)
  fabrics?: FabricItem[];
  // Fitting tracking
  fittingDone?: boolean;
  noFitting?: boolean;
  fittingRescheduleHistory?: { id: string; date: string; note: string; newDate: string }[];
  // Delivery tracking
  delivered?: boolean;
  // Legacy/migration fields from external data sources
  updatedAt?: string;
  fullName?: string;
}

interface StudioContextType {
  clients: Client[];
  activeClient: Client | null;
  activeClientId: string | null;
  isAuthenticated: boolean;
  searchQuery: string;
  userProfile: UserProfile;
  auditLogs: AuditLog[];
  workers: UserProfile[];
  setSearchQuery: (query: string) => void;
  setActiveClient: (id: string | null) => void;
  setActiveClientId: (id: string | null) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'lastActivity' | 'timeline' | 'payments' | 'measurements' | 'fittings' | 'totalCost' | 'startDate' | 'nextFittingDate' | 'deliveryDate' | 'fabricPhotos' | 'illustrations' | 'clientPhotos' | 'productionNotes' | 'howDidYouHear' | 'comments' | 'dateOfBirth'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addPayment: (clientId: string, payment: Omit<Payment, 'id'>) => void;
  addTimelineEvent: (clientId: string, action: string, description: string) => void;
  updateMeasurements: (clientId: string, measurements: Measurements) => void;
  updateFittings: (clientId: string, fittings: Fitting) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addAuditLog: (action: string, description: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getActiveClient: () => Client | undefined;
  filteredClients: Client[];
  addProductionNote: (clientId: string, noteText: string) => void;
  addWorker: (name: string, email: string, password?: string) => void;
  removeWorker: (id: string) => void;
  apiError: boolean;
  isRetrying: boolean;
  retryLoad: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

const defaultMeasurements: Measurements = {
  bust: '', shoulder: '', shoulderToNipple: '', shoulderToWaist: '',
  blouseLength: '', waist: '', hip: '', thigh: '', knee: '', trouser: '',
  bass: '', dressLength: '', slitLength: '', sleeveLength: '', aroundArm: '',
  waistToHip: '', kabaLength: '', waistToKnee: '', underbust: '',
};

const defaultFittings: Fitting = {
  startDate: '', firstFitting: '', secondFitting: '', finalFitting: '', deliveryDate: '',
};

// (sample clients removed — production uses real MongoDB data)
const _sampleClientsPlaceholder: Client[] = [
  {
    id: '1',
    name: 'Ama Serwaa Bonsu',
    email: 'ama.bonsu@email.com',
    gender: 'Female',
    dateOfBirth: '1990-05-15',
    phone: '+233 24 123 4567',
    profession: 'Lawyer',
    address: '12 Independence Ave',
    state: 'Greater Accra',
    country: 'Ghana',
    eventName: 'Wedding Reception',
    eventDate: '2026-06-20',
    eventLocation: 'Kempinski Hotel, Accra',
    eventMonth: 'June',
    kenteVendor: 'Bonwire Kente Weavers',
    fabricVendor: 'Woodin Fabrics',
    howDidYouHear: 'Instagram',
    referralSource: 'Instagram',
    comments: '',
    notes: 'Wants a modern twist on traditional Kente gown for her wedding reception.',
    fabricNotes: '',
    clientPhoto: '',
    fabricPhotos: [],
    fabrics: [],
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurementsTaken: true,
    fabricReceived: false,
    measurements: { ...defaultMeasurements, bust: '92', waist: '72', hip: '98' },
    fittings: { ...defaultFittings, startDate: '2026-04-01', firstFitting: '2026-05-15', secondFitting: '2026-05-20', finalFitting: '2026-06-10', deliveryDate: '2026-06-18' },
    payments: [
      { id: 'p1', date: '2026-03-01', amount: 2000, method: 'Bank Transfer', receiptNumber: 'HOF-X7Y2B9' },
      { id: 'p2', date: '2026-04-15', amount: 1500, method: 'Mobile Money', receiptNumber: 'HOF-A1Q8F4' },
    ],
    totalCost: 5000,
    clientPackage: 'Lux',
    consultationDone: true,
    consultationNotes: 'Client prefers a modern silhouette with traditional Kente panels. Discussed colour palette — gold and burgundy. Noted shoulder measurements should account for posture.',
    fittingDone: false,
    noFitting: false,
    fittingRescheduleHistory: [],
    delivered: false,
    timeline: [
      { id: 't1', date: '2026-03-01', action: 'Booking', description: 'New client booked for wedding reception gown.' },
      { id: 't2', date: '2026-03-01', action: 'Payment Recorded', description: 'Initial deposit of GH₵2,000 received.' },
      { id: 't3', date: '2026-03-15', action: 'Measurements Added', description: 'Body measurements taken at studio.' },
    ],
    status: 'Active',
    createdAt: '2026-03-01T10:00:00Z',
    lastActivity: '2026-03-15T14:30:00Z',
    startDate: '2026-04-01',
    nextFittingDate: '2026-05-15',
    deliveryDate: '2026-05-14',
  },
  {
    id: '2',
    name: 'Nana Akua Mensah',
    email: 'nana.mensah@email.com',
    gender: 'Female',
    dateOfBirth: '1988-11-23',
    phone: '+233 20 987 6543',
    profession: 'Doctor',
    address: '45 Ring Road Central',
    state: 'Ashanti',
    country: 'Ghana',
    eventName: 'Engagement Ceremony',
    eventDate: '2026-08-12',
    eventLocation: 'Golden Tulip, Kumasi',
    eventMonth: 'August',
    kenteVendor: 'Adanwomase Weavers',
    fabricVendor: 'GTP Fabrics',
    howDidYouHear: 'Referral',
    referralSource: 'Referral',
    comments: '',
    notes: 'Elegant engagement ceremony outfit with gold Kente accents.',
    fabricNotes: '',
    clientPhoto: '',
    fabricPhotos: [],
    fabrics: [],
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurementsTaken: false,
    fabricReceived: false,
    fittingDone: false,
    noFitting: false,
    fittingRescheduleHistory: [],
    delivered: false,
    measurements: { ...defaultMeasurements },
    fittings: defaultFittings,
    payments: [
      { id: 'p3', date: '2026-03-10', amount: 3000, method: 'Bank Transfer', receiptNumber: 'HOF-M4K9P2' },
    ],
    totalCost: 7500,
    clientPackage: 'Classic',
    consultationDone: false,
    consultationNotes: '',
    timeline: [
      { id: 't4', date: '2026-03-10', action: 'Booking', description: 'New client booked for engagement ceremony.' },
      { id: 't5', date: '2026-03-10', action: 'Payment Recorded', description: 'Initial deposit of GH₵3,000 received.' },
    ],
    status: 'Active',
    createdAt: '2026-03-10T09:00:00Z',
    lastActivity: '2026-03-10T09:00:00Z',
    startDate: '',
    nextFittingDate: '',
    deliveryDate: '',
  },
  {
    id: '3',
    name: 'Efua Darkwah',
    email: 'efua.d@email.com',
    gender: 'Female',
    dateOfBirth: '1995-02-08',
    phone: '+233 55 444 3210',
    profession: 'Entrepreneur',
    address: '8 Ocean Drive',
    state: 'Western',
    country: 'Ghana',
    eventName: 'Naming Ceremony',
    eventDate: '2026-05-30',
    eventLocation: 'Cape Coast Castle Gardens',
    eventMonth: 'May',
    kenteVendor: 'Bonwire Kente Weavers',
    fabricVendor: 'ATL Fabrics',
    howDidYouHear: 'Website',
    referralSource: 'Website',
    comments: '',
    notes: 'Traditional naming ceremony look with rich Kente patterns.',
    fabricNotes: '',
    clientPhoto: '',
    fabricPhotos: [],
    fabrics: [],
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurementsTaken: false,
    fabricReceived: false,
    fittingDone: false,
    noFitting: false,
    fittingRescheduleHistory: [],
    delivered: false,
    measurements: { ...defaultMeasurements, bust: '88', waist: '68', hip: '94' },
    fittings: { ...defaultFittings, startDate: '2026-03-20', firstFitting: '2026-04-15' },
    payments: [],
    totalCost: 4000,
    clientPackage: 'Essential',
    consultationDone: false,
    consultationNotes: '',
    timeline: [
      { id: 't6', date: '2026-03-12', action: 'Booking', description: 'New client booked for naming ceremony.' },
    ],
    status: 'Completed',
    createdAt: '2026-03-12T11:00:00Z',
    lastActivity: '2026-03-12T11:00:00Z',
    startDate: '2026-03-20',
    nextFittingDate: '2026-04-15',
    deliveryDate: '2026-05-28',
  },
  {
    id: '4',
    name: 'Abena Kyei Ofori',
    email: 'abena.kyei@email.com',
    gender: 'Female',
    dateOfBirth: '1993-07-22',
    phone: '+233 50 234 5678',
    profession: 'Teacher',
    address: '3 Link Road, Tema',
    state: 'Greater Accra',
    country: 'Ghana',
    eventName: 'Outdooring Ceremony',
    eventDate: '2026-05-16',
    eventLocation: 'Tema Community Centre',
    eventMonth: 'May',
    kenteVendor: 'Kente Masters',
    fabricVendor: 'ABC Fabrics',
    howDidYouHear: 'Friend',
    referralSource: 'Friend',
    comments: '',
    notes: 'Rush order — event in 3 days. Final adjustments needed urgently.',
    fabricNotes: '',
    clientPhoto: '',
    fabricPhotos: [],
    fabrics: [],
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurementsTaken: true,
    fabricReceived: true,
    fittingDone: false,
    noFitting: false,
    fittingRescheduleHistory: [],
    delivered: false,
    measurements: { ...defaultMeasurements, bust: '90', waist: '70', hip: '96', sleeveLength: '22' },
    fittings: { ...defaultFittings, startDate: '2026-05-10', firstFitting: '2026-05-14' },
    payments: [
      { id: 'p5', date: '2026-05-01', amount: 1500, method: 'MoMo Pay', receiptNumber: 'HOF-ABK991' },
    ],
    totalCost: 3000,
    clientPackage: 'Classic',
    consultationDone: true,
    consultationNotes: 'Simple traditional dress with gold trim. Prefers loose fitting around waist.',
    timeline: [
      { id: 't7', date: '2026-05-01', action: 'Booking', description: 'Rush booking for outdooring ceremony.' },
      { id: 't8', date: '2026-05-01', action: 'Consultation Done', description: 'Consultation completed.' },
      { id: 't9', date: '2026-05-02', action: 'Measurements Taken', description: 'Body measurements recorded.' },
      { id: 't10', date: '2026-05-05', action: 'Fabric Received', description: 'Fabric from Kente Masters received.' },
    ],
    status: 'Active',
    createdAt: '2026-05-01T08:00:00Z',
    lastActivity: '2026-05-05T10:00:00Z',
    startDate: '2026-05-10',
    nextFittingDate: '2026-05-14',
    deliveryDate: '2026-05-15',
  },
];



// Safe localStorage wrappers — iOS private browsing throws on access
function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

const LOADING_MESSAGES = [
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

export function StudioProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Admin',
    email: 'admin@houseofoath.com',
    avatar: null,
    role: 'Admin'
  });
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 'log-1', action: 'System Init', description: 'Application loaded successfully.', timestamp: new Date().toISOString() }
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useApi, setUseApi] = useState(true); // always attempt API writes; GET sync confirms availability
  const [apiError, setApiError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const layoutInit = useRef(false);
  const hasFetched = useRef(false);
  const hasLocalDataRef = useRef(false);
  const silentRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Effect 1: Synchronous localStorage restore (runs before first paint) ──
  // useLayoutEffect fires synchronously after DOM mutations but before the browser
  // paints, so returning users never see a loading flash — their cached data is
  // already in state when the screen is drawn for the first time.
  useLayoutEffect(() => {
    if (layoutInit.current) return;
    layoutInit.current = true;

    try {
      const savedUser = safeGetItem('studio_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.email) {
            // Optimistically assume session cookie is still valid; async check below corrects if expired
            setIsAuthenticated(true);
            setUserProfile(prev => ({ ...prev, ...parsed }));
          }
        } catch { /* corrupt */ }
      }
    } catch { /* ignore */ }

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
      const savedWorkers = safeGetItem('studio_workers');
      if (savedWorkers) {
        const parsed = JSON.parse(savedWorkers);
        if (Array.isArray(parsed) && parsed.length > 0) setWorkers(parsed);
      }
    } catch { /* ignore */ }

    // Returning users (have cached data): reveal the UI instantly — no loading screen.
    // First-time / cleared-cache users: keep the loading screen until the API responds.
    if (hasLocalClients) {
      hasLocalDataRef.current = true;
      setIsLoaded(true);
    }
  }, []);

  // Merge API data with any locally-saved clients the API doesn't know about
  // (POST failed or never reached the server). Reads from localStorage directly
  // to avoid React state-timing issues — the state updater stays pure.
  const mergeWithLocal = useCallback((apiData: Client[]) => {
    // Read the ground-truth local copy straight from storage
    let localClients: Client[] = [];
    try {
      const saved = safeGetItem('studio_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localClients = parsed;
      }
    } catch { /* ignore */ }

    const apiIds = new Set(apiData.map(c => c.id));
    const unsynced = localClients.filter(c => !apiIds.has(c.id));

    // Retry the POST for every client that didn't make it to MongoDB
    unsynced.forEach(c => {
      fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(c),
      }).catch(() => {});
    });

    // Pure state update — no side effects inside the updater
    const merged = [...apiData, ...unsynced];
    setClients(merged.length > 0 ? merged : localClients);
  }, []);

  // ── Silent background retry — keeps trying until the API comes back ─────
  // Defined before Effect 2 so syncFromApi can reference it.
  const startSilentBackgroundRetry = useCallback(() => {
    if (silentRetryTimerRef.current) return; // already scheduled
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
        if (Array.isArray(data)) mergeWithLocal(data);
        setIsLoaded(true); // data arrived — reveal the app (or update if already visible)
      } catch {
        // Still unreachable — try again in 5 s
        silentRetryTimerRef.current = setTimeout(doRetry, 5000);
      }
    };
    silentRetryTimerRef.current = setTimeout(doRetry, 5000);
  }, [mergeWithLocal]);

  // ── Effect 2: Background MongoDB sync ────────────────────────────────────
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
          if (Array.isArray(data)) mergeWithLocal(data);
        } else {
          throw new Error('Client API returned non-ok');
        }

        const workerRes = await fetch('/api/workers', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (workerRes.ok) {
          const wData = await workerRes.json();
          if (Array.isArray(wData) && wData.length > 0) {
            setWorkers(wData);
          } else {
            setWorkers(prev => {
              if (prev.length > 0) return prev;
              const defaultWorker = { id: 'w-demo', name: 'Kwame (Tailor)', email: 'worker@houseofoath.com', avatar: null, role: 'Worker' as const };
              fetch('/api/workers', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(defaultWorker),
              });
              return [defaultWorker];
            });
          }
        }
        setIsLoaded(true); // success — reveal the app
      } catch (err) {
        console.warn('API unreachable on initial load:', err);
        // Show the UI immediately — don't trap the user on the splash screen.
        // The silent retry will populate clients when MongoDB becomes available.
        setIsLoaded(true);
        startSilentBackgroundRetry();
      } finally {
        clearTimeout(timeoutId);
      }
    };
    syncFromApi();
  }, [startSilentBackgroundRetry, mergeWithLocal]);

  // Save to localStorage as backup (always) — strip passwords before persisting
  useEffect(() => {
    if (isLoaded) {
      safeSetItem('studio_clients', JSON.stringify(clients));
      const workersToStore = workers.map(({ password: _pw, ...w }) => w);
      safeSetItem('studio_workers', JSON.stringify(workersToStore));
    }
  }, [clients, workers, isLoaded]);

  const addAuditLog = useCallback((action: string, description: string) => {
    setAuditLogs(prev => [{
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      description,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const retryLoad = useCallback(async () => {
    setApiError(false);
    setIsRetrying(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const clientRes = await fetch('/api/clients', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (clientRes.ok) {
        const data = await clientRes.json();
        setUseApi(true);
        setApiError(false);
        if (Array.isArray(data)) mergeWithLocal(data);
        setIsLoaded(true);
      } else {
        throw new Error('API non-ok');
      }
    } catch {
      // Silent failure — schedule background retry, never show error to user
      startSilentBackgroundRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [startSilentBackgroundRetry, mergeWithLocal]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) return false;
      const data = await sessionRes.json();
      if (!data?.isLoggedIn) return false;
      const profile: UserProfile = {
        id: data.userId,
        name: data.name,
        email: data.email,
        avatar: null,
        role: data.role,
      };
      setIsAuthenticated(true);
      setUserProfile(profile);
      safeSetItem('studio_user', JSON.stringify(profile));
      addAuditLog('Login', `${data.name} logged in successfully.`);
      return true;
    } catch {
      return false;
    }
  }, [addAuditLog]);

  const logout = useCallback(async () => {
    addAuditLog('Logout', 'User logged out.');
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setIsAuthenticated(false);
    safeRemoveItem('studio_user');
  }, [addAuditLog]);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const newProfile = { ...prev, ...updates };
      
      // If a worker updates their profile, update it in the workers array too.
      if (newProfile.role === 'Worker' && newProfile.id) {
        setWorkers(workersList => workersList.map(w => 
          w.id === newProfile.id ? { ...w, ...updates } : w
        ));

        if (useApi) {
          fetch(`/api/workers/${newProfile.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }).catch(e => console.warn('API Error:', e));
        }
      }

      // Persist profile without password
      const { password: _pw, ...profileToStore } = newProfile;
      safeSetItem('studio_user', JSON.stringify(profileToStore));
      addAuditLog('Profile Updated', 'User profile details were modified.');
      return newProfile;
    });
  }, [useApi, addAuditLog]);

  const addWorker = useCallback((name: string, email: string, password?: string) => {
    const newWorker: UserProfile = {
      id: crypto.randomUUID(),
      name,
      email,
      password: password || '123',
      avatar: null,
      role: 'Worker'
    };
    setWorkers(prev => [...prev, newWorker]);
    if (useApi) {
      fetch('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorker),
      }).catch(e => console.warn('API Error:', e));
    }
    addAuditLog('Team Member Added', `Worker ${name} (${email}) was added to the team.`);
  }, [useApi, addAuditLog]);

  const removeWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    if (useApi) {
      fetch(`/api/workers/${id}`, {
        method: 'DELETE',
      }).catch(e => console.warn('API Error:', e));
    }
    addAuditLog('Team Member Removed', `A worker was removed from the team.`);
  }, [useApi, addAuditLog]);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'lastActivity' | 'timeline' | 'payments' | 'measurements' | 'fittings' | 'totalCost' | 'startDate' | 'nextFittingDate' | 'deliveryDate' | 'fabricPhotos' | 'illustrations' | 'clientPhotos' | 'productionNotes' | 'howDidYouHear' | 'comments' | 'dateOfBirth'>) => {
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
        { id: `t-${Date.now()}`, date: now, action: 'Booking', description: `${clientData.name} was booked as a new client.` },
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
      // Write to localStorage immediately so mergeWithLocal sees it even if
      // the component re-renders before the async save-effect fires.
      safeSetItem('studio_clients', JSON.stringify(next));
      return next;
    });
    setActiveClientId(newClient.id);

    // Sync to MongoDB
    if (useApi) {
      fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
      }).catch(e => console.warn('API Error:', e));
    }
    addAuditLog('Client Added', `Created new client record for ${newClient.name}.`);
  }, [useApi, addAuditLog]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, lastActivity: now } : c
    ));

    // Sync to MongoDB
    if (useApi) {
      fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...updates, lastActivity: now }),
      }).catch(e => console.warn('API Error:', e));
    }
    const updatedClientName = clients.find(c => c.id === id)?.name || 'a client';
    addAuditLog('Client Updated', `Modified record for ${updatedClientName}.`);
  }, [useApi, clients, addAuditLog]);

  const addPayment = useCallback((clientId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>) => {
    // Generate a unique, unguessable receipt number (e.g. HOF-A4X9B2)
    const randomHash = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const receiptNumber = `HOF-${randomHash}`;
    
    const paymentWithId: Payment = { ...payment, id: `pay-${Date.now()}`, receiptNumber };
    const now = new Date().toISOString();

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const newTimelineEvent: TimelineEvent = {
          id: `t-${Date.now()}`,
          date: now,
          action: 'Payment Recorded',
          description: `Payment of GH₵${payment.amount.toLocaleString()} via ${payment.method}.`,
        };
        
        const updatedTimeline = [...c.timeline, newTimelineEvent];
        const newTotalPaid = [...c.payments, paymentWithId].reduce((sum, p) => sum + p.amount, 0);

        if (newTotalPaid >= c.totalCost && (newTotalPaid - payment.amount) < c.totalCost) {
            updatedTimeline.push({
                id: `t-${Date.now()}-cleared`,
                date: now,
                action: 'Paid in Full',
                description: 'Client balance cleared. Garment ready for final delivery.',
            });
        }

        const updates = {
          payments: [...c.payments, paymentWithId],
          timeline: updatedTimeline,
          lastActivity: now,
        };

        if (useApi) {
          fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }).catch(e => console.warn('API Error:', e));
        }

        return { ...c, ...updates };
      }
      return c;
    }));
    addAuditLog('Payment Added', `Recorded payment of GH₵${payment.amount} for a client.`);
  }, [useApi, addAuditLog]);

  const addTimelineEvent = useCallback((clientId: string, action: string, description: string) => {
    const now = new Date().toISOString();
    const event: TimelineEvent = {
      id: `t-${Date.now()}`,
      date: now,
      action,
      description,
    };
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedTimeline = [...c.timeline, event];
        if (useApi) {
          fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timeline: updatedTimeline, lastActivity: now }),
          }).catch(e => console.warn('API Error:', e));
        }
        return { ...c, timeline: updatedTimeline, lastActivity: now };
      }
      return c;
    }));
  }, [useApi]);

  const updateMeasurements = useCallback((clientId: string, measurements: Measurements) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const isFirst = !c.measurementsTaken;
        const newTimelineEvent: TimelineEvent = {
          id: `t-${Date.now()}`,
          date: now,
          action: isFirst ? 'Measurements Taken' : 'Measurements Updated',
          description: isFirst ? 'Client measurements recorded.' : 'Client measurements were updated.',
        };
        const updatedTimeline = [...c.timeline, newTimelineEvent];
        const updates = { measurements, timeline: updatedTimeline, lastActivity: now, measurementsTaken: true };
        if (useApi) {
          fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }).catch(e => console.warn('API Error:', e));
        }
        return { ...c, ...updates };
      }
      return c;
    }));
    addAuditLog('Measurements Updated', `Updated measurements for a client.`);
  }, [useApi, addAuditLog]);

  const updateFittings = useCallback((clientId: string, fittings: Fitting) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => {
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
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fittings, timeline: updatedTimeline, lastActivity: now }),
          }).catch(e => console.warn('API Error:', e));
        }
        return {
          ...c,
          fittings,
          timeline: updatedTimeline,
          lastActivity: now,
        };
      }
      return c;
    }));
    addAuditLog('Fitting Updated', `Updated fitting schedule for a client.`);
  }, [useApi, addAuditLog]);

  const addProductionNote = useCallback((clientId: string, noteText: string) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const newNote: ProductionNote = {
          id: `n-${Date.now()}`,
          author: userProfile.name,
          text: noteText,
          timestamp: now
        };
        const updatedNotes = [...(c.productionNotes || []), newNote];
        if (useApi) {
          fetch(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productionNotes: updatedNotes, lastActivity: now }),
          }).catch(e => console.warn('API Error:', e));
        }
        return {
          ...c,
          productionNotes: updatedNotes,
          lastActivity: now
        };
      }
      return c;
    }));
  }, [useApi, userProfile.name]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setActiveClientId(prev => prev === id ? null : prev);
    if (useApi) {
      fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      }).catch(e => console.warn('API Error:', e));
    }
    addAuditLog('Client Deleted', 'A client record was permanently deleted.');
  }, [useApi, addAuditLog]);

  const getActiveClient = useCallback(() => {
    return clients.find(c => c.id === activeClientId);
  }, [clients, activeClientId]);

  const filteredClients = clients.filter(c => {
    // Role-based filtering
    if (userProfile.role === 'Worker' && c.assignedWorker !== userProfile.name) {
      return false;
    }

    const nameStr = (c.name || c.fullName || '').toLowerCase();
    const emailStr = (c.email || '').toLowerCase();
    const eventMonthStr = (c.eventMonth || '').toLowerCase();
    const searchStr = searchQuery.toLowerCase();
    
    return nameStr.includes(searchStr) || 
           emailStr.includes(searchStr) || 
           eventMonthStr.includes(searchStr);
  });

  // ── Keyboard scroll fix (iOS Safari + Chrome mobile) ────────────────────
  // When a virtual keyboard appears the browser forcibly scrolls window even
  // though body has overflow:hidden. It never restores the scroll position
  // after the keyboard is dismissed, leaving content stuck behind the status
  // bar.  We detect keyboard dismissal via visualViewport (viewport grows) and
  // reset the window scroll to 0.
  useEffect(() => {
    const resetScroll = () => window.scrollTo(0, 0);

    // Primary: visualViewport fires on every keyboard show/hide.
    // Only reset when the viewport GROWS (keyboard dismissed, not appeared).
    let prevVpHeight = window.visualViewport?.height ?? 0;
    const handleVpResize = () => {
      const h = window.visualViewport?.height ?? 0;
      if (h > prevVpHeight) resetScroll();
      prevVpHeight = h;
    };
    window.visualViewport?.addEventListener('resize', handleVpResize);

    // Fallback for browsers without visualViewport: reset once the keyboard
    // is fully gone (i.e. no editable element is focused after a short delay).
    let blurTimer: ReturnType<typeof setTimeout>;
    const handleFocusOut = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const a = document.activeElement;
        const isEditable = a && (
          a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'
        );
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

  // ── Session verification: correct the optimistic auth state ─────────────
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.isLoggedIn) {
          setIsAuthenticated(true);
          setUserProfile(prev => ({
            ...prev,
            id: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
          }));
        } else {
          setIsAuthenticated(false);
          safeRemoveItem('studio_user');
        }
      })
      .catch(() => { /* keep optimistic state if server is unreachable */ });
  }, []);

  // Cycle loading messages while the app initialises
  useEffect(() => {
    if (isLoaded) return;
    const t = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-canvas gap-6 select-none">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center size-16 rounded-2xl border-2 border-charcoal/80 bg-white shadow-md overflow-hidden">
            <img src="/ho_logo.png" alt="House of Oath" className="h-full w-full object-contain p-1" />
          </div>
          <p className="text-charcoal font-display font-bold text-lg tracking-wide">House of Oath</p>
        </div>

        {/* Cycling message — keyed so it re-mounts and replays the fade-in */}
        <p
          key={loadingMsgIdx}
          className="loading-msg text-gray text-sm font-medium text-center px-8"
        >
          {LOADING_MESSAGES[loadingMsgIdx]}
        </p>

        {/* Windows-style wave dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className="loading-dot inline-block w-2.5 h-2.5 rounded-full bg-primary"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <StudioContext.Provider value={{
      clients,
      activeClient: getActiveClient() || null,
      activeClientId,
      isAuthenticated,
      searchQuery,
      userProfile,
      auditLogs,
      workers,
      setSearchQuery,
      setActiveClient: setActiveClientId,
      setActiveClientId,
      addClient,
      updateClient,
      deleteClient,
      addPayment,
      addTimelineEvent,
      updateMeasurements,
      updateFittings,
      updateUserProfile,
      addAuditLog,
      login,
      logout,
      getActiveClient,
      filteredClients,
      addProductionNote,
      addWorker,
      removeWorker,
      apiError,
      isRetrying,
      retryLoad,
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}
