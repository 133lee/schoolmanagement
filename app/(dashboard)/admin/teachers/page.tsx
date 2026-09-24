"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Mail,
  Users,
  AlertTriangle,
  KeyRound,
  Loader2,
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
import { TeachersTable } from "@/components/shared/tables/teachers-table";
import { EditTeacherDialog } from "@/components/teachers/edit-teacher-dialog";
import { TeacherSheet } from "@/components/teachers/teacher-sheet";
import { useTeachers } from "@/hooks/useTeachers";
import { StaffStatus, Gender, QualificationLevel } from "@/types/prisma-enums";
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

export default function TeachersManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [qualificationFilter, setQualificationFilter] = useState<
    QualificationLevel | "all"
  >("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTeacherId, setSheetTeacherId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [teacherToReset, setTeacherToReset] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Mobile-only: which of the row-one filters is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "status" | "gender" | null
  >(null);

  // Use the teachers hook with filters and pagination
  const { teachers, meta, isLoading, error, refetch, deleteTeacher } =
    useTeachers(
      {
        status: statusFilter !== "all" ? statusFilter : undefined,
        gender: genderFilter !== "all" ? genderFilter : undefined,
        qualification:
          qualificationFilter !== "all" ? qualificationFilter : undefined,
        search: search || undefined,
      },
      { page, pageSize }
    );

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Teacher list has been refreshed",
    });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleDeleteClick = (teacher: any) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;

    try {
      await deleteTeacher(teacherToDelete.id);
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete teacher",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTeacherToDelete(null);
    }
  };

  const handleResetPasswordClick = (teacher: any) => {
    setTeacherToReset(teacher);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!teacherToReset) return;

    try {
      setIsResettingPassword(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/teachers/${teacherToReset.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password Reset",
        description: `Password reset for ${teacherToReset.firstName} ${teacherToReset.lastName}. They will receive an SMS with their new credentials.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
      setResetPasswordDialogOpen(false);
      setTeacherToReset(null);
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
          <h1 className="text-xl font-bold">Teachers Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage teacher information and assignments
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
            {/* Import and Send Invites are both disabled/"coming soon" —
                dead weight on mobile, so they only show on desktop there. */}
            <Button
              variant="outline"
              disabled
              className="hidden lg:inline-flex"
              title="Bulk teacher import coming soon — teachers require account setup">
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled className="hidden lg:inline-flex">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invites
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button className="shrink-0" asChild>
            <Link href="/admin/teachers/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          {/* ── Mobile filters: search/status/gender share row one, the
              focused one grows by its own content, the others shrink;
              qualification gets its own full-width row underneath. ──────── */}
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
                onValueChange={(value) => {
                  setStatusFilter(value as StaffStatus | "all");
                  setPage(1);
                }}
                onOpenChange={(open) =>
                  setActiveMobileFilter(open ? "status" : null)
                }>
                <SelectTrigger className={activeMobileFilter === "status" ? "w-fit max-w-full" : "w-full"}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={StaffStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={StaffStatus.ON_LEAVE}>On Leave</SelectItem>
                  <SelectItem value={StaffStatus.RETIRED}>Retired</SelectItem>
                  <SelectItem value={StaffStatus.TERMINATED}>
                    Terminated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                activeMobileFilter === "gender" ? "flex-none max-w-[70%]" : "flex-1"
              )}
            >
              <Select
                value={genderFilter}
                onValueChange={(value) => {
                  setGenderFilter(value as Gender | "all");
                  setPage(1);
                }}
                onOpenChange={(open) =>
                  setActiveMobileFilter(open ? "gender" : null)
                }>
                <SelectTrigger className={activeMobileFilter === "gender" ? "w-fit max-w-full" : "w-full"}>
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value={Gender.MALE}>Male</SelectItem>
                  <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="lg:hidden mt-2">
            <Select
              value={qualificationFilter}
              onValueChange={(value) => {
                setQualificationFilter(value as QualificationLevel | "all");
                setPage(1);
              }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Qualifications</SelectItem>
                <SelectItem value={QualificationLevel.CERTIFICATE}>
                  Certificate
                </SelectItem>
                <SelectItem value={QualificationLevel.DIPLOMA}>
                  Diploma
                </SelectItem>
                <SelectItem value={QualificationLevel.DEGREE}>
                  Degree
                </SelectItem>
                <SelectItem value={QualificationLevel.MASTERS}>
                  Masters
                </SelectItem>
                <SelectItem value={QualificationLevel.DOCTORATE}>
                  PhD
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Desktop filters — unchanged (peer focus-within shrink/grow) ── */}
          <div className="hidden lg:flex gap-3">
            <div className="peer relative flex-1 min-w-0 transition-all duration-300 ease-in-out focus-within:flex-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search teachers..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StaffStatus | "all");
                setPage(1);
              }}>
              <SelectTrigger className="w-32.5 shrink-0 transition-all duration-300 ease-in-out peer-focus-within:w-22.5">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={StaffStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={StaffStatus.ON_LEAVE}>On Leave</SelectItem>
                <SelectItem value={StaffStatus.RETIRED}>Retired</SelectItem>
                <SelectItem value={StaffStatus.TERMINATED}>
                  Terminated
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={genderFilter}
              onValueChange={(value) => {
                setGenderFilter(value as Gender | "all");
                setPage(1);
              }}>
              <SelectTrigger className="w-27.5 shrink-0 transition-all duration-300 ease-in-out peer-focus-within:w-20">
                <SelectValue placeholder="Filter by Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value={Gender.MALE}>Male</SelectItem>
                <SelectItem value={Gender.FEMALE}>Female</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={qualificationFilter}
              onValueChange={(value) => {
                setQualificationFilter(value as QualificationLevel | "all");
                setPage(1);
              }}>
              <SelectTrigger className="w-32.5 shrink-0 transition-all duration-300 ease-in-out peer-focus-within:w-22.5">
                <SelectValue placeholder="Filter by Qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Qualifications</SelectItem>
                <SelectItem value={QualificationLevel.CERTIFICATE}>
                  Certificate
                </SelectItem>
                <SelectItem value={QualificationLevel.DIPLOMA}>
                  Diploma
                </SelectItem>
                <SelectItem value={QualificationLevel.DEGREE}>
                  Degree
                </SelectItem>
                <SelectItem value={QualificationLevel.MASTERS}>
                  Masters
                </SelectItem>
                <SelectItem value={QualificationLevel.DOCTORATE}>
                  PhD
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading teachers</p>
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
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </div>
                ))}
              </div>
            </>
          ) : teachers.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No teachers found</EmptyTitle>
                  <EmptyDescription>
                    {search ||
                    statusFilter !== "all" ||
                    genderFilter !== "all" ||
                    qualificationFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new teachers to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <TeachersTable
              teachers={teachers}
              hideStaffNumberOnMobile
              hideStatusBadgeOnMobile
              onRowClick={(teacher) => {
                setSheetTeacherId(teacher.id);
                setSheetOpen(true);
              }}
              onEdit={(teacher) => {
                setSelectedTeacherId(teacher.id);
                setEditDialogOpen(true);
              }}
              onDelete={handleDeleteClick}
              onContact={(teacher) => {
                window.location.href = `mailto:${teacher.user?.email}`;
              }}
              onResetPassword={handleResetPasswordClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && teachers.length > 0 && (
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

      {/* Edit Teacher Dialog */}
      <EditTeacherDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedTeacherId(null);
          }
        }}
        teacherId={selectedTeacherId || undefined}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Teacher Sheet */}
      <TeacherSheet
        teacherId={sheetTeacherId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetTeacherId(null);
          }
        }}
      />

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <KeyRound className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Reset Password</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              This will reset{" "}
              <span className="font-semibold">
                {teacherToReset?.firstName} {teacherToReset?.lastName}
              </span>
              &apos;s password to the default{" "}
              <span className="font-mono font-semibold">teacher123</span>. They
              will be prompted to change it on next login and will receive an SMS
              with their new credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingPassword}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPasswordConfirm}
              disabled={isResettingPassword}
              className="bg-amber-600 text-white hover:bg-amber-700">
              {isResettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Teacher Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete teacher{" "}
              <span className="font-semibold">
                {teacherToDelete?.firstName} {teacherToDelete?.lastName}
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
