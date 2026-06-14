'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// ── Re-export all types for backward compat ──
export type { AuditLog } from './AuditContext';
export type { UserProfile } from './AuthContext';
export type {
  Payment,
  Fitting,
  TimelineEvent,
  Measurements,
  FabricItem,
  FeedbackComment,
  ProductionNote,
  DesignIllustration,
  Client,
} from './ClientContext';

import { AuditProvider, useAuditContext, type AuditLog } from './AuditContext';
import { AuthProvider, useAuthContext, type UserProfile } from './AuthContext';
import { WorkerProvider, useWorkerContext } from './WorkerContext';
import {
  ClientProvider,
  useClientContext,
  LOADING_MESSAGES,
  type Client,
  type Measurements,
  type Fitting,
  type Payment,
} from './ClientContext';

// ── Merged context type — identical to the original StudioContextType ──
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
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addAuditLog: (action: string, description: string) => void;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: boolean; message?: string; isInfo?: boolean }>;
  logout: () => void;
  getActiveClient: () => Client | undefined;
  filteredClients: Client[];
  addProductionNote: (clientId: string, noteText: string) => void;
  addWorker: (name: string, email: string, role?: 'Worker' | 'Admin') => Promise<string | null>;
  removeWorker: (id: string) => void;
  archiveWorker: (id: string) => void;
  restoreWorker: (id: string) => void;
  sessionChecked: boolean;
  apiError: boolean;
  isRetrying: boolean;
  retryLoad: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

// ── Loading screen (same markup as the original) ──
function LoadingScreen({ loadingMsgIdx }: { loadingMsgIdx: number }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-canvas gap-6 select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center size-16 rounded-2xl border-2 border-charcoal/80 bg-white shadow-md overflow-hidden">
          <img src="/ho_logo.png" alt="House of Oath" className="h-full w-full object-contain p-1" />
        </div>
        <p className="text-charcoal font-display font-bold text-lg tracking-wide">House of Oath</p>
      </div>

      <p
        key={loadingMsgIdx}
        className="loading-msg text-gray text-sm font-medium text-center px-8"
      >
        {LOADING_MESSAGES[loadingMsgIdx]}
      </p>

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

// ── Inner coordinator — lives INSIDE all 4 providers ──
function StudioFacadeProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  const audit = useAuditContext();
  const workerCtx = useWorkerContext();
  const clientCtx = useClientContext();

  // ── Background poll — keeps clients and workers in sync ──
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const id = setInterval(async () => {
      try {
        const [clientRes, workerRes] = await Promise.all([
          fetch('/api/clients', { signal: AbortSignal.timeout(8000), cache: 'no-store' }),
          fetch('/api/workers', { signal: AbortSignal.timeout(8000), cache: 'no-store' }),
        ]);
        if (clientRes.ok) clientCtx.mergeWithLocal(await clientRes.json());
        if (workerRes.ok) {
          const d = await workerRes.json();
          if (Array.isArray(d)) workerCtx.setWorkers(d);
        }
      } catch { /* silent */ }
    }, 20_000);
    return () => clearInterval(id);
  }, [auth.isAuthenticated, clientCtx, workerCtx]);

  // ── Composed login: auth + audit + data refresh ──
  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe?: boolean,
    ): Promise<{ ok: boolean; message?: string; isInfo?: boolean }> => {
      const result = await auth.rawLogin(email, password, rememberMe);
      if (result.ok) {
        audit.addAuditLog('Login', `${result.sessionName ?? email} logged in successfully.`);
        fetch('/api/clients', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (d) {
              clientCtx.mergeWithLocal(d);
              auth.setApiError(false);
            }
          })
          .catch(() => {});
        fetch('/api/workers', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (Array.isArray(d)) workerCtx.setWorkers(d);
          })
          .catch(() => {});
      }
      return { ok: result.ok, message: result.message, isInfo: result.isInfo };
    },
    [auth, audit, clientCtx, workerCtx],
  );

  // ── Composed logout: audit + server logout ──
  const logout = useCallback(async () => {
    audit.addAuditLog('Logout', 'User logged out.');
    await auth.rawLogout();
  }, [audit, auth]);

  // ── Composed updateUserProfile: auth state + workers array ──
  const updateUserProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      auth.rawUpdateUserProfile(updates, workerCtx.setWorkers);
    },
    [auth, workerCtx.setWorkers],
  );

  // ── Composed removeWorker: cascade to clients + API call ──
  const removeWorker = useCallback(
    (id: string) => {
      const worker = workerCtx.workers.find(w => w.id === id);
      clientCtx.cascadeWorkerRemoval(id, worker?.name ?? '');
      workerCtx.rawRemoveWorker(id);
    },
    [workerCtx, clientCtx],
  );

  if (!clientCtx.isLoaded) {
    return <LoadingScreen loadingMsgIdx={clientCtx.loadingMsgIdx} />;
  }

  return (
    <StudioContext.Provider
      value={{
        // Auth
        isAuthenticated: auth.isAuthenticated,
        sessionChecked: auth.sessionChecked,
        userProfile: auth.userProfile,
        apiError: auth.apiError,
        isRetrying: auth.isRetrying,
        login,
        logout,
        updateUserProfile,
        // Audit
        auditLogs: audit.auditLogs,
        addAuditLog: audit.addAuditLog,
        // Workers
        workers: workerCtx.workers,
        addWorker: workerCtx.addWorker,
        removeWorker,
        archiveWorker: workerCtx.archiveWorker,
        restoreWorker: workerCtx.restoreWorker,
        // Clients
        clients: clientCtx.clients,
        activeClient: clientCtx.activeClient,
        activeClientId: clientCtx.activeClientId,
        searchQuery: clientCtx.searchQuery,
        filteredClients: clientCtx.filteredClients,
        setSearchQuery: clientCtx.setSearchQuery,
        setActiveClient: clientCtx.setActiveClientId,
        setActiveClientId: clientCtx.setActiveClientId,
        addClient: clientCtx.addClient,
        updateClient: clientCtx.updateClient,
        deleteClient: clientCtx.deleteClient,
        addPayment: clientCtx.addPayment,
        addTimelineEvent: clientCtx.addTimelineEvent,
        updateMeasurements: clientCtx.updateMeasurements,
        updateFittings: clientCtx.updateFittings,
        addProductionNote: clientCtx.addProductionNote,
        getActiveClient: clientCtx.getActiveClient,
        retryLoad: clientCtx.retryLoad,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

// ── Inner bridge that wires onWorkersData from WorkerContext into ClientProvider ──
function WorkerClientBridge({ children }: { children: ReactNode }) {
  const workerCtx = useWorkerContext();

  const handleWorkersData = useCallback((workers: UserProfile[]) => {
    workerCtx.setWorkers(workers);
  }, [workerCtx]);

  return (
    <ClientProvider onWorkersData={handleWorkersData}>
      <StudioFacadeProvider>
        {children}
      </StudioFacadeProvider>
    </ClientProvider>
  );
}

export function StudioProvider({ children }: { children: ReactNode }) {
  return (
    <AuditProvider>
      <AuthProvider>
        <WorkerProvider>
          <WorkerClientBridge>
            {children}
          </WorkerClientBridge>
        </WorkerProvider>
      </AuthProvider>
    </AuditProvider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within a StudioProvider');
  return ctx;
}
