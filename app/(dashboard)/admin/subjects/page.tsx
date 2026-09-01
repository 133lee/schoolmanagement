"use client";

import { useState } from "react";
import Link from "next/link";
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
  BookOpen,
  AlertTriangle,
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
import { SubjectsTable } from "@/components/shared/tables/subjects-table";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { SubjectSheet } from "@/components/subjects/subject-sheet";
import { ImportSubjectsDialog } from "@/components/subjects/import-subjects-dialog";
import { useSubjects } from "@/hooks/useSubjects";
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

export default function SubjectsManagement() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | "all">(
    "all"
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSubjectId, setSheetSubjectId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Mobile-only: which of the row-one filters is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "department" | null
  >(null);

  // Use the subjects hook with filters and pagination
  const { subjects, meta, isLoading, error, refetch, deleteSubject } =
    useSubjects(
      {
        departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
        search: search || undefined,
      },
      { page, pageSize }
    );

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Subject list has been refreshed",
    });
  };

  // Mobile: the top-bar refresh icon calls this instead of the desktop button.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleDeleteClick = (subject: any) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) return;

    try {
      await deleteSubject(subjectToDelete.id);
      toast({
        title: "Success",
        description: "Subject deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete subject",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
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
      {/* Page Header — title/description hidden on mobile (top bar shows
          "Subjects"); mobile gets an icon-only refresh next to the
          notification bell instead of the inline Refresh button. */}
      <div className="flex items-start justify-between mt-5 lg:mt-2">
        <div className="hidden lg:flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Subjects Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage subjects and course information
          </p>
        </div>
        {/* flex-1 on mobile so this fills the rest of the row (title is
            hidden there); on desktop it must NOT grow, or its own internal
            justify-between spreads the action buttons apart instead of
            grouping them together opposite the title. */}
        <div className="flex items-center justify-between flex-1 gap-2 lg:flex-none lg:justify-start">
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <Button className="shrink-0" asChild>
            <Link href="/admin/subjects/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          {/* ── Mobile filters: search + department share row one, the
              focused one grows by its own content, the other shrinks. ── */}
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
                activeMobileFilter === "department" ? "flex-none max-w-[70%]" : "flex-1"
              )}
            >
              <Select
                value={departmentFilter}
                onValueChange={(value) => setDepartmentFilter(value)}
                onOpenChange={(open) => setActiveMobileFilter(open ? "department" : null)}>
                <SelectTrigger className={activeMobileFilter === "department" ? "w-fit max-w-full" : "w-full"}>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {/* TODO: Populate with actual departments from API */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Desktop filters — unchanged ─────────────────────────────── */}
          <div className="hidden lg:flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search subjects..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={(value) => setDepartmentFilter(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {/* TODO: Populate with actual departments from API */}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading subjects</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <>
              <div className="lg:hidden space-y-2 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border p-3">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <Skeleton className="h-4 w-20 flex-1" />
                    <Skeleton className="h-4 w-6 shrink-0" />
                    <Skeleton className="h-8 w-8 rounded shrink-0" />
                  </div>
                ))}
              </div>
              <div className="hidden lg:block space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            </>
          ) : subjects.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <BookOpen className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No subjects found</EmptyTitle>
                  <EmptyDescription>
                    {search || departmentFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new subjects to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <SubjectsTable
              subjects={subjects}
              onRowClick={(subject) => {
                setSheetSubjectId(subject.id);
                setSheetOpen(true);
              }}
              onEdit={(subject) => {
                setSelectedSubjectId(subject.id);
                setEditDialogOpen(true);
              }}
              onDelete={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && subjects.length > 0 && (
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

      {/* Edit Subject Dialog */}
      <EditSubjectDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedSubjectId(null);
          }
        }}
        subjectId={selectedSubjectId || undefined}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Subject Sheet */}
      <SubjectSheet
        subjectId={sheetSubjectId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetSubjectId(null);
          }
        }}
      />

      {/* Delete Subject Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete subject{" "}
              <span className="font-semibold">{subjectToDelete?.name}</span>?
              This action cannot be undone.
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

      <ImportSubjectsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => { setImportDialogOpen(false); window.location.reload(); }}
      />
    </div>
  );
}
