'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, ReactNode, useRef } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { useAuditContext } from './AuditContext';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  password?: string;
  avatar: string | null;
  role: 'Admin' | 'Worker';
  status?: 'Active' | 'Archived';
}

interface AuthContextType {
  isAuthenticated: boolean;
  sessionChecked: boolean;
  userProfile: UserProfile;
  useApi: boolean;
  apiError: boolean;
  isRetrying: boolean;
  setApiError: (v: boolean) => void;
  setUseApi: (v: boolean) => void;
  setIsRetrying: (v: boolean) => void;
  rawLogin: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: boolean; message?: string; isInfo?: boolean; sessionName?: string }>;
  rawLogout: () => Promise<void>;
  rawUpdateUserProfile: (
    updates: Partial<UserProfile>,
    setWorkers?: (updater: (prev: UserProfile[]) => UserProfile[]) => void,
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { addAuditLog } = useAuditContext();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Admin',
    email: 'admin@houseofoath.com',
    avatar: null,
    role: 'Admin',
  });
  const [useApi, setUseApi] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const layoutInit = useRef(false);

  // ── Synchronous localStorage restore (runs before first paint) ──
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
  }, []);

  // ── Session verification: correct the optimistic auth state ──
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
        setSessionChecked(true);
      })
      .catch(() => {
        // Keep optimistic state if server is unreachable
        setSessionChecked(true);
      });
  }, []);

  const rawLogin = useCallback(async (
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<{ ok: boolean; message?: string; isInfo?: boolean; sessionName?: string }> => {
    if (!email || !password) return { ok: false, message: 'Email and password are required' };
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const loginData = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, message: (loginData.error as string) ?? 'Invalid email or password' };
      }
      // Soft success — sign-in link was sent, no session created
      if (loginData.signInLinkSent) {
        return { ok: false, message: loginData.message as string, isInfo: true };
      }
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) return { ok: false, message: 'Login failed' };
      const data = await sessionRes.json();
      if (!data?.isLoggedIn) return { ok: false, message: 'Login failed' };

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
      return { ok: true, sessionName: data.name };
    } catch {
      return { ok: false, message: 'Login failed' };
    }
  }, []);

  const rawLogout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    safeRemoveItem('studio_user');
    window.location.replace('/login');
  }, []);

  const rawUpdateUserProfile = useCallback(
    (
      updates: Partial<UserProfile>,
      setWorkers?: (updater: (prev: UserProfile[]) => UserProfile[]) => void,
    ) => {
      setUserProfile(prev => {
        const newProfile = { ...prev, ...updates };

        // If a worker updates their profile, update it in the workers array too.
        if (newProfile.role === 'Worker' && newProfile.id && setWorkers) {
          setWorkers(workersList =>
            workersList.map(w => (w.id === newProfile.id ? { ...w, ...updates } : w)),
          );

          if (useApi) {
            fetch(`/api/workers/${newProfile.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            }).catch(e => console.warn('API Error:', e));
          }
        }

        // Admin name changes have nowhere else to persist — without this,
        // the name silently reverts to "Admin" on the next session check.
        if (newProfile.role === 'Admin' && useApi && typeof updates.name === 'string') {
          fetch('/api/auth/admin-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: updates.name }),
          }).catch(e => console.warn('API Error:', e));
        }

        // Persist profile without password
        const { password: _pw, ...profileToStore } = newProfile;
        safeSetItem('studio_user', JSON.stringify(profileToStore));
        addAuditLog('Profile Updated', 'User profile details were modified.');
        return newProfile;
      });
    },
    [useApi, addAuditLog],
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        sessionChecked,
        userProfile,
        useApi,
        apiError,
        isRetrying,
        setApiError,
        setUseApi,
        setIsRetrying,
        rawLogin,
        rawLogout,
        rawUpdateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
