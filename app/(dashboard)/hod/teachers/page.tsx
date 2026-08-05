"use client";

import { useState } from "react";
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
import { TeachersTable } from "@/components/shared/tables/teachers-table";
import { TeacherSheet } from "@/components/teachers/teacher-sheet";
import { useHodTeachers } from "@/hooks/useHodTeachers";
import { StaffStatus, Gender, QualificationLevel } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";

export default function HodTeachersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [qualificationFilter, setQualificationFilter] = useState<
    QualificationLevel | "all"
  >("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTeacherId, setSheetTeacherId] = useState<string | null>(null);

  // Use the HOD teachers hook with filters and pagination (department-scoped)
  const { teachers, meta, isLoading, error, refetch } = useHodTeachers(
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Department Teachers</h1>
          <p className="text-muted-foreground text-sm">
            View teachers in your department
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
                placeholder="Search teachers..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StaffStatus | "all")
              }>
              <SelectTrigger className="w-[140px]">
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
            <Select
              value={qualificationFilter}
              onValueChange={(value) =>
                setQualificationFilter(value as QualificationLevel | "all")
              }>
              <SelectTrigger className="w-[160px]">
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
            <div className="space-y-3 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
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
                      : "No teachers available in your department"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <TeachersTable
              teachers={teachers}
              onRowClick={(teacher) => {
                setSheetTeacherId(teacher.id);
                setSheetOpen(true);
              }}
              onContact={(teacher) => {
                window.location.href = `mailto:${teacher.user?.email}`;
              }}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && teachers.length > 0 && (
        <div className="flex items-end justify-center">
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
                      className="cursor-pointer ">
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

      {/* Teacher Sheet - View Only */}
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
    </div>
  );
}
