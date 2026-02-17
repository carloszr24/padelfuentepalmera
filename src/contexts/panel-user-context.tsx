'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PanelProfile = {
  full_name: string | null;
  wallet_balance: number | null;
  role: string | null;
  has_debt?: boolean | null;
  debt_amount?: number | null;
} | null;

export type PanelUserSerialized = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  email_confirmed_at?: string | null;
};

const STORAGE_KEY_PREFIX = 'panel-profile';

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

function getCachedProfile(userId: string): PanelProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelProfile;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedProfile(userId: string, profile: PanelProfile): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch {
    // ignore
  }
}

type PanelUserContextValue = {
  user: PanelUserSerialized | null;
  profile: PanelProfile;
  displayName: string;
  balance: number;
  isAdmin: boolean;
  hasDebt: boolean;
  debtAmount: number;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: PanelProfile) => void;
};

const PanelUserContext = createContext<PanelUserContextValue | null>(null);

export function usePanelUser(): PanelUserContextValue {
  const ctx = useContext(PanelUserContext);
  if (!ctx) {
    throw new Error('usePanelUser must be used within PanelUserProvider');
  }
  return ctx;
}

export function usePanelUserOptional(): PanelUserContextValue | null {
  return useContext(PanelUserContext);
}

type PanelUserProviderProps = {
  initialUser: PanelUserSerialized | null;
  initialProfile: PanelProfile;
  children: ReactNode;
};

export function PanelUserProvider({
  initialUser,
  initialProfile,
  children,
}: PanelUserProviderProps) {
  const [profile, setProfileState] = useState<PanelProfile>(() => {
    if (initialProfile && initialUser) {
      setCachedProfile(initialUser.id, initialProfile);
      return initialProfile;
    }
    if (initialUser) {
      const cached = getCachedProfile(initialUser.id);
      if (cached) return cached;
    }
    return initialProfile;
  });

  const setProfile = useCallback(
    (p: PanelProfile) => {
      setProfileState(p);
      if (initialUser?.id) setCachedProfile(initialUser.id, p);
    },
    [initialUser?.id]
  );

  const refreshProfile = useCallback(async () => {
    const res = await fetch('/api/panel/profile');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.profile != null) {
      setProfileState(data.profile);
      if (initialUser) setCachedProfile(initialUser.id, data.profile);
    }
  }, [initialUser?.id]);

  const value = useMemo<PanelUserContextValue>(() => {
    const balance = Number(profile?.wallet_balance ?? 0);
    const displayName =
      profile?.full_name ??
      (initialUser?.user_metadata?.full_name as string | undefined) ??
      initialUser?.email?.split('@')[0] ??
      'Jugador';
    return {
      user: initialUser,
      profile,
      displayName,
      balance,
      isAdmin: profile?.role === 'admin',
      hasDebt: profile?.has_debt === true,
      debtAmount: Number(profile?.debt_amount ?? 0),
      refreshProfile,
      setProfile,
    };
  }, [initialUser, profile, refreshProfile, setProfile]);

  return (
    <PanelUserContext.Provider value={value}>
      {children}
    </PanelUserContext.Provider>
  );
}
