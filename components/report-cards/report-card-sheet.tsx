"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";
import { ReportCard } from "@/types/prisma-enums";
import { useReportCards } from "@/hooks/useReportCards";
import { ReportCardPreview } from "./report-card-preview";
import { downloadSingleReportCard } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";

interface ReportCardWithRelations extends ReportCard {
  student?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    studentNumber: string;
  };
  class?: {
    name: string;
    grade?: {
      id: string;
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
  classTeacher?: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  subjects?: Array<{
    id: string;
    subject: {
      name: string;
      code: string;
      gradeSubjects?: Array<{ gradeId: string; isCore: boolean }>;
    };
    catMark: number | null;
    midMark: number | null;
    eotMark: number | null;
    totalMark: number | null;
    grade: string;
  }>;
}

interface ReportCardSheetProps {
  reportCardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportCardSheet({
  reportCardId,
  open,
  onOpenChange,
}: ReportCardSheetProps) {
  const [reportCard, setReportCard] = useState<ReportCardWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [schoolName, setSchoolName] = useState<string>("Kambombo Day Secondary School");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const { getReportCard } = useReportCards();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !reportCardId) {
      setReportCard(null);
      return;
    }

    const fetchReportCard = async () => {
      try {
        setIsLoading(true);
        const data = await getReportCard(reportCardId);
        setReportCard(data as ReportCardWithRelations);
      } catch (error) {
        console.error("Failed to fetch report card:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSchoolInfo = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/admin/settings/school-info", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();

          // Get school name from settings
          if (data.settings) {
            if (typeof data.settings === "object" && !Array.isArray(data.settings)) {
              // Settings is already an object
              if (data.settings.name) {
                setSchoolName(data.settings.name);
              }
            } else if (Array.isArray(data.settings)) {
              // Settings is an array
              const nameSettings = data.settings.find((s: any) => s.key === "name");
              if (nameSettings?.value) {
                setSchoolName(nameSettings.value);
              }
            }
          }

          // Get logo base64 (server-side converted)
          if (data.logoBase64) {
            setLogoUrl(data.logoBase64);
          }
        }
      } catch (error) {
        console.error("Failed to fetch school info:", error);
      }
    };

    fetchReportCard();
    fetchSchoolInfo();
  }, [open, reportCardId, getReportCard]);

  const handleDownload = async () => {
    if (!reportCard) return;

    try {
      setIsDownloading(true);
      const studentName = reportCard.student
        ? `${reportCard.student.firstName} ${reportCard.student.middleName || ""} ${reportCard.student.lastName}`
        : "Student";

      // Generate PDF using @react-pdf/renderer (proper PDF generation)
      await downloadSingleReportCard(reportCard, studentName.trim(), schoolName, logoUrl);

      toast({
        title: "Success",
        description: "Report card downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download report card",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[900px] w-full overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Report Card Preview</span>
            </SheetTitle>
            {reportCard && (
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    <span className="hidden sm:inline">Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        {isLoading || !reportCard ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 h-[calc(100dvh-5rem)]">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <ReportCardPreview reportCard={reportCard as any} schoolName={schoolName} logoUrl={logoUrl} />
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
