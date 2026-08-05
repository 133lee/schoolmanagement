"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSubjectAnalysisContent } from "@/components/admin/admin-subject-analysis-content";
import { AdminReportsHeader } from "@/components/reports/admin-reports-header";
import { PerformanceListsContent } from "@/components/reports/performance-lists-content";
import { api } from "@/lib/api-client";

interface GradeOption {
  id: string;
  name: string;
  level: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TermOption {
  id: string;
  name: string;
  termType: string;
  academicYear: string;
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<
    "subject-analysis" | "performance-lists"
  >("subject-analysis");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedConvention, setSelectedConvention] = useState<"standard" | "form">("standard");
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<"CAT" | "MID" | "EOT">("CAT");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Convention filter only applies to Grade 8 and Grade 9 (ambiguous levels)
  const selectedGradeData = grades.find((g) => g.id === selectedGrade);
  const showConventionFilter =
    selectedGradeData?.level === "GRADE_8" ||
    selectedGradeData?.level === "GRADE_9";

  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    setSelectedConvention("standard"); // reset on grade change
  };

  // Fetch initial data function (extracted for manual refresh)
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch grades (8-12 only for secondary)
      // api.get returns { data: { grades: [...] }, meta: ... }
      const gradesResponse = await api.get("/admin/reports/grades");
      const gradesData = gradesResponse.data?.grades || [];
      if (gradesData.length > 0) {
        const secondaryGrades = gradesData.filter((g: any) =>
          ["GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"].includes(
            g.level
          )
        );
        setGrades(secondaryGrades);
        if (secondaryGrades.length > 0) {
          setSelectedGrade(secondaryGrades[0].id);
        }
      }

      // Fetch terms
      const termsResponse = await api.get("/admin/reports/terms");
      const termsData = termsResponse.data?.terms || [];
      setTerms(termsData);
      const activeTerm = termsData.find((t: any) => t.isActive);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      // Fetch subjects
      const subjectsResponse = await api.get("/admin/reports/subjects");
      const subjectsData = subjectsResponse.data?.subjects || [];
      setSubjects(subjectsData);
      if (subjectsData.length > 0) {
        setSelectedSubject(subjectsData[0].id);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching initial data:", err);
      setError(err.message || "Failed to load initial data");
      setLoading(false);
    }
  };

  // Fetch initial data on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetchInitialData();
  }, []);

  // Fetch classes when grade changes
  useEffect(() => {
    async function fetchClasses() {
      if (!selectedGrade) {
        setClasses([]);
        setSelectedClass("");
        return;
      }

      try {
        const classesResponse = await api.get(
          `/admin/reports/classes?gradeId=${selectedGrade}`
        );
        const classesData = classesResponse.data?.classes || [];
        setClasses(classesData);
        if (classesData.length > 0) {
          setSelectedClass(classesData[0].id);
        } else {
          setSelectedClass("");
        }
      } catch (err: any) {
        console.error("Error fetching classes:", err);
        setClasses([]);
        setSelectedClass("");
      }
    }

    fetchClasses();
  }, [selectedGrade]);

  return (
    <div className="px-4 lg:px-0 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Reports & Analysis</h1>
          <p className="text-muted-foreground text-sm">
            Analyze class performance and view detailed subject statistics
          </p>
        </div>
        <Button
          onClick={fetchInitialData}
          variant="outline"
          size="sm"
          disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="flex gap-3"><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-28" /></div>
          <div className="flex gap-2 border-b pb-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-9 w-28" />)}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0,1,2].map(i => <Card key={i}><CardContent className="pt-5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-16" /></CardContent></Card>)}
          </div>
          <Card><CardContent className="pt-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => {
              const ws = ["w-40","w-32","w-36","w-44","w-28","w-40","w-32","w-36"];
              return (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className={`h-4 ${ws[i]}`} />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              );
            })}
          </CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "subject-analysis" | "performance-lists")
          }
          className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="subject-analysis"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Subject Analysis
            </TabsTrigger>
            <TabsTrigger
              value="performance-lists"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance Lists
            </TabsTrigger>
          </TabsList>

          {/* Subject Analysis Tab - Aggregated by Grade */}
          <TabsContent value="subject-analysis" className="mt-6 space-y-6">
            <AdminReportsHeader
              selectedGrade={selectedGrade}
              onGradeChange={handleGradeChange}
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
              selectedSubject={selectedSubject}
              onSubjectChange={setSelectedSubject}
              selectedTerm={selectedTerm}
              onTermChange={setSelectedTerm}
              selectedConvention={selectedConvention}
              onConventionChange={setSelectedConvention}
              showConventionFilter={showConventionFilter}
              grades={grades}
              classes={classes}
              subjects={subjects}
              terms={terms}
              hideClassFilter={true}
            />

            {!selectedGrade || !selectedSubject || !selectedTerm ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      Select filters to view analysis
                    </p>
                    <p className="text-sm mt-2">
                      Choose grade, subject, and term to view aggregated subject
                      analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              (() => {
                const selectedSubjectData = subjects.find(
                  (s) => s.id === selectedSubject
                );
                const selectedGradeData = grades.find(
                  (g) => g.id === selectedGrade
                );

                return (
                  <AdminSubjectAnalysisContent
                    gradeId={selectedGrade}
                    subjectId={selectedSubject}
                    termId={selectedTerm}
                    gradeName={selectedGradeData?.name || ""}
                    subjectName={selectedSubjectData?.name || ""}
                    convention={showConventionFilter ? selectedConvention : undefined}
                    assessmentType={selectedAssessmentType}
                    onAssessmentTypeChange={setSelectedAssessmentType}
                  />
                );
              })()
            )}
          </TabsContent>

          {/* Performance Lists Tab */}
          <TabsContent value="performance-lists" className="mt-6 space-y-6">
            <AdminReportsHeader
              selectedGrade={selectedGrade}
              onGradeChange={handleGradeChange}
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
              selectedSubject={selectedSubject}
              onSubjectChange={setSelectedSubject}
              selectedTerm={selectedTerm}
              onTermChange={setSelectedTerm}
              selectedConvention={selectedConvention}
              onConventionChange={setSelectedConvention}
              showConventionFilter={false}
              hideSubjectFilter={true}
              grades={grades}
              classes={classes}
              subjects={subjects}
              terms={terms}
            />

            {!selectedClass || !selectedTerm ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      Select filters to view performance
                    </p>
                    <p className="text-sm mt-2">
                      Choose grade, class, and term to view student performance
                      lists
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PerformanceListsContent
                classId={selectedClass}
                termId={selectedTerm}
                apiEndpoint="/api/admin/reports/performance"
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
