"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCompactClassLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BookOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Teacher Assignments Page
 * View all classes and subjects assigned to a teacher
 */

interface Assignment {
  id: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class: {
    id: string;
    name: string;
    grade: {
      id: string;
      name: string;
      sequence: number;
    };
  };
  academicYear: {
    id: string;
    year: number;
  };
}

interface AcademicYear {
  id: string;
  year: number;
  isActive: boolean;
}

interface Teacher {
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function TeacherAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [workload, setWorkload] = useState<any>(null);

  // Fetch academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const response = await fetch("/api/academic-years");
        if (response.ok) {
          const result = await response.json();
          setAcademicYears(result.data || []);
          const active = result.data.find((y: AcademicYear) => y.isActive);
          if (active) {
            setSelectedYearId(active.id);
          }
        }
      } catch (error) {
        console.error("Error fetching academic years:", error);
      }
    };
    fetchAcademicYears();
  }, []);

  // Fetch teacher info
  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const response = await fetch(`/api/teachers/${teacherId}`);
        if (response.ok) {
          const data = await response.json();
          setTeacher(data);
        }
      } catch (error) {
        console.error("Error fetching teacher:", error);
      }
    };
    fetchTeacher();
  }, [teacherId]);

  // Fetch assignments and workload
  useEffect(() => {
    if (selectedYearId) {
      fetchAssignments();
      fetchWorkload();
    }
  }, [selectedYearId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teachers/${teacherId}/assignments?academicYearId=${selectedYearId}`
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setAssignments(data.data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkload = async () => {
    try {
      const response = await fetch(
        `/api/teachers/${teacherId}/workload?academicYearId=${selectedYearId}`
      );

      if (response.ok) {
        const data = await response.json();
        setWorkload(data.data);
      }
    } catch (error) {
      console.error("Error fetching workload:", error);
    }
  };

  // Group assignments by subject
  const assignmentsBySubject = assignments.reduce((acc, assignment) => {
    const subjectKey = assignment.subject.id;
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        subject: assignment.subject,
        classes: [],
      };
    }
    acc[subjectKey].classes.push(assignment.class);
    return acc;
  }, {} as Record<string, { subject: Assignment["subject"]; classes: Assignment["class"][] }>);

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Teaching Assignments</h1>
          {teacher && (
            <p className="text-muted-foreground">
              {teacher.firstName} {teacher.lastName} ({teacher.user.email})
            </p>
          )}
        </div>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select academic year" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.year} {year.isActive ? "(Active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {workload && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{workload.totalClasses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workload.totalSubjects}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workload.totalAssignments}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Subjects & Classes ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teaching assignments for this academic year</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(assignmentsBySubject).map(
                ({ subject, classes }) => (
                  <div key={subject.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div className="font-semibold text-lg">
                        {subject.name}
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {subject.code}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {classes.map((classItem) => (
                        <div
                          key={classItem.id}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                        >
                          <Users className="h-4 w-4" />
                          {formatCompactClassLabel(classItem.grade.name, classItem.name)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TODO: Enhancements Needed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Workload comparison chart (vs other teachers)</li>
            <li>Student count per class</li>
            <li>Link to class timetables</li>
            <li>Export workload report</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
