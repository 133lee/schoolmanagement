import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";

export interface PermissionsFilters {
  search?: string;
  role?: string;
  status?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface UserWithPermissions {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
  } | null;
  userPermissions: Array<{
    id: string;
    permission: string;
    expiresAt: Date | null;
    reason: string | null;
    grantedBy: {
      firstName: string;
      lastName: string;
    } | null;
    createdAt: Date;
  }>;
}

export function usePermissions(
  filters?: PermissionsFilters,
  pagination?: PaginationParams
) {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.role) params.append("role", filters.role);
      if (filters?.status) params.append("status", filters.status);
      if (pagination?.page) params.append("page", pagination.page.toString());
      if (pagination?.pageSize)
        params.append("pageSize", pagination.pageSize.toString());

      const result = await api.get<{ data: UserWithPermissions[]; meta: typeof meta }>(
        `/permissions/users?${params.toString()}`
      );

      setUsers(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [filters?.search, filters?.role, filters?.status, pagination?.page, pagination?.pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (userId: string, newRole: string) => {
    const result = await api.patch<{ data: unknown }>(`/permissions/users/${userId}/role`, {
      role: newRole,
    });
    await fetchUsers();
    return result.data;
  };

  const addPermissionOverride = async (
    userId: string,
    permission: string,
    expiresAt: Date | null,
    reason: string
  ) => {
    const result = await api.post<{ data: unknown }>(`/permissions/users/${userId}/overrides`, {
      permission,
      expiresAt,
      reason,
    });
    await fetchUsers();
    return result.data;
  };

  const removePermissionOverride = async (userId: string, permission: string) => {
    const result = await api.delete<{ data: unknown }>(
      `/permissions/users/${userId}/overrides/${permission}`
    );
    await fetchUsers();
    return result.data;
  };

  return {
    users,
    meta,
    isLoading,
    error,
    refetch: fetchUsers,
    updateUserRole,
    addPermissionOverride,
    removePermissionOverride,
  };
}
