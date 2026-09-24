"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectAnalysisContent } from "@/components/reports/subject-analysis-content";
import { AdminReportsHeader } from "@/components/reports/admin-reports-header";
import { PerformanceListsContent } from "@/components/reports/performance-lists-content";
import { api } from "@/lib/api-client";
import type {
  GradeLevel,
  ClassOption,
  SubjectOption,
  TermOption,
  GradesResponse,
  ClassesResponse,
  SubjectsResponse,
  TermsResponse,
} from "@/types/hod-api.types";
import { getErrorMessage } from "@/lib/utils";

export default function HODReportCardsPage() {
  const [activeTab, setActiveTab] = useState<"subject-analysis" | "performance-lists">(
    "subject-analysis"
  );
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Fetch initial data on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function fetchInitialData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch grades (backend returns secondary grades only)
        const gradesResponse = await api.get<any>("/hod/reports/grades");
        const gradesData = gradesResponse.data || gradesResponse;
        if (gradesData.grades) {
          setGrades(gradesData.grades);
          if (gradesData.grades.length > 0) {
            setSelectedGrade(gradesData.grades[0].id);
          }
        }

        // Fetch terms
        const termsResponse = await api.get<any>("/hod/reports/terms");
        const termsData = termsResponse.data || termsResponse;
        setTerms(termsData.terms || []);
        const activeTerm = termsData.terms?.find((t: any) => t.isActive);
        if (activeTerm) {
          setSelectedTerm(activeTerm.id);
        }

        // Fetch subjects
        const subjectsResponse = await api.get<any>("/hod/reports/subjects");
        const subjectsData = subjectsResponse.data || subjectsResponse;
        setSubjects(subjectsData.subjects || []);
        if (subjectsData.subjects && subjectsData.subjects.length > 0) {
          setSelectedSubject(subjectsData.subjects[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(getErrorMessage(err, "Failed to load initial data"));
        setLoading(false);
      }
    }

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
        const classesResponse = await api.get<any>(`/hod/reports/classes?gradeId=${selectedGrade}`);
        const classesData = classesResponse.data || classesResponse;
        setClasses(classesData.classes || []);
        if (classesData.classes && classesData.classes.length > 0) {
          setSelectedClass(classesData.classes[0].id);
        } else {
          setSelectedClass("");
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        setClasses([]);
        setSelectedClass("");
      }
    }

    fetchClasses();
  }, [selectedGrade]);

  return (
    <div className="space-y-6">
      {/* Page Header — desktop only; mobile top bar handles the title */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Reports & Analysis</h1>
          <p className="text-muted-foreground text-sm">
            Analyze class performance and view detailed subject statistics
          </p>
        </div>
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
        <div className="space-y-6">
          {/* Filter bar skeleton — mirrors AdminReportsHeader's mobile
              compact layout (3 in row one, 1 spanning row two) vs desktop's
              flat row. */}
          <div className="px-4 lg:px-0">
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="hidden lg:flex items-center gap-3 flex-wrap">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
          {/* Tabs skeleton */}
          <div className="px-4 lg:px-0">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          {/* Content skeleton */}
          <div className="space-y-4 px-4 lg:px-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "subject-analysis" | "performance-lists")}
          className="w-full"
        >
          <div className="px-4 pt-4 lg:px-0 lg:pt-0">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger
                value="subject-analysis"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Subject Analysis
              </TabsTrigger>
              <TabsTrigger
                value="performance-lists"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance Lists
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Subject Analysis Tab */}
          <TabsContent value="subject-analysis" className="mt-6 space-y-6">
            <div className="px-4 lg:px-0">
              <AdminReportsHeader
                selectedGrade={selectedGrade}
                onGradeChange={setSelectedGrade}
                selectedClass={selectedClass}
                onClassChange={setSelectedClass}
                selectedSubject={selectedSubject}
                onSubjectChange={setSelectedSubject}
                selectedTerm={selectedTerm}
                onTermChange={setSelectedTerm}
                grades={grades}
                classes={classes}
                subjects={subjects}
                terms={terms}
                mobileCompactFilters
              />
            </div>

            {!selectedClass || !selectedSubject || !selectedTerm ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Select filters to view analysis</p>
                    <p className="text-sm mt-2">
                      Choose grade, class, subject, and term to view subject analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (() => {
              const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);
              const selectedClassData = classes.find((c) => c.id === selectedClass);

              return (
                <SubjectAnalysisContent
                  subjectId={selectedSubject}
                  classId={selectedClass}
                  subject={selectedSubjectData?.name || ""}
                  className={selectedClassData?.name || ""}
                  termId={selectedTerm}
                  apiEndpoint="/api/hod/reports/subject-analysis"
                />
              );
            })()}
          </TabsContent>

          {/* Performance Lists Tab */}
          <TabsContent value="performance-lists" className="mt-6 space-y-6">
            <div className="px-4 lg:px-0">
              <AdminReportsHeader
                selectedGrade={selectedGrade}
                onGradeChange={setSelectedGrade}
                selectedClass={selectedClass}
                onClassChange={setSelectedClass}
                selectedSubject={selectedSubject}
                onSubjectChange={setSelectedSubject}
                selectedTerm={selectedTerm}
                onTermChange={setSelectedTerm}
                grades={grades}
                classes={classes}
                subjects={subjects}
                terms={terms}
                mobileCompactFilters
              />
            </div>

            {!selectedClass || !selectedTerm ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Select filters to view performance</p>
                    <p className="text-sm mt-2">
                      Choose grade, class, and term to view student performance lists
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PerformanceListsContent
                classId={selectedClass}
                termId={selectedTerm}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
