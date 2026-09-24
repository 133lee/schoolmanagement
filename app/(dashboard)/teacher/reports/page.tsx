"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassReportsHeader } from "@/components/reports/class-reports-header";
import { ClassReportsTable } from "@/components/reports/class-reports-table";
import { ClassReportsStats } from "@/components/reports/class-reports-stats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectAnalysisContent } from "@/components/reports/subject-analysis-content";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";

interface ClassOption {
  id: string; // classId alone is NOT unique here — a teacher can teach the
  // same class under two different subjects, so this is `classId` or
  // `classId__subjectId` when disambiguation is needed. Never parse it;
  // use `classId` below for the real class id.
  classId: string;
  name: string;
  grade: string;
  subject: string;
  subjectCode: string;
  enrolled: number;
  subjectId?: string; // Optional: only present for subject teacher assignments
  isClassTeacher: boolean;
}

interface TermOption {
  id: string;
  name: string;
  termType: string;
  academicYear: string;
}

interface ReportCardData {
  id: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: string;
  };
  totalMarks: number | null;
  averageMark: number | null;
  position: number | null;
  outOf: number | null;
  attendance: number;
  daysPresent: number;
  daysAbsent: number;
  promotionStatus: string | null;
  subjects: {
    id: string;
    subject: {
      name: string;
      code: string;
    };
    catMark: number | null;
    midMark: number | null;
    eotMark: number | null;
    totalMark: number | null;
    grade: string | null;
    remarks: string | null;
  }[];
}

interface StatsData {
  totalStudents: number;
  averageClassMark: number;
  passRate: number;
  distinctionRate: number;
  attendanceRate: number;
  isJuniorSecondary: boolean;
}

