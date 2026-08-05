"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StreamBreakdownTable } from "@/components/admin/stream-breakdown-table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileWarning } from "lucide-react";
import { downloadSubjectAnalysisPdf } from "@/lib/pdf/subject-analysis-pdf";

type GradeLevel = "PRIMARY" | "JUNIOR" | "SENIOR";

interface AnalysisData {
  gradeLevel: GradeLevel;
  gradeName: string;
  subjectName: string;
  totalClasses: number;
  totalStudents: {
    male: number;
    female: number;
    total: number;
  };
  recordedEntries: {
    male: number;
    female: number;
    total: number;
  };
  absentStudents: {
    male: number;
    female: number;
    total: number;
  };
  gradeDistribution: Array<{
    gradeEnum: string;
    grade: string;
    range: string;
    male: number;
    female: number;
    total: number;
    percentage: number;
  }>;
  quantityPass: {
    passed: number;
    total: number;
    rate: number;
  };
  qualityPass: {
    qualityPasses: number;
    totalPassed: number;
    rate: number;
  };
}

interface StreamBreakdown {
  className: string;
  enrolled: number;
  sat: number;
  absent: number;
  passRate: number;
  qualityRate: number;
}

interface AdminSubjectAnalysisContentProps {
  gradeId: string;
  subjectId: string;
  termId: string;
  gradeName: string;
  subjectName: string;
  convention?: "standard" | "form";
  assessmentType: "CAT" | "MID" | "EOT";
  onAssessmentTypeChange: (assessmentType: "CAT" | "MID" | "EOT") => void;
}

