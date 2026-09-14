"use client";

import { useState, useMemo } from "react";
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
import { Search, RefreshCw, Users } from "lucide-react";
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
import { StudentSheet } from "@/components/students/student-sheet";
import { useStudents } from "@/hooks/useStudents";
import { useHodClasses } from "@/hooks/useHodClasses";
import { StudentStatus, Gender } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";
import { cn, formatCompactClassLabel } from "@/lib/utils";

export default function HodStudentsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">(
    "all"
  );
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [classFilter, setClassFilter] = useState<string | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);

  // Mobile-only: which of the row-one filters is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "status" | "gender" | null
  >(null);

  // Fetch all classes (unfiltered, large page) once to derive class options for the dropdown
  const { classes: allClasses } = useHodClasses(undefined, { page: 1, pageSize: 200 });
  const classOptions = useMemo(
    () =>
      (allClasses || [])
        .map((c) => ({ id: c.id, label: formatCompactClassLabel(c.grade?.name, c.name) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    [allClasses]
  );

  // Use the students hook with filters and pagination (read-only)
  const {
    students: rawStudents,
    meta,
    isLoading,
    error,
    refetch,
  } = useStudents(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      gender: genderFilter !== "all" ? genderFilter : undefined,
      search: search || undefined,
      classId: classFilter !== "all" ? classFilter : undefined,
    },
    { page, pageSize }
  );

  // Transform students data to extract grade and guardian information
  // Ensure rawStudents is always an array (defensive programming)
  // During initial render, loading, or error states, rawStudents may be undefined
  const students = (rawStudents || []).map((student: any) => {
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
    <div className="space-y-6 px-4 lg:px-0">
      {/* Page Header — desktop only; mobile top bar handles the title + refresh */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Students Overview</h1>
          <p className="text-muted-foreground text-sm">
            View student information and enrollment status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-12rem)] mt-5 lg:mt-0">
        <CardHeader>
          {/* ── Mobile filters: search/status/gender share row one, the
              focused one grows by its own content, the others shrink;
              class gets its own full-width row underneath. ───────────── */}
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
                  setStatusFilter(value as StudentStatus | "all")
                }
                onOpenChange={(open) =>
                  setActiveMobileFilter(open ? "status" : null)
                }>
                <SelectTrigger className={activeMobileFilter === "status" ? "w-fit max-w-full" : "w-full"}>
                  <SelectValue placeholder="Status" />
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
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                activeMobileFilter === "gender" ? "flex-none max-w-[70%]" : "flex-1"
              )}
            >
              <Select
                value={genderFilter}
                onValueChange={(value) =>
                  setGenderFilter(value as Gender | "all")
                }
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
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Desktop filters — unchanged, class filter appended ──────── */}
          <div className="hidden lg:flex gap-3">
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
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
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
              {/* Mobile skeleton — mirrors the tappable card rows */}
              <div className="lg:hidden divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-4 shrink-0" />
                  </div>
                ))}
              </div>
              {/* Desktop skeleton — mirrors the table columns */}
              <div className="hidden lg:block space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 ml-auto" />
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
                    {search || statusFilter !== "all" || genderFilter !== "all" || classFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No students available to view"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <StudentsTable
              students={students}
              compactMobileClassLabel
              hideMobileAvatar
              onRowClick={(student) => {
                setSheetStudentId(student.id);
                setSheetOpen(true);
              }}
              onEdit={() => {}}
              onDelete={() => {}}
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

      {/* Student Details Sheet - View Only */}
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
    </div>
  );
}
