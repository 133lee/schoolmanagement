"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";

interface RefreshState {
  fn: (() => void) | null;
  loading: boolean;
}

interface MobileHeaderRefreshContextValue {
  state: RefreshState;
  register: (fn: (() => void) | null, loading: boolean) => void;
}

const MobileHeaderRefreshContext = createContext<MobileHeaderRefreshContextValue | null>(null);

/**
 * Wraps a mobile layout's content so pages inside it can register a refresh
 * action into the layout's own header (see useMobileHeaderRefresh below).
 */
export function MobileHeaderRefreshProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RefreshState>({ fn: null, loading: false });

  const register = useCallback((fn: (() => void) | null, loading: boolean) => {
    setState({ fn, loading });
  }, []);

  const value = useMemo(() => ({ state, register }), [state, register]);

  return (
    <MobileHeaderRefreshContext.Provider value={value}>
      {children}
    </MobileHeaderRefreshContext.Provider>
  );
}

/**
 * Called by the layout's header to know whether to render a refresh icon
 * button next to the notification bell, and what state it's in.
 */
export function useMobileHeaderRefreshState(): RefreshState {
  const ctx = useContext(MobileHeaderRefreshContext);
  return ctx?.state ?? { fn: null, loading: false };
}

/**
 * Called by a page to put its own refresh action into the mobile layout's
 * header (instead of rendering its own "Refresh" button inline). Registers
 * on mount/update and clears itself on unmount so a stale handler never
 * survives navigating away from the page.
 */
export function useMobileHeaderRefresh(onRefresh: () => void, isLoading: boolean) {
  // Depend only on `register` itself (stable across renders), not the whole
  // context object — that object also carries `state`, which changes as a
  // *result* of calling `register`. Depending on it here would turn this
  // effect into a feedback loop: fire → register → state changes → new
  // context object → deps changed → fire again, forever.
  const register = useContext(MobileHeaderRefreshContext)?.register;
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (!register) return;
    register(() => onRefreshRef.current(), isLoading);
    return () => register(null, false);
  }, [register, isLoading]);
}
