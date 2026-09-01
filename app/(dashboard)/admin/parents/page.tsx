"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  Plus,
  Download,
  Users,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ParentsTable } from "@/components/shared/tables/parents-table";
import { EditParentDialog } from "@/components/parent/edit-parent-dialog";
import { ParentSheet } from "@/components/parent/parent-sheet";
import { SendParentSmsDialog } from "@/components/parents/send-parent-sms-dialog";
import { useParents } from "@/hooks/useParents";
import { ParentStatus } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ParentsManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParentStatus | "all">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetParentId, setSheetParentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<any>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsMode, setSmsMode] = useState<"bulk" | "targeted">("bulk");
  const [smsParent, setSmsParent] = useState<any>(null);

  // Mobile-only: which of the row-one filters is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "status" | null
  >(null);

  // Use the parents hook with filters and pagination
  const { parents, meta, isLoading, error, refetch, deleteParent } = useParents(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: search || undefined,
    },
    { page, pageSize }
  );

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Parent list has been refreshed",
    });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleDeleteClick = (parent: any) => {
    setParentToDelete(parent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!parentToDelete) return;

    try {
      await deleteParent(parentToDelete.id);
      toast({
        title: "Success",
        description: "Parent deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete parent",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setParentToDelete(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const totalPages = meta.totalPages;
    const currentPage = meta.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "ellipsis",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          totalPages
        );
      }
    }

    return pages;
  };

  return (
    <div className="px-4 lg:px-0 space-y-6">
      {/* Page Header — title/description hidden on mobile, actions stay.
          Extra top margin on mobile since the buttons become the first
          visible thing under the sticky top bar once the title is hidden. */}
      <div className="flex items-start justify-between mt-5 lg:mt-2">
        <div className="hidden lg:flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Parents Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage parent and guardian information
          </p>
        </div>
        {/* flex-1 on mobile so this fills the rest of the row (title is
            hidden there); on desktop it must NOT grow, or its own internal
            justify-between spreads the action buttons apart instead of
            grouping them together opposite the title. */}
        <div className="flex items-center justify-between flex-1 gap-2 lg:flex-none lg:justify-start">
          <div className="flex gap-2">
            {/* Desktop only — mobile gets an icon-only refresh next to the notification bell instead */}
            <Button
              variant="outline"
              className="hidden lg:inline-flex"
              onClick={handleRefresh}
              disabled={isLoading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSmsMode("bulk");
                setSmsParent(null);
                setSmsDialogOpen(true);
              }}>
              <MessageSquare className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Send SMS</span>
            </Button>
            {/* Disabled/"coming soon" — dead weight on mobile */}
            <Button
              variant="outline"
              disabled
              className="hidden lg:inline-flex"
              title="Bulk parent import coming soon — guardians require student linking">
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <Button className="shrink-0" asChild>
            <Link href="/admin/parents/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Parent
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          {/* ── Mobile filters: search + status share the one row, the
              focused one grows by its own content, the other shrinks. ──── */}
          <div className="flex lg:hidden gap-2">
            <div
              className={cn(
                "relative min-w-0 transition-all duration-200",
                activeMobileFilter === "search" ? "flex-[3]" : "flex-1"
              )}
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setActiveMobileFilter("search")}
                onBlur={() => setActiveMobileFilter(null)}
              />
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                activeMobileFilter === "status" ? "flex-none max-w-[70%]" : "flex-1"
              )}
            >
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ParentStatus | "all")
                }
                onOpenChange={(open) => setActiveMobileFilter(open ? "status" : null)}>
                <SelectTrigger className={cn(activeMobileFilter === "status" ? "w-fit max-w-full" : "w-full")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={ParentStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={ParentStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={ParentStatus.DECEASED}>Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Desktop filters — unchanged ─────────────────────────────── */}
          <div className="hidden lg:flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search parents..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ParentStatus | "all")
              }>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ParentStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ParentStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={ParentStatus.DECEASED}>Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading parents</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <>
              {/* Mobile: mimics the single-row card shape */}
              <div className="lg:hidden rounded-md border divide-y overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16 rounded-full shrink-0" />
                      <Skeleton className="h-4 w-14 rounded-full shrink-0" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  </div>
                ))}
              </div>
              {/* Desktop: mimics the table-row shape */}
              <div className="hidden lg:block space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </div>
                ))}
              </div>
            </>
          ) : parents.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No parents found</EmptyTitle>
                  <EmptyDescription>
                    {search || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new parents to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ParentsTable
              parents={parents}
              onRowClick={(parent) => {
                setSheetParentId(parent.id);
                setSheetOpen(true);
              }}
              onEdit={(parent) => {
                setSelectedParentId(parent.id);
                setEditDialogOpen(true);
              }}
              onDelete={handleDeleteClick}
              onSendSms={(parent) => {
                setSmsMode("targeted");
                setSmsParent(parent);
                setSmsDialogOpen(true);
              }}
              onLinkStudent={(parent) => {
                router.push(
                  `/admin/parents/link-students?guardianId=${parent.id}`
                );
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && parents.length > 0 && (
        <div className="flex items-center justify-between">
          <Pagination className="flex items-center justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={
                    page === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((pageNum, index) =>
                pageNum === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum as number)}
                      isActive={pageNum === page}
                      className="cursor-pointer">
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  className={
                    page === meta.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Edit Parent Dialog */}
      <EditParentDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedParentId(null);
          }
        }}
        parentId={selectedParentId || undefined}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Parent Details Sheet */}
      <ParentSheet
        parentId={sheetParentId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetParentId(null);
          }
        }}
      />

      {/* Send SMS Dialog */}
      <SendParentSmsDialog
        open={smsDialogOpen}
        onOpenChange={(open) => {
          setSmsDialogOpen(open);
          if (!open) setSmsParent(null);
        }}
        mode={smsMode}
        parent={smsParent}
      />

      {/* Delete Parent Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Parent</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete parent{" "}
              <span className="font-semibold">
                {parentToDelete?.firstName} {parentToDelete?.lastName}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