export function AdminSubjectAnalysisContent({
  gradeId,
  subjectId,
  termId,
  gradeName,
  subjectName,
  convention,
  assessmentType,
  onAssessmentTypeChange,
}: AdminSubjectAnalysisContentProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [streamBreakdown, setStreamBreakdown] = useState<StreamBreakdown[]>([]);
  const [showStreamBreakdown, setShowStreamBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!gradeId || !subjectId || !termId) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");
        const conventionParam = convention ? `&convention=${convention}` : "";
        const url = `/api/admin/reports/subject-analysis?gradeId=${gradeId}&subjectId=${subjectId}&termId=${termId}&assessmentType=${assessmentType}&includeStreams=${showStreamBreakdown}${conventionParam}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to fetch analysis data");
        }

        // Handle ApiResponse wrapper: { success: true, data: {...} }
        const data = result?.data || result;

        if (showStreamBreakdown && data.overall) {
          // Response has overall + streamBreakdown
          setAnalysisData(data.overall);
          setStreamBreakdown(data.streamBreakdown || []);
        } else {
          // Response is just the analysis data
          setAnalysisData(data);
          setStreamBreakdown([]);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [gradeId, subjectId, termId, assessmentType, showStreamBreakdown, convention]);

  const getGradeLevelDescription = () => {
    if (!analysisData) return "";
    switch (analysisData.gradeLevel) {
      case "JUNIOR":
        return "Junior (5-point scale)";
      case "SENIOR":
        return "Senior (9-point scale)";
      case "PRIMARY":
        return "Primary";
      default:
        return "";
    }
  };

  const getAssessmentLabel = () => {
    if (assessmentType === "CAT") return "CAT";
    if (assessmentType === "MID") return "Mid-Term";
    if (assessmentType === "EOT") return "End of Term";
    return assessmentType;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-6 w-32 self-center" />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Table */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className={`h-4 ${["w-36","w-28","w-40","w-32","w-36","w-28","w-40","w-32"][i]}`} />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] space-y-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Controls */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {getAssessmentLabel()} - {subjectName}
            </h2>
            {/* Grade-level scale badge (e.g. "Junior (5-point scale)") hidden
                here — dropped to keep this row fitting on one line; the scale
                is still accurate, just not worth the space in this header. */}
            {analysisData && (
              <span className="text-xs bg-muted px-2 py-1 rounded-md font-medium">
                {analysisData.totalClasses}{" "}
                {analysisData.totalClasses === 1 ? "Stream" : "Streams"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stream Breakdown Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="stream-breakdown"
              checked={showStreamBreakdown}
              onCheckedChange={setShowStreamBreakdown}
            />
            <Label htmlFor="stream-breakdown" className="text-sm">
              Show stream breakdown
            </Label>
          </div>

          {/* Assessment Type Selector */}
          <Select value={assessmentType} onValueChange={onAssessmentTypeChange}>
            <SelectTrigger className="w-35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CAT">CAT</SelectItem>
              <SelectItem value="MID">Mid-Term</SelectItem>
              <SelectItem value="EOT">End of Term</SelectItem>
            </SelectContent>
          </Select>

          {/* Download PDF */}
          <Button
            variant="outline"
            size="sm"
            disabled={!analysisData || downloading}
            onClick={async () => {
              if (!analysisData) return;
              setDownloading(true);
              try {
                const token = localStorage.getItem("auth_token");
                let schoolName: string | undefined;
                let schoolLogoBase64: string | undefined;
                try {
                  const res = await fetch("/api/admin/settings/school-info", {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (res.ok) {
                    const json = await res.json();
                    const info = json.data || json;
                    schoolName = info.settings?.name || undefined;
                    schoolLogoBase64 = info.logoBase64 || undefined;
                  }
                } catch { /* non-fatal */ }
                await downloadSubjectAnalysisPdf(analysisData, {
                  classOrGrade: gradeName,
                  assessmentType,
                  gradeLevelDescription: getGradeLevelDescription() || undefined,
                  schoolName,
                  schoolLogoBase64,
                  streamBreakdown: showStreamBreakdown && streamBreakdown.length > 0
                    ? streamBreakdown
                    : undefined,
                });
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Download className="h-4 w-4 mr-2" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Main Grid Layout, or an empty-state pointing to entering scores */}
      {analysisData && analysisData.recordedEntries.total === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileWarning className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium text-foreground">
                No {getAssessmentLabel()} scores recorded for {subjectName} in {gradeName}
              </p>
              <p className="text-sm mt-2 max-w-md">
                Subject Analysis reads directly from entered assessment scores, not report
                cards. Teachers need to enter {getAssessmentLabel()} scores for this subject
                and term before analysis can show here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Statistics Card */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[calc(100vh-16rem)]">
            <CardHeader>
              <CardTitle className="text-base">Assessment Statistics</CardTitle>
              <CardDescription className="text-xs">
                Combined data from all streams in {gradeName}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  {/* Student Counts */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">
                        Total Students
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Male:
                          </span>
                          <span className="font-medium">
                            {analysisData?.totalStudents.male || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Female:
                          </span>
                          <span className="font-medium">
                            {analysisData?.totalStudents.female || 0}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">
                            {analysisData?.totalStudents.total || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">
                        Recorded Entries
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Male:
                          </span>
                          <span className="font-medium">
                            {analysisData?.recordedEntries.male || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Female:
                          </span>
                          <span className="font-medium">
                            {analysisData?.recordedEntries.female || 0}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">
                            {analysisData?.recordedEntries.total || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">
                        Absent Students
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Male:
                          </span>
                          <span className="font-medium">
                            {analysisData?.absentStudents.male || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">
                            Female:
                          </span>
                          <span className="font-medium">
                            {analysisData?.absentStudents.female || 0}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">
                            {analysisData?.absentStudents.total || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grade Distribution Table */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">
                      Grade Distribution
                    </h3>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Grade</TableHead>
                            <TableHead className="text-xs">Range</TableHead>
                            <TableHead className="text-center text-xs">
                              Male
                            </TableHead>
                            <TableHead className="text-center text-xs">
                              Female
                            </TableHead>
                            <TableHead className="text-center text-xs">
                              Total
                            </TableHead>
                            <TableHead className="text-center text-xs">
                              %
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisData?.gradeDistribution.map((gradeItem, index) => (
                            <TableRow
                              key={gradeItem.gradeEnum}
                              className={
                                index % 2 === 0 ? "bg-background" : "bg-muted/30"
                              }
                            >
                              <TableCell className="font-medium text-xs">
                                {gradeItem.grade}
                              </TableCell>
                              <TableCell className="text-xs">
                                {gradeItem.range}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {gradeItem.male}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {gradeItem.female}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-xs">
                                {gradeItem.total}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {gradeItem.percentage}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Stream Breakdown Table (if enabled) */}
                  {showStreamBreakdown && streamBreakdown.length > 0 && (
                    <StreamBreakdownTable streams={streamBreakdown} />
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Pass Analysis Card */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-16rem)] flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Pass Analysis</CardTitle>
              <CardDescription className="text-xs">
                Quantity and quality pass rates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  {/* Quantity Pass Analysis */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 text-sm">Quantity Pass</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">
                          Students Passed:
                        </span>
                        <span className="text-lg font-bold">
                          {analysisData?.quantityPass.passed}/
                          {analysisData?.quantityPass.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">
                          Pass Rate:
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          {analysisData?.quantityPass.rate}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-3 border-t">
                        Formula: (Students passed ÷ Students who sat) × 100
                      </p>
                    </div>
                  </div>

                  {/* Quality Pass Analysis */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 text-sm">Quality Pass</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">
                          {analysisData?.gradeLevel === "JUNIOR" ? "Dist 1:" : "Dist 1&2:"}
                        </span>
                        <span className="text-lg font-bold">
                          {analysisData?.qualityPass.qualityPasses}/
                          {analysisData?.qualityPass.totalPassed}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">
                          Quality Rate:
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {analysisData?.qualityPass.rate}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-3 border-t">
                        Formula: ({analysisData?.gradeLevel === "JUNIOR" ? "Distinction 1" : "Distinction 1&2"} ÷ Students passed) × 100
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
