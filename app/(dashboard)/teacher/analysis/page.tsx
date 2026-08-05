"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function GradebookAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const subject = searchParams.get("subject") || "";
  const className = searchParams.get("class") || "";
  const subjectId = searchParams.get("subjectId") || "";
  const classId = searchParams.get("classId") || "";

  const [assessmentType, setAssessmentType] = useState(searchParams.get("type") || "CAT1");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch(
          `/api/teacher/gradebook/analysis?subjectId=${subjectId}&classId=${classId}&assessmentType=${assessmentType}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analysis data");
        }

        const result = await response.json();

        // API returns { success: true, data: {...} } - must check success flag
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch analysis data");
        }

        const data = result.data;
        setAnalysisData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching analysis data:", err);
        setError("Failed to load analysis data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [subjectId, classId, assessmentType]);

  // Get grade level description for display
  const getGradeLevelDescription = () => {
    if (!analysisData) return "";
    switch (analysisData.gradeLevel) {
      case "JUNIOR":
        return "Grade 8-9";
      case "SENIOR":
        return "Grade 10-12 / Form 1-4";
      case "PRIMARY":
        return "Grade 5-7";
      default:
        return "";
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleAssessmentTypeChange = (newType: string) => {
    setAssessmentType(newType);
    // Update URL with new assessment type
    const params = new URLSearchParams({
      classId,
      subjectId,
      subject,
      class: className,
      type: newType,
    });
    router.push(`/teacher/analysis?${params.toString()}`, { scroll: false });
  };

  const getAssessmentLabel = () => {
    if (assessmentType === "CAT1") return "CAT 1";
    if (assessmentType === "MID") return "MID";
    if (assessmentType === "EOT") return "EOT";
    return assessmentType;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between mt-2">
          <div className="flex flex-col space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="border rounded-lg p-6 space-y-4 h-[calc(100vh-12rem)]">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="grid grid-cols-3 gap-4 pt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-5 w-40" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 space-y-4 h-[calc(100vh-12rem)]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2 ">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
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

          <div className="flex items-center gap-3">
            <Select value={assessmentType} onValueChange={handleAssessmentTypeChange}>
              <SelectTrigger className="w-35">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAT1">CAT 1</SelectItem>
                <SelectItem value="MID">Mid-Term</SelectItem>
                <SelectItem value="EOT">End of Term</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Statistics Card */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-base">Assessment Statistics</CardTitle>
              <CardDescription className="text-xs">
                Detailed breakdown of student performance
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
                          {analysisData?.gradeDistribution.map(
                            (grade, index) => (
                              <TableRow
                                key={grade.grade}
                                className={
                                  index % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/30"
                                }>
                                <TableCell className="font-medium text-xs">
                                  {grade.grade}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {grade.range}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  {grade.male}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  {grade.female}
                                </TableCell>
                                <TableCell className="text-center font-semibold text-xs">
                                  {grade.total}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  {grade.percentage}%
                                </TableCell>
                              </TableRow>
                            )
                          )}
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
          <Card className="h-[calc(100vh-12rem)] flex flex-col">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
