"use client";

import { useState, useEffect } from "react";
import { formatClassLabel } from "@/lib/utils";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Student Enrollment History Page
 * View a student's enrollment history across academic years
 */

interface Class {
  id: string;
  name: string;
  grade: {
    name: string;
  };
}

interface AcademicYear {
  id: string;
  year: number;
}

interface Enrollment {
  id: string;
  class: Class;
  academicYear: AcademicYear;
  status: string;
  enrollmentDate: string;
}

export default function StudentEnrollmentsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}/enrollments`);

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setEnrollments(data.data || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast({
        title: "Error",
        description: "Failed to load enrollment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enrollment History</h1>
        <p className="text-muted-foreground">
          View student's enrollment across academic years
        </p>
      </div>

      <div className="grid gap-4">
        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No enrollment history</p>
              <p className="text-sm text-muted-foreground">
                This student has not been enrolled yet
              </p>
            </CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {enrollment.academicYear.year} - {formatClassLabel(enrollment.class.grade.name, enrollment.class.name)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      enrollment.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : enrollment.status === "TRANSFERRED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {enrollment.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enrolled on:{" "}
                  {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TODO: Enhancements Needed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Add promotion/transfer actions</li>
            <li>View performance summary for each year</li>
            <li>Export enrollment history as PDF</li>
            <li>Show more detailed enrollment information</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
