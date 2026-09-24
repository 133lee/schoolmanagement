"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSubjectAnalysisContent } from "@/components/admin/admin-subject-analysis-content";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";

interface GradeOption {
  id: string;
  name: string;
  level: string;
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
  isActive: boolean;
}

export default function AdminSubjectAnalysisPage() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<"CAT" | "MID" | "EOT">("CAT");
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data function (extracted for manual refresh)
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all grades
      const gradesData = await api.get("/grade-levels");
      if (gradesData.grades) {
        const gradeOptions: GradeOption[] = gradesData.grades.map((g: any) => ({
          id: g.id,
          name: g.name,
          level: g.level,
        }));
        setGrades(gradeOptions);
      }

      // Fetch all subjects
      const subjectsData = await api.get("/subjects");
      if (subjectsData.subjects) {
        const subjectOptions: SubjectOption[] = subjectsData.subjects.map(
          (s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })
        );
        setSubjects(subjectOptions);
      }

      // Fetch available terms
      const termsData = await api.get("/terms");
      if (termsData.terms) {
        const termOptions: TermOption[] = termsData.terms.map((t: any) => ({
          id: t.id,
          name: `${t.termType} - ${t.academicYear.year}`,
          termType: t.termType,
          academicYear: t.academicYear.year.toString(),
          isActive: t.isActive,
        }));
        setTerms(termOptions);

        // Auto-select active term if available
        const activeTerm = termOptions.find((t) => t.isActive);
        if (activeTerm) {
          setSelectedTerm(activeTerm.id);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError(getErrorMessage(err, "Failed to load initial data"));
      setLoading(false);
    }
  };

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Grade-Level Subject Analysis</h1>
          <p className="text-muted-foreground text-sm">
            Analyze subject performance across all streams in a grade (combined data)
          </p>
        </div>
        <Button
          onClick={fetchInitialData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-28" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <Card key={i}><CardContent className="pt-5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-16" /></CardContent></Card>)}
          </div>
          <Card><CardContent className="pt-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => {
              const ws = ["w-36","w-28","w-40","w-24","w-36","w-28","w-40","w-24"];
              return (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className={`h-4 ${ws[i]}`} />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              );
            })}
          </CardContent></Card>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analysis Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Grade Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade</label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Term Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Term</label>
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name}
                          {term.isActive && (
                            <span className="ml-2 text-xs text-green-600">
                              (Active)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {!error && (!selectedGrade || !selectedSubject || !selectedTerm) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Select filters to view analysis</p>
                  <p className="text-sm mt-2">
                    Choose a grade, subject, and term to see aggregated performance
                    data
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Content */}
          {!error && selectedGrade && selectedSubject && selectedTerm && (
            <AdminSubjectAnalysisContent
              gradeId={selectedGrade}
              subjectId={selectedSubject}
              termId={selectedTerm}
              gradeName={
                grades.find((g) => g.id === selectedGrade)?.name || ""
              }
              subjectName={
                subjects.find((s) => s.id === selectedSubject)?.name || ""
              }
              subjectCode={
                subjects.find((s) => s.id === selectedSubject)?.code || ""
              }
              assessmentType={selectedAssessmentType}
              onAssessmentTypeChange={setSelectedAssessmentType}
            />
          )}
        </div>
      )}
    </div>
  );
}
