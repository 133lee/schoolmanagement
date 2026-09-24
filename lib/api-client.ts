/* eslint-disable @typescript-eslint/no-explicit-any --
   This client is intentionally untyped: `T` defaults to `any` and each call
   site narrows it (`api.get<Foo>(...)`). Defaulting to `unknown` would force a
   cast at every existing untyped UI call. Typed per-endpoint responses are the
   real fix; until then the untyped default is the contract. */
/**
 * API Client Utility
 *
 * Provides authenticated API request helpers for client-side calls.
 * Automatically includes JWT token from localStorage.
 */

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Make authenticated API request
 *
 * @param endpoint - API endpoint path (with or without /api prefix)
 * @param options - Fetch options
 * @returns Promise with parsed JSON response
 * @throws Error if request fails
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  // Ensure endpoint starts with /api
  const url = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-JSON responses (e.g., HTML error pages)
  let data;
  try {
    data = await response.json();
  } catch (error) {
    // If response is not JSON, create error object
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  // Handle authentication errors
  if (response.status === 401) {
    // Clear invalid token
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      // Redirect to login
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please login again.");
  }

  // Check for ApiResponse envelope (handles both success and error cases)
  // Standard contract: { success: boolean, data?: T, meta?: any, error?: string }
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success) {
      // API returned structured error with success=false
      throw new Error(data.error || 'API request failed');
    }
    // API returned success=true, return stable shape with data and optional meta
    return {
      data: data.data,
      meta: data.meta,
    } as unknown as T;
  }

  // Legacy: Handle non-ok responses without ApiResponse envelope
  if (!response.ok) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }

  // Return raw data for backwards compatibility
  return data;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
