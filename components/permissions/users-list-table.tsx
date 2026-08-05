"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserWithPermissions } from "@/hooks/usePermissions";
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsersListTableProps {
  users: UserWithPermissions[];
  isLoading: boolean;
  onUserSelect: (userId: string) => void;
  selectedUserId: string | null;
}

const ROLE_STYLE: Record<string, { label: string; className: string }> = {
  ADMIN:        { label: "Administrator", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  HEAD_TEACHER: { label: "Head Teacher",  className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  DEPUTY_HEAD:  { label: "Deputy Head",   className: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  TEACHER:      { label: "Teacher",       className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  CLERK:        { label: "Clerk",         className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
};

function formatLastLogin(lastLogin: Date | null) {
  if (!lastLogin) return "Never";
  const diffH = Math.floor((Date.now() - new Date(lastLogin).getTime()) / 3_600_000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffH < 48) return "Yesterday";
  if (diffH < 168) return `${Math.floor(diffH / 24)}d ago`;
  return new Date(lastLogin).toLocaleDateString();
}

export function UsersListTable({
  users,
  isLoading,
  onUserSelect,
  selectedUserId,
}: UsersListTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Overrides</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto rounded-full" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-md border">
        <p className="text-sm text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Overrides</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const style = ROLE_STYLE[user.role];
            const name = user.profile
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user.email;
            const initials = user.profile
              ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
              : user.email.slice(0, 2).toUpperCase();

            return (
              <TableRow
                key={user.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedUserId === user.id && "bg-muted/60"
                )}
                onClick={() => onUserSelect(user.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                      {user.profile?.staffNumber && (
                        <p className="text-xs text-muted-foreground">{user.profile.staffNumber}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", style?.className)}>
                    {style?.label ?? user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {user.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-sm">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Inactive</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-sm">{formatLastLogin(user.lastLogin)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {user.userPermissions.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {user.userPermissions.length}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