export default function ClassReportsPage() {
  const [activeTab, setActiveTab] = useState<
    "class-reports" | "subject-analysis"
  >("class-reports");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [reportCards, setReportCards] = useState<ReportCardData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Fetch teacher's classes and terms on mount
  useEffect(() => {
    // Prevent double fetch in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function fetchInitialData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all classes where teacher teaches (both as class teacher and subject teacher)
        const classesData = await api.get("/teacher/reports/classes");

        // API returns: { data: { allClasses: [...], classTeacherClasses: [...], subjectTeacherClasses: [...] } }
        // A teacher can teach the SAME class under two different subjects —
        // either as a class teacher personally teaching >1 subject there
        // (c.teachingSubjects has every subject) or as a pure subject
        // teacher (allClasses then has two entries sharing the same c.id,
        // one per subject). Either way, expand to one row per (class,
        // subject) pair with a globally-unique `id`, instead of collapsing
        // to a single classId-keyed row that always resolves to the first
        // subject found — see teacher/assessments/page.tsx for the same
        // pattern already used correctly there.
        if (classesData.data?.allClasses) {
          const classOptions: ClassOption[] = [];
          for (const c of classesData.data.allClasses as any[]) {
            const subjects: Array<{ id: string; name: string; code?: string }> =
              c.teachingSubjects && c.teachingSubjects.length > 0
                ? c.teachingSubjects
                : c.teachingSubjectId
                ? [{ id: c.teachingSubjectId, name: c.teachingSubject, code: c.teachingSubjectCode }]
                : [];

            if (subjects.length === 0) {
              // Primary-grade class teacher with no single subject ("All Subjects")
              classOptions.push({
                id: c.id,
                classId: c.id,
                name: c.name,
                grade: c.gradeLevel || c.grade,
                subject: c.teachingSubject || c.subject || "All Subjects",
                subjectCode: c.teachingSubjectCode || c.subjectCode || "",
                enrolled: c.totalStudents || c.enrolled || 0,
                subjectId: undefined,
                isClassTeacher: c.isClassTeacher,
              });
            } else {
              for (const s of subjects) {
                classOptions.push({
                  id: `${c.id}__${s.id}`,
                  classId: c.id,
                  name: c.name,
                  grade: c.gradeLevel || c.grade,
                  subject: s.name,
                  subjectCode: s.code || "",
                  enrolled: c.totalStudents || c.enrolled || 0,
                  subjectId: s.id,
                  isClassTeacher: c.isClassTeacher,
                });
              }
            }
          }
          setClasses(classOptions);

          // Auto-select first class if available
          if (classOptions.length > 0) {
            setSelectedClass(classOptions[0].id);
          }
        }

        // Fetch available terms
        const termsData = await api.get("/teacher/reports/terms");
        setTerms(termsData.data?.terms || []);

        // Auto-select active term if available
        const activeTerm = termsData.data?.terms?.find((t: any) => t.isActive);
        if (activeTerm) {
          setSelectedTerm(activeTerm.id);
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

  // Fetch report cards when class or term changes
  useEffect(() => {
    async function fetchReportCards() {
      if (!selectedClass || !selectedTerm) {
        setReportCards([]);
        setStats(null);
        return;
      }

      try {
        setDataLoading(true);
        setError(null);

        // Resolve the real classId + subjectId from the selected option —
        // `selectedClass` is the composite selection key, not the classId.
        const selectedClassData = classes.find((c) => c.id === selectedClass);
        const subjectId = selectedClassData?.subjectId;
        const classId = selectedClassData?.classId;
        if (!classId) {
          setReportCards([]);
          setStats(null);
          setDataLoading(false);
          return;
        }

        // Build API URL with optional subjectId
        let url = `/teacher/reports?classId=${classId}&termId=${selectedTerm}`;
        if (subjectId) {
          url += `&subjectId=${subjectId}`;
        }

        const result = await api.get(url);

        setReportCards(result.data?.reportCards || []);
        setStats(result.data?.stats || null);
        setDataLoading(false);
      } catch (err) {
        console.error("Error fetching report cards:", err);
        setError(getErrorMessage(err, "Failed to load report cards"));
        setDataLoading(false);
      }
    }

    fetchReportCards();
  }, [selectedClass, selectedTerm, classes]);

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
      {/* Page Header — hidden on mobile (top bar handles title) */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Reports & Analysis</h1>
          <p className="text-muted-foreground text-sm">
            View student report cards and analyze class performance
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
        <div className="space-y-4 mt-5 lg:mt-0">
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "class-reports" | "subject-analysis")
          }
          className="w-full mt-5 lg:mt-0">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="class-reports"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              Class Reports
            </TabsTrigger>
            <TabsTrigger
              value="subject-analysis"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Subject Analysis
            </TabsTrigger>
          </TabsList>

          {/* Class Reports Tab */}
          <TabsContent value="class-reports" className="mt-4 space-y-4 lg:mt-6 lg:space-y-6">
            {/* Class and Term Selector */}
            <ClassReportsHeader
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
              selectedTerm={selectedTerm}
              onTermChange={setSelectedTerm}
              classes={classes}
              terms={terms}
            />

            {/* Empty State */}
            {!error && (!selectedClass || !selectedTerm) && (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-12 w-12" />
                  <p className="text-lg font-medium">Select a class and term</p>
                  <p className="text-sm">
                    Choose a class and term to view report cards
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            {!error && selectedClass && selectedTerm && (
              <>
                {/* Statistics Cards */}
                {stats && (
                  <ClassReportsStats stats={stats} loading={dataLoading} />
                )}

                {/* Report Cards Table */}
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Student Report Cards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="border rounded-lg overflow-hidden">
                        {/* Mobile compact list — mirrors ClassReportsTable's mobile rows */}
                        <div className="sm:hidden divide-y">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                              <Skeleton className="h-3 w-4 shrink-0" />
                              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                              <div className="shrink-0 flex flex-col items-end gap-1">
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-14 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop table — mirrors ClassReportsTable's 6-column table */}
                        <div className="hidden sm:block">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
                              <Skeleton className="h-4 w-6" />
                              <div className="flex items-center gap-3 flex-1">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-1.5">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-20" />
                                </div>
                              </div>
                              <Skeleton className="h-4 w-12" />
                              <Skeleton className="h-4 w-12" />
                              <Skeleton className="h-4 w-14" />
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : reportCards.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No report cards found for this class and term.</p>
                        <p className="text-sm mt-2">
                          Report cards may not have been generated yet.
                        </p>
                      </div>
                    ) : (
                      <ClassReportsTable reportCards={reportCards} />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Subject Analysis Tab */}
          <TabsContent value="subject-analysis" className="mt-6">
            {!selectedClass || !selectedTerm ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      Select a class and term
                    </p>
                    <p className="text-sm mt-2">
                      Switch to Class Reports tab to select a class and term
                      first
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              (() => {
                const selectedClassData = classes.find(
                  (c) => c.id === selectedClass
                );
                if (!selectedClassData || !selectedClassData.subjectId) {
                  return (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-12 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-lg font-medium">
                            No subject selected
                          </p>
                          <p className="text-sm mt-2">
                            Please select a class with a subject assignment
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <SubjectAnalysisContent
                    subjectId={selectedClassData.subjectId}
                    classId={selectedClassData.classId}
                    subject={selectedClassData.subject}
                    className={selectedClassData.name}
                    termId={selectedTerm}
                  />
                );
              })()
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
