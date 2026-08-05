"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, BookOpen, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Class Subject-Teacher Assignments Page
 * Manage which teachers teach which subjects to a class
 */

interface Assignment {
  id: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    user: {
      email: string;
    };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: {
    id: string;
    year: number;
  };
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

interface AcademicYear {
  id: string;
  year: number;
  isActive: boolean;
}

export default function ClassAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [className, setClassName] = useState("");

  // New assignment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [adding, setAdding] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  // Fetch academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/academic-years", {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  // Fetch class info
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`/api/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setClassName(`${data.grade.name} ${data.section}`);
        }
      } catch (error) {
        console.error("Error fetching class:", error);
      }
    };
    fetchClass();
  }, [classId]);

  // Fetch teachers and subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const [teachersRes, subjectsRes] = await Promise.all([
          fetch("/api/teachers?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/subjects?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(teachersData.data || []);
        }

        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          setSubjects(subjectsData.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch assignments
  useEffect(() => {
    if (selectedYearId) {
      fetchAssignments();
    }
  }, [selectedYearId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/classes/${classId}/assignments?academicYearId=${selectedYearId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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

  const handleAddAssignment = async () => {
    if (!newTeacherId || !newSubjectId) {
      toast({
        title: "Validation Error",
        description: "Please select both teacher and subject",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId: newTeacherId,
          subjectId: newSubjectId,
          classId,
          academicYearId: selectedYearId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create assignment");
      }

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });

      setShowAddForm(false);
      setNewTeacherId("");
      setNewSubjectId("");
      fetchAssignments();
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClick = (assignmentId: string) => {
    setAssignmentToDelete(assignmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/assignments/${assignmentToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete assignment");
      }

      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });

      fetchAssignments();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Subject-Teacher Assignments</h1>
          <p className="text-muted-foreground">{className}</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignments ({assignments.length})</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-4 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">New Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Teacher
                  </label>
                  <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Subject
                  </label>
                  <Select value={newSubjectId} onValueChange={setNewSubjectId}>
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

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddAssignment}
                    disabled={adding}
                    className="flex-1"
                  >
                    {adding ? "Adding..." : "Add Assignment"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTeacherId("");
                      setNewSubjectId("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subject-teacher assignments yet</p>
              <p className="text-sm mt-2">
                Click &quot;Add Assignment&quot; to assign teachers to subjects
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg">
                        {assignment.subject.name}
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {assignment.subject.code}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Teacher: {assignment.teacher.firstName}{" "}
                      {assignment.teacher.lastName}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
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
            <li>Filter available subjects by grade curriculum</li>
            <li>Filter available teachers by subject qualification</li>
            <li>Change teacher for existing assignment</li>
            <li>Bulk assignment wizard</li>
            <li>Validation warnings (duplicate, unqualified teacher)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Delete Assignment Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to remove this subject-teacher assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
