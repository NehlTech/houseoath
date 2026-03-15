'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
  // Body
  bust: string;
  waist: string;
  hip: string;
  // Upper Body
  shoulderToNipple: string;
  shoulderUnderBust: string;
  shoulderToWaist: string;
  nippleToNipple: string;
  blouseLength: string;
  acrossBack: string;
  // Skirt
  skirtShortMidi: string;
  skirtLong: string;
  // Dress
  dressShort: string;
  dressMidi: string;
  dressLong: string;
  // Sleeve
  sleeve: string;
  sleeveLength: string;
  aroundArm: string;
  aroundElbow: string;
  aroundWrist: string;
  // Unit
  unit: 'cm' | 'inches';
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
  addPayment: (clientId: string, payment: Omit<Payment, 'id'>) => void;
  addTimelineEvent: (clientId: string, action: string, description: string) => void;
  updateMeasurements: (clientId: string, measurements: Measurements) => void;
  updateFittings: (clientId: string, fittings: Fitting) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addAuditLog: (action: string, description: string) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  getActiveClient: () => Client | undefined;
  filteredClients: Client[];
  addProductionNote: (clientId: string, noteText: string) => void;
  addWorker: (name: string, email: string, password?: string) => void;
  removeWorker: (id: string) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

const defaultMeasurements: Measurements = {
  bust: '', waist: '', hip: '',
  shoulderToNipple: '', shoulderUnderBust: '', shoulderToWaist: '',
  nippleToNipple: '', blouseLength: '', acrossBack: '',
  skirtShortMidi: '', skirtLong: '',
  dressShort: '', dressMidi: '', dressLong: '',
  sleeve: '', sleeveLength: '', aroundArm: '', aroundElbow: '', aroundWrist: '',
  unit: 'cm',
};

const defaultFittings: Fitting = {
  startDate: '', firstFitting: '', secondFitting: '', finalFitting: '', deliveryDate: '',
};

// Sample clients for demo
const sampleClients: Client[] = [
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
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurements: { ...defaultMeasurements, bust: '92', waist: '72', hip: '98' },
    fittings: { ...defaultFittings, startDate: '2026-04-01', firstFitting: '2026-05-01', secondFitting: '2026-05-20', finalFitting: '2026-06-10', deliveryDate: '2026-06-18' },
    payments: [
      { id: 'p1', date: '2026-03-01', amount: 2000, method: 'Bank Transfer', receiptNumber: 'HOF-X7Y2B9' },
      { id: 'p2', date: '2026-04-15', amount: 1500, method: 'Mobile Money', receiptNumber: 'HOF-A1Q8F4' },
    ],
    totalCost: 5000,
    timeline: [
      { id: 't1', date: '2026-03-01', action: 'Client Created', description: 'New client onboarded for wedding reception gown.' },
      { id: 't2', date: '2026-03-01', action: 'Payment Recorded', description: 'Initial deposit of GH₵2,000 received.' },
      { id: 't3', date: '2026-03-15', action: 'Measurements Added', description: 'Body measurements taken at studio.' },
    ],
    status: 'Active',
    createdAt: '2026-03-01T10:00:00Z',
    lastActivity: '2026-03-15T14:30:00Z',
    startDate: '2026-04-01',
    nextFittingDate: '2026-05-01',
    deliveryDate: '2026-06-18',
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
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurements: { ...defaultMeasurements },
    fittings: defaultFittings,
    payments: [
      { id: 'p3', date: '2026-03-10', amount: 3000, method: 'Bank Transfer', receiptNumber: 'HOF-M4K9P2' },
    ],
    totalCost: 7500,
    timeline: [
      { id: 't4', date: '2026-03-10', action: 'Client Created', description: 'New client for engagement ceremony.' },
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
    illustrations: [],
    clientPhotos: [],
    productionNotes: [],
    measurements: { ...defaultMeasurements, bust: '88', waist: '68', hip: '94' },
    fittings: { ...defaultFittings, startDate: '2026-03-20', firstFitting: '2026-04-15' },
    payments: [],
    totalCost: 4000,
    timeline: [
      { id: 't6', date: '2026-03-12', action: 'Client Created', description: 'New client for naming ceremony.' },
    ],
    status: 'Completed',
    createdAt: '2026-03-12T11:00:00Z',
    lastActivity: '2026-03-12T11:00:00Z',
    startDate: '2026-03-20',
    nextFittingDate: '2026-04-15',
    deliveryDate: '2026-05-28',
  },
];

