"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiRequest, getAuthToken } from "@/lib/api-client";
import { Role, StaffStatus } from "@/types/prisma-enums";
import { toast } from "sonner";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  profile: {
    id: string;
    staffNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phone: string;
    status: StaffStatus;
  } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  /** Re-fetch the current user from /api/auth/me (fresh DB values, not the JWT). */
  refetch: () => Promise<void>;
  /** Clear the session and send the user to /login. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Fetches the authenticated user from /api/auth/me — always fresh from the
 * database (role, active status, permissions), never decoded from the
 * possibly-stale JWT. Mirrors the re-check withAuth already does server-side
 * on every API request.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data } = await apiRequest<{ data: AuthUser }>("/auth/me");
      setUser(data);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, error, refetch: fetchUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the authenticated user anywhere under <AuthProvider>.
 * Throws if called outside the provider, so a missing wrap fails loudly
 * instead of silently returning stub/empty data.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
