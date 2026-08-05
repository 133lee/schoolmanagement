"use client";

import React from "react";
import { ReportCard, PromotionStatus } from "@/types/prisma-enums";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Extended type for additional fields that might come from relations
type ExtendedReportCard = ReportCard & {
  student?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    studentNumber: string;
  };
  class?: {
    name: string;
    grade?: {
      name: string;
      level: string;
    };
  };
  term?: {
    termType: string;
    academicYear?: {
      year: number;
    };
  };
  academicYear?: {
    year: number;
  };
};

interface ReportCardsTableProps {
  reportCards: ExtendedReportCard[];
  onRowClick: (reportCard: ExtendedReportCard) => void;
  onEdit?: (reportCard: ExtendedReportCard) => void;
  onDelete?: (reportCard: ExtendedReportCard) => void;
  onPreview?: (reportCard: ExtendedReportCard) => void;
  showActions?: boolean;
}

const promotionStatusVariants: Record<PromotionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PROMOTED: "default",
  REPEATED: "destructive",
  GRADUATED: "secondary",
  TRANSFERRED: "outline",
  WITHDRAWN: "outline",
};

const promotionStatusLabels: Record<PromotionStatus, string> = {
  PROMOTED: "Promoted",
  REPEATED: "Repeated",
  GRADUATED: "Graduated",
  TRANSFERRED: "Transferred",
  WITHDRAWN: "Withdrawn",
};

export function ReportCardsTable({
  reportCards,
  onRowClick,
  onEdit,
  onDelete,
  onPreview,
  showActions = true,
}: ReportCardsTableProps) {
  // Helper to get student full name
  const getStudentName = (reportCard: ExtendedReportCard) => {
    if (!reportCard.student) return "Unknown Student";
    const parts = [
      reportCard.student.firstName,
      reportCard.student.middleName,
      reportCard.student.lastName
    ].filter(Boolean);
    return parts.join(" ");
  };

  // Helper to format term display
  const getTermDisplay = (reportCard: ExtendedReportCard) => {
    if (!reportCard.term) return "Unknown";
    const year = reportCard.term.academicYear?.year || reportCard.academicYear?.year || "N/A";
    const label = reportCard.term.termType.replace(/^TERM_(\d+)$/, (_, n) => `Term ${n}`);
    return `${label} · ${year}`;
  };

  // Helper to format average mark
  const formatAverage = (average: number | null) => {
    if (average === null) return "N/A";
    return `${average.toFixed(1)}%`;
  };

  // Helper to format position
  const formatPosition = (position: number | null, outOf: number | null) => {
    if (position === null || outOf === null) return "N/A";
    return `${position}/${outOf}`;
  };

  const renderActions = (reportCard: ExtendedReportCard) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onPreview && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onPreview(reportCard);
            }}>
            <Eye className="h-4 w-4 mr-2" />
            Preview PDF
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit(reportCard);
            }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Remarks
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(reportCard);
            }}
            className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (reportCards.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        No report cards found
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: tappable card rows — class/term/position/attendance
          dropped from the card front (still one tap away via the detail
          sheet) to keep this compact and single-row. ────────────────────── */}
      <div className="lg:hidden rounded-md border divide-y overflow-hidden">
        {reportCards.map((reportCard) => (
          <div
            key={reportCard.id}
            onClick={() => onRowClick(reportCard)}
            className="flex items-center gap-3 p-3 active:bg-muted/70 transition-colors cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{getStudentName(reportCard)}</p>
              <p className="text-xs text-muted-foreground truncate">
                {reportCard.class?.name || "N/A"} · {formatAverage(reportCard.averageMark)}
              </p>
            </div>
            {reportCard.promotionStatus ? (
              <Badge
                variant={promotionStatusVariants[reportCard.promotionStatus]}
                className="text-[10px] px-1.5 py-0 shrink-0">
                {promotionStatusLabels[reportCard.promotionStatus]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-muted-foreground">
                Undecided
              </Badge>
            )}
            {showActions && renderActions(reportCard)}
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>

      {/* ── Desktop: full table ─────────────────────────────────────────────── */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Average</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportCards.map((reportCard) => (
              <TableRow
                key={reportCard.id}
                onClick={() => onRowClick(reportCard)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell>
                  <div>
                    <p className="font-semibold text-sm">
                      {getStudentName(reportCard)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reportCard.student?.studentNumber || "N/A"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium">{reportCard.class?.name || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">
                      {reportCard.class?.grade?.name || "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {getTermDisplay(reportCard)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {formatAverage(reportCard.averageMark)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatPosition(reportCard.position, reportCard.outOf)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium">{reportCard.daysPresent || 0} days</p>
                    <p className="text-xs text-muted-foreground">
                      {reportCard.attendance || 0} total
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {reportCard.promotionStatus ? (
                    <Badge variant={promotionStatusVariants[reportCard.promotionStatus]}>
                      {promotionStatusLabels[reportCard.promotionStatus]}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Undecided</Badge>
                  )}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {renderActions(reportCard)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
