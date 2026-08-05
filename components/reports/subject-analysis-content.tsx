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
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadSubjectAnalysisPdf } from "@/lib/pdf/subject-analysis-pdf";

type GradeLevel = "PRIMARY" | "JUNIOR" | "SENIOR";

interface AnalysisData {
  gradeLevel: GradeLevel;
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

interface SubjectAnalysisContentProps {
  subjectId: string;
  classId: string;
  subject: string;
  className: string;
  termId?: string;
  apiEndpoint?: string;
}

// ── Grade abbreviations ──────────────────────────────────────────────────────
function abbreviateGrade(grade: string): string {
  return grade
    .replace(/Distinction/g, "Dist")
    .replace(/\bMerit\b/g, "Mer")
    .replace(/\bCredit\b/g, "Cre")
    .replace(/\bUnsatisfactory\b/g, "Unsat")
    .replace(/\bSatisfactory\b/g, "Sat");
}

export function SubjectAnalysisContent({
  subjectId,
  classId,
  subject,
  className,
  termId,
  apiEndpoint,
}: SubjectAnalysisContentProps) {
  const [assessmentType, setAssessmentType] = useState("CAT1");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!subjectId || !classId) {
        setError("Missing subject or class information");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");
        const endpoint = apiEndpoint ?? "/api/teacher/gradebook/analysis";
        const url = termId
          ? `${endpoint}?subjectId=${subjectId}&classId=${classId}&assessmentType=${assessmentType}&termId=${termId}`
          : `${endpoint}?subjectId=${subjectId}&classId=${classId}&assessmentType=${assessmentType}`;

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
        setAnalysisData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [subjectId, classId, assessmentType, termId]);

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
    if (assessmentType === "CAT1") return "CAT 1";
    if (assessmentType === "MID") return "MID";
    if (assessmentType === "EOT") return "EOT";
    return assessmentType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] space-y-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-6 lg:px-0 lg:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mt-2">
        {/* Title */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold lg:text-xl">
              {getAssessmentLabel()} Analysis
            </h1>
            {analysisData && getGradeLevelDescription() && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                {getGradeLevelDescription()}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {subject} • {className}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Select value={assessmentType} onValueChange={setAssessmentType}>
            <SelectTrigger className="flex-1 lg:w-35 h-9 text-xs lg:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CAT1">CAT 1</SelectItem>
              <SelectItem value="MID">Mid-Term</SelectItem>
              <SelectItem value="EOT">End of Term</SelectItem>
            </SelectContent>
          </Select>

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
                await downloadSubjectAnalysisPdf(
                  { ...analysisData, subjectName: subject },
                  {
                    classOrGrade: className,
                    assessmentType,
                    gradeLevelDescription: getGradeLevelDescription() || undefined,
                    schoolName,
                    schoolLogoBase64,
                  }
                );
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left Side - Statistics Card */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col lg:h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-base">Assessment Statistics</CardTitle>
              <CardDescription className="text-xs">
                Detailed breakdown of student performance
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 lg:overflow-hidden">
              <ScrollArea className="lg:h-full">
                <div className="space-y-6 lg:pr-4">
                  {/* Student Counts ── Mobile: compact unified table */}
                  <div className="lg:hidden border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-muted-foreground"></th>
                          <th className="py-2 px-2 text-center text-[11px] font-semibold">M</th>
                          <th className="py-2 px-2 text-center text-[11px] font-semibold">F</th>
                          <th className="py-2 px-2 text-center text-[11px] font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        <tr className="border-b">
                          <td className="py-2.5 px-3 text-muted-foreground font-medium">Students</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.totalStudents?.male || 0}</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.totalStudents?.female || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold">{analysisData?.totalStudents?.total || 0}</td>
                        </tr>
                        <tr className="border-b bg-muted/20">
                          <td className="py-2.5 px-3 text-muted-foreground font-medium">Recorded</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.recordedEntries?.male || 0}</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.recordedEntries?.female || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold">{analysisData?.recordedEntries?.total || 0}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-muted-foreground font-medium">Absent</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.absentStudents?.male || 0}</td>
                          <td className="py-2.5 px-2 text-center font-medium">{analysisData?.absentStudents?.female || 0}</td>
                          <td className="py-2.5 px-2 text-center font-bold">{analysisData?.absentStudents?.total || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Student Counts ── Desktop: 3-card layout */}
                  <div className="hidden lg:grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">Total Students</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Male:</span>
                          <span className="font-medium">{analysisData?.totalStudents?.male || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Female:</span>
                          <span className="font-medium">{analysisData?.totalStudents?.female || 0}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">{analysisData?.totalStudents?.total || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">Recorded Entries</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Male:</span>
                          <span className="font-medium">{analysisData?.recordedEntries?.male || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Female:</span>
                          <span className="font-medium">{analysisData?.recordedEntries?.female || 0}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">{analysisData?.recordedEntries?.total || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-sm">Absent Students</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Male:</span>
                          <span className="font-medium">{analysisData?.absentStudents?.male || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Female:</span>
                          <span className="font-medium">{analysisData?.absentStudents?.female || 0}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold text-xs">Total:</span>
                          <span className="font-semibold">{analysisData?.absentStudents?.total || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grade Distribution Table */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">
                      Grade Distribution
                    </h3>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold">Grade</TableHead>
                            <TableHead className="text-xs">Range</TableHead>
                            <TableHead className="text-center text-xs font-semibold">M</TableHead>
                            <TableHead className="text-center text-xs font-semibold">F</TableHead>
                            <TableHead className="text-center text-xs font-semibold">Total</TableHead>
                            <TableHead className="text-center text-xs font-semibold">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisData?.gradeDistribution?.map((grade, index) => (
                            <TableRow
                              key={grade.grade}
                              className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <TableCell className="font-semibold text-xs py-2 whitespace-nowrap">
                                {/* Mobile: abbreviated; Desktop: full name */}
                                <span className="lg:hidden">{abbreviateGrade(grade.grade)}</span>
                                <span className="hidden lg:inline">{grade.grade}</span>
                              </TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {grade.range}
                              </TableCell>
                              <TableCell className="text-center text-xs py-2">{grade.male}</TableCell>
                              <TableCell className="text-center text-xs py-2">{grade.female}</TableCell>
                              <TableCell className="text-center text-xs py-2 font-semibold">{grade.total}</TableCell>
                              <TableCell className="text-center text-xs py-2">{grade.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Pass Analysis Card */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col lg:h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-base">Pass Analysis</CardTitle>
              <CardDescription className="text-xs">
                Quantity and quality pass rates
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-6">
              {/* Quantity Pass Analysis */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4 text-sm">Quantity Pass</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">
                      Students Passed:
                    </span>
                    <span className="text-lg font-bold">
                      {analysisData?.quantityPass?.passed}/
                      {analysisData?.quantityPass?.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">
                      Pass Rate:
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      {analysisData?.quantityPass?.rate}%
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
                      {analysisData?.qualityPass?.qualityPasses}/
                      {analysisData?.qualityPass?.totalPassed}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">
                      Quality Rate:
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {analysisData?.qualityPass?.rate}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-3 border-t">
                    Formula: ({analysisData?.gradeLevel === "JUNIOR" ? "Distinction 1" : "Distinction 1&2"} ÷ Students passed) × 100
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
