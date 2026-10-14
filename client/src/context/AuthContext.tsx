import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, authApi } from '../services/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  restorationError: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: Parameters<typeof authApi.register>[0]) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function millisecondsUntilAccessExpiry(accessToken: string): number {
  try {
    const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return Math.max(0, payload.exp * 1000 - Date.now() - 30_000);
    }
  } catch {
    return 14 * 60 * 1000;
  }
  return 14 * 60 * 1000;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [restorationError, setRestorationError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      const token = await authApi.refresh();
      const profile = await authApi.me(token.access_token);
      setAccessToken(token.access_token);
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      setStatus('unauthenticated');
      if (error instanceof TypeError) {
        setRestorationError('Could not reach ScrapSetu. Check your connection and try again.');
      }
    }
  }, []);

  const refreshCurrentSession = useCallback(async () => {
    try {
      const token = await authApi.refresh();
      const profile = await authApi.me(token.access_token);
      setAccessToken(token.access_token);
      setUser(profile);
      setStatus('authenticated');
      setRestorationError(null);
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
      setRestorationError(
        error instanceof TypeError
          ? 'Your session could not be renewed because ScrapSetu is unreachable. Sign in again when the service is available.'
          : error instanceof Error ? error.message : 'Your session expired. Please sign in again.',
      );
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => void refreshCurrentSession(),
      millisecondsUntilAccessExpiry(accessToken),
    );
    return () => window.clearTimeout(timer);
  }, [accessToken, refreshCurrentSession]);

  const login = useCallback(async (email: string, password: string) => {
    const token = await authApi.login(email, password);
    const profile = await authApi.me(token.access_token);
    setAccessToken(token.access_token);
    setUser(profile);
    setRestorationError(null);
    setStatus('authenticated');
    return profile;
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => (
    authApi.register(data)
  ), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(accessToken || undefined);
      setRestorationError(null);
    } catch (error) {
      setRestorationError(
        `You were signed out in this browser, but the server could not clear the refresh session: ${error instanceof Error ? error.message : 'network error'}`,
      );
      throw error;
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, [accessToken]);

  const value = useMemo(() => ({
    status,
    user,
    accessToken,
    restorationError,
    login,
    register,
    logout,
  }), [status, user, accessToken, restorationError, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
