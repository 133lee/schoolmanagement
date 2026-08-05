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
import { Search, RefreshCw, School } from "lucide-react";
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
import { ClassSheet } from "@/components/classes/class-sheet";
import { useHodClasses } from "@/hooks/useHodClasses";
import { ClassStatus } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";

export default function HodClassesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassStatus | "all">("all");
  const [gradeFilter, setGradeFilter] = useState<string | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClassId, setSheetClassId] = useState<string | null>(null);

  // Fetch all classes (unfiltered, large page) once to derive grade options for the dropdown
  const { classes: allClassesForGrades } = useHodClasses(undefined, { page: 1, pageSize: 200 });

  const gradeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of allClassesForGrades || []) {
      if (c.grade && !seen.has(c.grade.id)) {
        seen.set(c.grade.id, c.grade.name);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [allClassesForGrades]);

  // Use the HOD classes hook - automatically filters to secondary grades (8-12)
  const {
    classes: classesData,
    meta,
    isLoading,
    error,
    refetch,
  } = useHodClasses(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      gradeId: gradeFilter !== "all" ? gradeFilter : undefined,
      search: search || undefined,
    },
    { page, pageSize }
  );

  // Ensure classes is always an array (defensive programming)
  const classes = classesData || [];

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Class list has been refreshed",
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  // Handle manage assignments navigation
  const handleManageAssignments = (classItem: any) => {
    router.push(`/hod/classes/${classItem.id}/assignments`);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Department Classes</h1>
          <p className="text-muted-foreground text-sm">
            View secondary classes (Grades 8-12) for subject assignments
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {gradeOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ClassStatus | "all")
              }>
              <SelectTrigger className="w-[140px]">
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
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
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
                      : "No classes available for your department"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ClassesTable
              classes={classes as any}
              onRowClick={(classItem) => {
                setSheetClassId(classItem.id);
                setSheetOpen(true);
              }}
              onEdit={() => {}}
              onDelete={() => {}}
              onManageAssignments={(classItem) => {
                handleManageAssignments(classItem);
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

      {/* Class Sheet - View Only */}
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
        basePath="/hod"
      />
    </div>
  );
}
