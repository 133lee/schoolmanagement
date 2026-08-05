"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * All Assignments Management Page
 * View and filter all subject-teacher-class assignments across the school
 */

interface Assignment {
  id: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class: {
    id: string;
    section: string;
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
  id: string;
  firstName: string;
  lastName: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassItem {
  id: string;
  section: string;
  grade: {
    id: string;
    name: string;
  };
}

export default function AllAssignmentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [teachersRes, subjectsRes, classesRes] = await Promise.all([
          fetch("/api/teachers?mode=all"),
          fetch("/api/subjects?mode=all"),
          fetch("/api/classes?mode=all"),
        ]);

        if (teachersRes.ok) {
          const data = await teachersRes.json();
          setTeachers(data.data || []);
        }

        if (subjectsRes.ok) {
          const data = await subjectsRes.json();
          setSubjects(data.data || []);
        }

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch assignments when filters change
  useEffect(() => {
    if (selectedYearId) {
      fetchAssignments();
    }
  }, [selectedYearId, selectedTeacherId, selectedSubjectId, selectedClassId, page]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        page: page.toString(),
        pageSize: "20",
      });

      if (selectedTeacherId) params.append("teacherId", selectedTeacherId);
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId);
      if (selectedClassId) params.append("classId", selectedClassId);

      const response = await fetch(`/api/assignments?${params.toString()}`);

      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      setAssignments(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
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

  const clearFilters = () => {
    setSelectedTeacherId("");
    setSelectedSubjectId("");
    setSelectedClassId("");
    setSearchTerm("");
    setPage(1);
  };

  // Client-side search filter
  const filteredAssignments = assignments.filter((assignment) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      assignment.teacher.firstName.toLowerCase().includes(term) ||
      assignment.teacher.lastName.toLowerCase().includes(term) ||
      assignment.subject.name.toLowerCase().includes(term) ||
      assignment.subject.code.toLowerCase().includes(term) ||
      assignment.class.grade.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subject-Teacher Assignments</h1>
        <p className="text-muted-foreground">
          Manage all subject-teacher-class assignments across the school
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Academic Year
              </label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
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

            <div>
              <label className="text-sm font-medium mb-2 block">Teacher</label>
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.grade.name} {classItem.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Assignments ({filteredAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assignments found</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Class</p>
                        <p className="font-medium">
                          {assignment.class.grade.name}{" "}
                          {assignment.class.section}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Subject</p>
                        <p className="font-medium">
                          {assignment.subject.name}
                          <span className="text-xs ml-2 text-muted-foreground">
                            ({assignment.subject.code})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teacher</p>
                        <p className="font-medium">
                          {assignment.teacher.firstName}{" "}
                          {assignment.teacher.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/classes/${assignment.class.id}/assignments`
                          )
                        }
                      >
                        View Class
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/teachers/${assignment.teacher.id}/assignments`
                          )
                        }
                      >
                        View Teacher
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TODO: Enhancements Needed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Export assignments to CSV/Excel</li>
            <li>Bulk operations (delete, change teacher)</li>
            <li>Workload analytics dashboard</li>
            <li>Copy assignments from previous year</li>
            <li>Validation report (gaps, conflicts)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
