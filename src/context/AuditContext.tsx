'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
}

interface AuditContextType {
  auditLogs: AuditLog[];
  addAuditLog: (action: string, description: string) => void;
}

const INITIAL_LOG: AuditLog[] = [
  {
    id: 'log-1',
    action: 'System Init',
    description: 'Application loaded successfully.',
    timestamp: new Date().toISOString(),
  },
];

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function useAuditContext() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAuditContext must be used within AuditProvider');
  return ctx;
}

export function AuditProvider({ children }: { children: ReactNode }) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_LOG);

  const addAuditLog = useCallback((action: string, description: string) => {
    setAuditLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        action,
        description,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    // Fire-and-forget to MongoDB — no dependency on useApi to avoid circular deps
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, description }),
    }).catch(() => {});
  }, []);

  return (
    <AuditContext.Provider value={{ auditLogs, addAuditLog }}>
      {children}
    </AuditContext.Provider>
  );
}
