"use client";

import { useState, useEffect } from "react";
import { formatClassLabel } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

/**
 * Marksheet View Page
 * Shows combined assessment results in a gradebook format
 */

interface Assessment {
  id: string;
  title: string;
  examType: string;
  totalMarks: number;
  status: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class: {
    id: string;
    name: string;
    grade: {
      name: string;
    };
  };
  term: {
    id: string;
    termType: string;
    academicYear: {
      id: string;
      year: number;
    };
  };
}

interface StudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  results: {
    [examType: string]: {
      marksObtained: number;
      totalMarks: number;
    };
  };
}

export default function MarksheetPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 50;

  useEffect(() => {
    fetchAssessmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);

      // Fetch the selected assessment
      const assessmentResponse = await api.get(`/assessments/${assessmentId}`);
      const currentAssessment = assessmentResponse.data;
      setAssessment(currentAssessment);

      // Fetch all assessments for the same subject, class, and term
      const params = new URLSearchParams({
        termId: currentAssessment.term.id,
        classId: currentAssessment.class.id,
      });
      const allAssessmentsResponse = await api.get(`/assessments?${params.toString()}`);
      const filteredAssessments = (allAssessmentsResponse.data || []).filter(
        (a: Assessment) =>
          a.subject.id === currentAssessment.subject.id &&
          a.status !== "DRAFT"
      );
      setAllAssessments(filteredAssessments);

      // Fetch students and their results for all assessments
      await fetchStudentResults(
        filteredAssessments,
        currentAssessment.class.id,
        currentAssessment.term.academicYear.id
      );
    } catch {
      // Don't toast — show inline so the page isn't left blank
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentResults = async (
    assessments: Assessment[],
    classId: string,
    academicYearId: string
  ) => {
    try {
      // Fetch all students in the class (returns enrollments with nested student)
      const studentsResponse = await api.get(
        `/classes/${classId}/students?academicYearId=${academicYearId}`
      );
      const enrollments = studentsResponse.data || [];

      // Map enrollments to students
      const resultsMap: { [studentId: string]: StudentResult } = {};

      for (const enrollment of enrollments) {
        const student = enrollment.student;
        resultsMap[student.id] = {
          studentId: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          results: {},
        };
      }

      // Fetch results for each assessment
      for (const assessment of assessments) {
        try {
          const resultsResponse = await api.get(`/assessments/${assessment.id}/results`);
          const results = resultsResponse.data || [];

          results.forEach((result: any) => {
            if (resultsMap[result.studentId]) {
              resultsMap[result.studentId].results[assessment.examType] = {
                marksObtained: result.marksObtained,
                totalMarks: assessment.totalMarks,
              };
            }
          });
        } catch (error) {
          console.error(`Error fetching results for assessment ${assessment.id}:`, error);
        }
      }

      setStudentResults(Object.values(resultsMap));
    } catch (error) {
      console.error("Error fetching student results:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading marksheet...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push("/teacher/assessments")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-muted-foreground font-medium">
            This assessment could not be loaded.
          </p>
          <p className="text-sm text-muted-foreground">
            It may have been deleted or you may not have access to it.
          </p>
        </div>
      </div>
    );
  }

  // Get unique exam types from assessments
  const examTypes = [...new Set(allAssessments.map((a) => a.examType))].sort();

  // Pagination
  const totalPages = Math.ceil(studentResults.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = studentResults.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/teacher/assessments")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="text-right">
          <h1 className="text-lg font-bold">
            {assessment.subject.name} ({assessment.subject.code})
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatClassLabel(assessment.class.grade.name, assessment.class.name)} •{" "}
            {assessment.term.academicYear.year} - {assessment.term.termType.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Marksheet Table */}
      <Card className="h-[calc(100vh-12rem)]">
        <CardContent className="p-0">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 border-b z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-16">SNo.</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  {examTypes.map((examType) => (
                    <th key={examType} className="px-4 py-3 text-center font-medium w-24">
                      {examType}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + examTypes.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No students found
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, index) => (
                    <tr key={student.studentId} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-muted-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.studentNumber}
                          </p>
                        </div>
                      </td>
                      {examTypes.map((examType) => {
                        const result = student.results[examType];
                        return (
                          <td key={examType} className="px-4 py-3 text-center">
                            {result ? (
                              <div>
                                <span className="font-medium">{result.marksObtained}</span>
                                <span className="text-muted-foreground">
                                  /{result.totalMarks}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {studentResults.length > 0 ? (
            <>
              Showing {startIndex + 1} to {Math.min(endIndex, studentResults.length)} of{" "}
              {studentResults.length} students
            </>
          ) : (
            "No students"
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || studentResults.length === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || studentResults.length === 0}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