let isFetchingClients = false;

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

export function StudioProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    name: 'Admin', 
    email: 'admin@houseofoath.com', 
    password: 'admin123',
    avatar: null, 
    role: 'Admin' 
  });
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 'log-1', action: 'System Init', description: 'Application loaded successfully.', timestamp: new Date().toISOString() }
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useApi, setUseApi] = useState(false);

  // Load clients: try API first, fallback to localStorage
  useEffect(() => {
    if (isFetchingClients) return;
    isFetchingClients = true;

    const loadData = async () => {
      try {
        const savedAuth = safeGetItem('studio_auth');
        if (savedAuth === 'true') setIsAuthenticated(true);
        const savedUser = safeGetItem('studio_user');
        if (savedUser) {
          try { setUserProfile(JSON.parse(savedUser)); } catch { /* corrupt data, use defaults */ }
        }
      } catch { /* ignore auth restore errors */ }

      try {
        // Load clients
        const clientRes = await fetch('/api/clients');
        if (clientRes.ok) {
          const data = await clientRes.json();
          setUseApi(true);
          if (Array.isArray(data) && data.length > 0) setClients(data);
          else {
            for (const sc of sampleClients) {
              await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sc) });
            }
            setClients(sampleClients);
          }
        } else {
          throw new Error('Client API returned non-ok');
        }

        // Load workers
        const workerRes = await fetch('/api/workers');
        if (workerRes.ok) {
          const data = await workerRes.json();
          if (Array.isArray(data) && data.length > 0) setWorkers(data);
          else {
            const defaultWorker = { id: 'w-demo', name: 'Kwame (Tailor)', email: 'worker@houseofoath.com', password: '123', avatar: null, role: 'Worker' };
            await fetch('/api/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaultWorker) });
            setWorkers([defaultWorker as UserProfile]);
          }
        }
      } catch (err) {
        console.error('API Error, falling back to local data:', err);
        // Fallback: localStorage
        try {
          const savedClients = safeGetItem('studio_clients');
          const savedWorkers = safeGetItem('studio_workers');
          if (savedClients) setClients(JSON.parse(savedClients));
          else setClients(sampleClients);
          if (savedWorkers) setWorkers(JSON.parse(savedWorkers));
        } catch {
          // Even localStorage fallback failed — use hardcoded samples
          setClients(sampleClients);
        }
      } finally {
        // ALWAYS mark as loaded — never leave the app stuck on a blank screen
        setTimeout(() => setIsLoaded(true), 100);
      }
    };
    loadData();
  }, []);

  // Save to localStorage as backup (always)
  useEffect(() => {
    if (isLoaded) {
      safeSetItem('studio_clients', JSON.stringify(clients));
      safeSetItem('studio_workers', JSON.stringify(workers));
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

  const login = useCallback((email: string, password: string): boolean => {
    if (!email || !password) return false;

    // Admin login
    if (email.toLowerCase() === 'admin@houseofoath.com') {
      if (password === 'admin123') {
        const adminProfile: UserProfile = { name: 'Admin', email, avatar: null, role: 'Admin', password: 'admin123' };
        setIsAuthenticated(true);
        setUserProfile(adminProfile);
        safeSetItem('studio_auth', 'true');
        safeSetItem('studio_user', JSON.stringify(adminProfile));
        addAuditLog('Login', `Admin logged in successfully.`);
        return true;
      }
      return false;
    }

    // Worker login check
    const matchedWorker = workers.find(w => w.email.toLowerCase() === email.toLowerCase());
    if (matchedWorker && matchedWorker.password === password) {
      setIsAuthenticated(true);
      setUserProfile(matchedWorker);
      safeSetItem('studio_auth', 'true');
      safeSetItem('studio_user', JSON.stringify(matchedWorker));
      addAuditLog('Login', `Worker ${matchedWorker.name} logged in successfully.`);
      return true;
    }

    return false;
  }, [workers, addAuditLog]);

  const logout = useCallback(() => {
    addAuditLog('Logout', 'User logged out.');
    setIsAuthenticated(false);
    safeRemoveItem('studio_auth');
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
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updates) 
          }).catch(console.error);
        }
      }

      safeSetItem('studio_user', JSON.stringify(newProfile));
      addAuditLog('Profile Updated', 'User profile details were modified.');
      return newProfile;
    });
  }, [useApi, addAuditLog]);

  const addWorker = useCallback((name: string, email: string, password?: string) => {
    const newWorker: UserProfile = {
      id: `w-${Date.now()}`,
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
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newWorker) 
      }).catch(console.error);
    }
    addAuditLog('Team Member Added', `Worker ${name} (${email}) was added to the team.`);
  }, [useApi, addAuditLog]);

  const removeWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    if (useApi) {
      fetch(`/api/workers/${id}`, { method: 'DELETE' }).catch(console.error);
    }
    addAuditLog('Team Member Removed', `A worker was removed from the team.`);
  }, [useApi, addAuditLog]);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'lastActivity' | 'timeline' | 'payments' | 'measurements' | 'fittings' | 'totalCost' | 'startDate' | 'nextFittingDate' | 'deliveryDate' | 'fabricPhotos' | 'illustrations' | 'clientPhotos' | 'productionNotes' | 'howDidYouHear' | 'comments' | 'dateOfBirth'>) => {
    const now = new Date().toISOString();
    const newClient: Client = {
      ...clientData,
      id: Date.now().toString(),
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
        { id: `t-${Date.now()}`, date: now, action: 'Client Created', description: `${clientData.name} was added as a new client.` },
      ],
      status: 'Active',
      createdAt: now,
      lastActivity: now,
      startDate: '',
      nextFittingDate: '',
      deliveryDate: '',
    };
    setClients(prev => [newClient, ...prev]);
    setActiveClientId(newClient.id);

    // Sync to MongoDB
    if (useApi) {
      fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClient) }).catch(console.error);
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
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...updates, lastActivity: now }) 
      }).catch(console.error);
    }
    const updatedClientName = clients.find(c => c.id === id)?.name || 'a client';
    addAuditLog('Client Updated', `Modified record for ${updatedClientName}.`);
  }, [useApi, clients, addAuditLog]);

  const addPayment = useCallback((clientId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>) => {
    // Generate a unique, unguessable receipt number (e.g. HOF-A4X9B2)
    const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase();
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
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updates) 
          }).catch(console.error);
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
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ timeline: updatedTimeline, lastActivity: now }) 
          }).catch(console.error);
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
        const newTimelineEvent: TimelineEvent = {
          id: `t-${Date.now()}`,
          date: now,
          action: 'Measurements Updated',
          description: 'Client measurements were updated.',
        };
        const updatedTimeline = [...c.timeline, newTimelineEvent];
        if (useApi) {
          fetch(`/api/clients/${clientId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ measurements, timeline: updatedTimeline, lastActivity: now }) 
          }).catch(console.error);
        }
        return {
          ...c,
          measurements,
          timeline: updatedTimeline,
          lastActivity: now,
        };
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
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ fittings, timeline: updatedTimeline, lastActivity: now }) 
          }).catch(console.error);
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
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ productionNotes: updatedNotes, lastActivity: now }) 
          }).catch(console.error);
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

  const getActiveClient = useCallback(() => {
    return clients.find(c => c.id === activeClientId);
  }, [clients, activeClientId]);

  const filteredClients = clients.filter(c => {
    // Role-based filtering
    if (userProfile.role === 'Worker' && c.assignedWorker !== userProfile.name) {
      return false;
    }

    const nameStr = (c.name || (c as any).fullName || '').toLowerCase();
    const emailStr = (c.email || '').toLowerCase();
    const eventMonthStr = (c.eventMonth || '').toLowerCase();
    const searchStr = searchQuery.toLowerCase();
    
    return nameStr.includes(searchStr) || 
           emailStr.includes(searchStr) || 
           eventMonthStr.includes(searchStr);
  });

  if (!isLoaded) {
    return null;
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
