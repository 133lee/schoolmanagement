"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadSubjectAnalysisPdf } from "@/lib/pdf/subject-analysis-pdf";

interface SubjectData {
  name: string;
  className?: string;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  gradeDistribution: {
    grade: string;
    range: string;
    male: number;
    female: number;
    total: number;
    percentage: number;
  }[];
  topPerformers?: {
    id: string;
    name: string;
    studentId: string;
    score: number;
    grade: string;
  }[];
  needsAttention?: {
    id: string;
    name: string;
    studentId: string;
    score: number;
    grade: string;
  }[];
}

interface SubjectAnalysisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectData: SubjectData | null;
  availableSubjects?: string[]; // List of subjects the teacher teaches
  onSubjectChange?: (subject: string) => void; // Callback when subject changes
  gradeLevel?: "junior" | "senior"; // Grade level determines which grading scale to use
}

export function SubjectAnalysisSheet({
  open,
  onOpenChange,
  subjectData,
  availableSubjects = [],
  onSubjectChange,
  gradeLevel = "junior", // Default to junior (grades 8-9)
}: SubjectAnalysisSheetProps) {
  const [assessmentType, setAssessmentType] = useState("CAT");
  const [downloading, setDownloading] = useState(false);

  if (!subjectData) return null;

  const handleSubjectChange = (subject: string) => {
    if (onSubjectChange) onSubjectChange(subject);
  };

  // Define pass criteria based on grade level
  const getPassCriteria = () => {
    if (gradeLevel === "junior") {
      // Grades 8-9: Pass is grades 1-4 (40% and above)
      return ["1", "2", "3", "4", "Distinction", "Merit", "Credit", "Pass"];
    } else {
      // Grades 10-12/Form 1-4: Pass is grades 1-8 (40% and above)
      return ["1", "2", "3", "4", "5", "6", "7", "8",
              "Distinction 1", "Distinction 2", "Merit 3", "Merit 4",
              "Credit 5", "Credit 6", "Satisfactory 7", "Satisfactory 8"];
    }
  };

  // Define distinction criteria based on grade level
  const getDistinctionCriteria = () => {
    if (gradeLevel === "junior") {
      // Grades 8-9: Distinction is grade 1 (75% and above)
      return ["1", "Distinction"];
    } else {
      // Grades 10-12/Form 1-4: Distinction is grades 1-2 (70% and above)
      return ["1", "2", "Distinction 1", "Distinction 2"];
    }
  };

  const studentsRecorded = subjectData.totalStudents;
  const studentsAbsent = 0;
  const passCriteria = getPassCriteria();
  const studentsPassed = subjectData.gradeDistribution
    .filter((g) => passCriteria.some(criteria => g.grade.includes(criteria)))
    .reduce((sum, g) => sum + g.total, 0);
  const passRate = studentsRecorded > 0 ? ((studentsPassed / studentsRecorded) * 100).toFixed(1) : "0.0";

  const distinctionCriteria = getDistinctionCriteria();
  const qualityPass = subjectData.gradeDistribution
    .filter((g) => distinctionCriteria.some(criteria => g.grade.includes(criteria)))
    .reduce((sum, g) => sum + g.total, 0);
  const qualityRate = studentsPassed > 0 ? ((qualityPass / studentsPassed) * 100).toFixed(1) : "0.0";

  // ── Extracted export handler (shared between mobile + desktop buttons) ──────
  const handleExport = async () => {
    setDownloading(true);
    try {
      const gradeLevelDesc =
        gradeLevel === "junior" ? "Junior (5-point scale)" : "Senior (9-point scale)";
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
        {
          gradeLevel: gradeLevel === "junior" ? "JUNIOR" : "SENIOR",
          subjectName: subjectData!.name,
          totalStudents: {
            male: subjectData!.maleStudents,
            female: subjectData!.femaleStudents,
            total: subjectData!.totalStudents,
          },
          recordedEntries: {
            male: subjectData!.maleStudents,
            female: subjectData!.femaleStudents,
            total: studentsRecorded,
          },
          absentStudents: { male: 0, female: 0, total: studentsAbsent },
          gradeDistribution: subjectData!.gradeDistribution,
          quantityPass: {
            passed: studentsPassed,
            total: studentsRecorded,
            rate: parseFloat(passRate),
          },
          qualityPass: {
            qualityPasses: qualityPass,
            totalPassed: studentsPassed,
            rate: parseFloat(qualityRate),
          },
        },
        {
          classOrGrade: subjectData!.className || subjectData!.name,
          assessmentType,
          gradeLevelDescription: gradeLevelDesc,
          schoolName,
          schoolLogoBase64,
        }
      );
    } finally {
      setDownloading(false);
    }
  };

  // ── Shared select blocks ─────────────────────────────────────────────────────
  const SubjectSelect = ({ className }: { className?: string }) =>
    availableSubjects.length > 0 ? (
      <Select value={subjectData!.name} onValueChange={handleSubjectChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          {availableSubjects.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const AssessmentTypeSelect = ({ className }: { className?: string }) => (
    <Select value={assessmentType} onValueChange={setAssessmentType}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="CAT">CAT</SelectItem>
        <SelectItem value="MID">Mid-Term</SelectItem>
        <SelectItem value="EOT">End of Term</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[60vw] p-0 overflow-hidden">
        <div className="flex flex-col h-full">

          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <SheetHeader className="border-b bg-background p-4 sm:p-6 shrink-0">

            {/* Mobile layout */}
            <div className="sm:hidden space-y-3">
              {/* Icon + title row */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base leading-snug truncate">
                    {subjectData.name}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Performance Analysis
                    {subjectData.className && ` · ${subjectData.className}`}
                  </p>
                </div>
              </div>
              {/* Selects + icon-only export button */}
              <div className="flex items-center gap-2">
                <SubjectSelect className="flex-1 h-8 text-xs" />
                <AssessmentTypeSelect
                  className={cn(
                    "h-8 text-xs",
                    availableSubjects.length > 0 ? "flex-1" : "w-full"
                  )}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  disabled={downloading}
                  onClick={handleExport}
                  title="Export Report"
                >
                  {downloading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">{subjectData.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                      Complete Class Performance Analysis
                      {subjectData.className && ` - ${subjectData.className}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading}
                  onClick={handleExport}>
                  {downloading
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Export Report
                </Button>
              </div>
              <div className="flex gap-2">
                <SubjectSelect className="w-[160px]" />
                <AssessmentTypeSelect className="w-[140px]" />
              </div>
            </div>

          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/30">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Male:</span>
                        <span className="font-medium">
                          {subjectData.maleStudents}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Female:</span>
                        <span className="font-medium">
                          {subjectData.femaleStudents}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold">
                          {subjectData.totalStudents}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recorded Entries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Male:</span>
                        <span className="font-medium">
                          {subjectData.maleStudents}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Female:</span>
                        <span className="font-medium">
                          {subjectData.femaleStudents}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold">{studentsRecorded}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Absent Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Male:</span>
                        <span className="font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Female:</span>
                        <span className="font-medium">0</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold">{studentsAbsent}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analysis Table with Pass Rate Cards */}
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-3 border-r text-left text-sm font-medium">
                            Grade
                          </th>
                          <th className="px-4 py-3 border-r text-left text-sm font-medium">
                            Range
                          </th>
                          <th className="px-4 py-3 border-r text-center text-sm font-medium">
                            Male
                          </th>
                          <th className="px-4 py-3 border-r text-center text-sm font-medium">
                            Female
                          </th>
                          <th className="px-4 py-3 border-r text-center text-sm font-medium">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectData.gradeDistribution.map((grade, index) => (
                          <tr
                            key={grade.grade}
                            className={`border-b ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/50"
                            }`}>
                            <td className="px-4 py-3 border-r text-sm font-medium">
                              {grade.grade}
                            </td>
                            <td className="px-4 py-3 border-r text-sm text-muted-foreground">
                              {grade.range || "-"}
                            </td>
                            <td className="px-4 py-3 border-r text-sm text-center">
                              {grade.male}
                            </td>
                            <td className="px-4 py-3 border-r text-sm text-center">
                              {grade.female}
                            </td>
                            <td className="px-4 py-3 border-r text-sm text-center font-medium">
                              {grade.total}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {grade.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pass Rate Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Quantity Pass Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Students Passed:
                            </span>
                            <span className="font-medium">
                              {studentsPassed}/{studentsRecorded}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Pass Rate:
                            </span>
                            <span className="text-lg font-bold">
                              {passRate}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            Formula: (Students passed ÷ Students who sat) × 100
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Quality Pass Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Quality Pass ({gradeLevel === "junior" ? "Dist 1" : "Dist 1&2"}):
                            </span>
                            <span className="font-medium">
                              {qualityPass}/{studentsPassed}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Quality Rate:
                            </span>
                            <span className="text-lg font-bold">
                              {qualityRate}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            Formula: ({gradeLevel === "junior" ? "Distinction 1" : "Distinction 1&2"} ÷ Students passed) × 100
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
