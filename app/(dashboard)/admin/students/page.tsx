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
  Users,
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
import { StudentsTable } from "@/components/shared/tables/students-table";
import { EditStudentDialog } from "@/components/students/edit-student-dialog";
import { StudentSheet } from "@/components/students/student-sheet";
import { ImportStudentsDialog } from "@/components/students/import-students-dialog";
import { useStudents } from "@/hooks/useStudents";
import { StudentStatus, Gender } from "@/types/prisma-enums";
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

export default function StudentsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">(
    "all"
  );
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Use the students hook with filters and pagination
  const {
    students: rawStudents,
    meta,
    isLoading,
    error,
    refetch,
    deleteStudent,
  } = useStudents(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      gender: genderFilter !== "all" ? genderFilter : undefined,
      search: search || undefined,
    },
    { page, pageSize }
  );

  // Transform students data to extract grade and guardian information
  const students = rawStudents.map((student: any) => {
    const enrollment = student.enrollments?.[0];
    const guardian = student.studentGuardians?.[0]?.guardian;

    return {
      ...student,
      grade: enrollment?.class?.grade?.name,
      className: enrollment?.class?.name,
      vulnerabilityStatus: student.vulnerability,
      hasGuardian: !!guardian,
    };
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Student list has been refreshed",
    });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleDeleteClick = (student: any) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    try {
      await deleteStudent(studentToDelete.id);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete student",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
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
          <h1 className="text-xl font-bold">Students Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage student information and enrollment
          </p>
        </div>
        {/* flex-1 on mobile so this fills the rest of the row (title is
            hidden there, so this is the only visible content); on desktop
            it must NOT grow, or its own internal justify-between spreads the
            action buttons apart from each other instead of grouping them
            together opposite the title. */}
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
              onClick={() => setImportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <Button className="shrink-0" asChild>
            <Link href="/admin/students/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
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
                placeholder="Search students..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StudentStatus | "all")
              }>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={StudentStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={StudentStatus.SUSPENDED}>
                  Suspended
                </SelectItem>
                <SelectItem value={StudentStatus.GRADUATED}>
                  Graduated
                </SelectItem>
                <SelectItem value={StudentStatus.WITHDRAWN}>
                  Withdrawn
                </SelectItem>
                <SelectItem value={StudentStatus.TRANSFERRED}>
                  Transferred
                </SelectItem>
                <SelectItem value={StudentStatus.DECEASED}>Deceased</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={genderFilter}
              onValueChange={(value) =>
                setGenderFilter(value as Gender | "all")
              }>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value={Gender.MALE}>Male</SelectItem>
                <SelectItem value={Gender.FEMALE}>Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading students</p>
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
                {[
                  "w-40", "w-36", "w-44", "w-32",
                  "w-40", "w-36", "w-44", "w-28",
                ].map((nameWidth, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className={`h-4 ${nameWidth}`} />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </div>
                ))}
              </div>
            </>
          ) : students.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No students found</EmptyTitle>
                  <EmptyDescription>
                    {search || statusFilter !== "all" || genderFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start by adding new students to the system"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <StudentsTable
              students={students}
              onRowClick={(student) => {
                setSheetStudentId(student.id);
                setSheetOpen(true);
              }}
              onEdit={(student) => {
                setSelectedStudentId(student.id);
                setEditDialogOpen(true);
              }}
              onDelete={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && students.length > 0 && (
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

      {/* Edit Student Dialog */}
      <EditStudentDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedStudentId(null);
          }
        }}
        studentId={selectedStudentId || undefined}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Student Details Sheet */}
      <StudentSheet
        studentId={sheetStudentId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetStudentId(null);
          }
        }}
      />

      {/* Delete Student Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to delete student{" "}
              <span className="font-semibold">
                {studentToDelete?.firstName} {studentToDelete?.lastName}
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

      {/* Import Students Dialog */}
      <ImportStudentsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
