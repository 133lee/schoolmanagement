"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, RefreshCw, ShieldCheck, UserCog, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UsersListTable } from "@/components/permissions/users-list-table";
import { RoleAssignment } from "@/components/permissions/role-assignment";
import { PermissionOverrides } from "@/components/permissions/permission-overrides";
import { ActiveOverrides } from "@/components/permissions/active-overrides";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

export default function PermissionsManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  const { users, meta, isLoading, refetch } = usePermissions(
    {
      search: search || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { page, pageSize }
  );

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "User list has been refreshed" });
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab("role-assignment");
  };

  const handlePageChange = (newPage: number) => {
    if (meta && newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (!meta) return pages;
    const { totalPages, page: currentPage } = meta;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "ellipsis", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
    }
    return pages;
  };

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-xl font-bold">Permissions Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage user roles and permission overrides
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Tab bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b shrink-0">
              <TabsList className="h-9 rounded-none border-0 bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="users"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="role-assignment"
                  disabled={!selectedUserId}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3"
                >
                  <UserCog className="h-4 w-4 mr-1.5" />
                  Role Assignment
                  {selectedUser && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({selectedUser.profile
                        ? `${selectedUser.profile.firstName} ${selectedUser.profile.lastName}`
                        : selectedUser.email})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="overrides"
                  disabled={!selectedUserId}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3"
                >
                  <Shield className="h-4 w-4 mr-1.5" />
                  Permission Overrides
                </TabsTrigger>
                <TabsTrigger
                  value="active-overrides"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3"
                >
                  Active Overrides
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Users tab — filters live here */}
            <TabsContent value="users" className="m-0 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or staff number..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="HEAD_TEACHER">Head Teacher</SelectItem>
                    <SelectItem value="DEPUTY_HEAD">Deputy Head</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="CLERK">Clerk</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-auto px-4 py-3">
                <UsersListTable
                  users={users || []}
                  isLoading={isLoading}
                  onUserSelect={handleUserSelect}
                  selectedUserId={selectedUserId}
                />
              </div>

              {/* Pagination */}
              {!isLoading && users && users.length > 0 && meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t shrink-0">
                  <p className="text-sm text-muted-foreground">
                    {((meta.page - 1) * pageSize) + 1}–{Math.min(meta.page * pageSize, meta.total)} of {meta.total} users
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(page - 1)}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((pageNum, i) =>
                        pageNum === "ellipsis" ? (
                          <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum as number)}
                              isActive={pageNum === page}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(page + 1)}
                          className={page === meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </TabsContent>

            {/* Role Assignment tab */}
            <TabsContent value="role-assignment" className="m-0 flex-1 overflow-auto p-4">
              {selectedUser ? (
                <RoleAssignment user={selectedUser} onUpdate={refetch} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                  <UserCog className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a user from the Users tab to manage their role</p>
                </div>
              )}
            </TabsContent>

            {/* Permission Overrides tab */}
            <TabsContent value="overrides" className="m-0 flex-1 overflow-auto p-4">
              {selectedUser ? (
                <PermissionOverrides user={selectedUser} onUpdate={refetch} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                  <Shield className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a user from the Users tab to manage their permission overrides</p>
                </div>
              )}
            </TabsContent>

            {/* Active Overrides tab */}
            <TabsContent value="active-overrides" className="m-0 flex-1 overflow-auto p-4">
              <ActiveOverrides users={users || []} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
