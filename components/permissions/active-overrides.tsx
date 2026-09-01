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
import { ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveOverridesProps {
  users: UserWithPermissions[];
  isLoading: boolean;
}

export function ActiveOverrides({ users, isLoading }: ActiveOverridesProps) {
  if (isLoading) {
    return (
      <>
        <div className="lg:hidden space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-5 w-36 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-2"><Skeleton className="h-7 w-7 rounded-full" /><Skeleton className="h-3.5 w-28" /></div></TableCell>
                  <TableCell><Skeleton className="h-5 w-36 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  // Flatten all overrides across users
  const rows = users.flatMap((user) =>
    user.userPermissions.map((up) => ({ user, override: up }))
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-md border">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">No active overrides</p>
          <p className="text-xs text-muted-foreground mt-1">
            All users are operating under their default role permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {rows.length} active permission override{rows.length !== 1 ? "s" : ""} across {users.filter((u) => u.userPermissions.length > 0).length} user{users.filter((u) => u.userPermissions.length > 0).length !== 1 ? "s" : ""}
      </p>

      {/* Mobile: card rows */}
      <div className="lg:hidden space-y-2">
        {rows.map(({ user, override: up }) => {
          const name = user.profile
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.email;
          const initials = user.profile
            ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
            : user.email.slice(0, 2).toUpperCase();
          const isExpired = up.expiresAt && new Date(up.expiresAt) < new Date();

          return (
            <div key={up.id} className={cn("rounded-lg border p-3 space-y-2", isExpired && "opacity-50")}>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                </div>
              </div>
              <code className="block text-xs bg-muted px-1.5 py-0.5 rounded font-mono w-fit max-w-full truncate">
                {up.permission}
              </code>
              {up.reason && (
                <p className="text-xs text-muted-foreground truncate" title={up.reason}>{up.reason}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>Granted {new Date(up.createdAt).toLocaleDateString()}</span>
                {up.expiresAt ? (
                  <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                    {isExpired ? "Expired " : ""}{new Date(up.expiresAt).toLocaleDateString()}
                  </Badge>
                ) : (
                  <span>· Never expires</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Granted</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ user, override: up }) => {
              const name = user.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.email;
              const initials = user.profile
                ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
                : user.email.slice(0, 2).toUpperCase();
              const isExpired = up.expiresAt && new Date(up.expiresAt) < new Date();

              return (
                <TableRow key={up.id} className={isExpired ? "opacity-50" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {up.permission}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {up.reason || <span className="italic">—</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(up.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {up.expiresAt ? (
                      <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                        {isExpired ? "Expired " : ""}{new Date(up.expiresAt).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
