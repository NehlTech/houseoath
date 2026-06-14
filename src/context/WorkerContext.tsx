'use client';

import React, { createContext, useContext, useState, useLayoutEffect, useCallback, ReactNode } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { useAuditContext } from './AuditContext';
import { useAuthContext, UserProfile } from './AuthContext';

interface WorkerContextType {
  workers: UserProfile[];
  setWorkers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  addWorker: (name: string, email: string, role?: 'Worker' | 'Admin') => Promise<string | null>;
  rawRemoveWorker: (id: string) => Promise<boolean>;
  archiveWorker: (id: string) => void;
  restoreWorker: (id: string) => void;
}

const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

export function useWorkerContext() {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error('useWorkerContext must be used within WorkerProvider');
  return ctx;
}

export function WorkerProvider({ children }: { children: ReactNode }) {
  const { addAuditLog } = useAuditContext();
  const { useApi } = useAuthContext();

  const [workers, setWorkers] = useState<UserProfile[]>([]);

  const layoutInit = React.useRef(false);

  // ── Synchronous localStorage restore ──
  useLayoutEffect(() => {
    if (layoutInit.current) return;
    layoutInit.current = true;

    try {
      const savedWorkers = safeGetItem('studio_workers');
      if (savedWorkers) {
        const parsed = JSON.parse(savedWorkers);
        if (Array.isArray(parsed) && parsed.length > 0) setWorkers(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const addWorker = useCallback(
    async (name: string, email: string, role: 'Worker' | 'Admin' = 'Worker'): Promise<string | null> => {
      const emailLower = email.trim().toLowerCase();

      // Client-side duplicate guard
      const duplicate = workers.some(w => w.email.toLowerCase() === emailLower);
      if (duplicate) return 'A team member with this email already exists';

      const tempId = crypto.randomUUID();
      const newWorker: UserProfile = { id: tempId, name, email: emailLower, avatar: null, role, status: 'Active' };
      setWorkers(prev => [...prev, newWorker]);

      if (useApi) {
        try {
          const res = await fetch('/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: emailLower, role }),
          });
          if (!res.ok) {
            setWorkers(prev => prev.filter(w => w.id !== tempId));
            const data = await res.json().catch(() => ({}));
            return (data as { error?: string }).error ?? 'Failed to add team member';
          }
        } catch {
          setWorkers(prev => prev.filter(w => w.id !== tempId));
          return 'Network error. Please try again.';
        }
      }

      addAuditLog('Team Member Added', `${role} ${name} (${email}) was added to the team.`);
      return null;
    },
    [useApi, addAuditLog, workers],
  );

  const rawRemoveWorker = useCallback(
    async (id: string): Promise<boolean> => {
      const worker = workers.find(w => w.id === id);
      const workerName = worker?.name ?? '';

      // Optimistic remove
      setWorkers(prev => prev.filter(w => w.id !== id));

      if (useApi) {
        try {
          const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            // Server rejected — restore the worker
            if (worker) setWorkers(prev => [...prev, worker]);
            return false;
          }
        } catch {
          // Network failure — restore the worker
          if (worker) setWorkers(prev => [...prev, worker]);
          return false;
        }
      }

      addAuditLog(
        'Team Member Removed',
        `${workerName || 'A worker'} was permanently removed from the team.`,
      );
      return true;
    },
    [useApi, addAuditLog, workers],
  );

  const archiveWorker = useCallback(
    (id: string) => {
      const worker = workers.find(w => w.id === id);
      setWorkers(prev => prev.map(w => (w.id === id ? { ...w, status: 'Archived' as const } : w)));
      if (useApi) {
        fetch(`/api/workers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Archived' }),
        }).catch(e => console.warn('API Error:', e));
      }
      addAuditLog(
        'Worker Archived',
        `${worker?.name ?? 'A worker'} was archived and can no longer log in.`,
      );
    },
    [useApi, addAuditLog, workers],
  );

  const restoreWorker = useCallback(
    (id: string) => {
      const worker = workers.find(w => w.id === id);
      setWorkers(prev => prev.map(w => (w.id === id ? { ...w, status: 'Active' as const } : w)));
      if (useApi) {
        fetch(`/api/workers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Active' }),
        }).catch(e => console.warn('API Error:', e));
      }
      addAuditLog(
        'Worker Restored',
        `${worker?.name ?? 'A worker'} was restored and can log in again.`,
      );
    },
    [useApi, addAuditLog, workers],
  );

  // ── Persist workers to localStorage (strip passwords) ──
  React.useEffect(() => {
    const workersToStore = workers.map(({ password: _pw, ...w }) => w);
    safeSetItem('studio_workers', JSON.stringify(workersToStore));
  }, [workers]);

  return (
    <WorkerContext.Provider
      value={{ workers, setWorkers, addWorker, rawRemoveWorker, archiveWorker, restoreWorker }}
    >
      {children}
    </WorkerContext.Provider>
  );
}
