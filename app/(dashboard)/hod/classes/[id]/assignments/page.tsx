"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Edit2, AlertCircle, Search, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, formatCompactClassLabel } from "@/lib/utils";
import type {
  Assignment,
  Teacher,
  SubjectOption as Subject,
  AcademicYear,
  TeachersPaginatedResponse,
  SubjectsPaginatedResponse,
  AcademicYearsResponse,
  AssignmentsResponse,
  AssignmentResponse,
} from "@/types/hod-api.types";

interface ClassData {
  id: string;
  name: string;
  capacity: number;
  currentEnrolled: number;
  grade: {
    id: string;
    name: string;
    level: string;
  };
}

export default function HodClassAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  // State
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);
  const [loadingTeacherSubjects, setLoadingTeacherSubjects] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(
    null
  );
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // Filter teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;

    const query = searchQuery.toLowerCase();
    return teachers.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const staffNumber = teacher.staffNumber.toLowerCase();
      return fullName.includes(query) || staffNumber.includes(query);
    });
  }, [teachers, searchQuery]);

  // Filter subjects based on selected teacher's qualifications
  const availableSubjects = useMemo(() => {
    if (!selectedTeacherId) return [];
    return teacherSubjects;
  }, [selectedTeacherId, teacherSubjects]);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [classId]);

  // Fetch assignments when year changes
  useEffect(() => {
    if (selectedYearId && classData) {
      fetchAssignments();
    }
  }, [selectedYearId, classData]);

  // Fetch teacher subjects when teacher is selected
  useEffect(() => {
    if (selectedTeacherId) {
      fetchTeacherSubjects(selectedTeacherId);
    } else {
      setTeacherSubjects([]);
      setSelectedSubjectId("");
    }
  }, [selectedTeacherId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Authentication token not found");
        return;
      }

      // Fetch class data, academic years, teachers, and subjects in parallel
      const [classRes, yearsRes, teachersRes, subjectsRes] = await Promise.all([
        fetch(`/api/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/academic-years", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/hod/teachers?mode=all", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/hod/subjects?mode=all", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Check responses
      if (!classRes.ok) {
        throw new Error("Failed to load class data");
      }

      const classResult = await classRes.json();
      if (!classResult.success) {
        throw new Error(classResult.error || "Failed to load class");
      }

      const classDataResult = classResult.data;

      setClassData(classDataResult);

      // Parse other responses
      if (yearsRes.ok) {
        const yearsResult = await yearsRes.json();
        if (!yearsResult.success) {
          throw new Error(yearsResult.error || "Failed to load academic years");
        }
        const yearsArray = yearsResult.data || [];
        setAcademicYears(yearsArray);

        // Set active year as default
        const activeYear = yearsArray.find((y: AcademicYear) => y.isActive);
        if (activeYear) {
          setSelectedYearId(activeYear.id);
        }
      }

      if (teachersRes.ok) {
        const teachersResult = await teachersRes.json();
        if (!teachersResult.success) {
          throw new Error(teachersResult.error || "Failed to load teachers");
        }
        setTeachers(teachersResult.data || []);
      }

      if (subjectsRes.ok) {
        const subjectsResult = await subjectsRes.json();
        if (!subjectsResult.success) {
          throw new Error(subjectsResult.error || "Failed to load subjects");
        }
        setSubjects(subjectsResult.data || []);
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(
        `/api/hod/assignments/by-class/${classId}?academicYearId=${selectedYearId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load assignments");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to load assignments");
      }

      setAssignments(result.data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      toast.error("Failed to load assignments");
    }
  };

  const fetchTeacherSubjects = async (teacherId: string) => {
    try {
      setLoadingTeacherSubjects(true);
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(
        `/api/hod/teachers/${teacherId}/subjects`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load teacher subjects");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to load teacher subjects");
      }

      setTeacherSubjects(result.data || []);
    } catch (err) {
      console.error("Error fetching teacher subjects:", err);
      toast.error("Failed to load teacher subjects");
      setTeacherSubjects([]);
    } finally {
      setLoadingTeacherSubjects(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedTeacherId || !selectedSubjectId) {
      toast.error("Please select both teacher and subject");
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch("/api/hod/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          subjectId: selectedSubjectId,
          classId,
          academicYearId: selectedYearId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create assignment");
      }

      toast.success("Assignment created successfully");
      setCreateDialogOpen(false);
      setSelectedTeacherId("");
      setSelectedSubjectId("");
      fetchAssignments();
    } catch (err) {
      console.error("Error creating assignment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create assignment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAssignment = async () => {
    if (!assignmentToEdit || !selectedTeacherId) {
      toast.error("Please select a teacher");
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `/api/hod/assignments/${assignmentToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacherId: selectedTeacherId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update assignment");
      }

      toast.success("Assignment updated successfully");
      setEditDialogOpen(false);
      setAssignmentToEdit(null);
      setSelectedTeacherId("");
      fetchAssignments();
    } catch (err) {
      console.error("Error updating assignment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update assignment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      setSubmitting(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `/api/hod/assignments/${assignmentToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete assignment");
      }

      toast.success("Assignment deleted successfully");
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      fetchAssignments();
    } catch (err) {
      console.error("Error deleting assignment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete assignment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-9 w-36" />
          <div className="flex flex-col items-end space-y-1">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="border rounded-lg p-6 space-y-3">
          <Skeleton className="h-5 w-56" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Class not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mt-2">
        <Button onClick={() => router.back()} variant="outline">
          Back to Classes
        </Button>
        <div className="flex flex-col items-end space-y-1">
          <h1 className="text-xl font-bold">Class Assignments</h1>
          <p className="text-muted-foreground text-sm">
            {formatCompactClassLabel(classData.grade.name, classData.name)}
          </p>
        </div>
      </div>

      {/* Academic Year Selector */}
      <Card>
        <CardContent className="py-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Academic Year:</label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.year} {year.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Subject Teacher Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assignments found for this class</p>
              <p className="text-sm mt-2">
                Click &quot;Add Assignment&quot; to create one
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Staff Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.subject.name}
                      <span className="text-muted-foreground text-sm ml-2">
                        ({assignment.subject.code})
                      </span>
                    </TableCell>
                    <TableCell>
                      {assignment.teacher.firstName}{" "}
                      {assignment.teacher.lastName}
                    </TableCell>
                    <TableCell>{assignment.teacher.staffNumber}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentToEdit(assignment);
                            setSelectedTeacherId(assignment.teacher.id);
                            setEditDialogOpen(true);
                          }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAssignmentToDelete(assignment.id);
                            setDeleteDialogOpen(true);
                          }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Add Subject Teacher Assignment</DialogTitle>
            <DialogDescription>
              Assign a teacher to teach a subject to this class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Teachers and Subject Selection Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Search Teachers */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Teachers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or staff number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Subject Selection - Only available after teacher is selected */}
              <div className="space-y-2">
                <Label htmlFor="subject">Select Subject for this Teacher</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  disabled={!selectedTeacherId || submitting || loadingTeacherSubjects}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTeacherSubjects ? "Loading subjects..." : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTeacherSubjects ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading subjects...
                      </div>
                    ) : availableSubjects.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No subjects available for this teacher
                      </div>
                    ) : (
                      availableSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Teacher Selection */}
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher</Label>
              <div className="border rounded-md">
                <ScrollArea className="h-60">
                  {filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No teachers found
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredTeachers.map((teacher) => {
                        const isSelected = selectedTeacherId === teacher.id;
                        const fullName = `${teacher.firstName} ${teacher.lastName}`;
                        const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;

                        return (
                          <div
                            key={teacher.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-accent transition-colors",
                              isSelected && "bg-accent"
                            )}
                            onClick={() => setSelectedTeacherId(teacher.id)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage src="" alt={fullName} />
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {fullName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {teacher.staffNumber}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Selected Preview */}
            {selectedTeacherId && selectedSubjectId && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Assignment Preview
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={`${teachers.find(t => t.id === selectedTeacherId)?.firstName} ${teachers.find(t => t.id === selectedTeacherId)?.lastName}`} />
                      <AvatarFallback>
                        {teachers.find(t => t.id === selectedTeacherId)?.firstName[0]}{teachers.find(t => t.id === selectedTeacherId)?.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {teachers.find(t => t.id === selectedTeacherId)?.firstName} {teachers.find(t => t.id === selectedTeacherId)?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {teachers.find(t => t.id === selectedTeacherId)?.staffNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium">
                      {teacherSubjects.find(s => s.id === selectedSubjectId)?.name}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setSelectedTeacherId("");
                setSelectedSubjectId("");
                setSearchQuery("");
              }}
              disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={submitting || !selectedTeacherId || !selectedSubjectId}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Teacher</DialogTitle>
            <DialogDescription>
              Change the teacher assigned to {assignmentToEdit?.subject.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Teacher</label>
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName} (
                      {teacher.staffNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setAssignmentToEdit(null);
                setSelectedTeacherId("");
              }}>
              Cancel
            </Button>
            <Button onClick={handleEditAssignment} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAssignmentToDelete(null);
              }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAssignment}
              disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
