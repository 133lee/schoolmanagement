"use client";

import { useState, useEffect } from "react";
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
  FileText,
  AlertTriangle,
  Download,
  Users,
  GraduationCap,
  CheckCircle,
  Clock,
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
import { ReportCardsTable } from "@/components/shared/tables/report-cards-table";
import { ReportCardSheet } from "@/components/report-cards/report-card-sheet";
import { StatsCard } from "@/components/shared/stats-card";
import { useTerms } from "@/hooks/useTerms";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";

interface ClassData {
  id: string;
  name: string;
  gradeLevel?: string;
  totalStudents?: number;
}

export default function TeacherReportCardsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReportCardId, setSheetReportCardId] = useState<string | null>(
    null
  );

  // State for class teacher class
  const [classTeacherClass, setClassTeacherClass] = useState<ClassData | null>(
    null
  );
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load terms for filter
  const { terms, isLoading: termsLoading } = useTerms();

  // Fetch class teacher class on mount
  useEffect(() => {
    const fetchClassTeacherClass = async () => {
      try {
        const response = await api.get("/teacher/classes");
        const data = response.data || response;

        if (data.classTeacherClasses && data.classTeacherClasses.length > 0) {
          setClassTeacherClass(data.classTeacherClasses[0]);
        } else {
          setClassTeacherClass(null);
        }
      } catch (err) {
        console.error("Error fetching class teacher class:", err);
        setError("Failed to load class information");
      }
    };

    fetchClassTeacherClass();
  }, []);

  // Fetch report cards for the class teacher's class
  useEffect(() => {
    const fetchReportCards = async () => {
      if (!classTeacherClass) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append("classId", classTeacherClass.id);
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());

        if (termFilter !== "all") {
          params.append("termId", termFilter);
        }

        const response = await api.get(`/report-cards?${params.toString()}`);
        const result = response.data || response;

        setReportCards(result.data || result || []);
        setTotalPages(result.meta?.totalPages || 1);
        setTotalCount(result.meta?.total || 0);
      } catch (err) {
        console.error("Error fetching report cards:", err);
        setError(getErrorMessage(err, "Failed to load report cards"));
      } finally {
        setLoading(false);
      }
    };

    fetchReportCards();
  }, [classTeacherClass, termFilter, page, pageSize]);

  const handleRefresh = () => {
    setPage(1);
    // Trigger refetch by updating a dependency
    setLoading(true);
    api
      .get(
        `/report-cards?classId=${classTeacherClass?.id}&page=1&pageSize=${pageSize}${termFilter !== "all" ? `&termId=${termFilter}` : ""}`
      )
      .then((response) => {
        const result = response.data || response;
        setReportCards(result.data || result || []);
        setTotalPages(result.meta?.totalPages || 1);
        setTotalCount(result.meta?.total || 0);
        toast({
          title: "Refreshed",
          description: "Report cards list has been refreshed",
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to refresh");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Filter report cards by search
  const filteredReportCards = reportCards.filter((rc) => {
    if (!search) return true;
    const studentName =
      `${rc.student?.firstName} ${rc.student?.lastName}`.toLowerCase();
    return studentName.includes(search.toLowerCase());
  });

  // Stats calculations
  const stats = {
    total: totalCount,
    generated: reportCards.filter(
      (rc) => rc.subjects && rc.subjects.length > 0
    ).length,
    pending: reportCards.filter(
      (rc) => !rc.subjects || rc.subjects.length === 0
    ).length,
    students: classTeacherClass?.totalStudents || 0,
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "ellipsis",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
      }
    }

    return pages;
  };

  // If teacher is not a class teacher
  if (!loading && !classTeacherClass) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-2">
            <h1 className="text-xl font-bold">Report Cards</h1>
            <p className="text-muted-foreground text-sm">
              View and download report cards for your class
            </p>
          </div>
        </div>

        <Card className="py-12">
          <CardContent>
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <FileText className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Not a Class Teacher</EmptyTitle>
                  <EmptyDescription>
                    Report card management is only available for class teachers.
                    Please contact the administrator if you believe this is an
                    error.
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Report Cards</h1>
          <p className="text-muted-foreground text-sm">
            {classTeacherClass
              ? `Manage report cards for ${classTeacherClass.name}`
              : "View and download report cards for your class"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Report Cards"
          value={stats.total}
          icon={FileText}
          variant="primary"
        />
        <StatsCard
          label="Generated"
          value={stats.generated}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          label="Students in Class"
          value={stats.students}
          icon={Users}
          variant="info"
        />
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-[calc(100vh-20rem)]">
        <CardHeader>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by student name..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={termFilter}
              onValueChange={(value) => setTermFilter(value)}
              disabled={termsLoading}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.termType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Error loading report cards</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <>
              {/* Mobile — mirrors ReportCardsTable's tappable card rows */}
              <div className="lg:hidden rounded-md border divide-y overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-14 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-4 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Desktop — mirrors ReportCardsTable's 8-column table */}
              <div className="hidden lg:block rounded-md border divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                ))}
              </div>
            </>
          ) : filteredReportCards.length === 0 ? (
            <Empty className="h-96">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <FileText className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No report cards found</EmptyTitle>
                  <EmptyDescription>
                    {search || termFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No report cards have been generated for this class yet"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ReportCardsTable
              reportCards={filteredReportCards}
              onRowClick={(reportCard) => {
                setSheetReportCardId(reportCard.id);
                setSheetOpen(true);
              }}
              onPreview={(reportCard) => {
                setSheetReportCardId(reportCard.id);
                setSheetOpen(true);
              }}
              showActions={false}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && filteredReportCards.length > 0 && (
        <div className="flex items-center justify-start">
          <Pagination>
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
                  className={
                    page === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Report Card Details Sheet */}
      <ReportCardSheet
        reportCardId={sheetReportCardId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetReportCardId(null);
          }
        }}
      />
    </div>
  );
}
