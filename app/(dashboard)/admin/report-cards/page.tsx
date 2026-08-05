"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Sparkles,
  Download,
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
import { Separator } from "@/components/ui/separator";
import { ReportCardsTable } from "@/components/shared/tables/report-cards-table";
import { EditReportCardDialog } from "@/components/report-cards/edit-report-card-dialog";
import { BulkGenerateDialog } from "@/components/report-cards/bulk-generate-dialog";
import { BulkDownloadDialog } from "@/components/report-cards/bulk-download-dialog";
import { ReportCardSheet } from "@/components/report-cards/report-card-sheet";
import { NotifyParentsDialog } from "@/components/report-cards/notify-parents-dialog";
import { useReportCards } from "@/hooks/useReportCards";
import { useClasses } from "@/hooks/useClasses";
import { useTerms } from "@/hooks/useTerms";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useGrades } from "@/hooks/useGrades";
import { PromotionStatus } from "@/types/prisma-enums";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";

function formatTermLabel(termType: string): string {
  return termType.replace(/^TERM_(\d+)$/, (_, n) => `Term ${n}`);
}

export default function AdminReportCardsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [termFilter, setTermFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [promotionStatusFilter, setPromotionStatusFilter] = useState<PromotionStatus | "all">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReportCardId, setSelectedReportCardId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReportCardId, setSheetReportCardId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportCardToDelete, setReportCardToDelete] = useState<any>(null);
  const [bulkGenerateDialogOpen, setBulkGenerateDialogOpen] = useState(false);
  const [bulkDownloadDialogOpen, setBulkDownloadDialogOpen] = useState(false);
  const [notifyParentsDialogOpen, setNotifyParentsDialogOpen] = useState(false);

  const { grades, isLoading: gradesLoading } = useGrades();
  const { classes: allClasses, isLoading: classesLoading } = useClasses({ mode: "all" }, { page: 1, pageSize: 10 });
  const { terms, isLoading: termsLoading } = useTerms();
  const { academicYears, isLoading: academicYearsLoading } = useAcademicYears();

  const filteredClasses = useMemo(() => {
    if (gradeFilter === "all") return allClasses;
    return allClasses.filter((c) => c.gradeId === gradeFilter);
  }, [gradeFilter, allClasses]);

  const handleGradeChange = (value: string) => {
    setGradeFilter(value);
    setClassFilter("all");
  };

  const { reportCards, meta, isLoading, error, refetch, deleteReportCard } = useReportCards(
    {
      classId: classFilter !== "all" ? classFilter : undefined,
      termId: termFilter !== "all" ? termFilter : undefined,
      academicYearId: academicYearFilter !== "all" ? academicYearFilter : undefined,
      promotionStatus: promotionStatusFilter !== "all" ? promotionStatusFilter : undefined,
    },
    { page, pageSize }
  );

  const hasActiveFilters =
    gradeFilter !== "all" ||
    classFilter !== "all" ||
    termFilter !== "all" ||
    academicYearFilter !== "all" ||
    promotionStatusFilter !== "all";

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "Report cards list has been refreshed" });
  };

  useMobileHeaderRefresh(handleRefresh, isLoading);

  const handleClearFilters = () => {
    setGradeFilter("all");
    setClassFilter("all");
    setTermFilter("all");
    setAcademicYearFilter("all");
    setPromotionStatusFilter("all");
    setSearch("");
    setPage(1);
  };

  const handleDeleteClick = (reportCard: any) => {
    setReportCardToDelete(reportCard);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportCardToDelete) return;
    try {
      await deleteReportCard(reportCardToDelete.id);
      toast({ title: "Deleted", description: "Report card deleted successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete report card",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setReportCardToDelete(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
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
    <div className="px-4 lg:px-0 space-y-6">
      {/* Page Header — title hidden on mobile (MobileAdminLayout's own header
          already shows the page name); Refresh also moves there via
          useMobileHeaderRefresh above instead of duplicating it inline. */}
      <div className="flex items-center justify-between mt-2">
        <div className="hidden lg:flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Report Cards</h1>
          <p className="text-sm text-muted-foreground">Generate, view, and manage student report cards</p>
        </div>
        {/* flex-1 so this fills the rest of the row — the internal
            justify-between then pushes "Bulk Generate" to the true far
            right, separate from the other (secondary) action buttons. */}
        <div className="flex items-center justify-between flex-1 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={handleRefresh}
              disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Separator orientation="vertical" className="hidden lg:block h-6" />
            <Button variant="outline" size="sm" onClick={() => setBulkDownloadDialogOpen(true)}>
              <Download className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Download</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotifyParentsDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Notify Parents</span>
            </Button>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setBulkGenerateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Bulk Generate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={gradeFilter} onValueChange={handleGradeChange} disabled={gradesLoading}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={classFilter}
              onValueChange={setClassFilter}
              disabled={classesLoading || gradeFilter === "all"}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder={gradeFilter === "all" ? "Pick grade first" : "Class"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {grades.find((g) => g.id === c.gradeId)?.name} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={termFilter} onValueChange={setTermFilter} disabled={termsLoading}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {formatTermLabel(t.termType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={academicYearsLoading}>
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={promotionStatusFilter}
              onValueChange={(v) => setPromotionStatusFilter(v as PromotionStatus | "all")}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={PromotionStatus.PROMOTED}>Promoted</SelectItem>
                <SelectItem value={PromotionStatus.REPEATED}>Repeated</SelectItem>
                <SelectItem value={PromotionStatus.GRADUATED}>Graduated</SelectItem>
                <SelectItem value={PromotionStatus.TRANSFERRED}>Transferred</SelectItem>
                <SelectItem value={PromotionStatus.WITHDRAWN}>Withdrawn</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground">
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 m-4 bg-destructive/10 text-destructive rounded-md text-sm">
              <p className="font-medium">Error loading report cards</p>
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : reportCards.length === 0 ? (
            <Empty className="py-20">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <FileText className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No report cards found</EmptyTitle>
                  <EmptyDescription>
                    {hasActiveFilters
                      ? "Try adjusting your filters or clearing them"
                      : "Generate report cards to get started"}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : (
            <ReportCardsTable
              reportCards={reportCards}
              onRowClick={(rc) => { setSheetReportCardId(rc.id); setSheetOpen(true); }}
              onEdit={(rc) => { setSelectedReportCardId(rc.id); setEditDialogOpen(true); }}
              onDelete={handleDeleteClick}
              onPreview={(rc) => { setSheetReportCardId(rc.id); setSheetOpen(true); }}
            />
          )}
        </CardContent>

        {/* Pagination inside the card */}
        {!isLoading && reportCards.length > 0 && (
          <div className="border-t px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {meta.total > 0
                ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, meta.total)} of ${meta.total}`
                : "No results"}
            </p>
            <Pagination className="mx-0 w-auto">
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
                    className={page === meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <NotifyParentsDialog
        open={notifyParentsDialogOpen}
        onOpenChange={setNotifyParentsDialogOpen}
      />

      <EditReportCardDialog
        open={editDialogOpen}
        onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setSelectedReportCardId(null); }}
        reportCardId={selectedReportCardId || undefined}
        onSuccess={refetch}
      />

      <BulkGenerateDialog
        open={bulkGenerateDialogOpen}
        onOpenChange={setBulkGenerateDialogOpen}
        onSuccess={refetch}
      />

      <BulkDownloadDialog
        open={bulkDownloadDialogOpen}
        onOpenChange={setBulkDownloadDialogOpen}
      />

      <ReportCardSheet
        reportCardId={sheetReportCardId}
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setSheetReportCardId(null); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Report Card</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              Are you sure you want to delete this report card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
