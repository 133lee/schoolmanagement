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

interface ClassOption {
  id: string;
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
        if (classesData.data?.allClasses) {
          const classOptions: ClassOption[] = classesData.data.allClasses.map(
            (c: any) => ({
              id: c.id,
              name: c.name,
              grade: c.gradeLevel || c.grade, // API returns gradeLevel
              subject: c.teachingSubject || c.subject || "All Subjects", // API returns teachingSubject
              subjectCode: c.subjectCode || "", // May not exist in response
              enrolled: c.totalStudents || c.enrolled || 0, // API returns totalStudents
              subjectId: c.teachingSubjectId, // API returns teachingSubjectId (optional - only for subject teachers)
              isClassTeacher: c.isClassTeacher,
            })
          );
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
      } catch (err: any) {
        console.error("Error fetching initial data:", err);
        setError(err.message || "Failed to load initial data");
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

        // Get subjectId from selected class (for subject teachers)
        const selectedClassData = classes.find((c) => c.id === selectedClass);
        const subjectId = selectedClassData?.subjectId;

        // Build API URL with optional subjectId
        let url = `/teacher/reports?classId=${selectedClass}&termId=${selectedTerm}`;
        if (subjectId) {
          url += `&subjectId=${subjectId}`;
        }

        const result = await api.get(url);

        setReportCards(result.data?.reportCards || []);
        setStats(result.data?.stats || null);
        setDataLoading(false);
      } catch (err: any) {
        console.error("Error fetching report cards:", err);
        setError(err.message || "Failed to load report cards");
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
        <div className="space-y-4">
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
          className="w-full">
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
                      <div className="space-y-3 py-2">
                        {Array.from({ length: 6 }).map((_, i) => {
                          const ws = ["w-40","w-32","w-36","w-28","w-40","w-32"];
                          return (
                            <div key={i} className="flex items-center gap-4">
                              <Skeleton className={`h-4 ${ws[i]}`} />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-16 ml-auto" />
                            </div>
                          );
                        })}
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
                    classId={selectedClass}
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
