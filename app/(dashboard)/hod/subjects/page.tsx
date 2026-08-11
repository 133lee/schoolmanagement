"use client";

import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, BookOpen, AlertTriangle, Users, Grid3X3 } from "lucide-react";
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
import { SubjectSheet } from "@/components/subjects/subject-sheet";
import { useHodSubjects } from "@/hooks/useHodSubjects";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";
import { cn } from "@/lib/utils";

type AssignmentFilter = "all" | "assigned" | "unassigned";

export default function HodSubjectsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSubjectId, setSheetSubjectId] = useState<string | null>(null);

  // Mobile-only: which of the two filter fields is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "assignment" | null
  >(null);

  const { subjects: rawSubjects, meta, isLoading, error, refetch } = useHodSubjects(
    search || undefined,
    { page, pageSize }
  );

  const subjects = useMemo(() => {
    if (!rawSubjects) return [];
    if (assignmentFilter === "all") return rawSubjects;
    return rawSubjects.filter((s) => {
      const hasTeacher = (s.teacherSubjects?.length ?? 0) > 0;
      return assignmentFilter === "assigned" ? hasTeacher : !hasTeacher;
    });
  }, [rawSubjects, assignmentFilter]);

  const unassignedCount = useMemo(
    () => (rawSubjects || []).filter((s) => (s.teacherSubjects?.length ?? 0) === 0).length,
    [rawSubjects]
  );

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "Subject list has been refreshed" });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) setPage(newPage);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
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

  return (
    <div className="space-y-6 px-4 lg:px-0">
      {/* Page Header — desktop only; mobile top bar handles the title + refresh */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Department Subjects</h1>
          <p className="text-muted-foreground text-sm">
            Manage teacher assignments for subjects in your department
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary strip */}
      {!isLoading && (rawSubjects?.length ?? 0) > 0 && (
        <div className="flex items-center gap-4 mt-5 lg:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{meta.total} subject{meta.total !== 1 ? "s" : ""} in department</span>
          </div>
          {unassignedCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              <span>{unassignedCount} without a teacher assigned</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-14rem)]">
        <CardHeader>
          {/* ── Mobile filters: search + assignment type share the one row,
              the focused one grows by its own content, the other shrinks. */}
          <div className="flex lg:hidden gap-2">
            <div
              className={cn(
                "relative min-w-0 transition-all duration-200",
                activeMobileFilter === "search" ? "flex-[3]" : "flex-1"
              )}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onFocus={() => setActiveMobileFilter("search")}
                onBlur={() => setActiveMobileFilter(null)}
              />
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                activeMobileFilter === "assignment" ? "flex-none max-w-[70%]" : "flex-1"
              )}
            >
              <Select
                value={assignmentFilter}
                onValueChange={(v) => { setAssignmentFilter(v as AssignmentFilter); setPage(1); }}
                onOpenChange={(open) => setActiveMobileFilter(open ? "assignment" : null)}>
                <SelectTrigger className={activeMobileFilter === "assignment" ? "w-fit" : "w-full"}>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="assigned">Has Teacher</SelectItem>
                  <SelectItem value="unassigned">No Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Desktop filters — unchanged ─────────────────────────────── */}
          <div className="hidden lg:flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search subjects..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select
              value={assignmentFilter}
              onValueChange={(v) => { setAssignmentFilter(v as AssignmentFilter); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="assigned">Has Teacher</SelectItem>
                <SelectItem value="unassigned">No Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-0">
          {error && (
            <div className="p-4 m-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading subjects</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <>
              {/* Mobile skeleton — mirrors the tappable card rows below */}
              <div className="lg:hidden divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  </div>
                ))}
              </div>
              {/* Desktop skeleton — mirrors the 3-column table */}
              <div className="hidden lg:block space-y-3 p-4 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            </>
          ) : subjects.length === 0 ? (
            <Empty className="h-80">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <BookOpen className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No subjects found</EmptyTitle>
                  <EmptyDescription>
                    {search || assignmentFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No subjects available in your department"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {/* ── Mobile: tappable card rows ────────────────────────── */}
              <div className="lg:hidden divide-y">
                {subjects.map((subject) => {
                  const teachers = subject.teacherSubjects?.map((ts) => ts.teacher) ?? [];
                  return (
                    <div
                      key={subject.id}
                      onClick={() => { setSheetSubjectId(subject.id); setSheetOpen(true); }}
                      className="flex items-center gap-3 px-4 py-3 active:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{subject.name}</p>
                        {teachers.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-500 font-medium truncate">
                            No teacher assigned
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground truncate">
                            {teachers[0].firstName} {teachers[0].lastName}
                            {teachers.length > 1 && ` +${teachers.length - 1} more`}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/hod/assignments?subject=${subject.id}`);
                        }}>
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: full table ────────────────────────────────── */}
              <Table className="hidden lg:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => {
                    const teachers = subject.teacherSubjects?.map((ts) => ts.teacher) ?? [];
                    return (
                      <TableRow
                        key={subject.id}
                        className="cursor-pointer"
                        onClick={() => { setSheetSubjectId(subject.id); setSheetOpen(true); }}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-sm">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">{subject.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {teachers.length === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                                No teacher assigned
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {teachers[0].firstName} {teachers[0].lastName}
                                </span>
                              </div>
                              {teachers.length > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{teachers.length - 1} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/hod/assignments?subject=${subject.id}`);
                            }}>
                            <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
                            Assignments
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && subjects.length > 0 && (
        <Pagination className="flex items-center justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                className={page === meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Subject Sheet */}
      <SubjectSheet
        subjectId={sheetSubjectId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSheetSubjectId(null);
        }}
      />
    </div>
  );
}
