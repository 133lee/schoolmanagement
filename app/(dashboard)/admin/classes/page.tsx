"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  School,
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
import { ClassesTable } from "@/components/shared/tables/classes-table";
import { EditClassDialog } from "@/components/classes/edit-class-dialog";
import { ClassSheet } from "@/components/classes/class-sheet";
import { ImportClassesDialog } from "@/components/classes/import-classes-dialog";
import { useClasses } from "@/hooks/useClasses";
import { useGrades } from "@/hooks/useGrades";
import { ClassStatus } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";
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

export default function ClassesManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");
  const [gradeFilter, setGradeFilter] = useState<string | "all">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClassId, setSheetClassId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Use the classes hook with filters and pagination
  const { classes, meta, isLoading, error, refetch, deleteClass } = useClasses(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      gradeId: gradeFilter !== "all" ? gradeFilter : undefined,
      search: search || undefined,
    },
    { page, pageSize }
  );

  // Fetch grades using the hook
  const { grades, isLoading: gradesLoading } = useGrades();

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Class list has been refreshed",
    });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleDeleteClick = (classItem: any) => {
    setClassToDelete(classItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return;

    try {
      await deleteClass(classToDelete.id);
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete class",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setClassToDelete(null);
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
      {/* Page Header — title/description hidden on mobile, actions stay */}
      <div className="flex items-start justify-between mt-2">
        <div className="hidden lg:flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Classes Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage class sections and assignments
          </p>
        </div>
        {/* flex-1 so this fills the rest of the row — the internal
            justify-between then pushes "Add Class" to the true far right,
            separate from the other action buttons. */}
        <div className="flex items-center justify-between flex-1 gap-2">
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
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <Button className="shrink-0" asChild>
            <Link href="/admin/classes/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search classes..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={gradeFilter}
              onValueChange={(value) => setGradeFilter(value)}>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ClassStatus | "all")
              }>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ClassStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ClassStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={ClassStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading classes</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : classes.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <School className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No classes found</EmptyTitle>
                  <EmptyDescription>
                    {search || statusFilter !== "all" || gradeFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new classes to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ClassesTable
              classes={classes}
              onRowClick={(classItem) => {
                setSheetClassId(classItem.id);
                setSheetOpen(true);
              }}
              onEdit={(classItem) => {
                setSelectedClassId(classItem.id);
                setEditDialogOpen(true);
              }}
              onDelete={handleDeleteClick}
              onEnrollStudents={(classItem) => {
                router.push(`/admin/classes/${classItem.id}/enroll`);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && classes.length > 0 && (
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

      {/* Edit Class Dialog */}
      <EditClassDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedClassId(null);
          }
        }}
        classId={selectedClassId || undefined}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Class Sheet */}
      <ClassSheet
        classId={sheetClassId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetClassId(null);
          }
        }}
        onDataChange={refetch}
      />

      {/* Delete Class Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Class</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete class{" "}
              <span className="font-semibold">{classToDelete?.name}</span>? This
              action cannot be undone.
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

      <ImportClassesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => { setImportDialogOpen(false); window.location.reload(); }}
      />
    </div>
  );
}
