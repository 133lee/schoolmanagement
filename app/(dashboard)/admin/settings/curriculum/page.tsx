"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  AlertCircle,
  Loader2,
  ChevronLeft,
  RefreshCw,
  School,
  BookOpen,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// School level categories based on Zambian education system
const SCHOOL_LEVELS = [
  { id: "lower-primary", label: "Lower Primary", grades: [1, 2, 3, 4] },
  { id: "upper-primary", label: "Upper Primary", grades: [5, 6, 7] },
  { id: "junior-secondary", label: "Junior Secondary", grades: [8, 9] },
  { id: "senior-secondary", label: "Senior Secondary", grades: [10, 11, 12] },
];

interface Subject {
  id: string;
  name: string;
  code: string;
  department?: {
    id: string;
    name: string;
  };
}

interface Grade {
  id: string;
  name: string;
  level: string;
  schoolLevel: string;
  sequence: number;
}

interface Class {
  id: string;
  name: string;
  gradeId: string;
  capacity: number;
  currentEnrolled: number;
  status: string;
}

interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  isCore: boolean;
  periodsPerWeek: number;
  subject: Subject;
}

// Helper function to extract grade number from grade level enum
function getGradeNumber(gradeLevel: string): number {
  const match = gradeLevel.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export default function StreamCurriculumPage() {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [coreSubjects, setCoreSubjects] = useState<Set<string>>(new Set());
  const [periodsPerWeek, setPeriodsPerWeek] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(SCHOOL_LEVELS[0].id);

  // Fetch grades, classes, and subjects on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch class subjects when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchClassSubjects(selectedClass);
    } else {
      // Clear selections when no class selected
      setClassSubjects([]);
      setSelectedSubjects(new Set());
      setCoreSubjects(new Set());
      setPeriodsPerWeek(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  // Filter classes by selected grade
  const filteredClasses = useMemo(() => {
    if (!selectedGrade) return [];
    return classes.filter(
      (c) => c.gradeId === selectedGrade && c.status === "ACTIVE"
    );
  }, [classes, selectedGrade]);

  // Reset selections when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSelectedGrade("");
    setSelectedClass("");
  };

  // Handle grade change - reset class selection
  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    setSelectedClass("");
  };

  async function fetchInitialData() {
    try {
      setLoading(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required. Please login again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const [gradesResponse, classesResponse, subjectsResponse] =
        await Promise.all([
          fetch("/api/grade-levels", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/classes?status=ACTIVE", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/subjects?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (!gradesResponse.ok || !classesResponse.ok || !subjectsResponse.ok) {
        throw new Error("Failed to fetch curriculum data");
      }

      const gradesData = await gradesResponse.json();
      const classesData = await classesResponse.json();
      const subjectsData = await subjectsResponse.json();

      setGrades(gradesData.data || []);
      setClasses(classesData.data || []);
      setSubjects(subjectsData.data || []);
    } catch (error: any) {
      console.error("Error fetching curriculum data:", error);
      toast({
        title: "Error",
        description:
          error.message || "Unable to load curriculum data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchClassSubjects(classId: string) {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(`/api/admin/curriculum/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch class subjects");
      }

      const data = await response.json();
      const assignments: ClassSubject[] = data.data || [];

      setClassSubjects(assignments);

      // Set selected and core subjects
      const selected = new Set(assignments.map((cs) => cs.subjectId));
      const core = new Set(
        assignments.filter((cs) => cs.isCore).map((cs) => cs.subjectId)
      );

      // Set periods per week
      const periods = new Map(
        assignments.map((cs) => [cs.subjectId, cs.periodsPerWeek || 5])
      );

      setSelectedSubjects(selected);
      setCoreSubjects(core);
      setPeriodsPerWeek(periods);
    } catch (error) {
      console.error("Error fetching class subjects:", error);
      setClassSubjects([]);
      setSelectedSubjects(new Set());
      setCoreSubjects(new Set());
      setPeriodsPerWeek(new Map());
    }
  }

  function toggleSubjectSelection(subjectId: string) {
    setSelectedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
        // Also remove from core if unselected
        setCoreSubjects((coreSet) => {
          const newCoreSet = new Set(coreSet);
          newCoreSet.delete(subjectId);
          return newCoreSet;
        });
        // Remove periodsPerWeek entry
        setPeriodsPerWeek((periodsMap) => {
          const newMap = new Map(periodsMap);
          newMap.delete(subjectId);
          return newMap;
        });
      } else {
        newSet.add(subjectId);
        // Initialize periodsPerWeek with default value of 5
        setPeriodsPerWeek((periodsMap) => {
          const newMap = new Map(periodsMap);
          newMap.set(subjectId, 5);
          return newMap;
        });
      }
      return newSet;
    });
  }

  function toggleCoreStatus(subjectId: string) {
    setCoreSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  }

  async function handleSave() {
    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class/stream",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required. Please login again.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Prepare data
      const subjectsData = Array.from(selectedSubjects).map((subjectId) => ({
        subjectId,
        isCore: coreSubjects.has(subjectId),
        periodsPerWeek: periodsPerWeek.get(subjectId) || 5,
      }));

      const response = await fetch("/api/admin/curriculum/classes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          subjects: subjectsData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save curriculum");
      }

      toast({
        title: "Success",
        description: "Stream curriculum updated successfully",
      });

      // Refresh class subjects
      await fetchClassSubjects(selectedClass);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save curriculum",
        variant: "destructive",
      });
      console.error("Error saving curriculum:", error);
    } finally {
      setSaving(false);
    }
  }

  const handleRefresh = () => {
    fetchInitialData();
    if (selectedClass) {
      fetchClassSubjects(selectedClass);
    }
    toast({
      title: "Refreshed",
      description: "Curriculum data has been refreshed",
    });
  };

  const selectedGradeObj = grades.find((g) => g.id === selectedGrade);
  const selectedClassObj = classes.find((c) => c.id === selectedClass);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-64" /></div>
        <div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
        <Card><CardContent className="pt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className={`h-4 ${["w-40","w-32","w-48","w-36","w-44","w-28"][i]}`} />
              <Skeleton className="h-5 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Back button left, Title right */}
      <div className="flex items-center justify-between mt-2">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-xl font-bold">Stream Curriculum Setup</h1>
            <p className="text-sm text-muted-foreground">
              Configure which subjects each class/stream teaches
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
        <School className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Stream-based curriculum.</span>{" "}
          Each class defines its own subject combination. Students enrolled in a class automatically follow that stream&apos;s curriculum.
        </p>
      </div>

      {grades.length === 0 || classes.length === 0 || subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {grades.length === 0
                ? "No grades found. Please create grade levels first."
                : classes.length === 0
                ? "No classes found. Please create classes first."
                : "No subjects found. Please create subjects first."}
            </p>
            <div className="flex gap-3">
              {grades.length === 0 && (
                <Button variant="outline" asChild>
                  <Link href="/admin/settings/academic-calendar">
                    Manage Grades
                  </Link>
                </Button>
              )}
              {classes.length === 0 && (
                <Button variant="outline" asChild>
                  <Link href="/admin/classes">Manage Classes</Link>
                </Button>
              )}
              {subjects.length === 0 && (
                <Button variant="outline" asChild>
                  <Link href="/admin/subjects">Manage Subjects</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Select Stream to Configure
            </CardTitle>
            <CardDescription>
              Choose a grade level, then select the class/stream to set up its
              curriculum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {SCHOOL_LEVELS.map((level) => {
                  const levelGrades = grades.filter((g) => {
                    const gradeNum = getGradeNumber(g.level);
                    return level.grades.includes(gradeNum);
                  });
                  const levelClasses = classes.filter((c) =>
                    levelGrades.some((g) => g.id === c.gradeId)
                  );
                  return (
                    <TabsTrigger
                      key={level.id}
                      value={level.id}
                      className="text-xs sm:text-sm"
                      disabled={levelClasses.length === 0}>
                      <span className="hidden sm:inline">{level.label}</span>
                      <span className="sm:hidden">
                        {level.label.split(" ")[0]}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {SCHOOL_LEVELS.map((level) => {
                const levelGrades = grades.filter((g) => {
                  const gradeNum = getGradeNumber(g.level);
                  return level.grades.includes(gradeNum);
                });

                return (
                  <TabsContent key={level.id} value={level.id} className="mt-0">
                    {levelGrades.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                          No grades for {level.label}
                        </p>
                        <p className="text-sm mt-1">
                          Create grades in Academic Calendar settings
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6 lg:grid-cols-3">
                        {/* Step 1 & 2: Grade and Class Selection */}
                        <Card className="lg:col-span-1 border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Select Stream
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Grade Dropdown */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">
                                Grade Level
                              </label>
                              <Select
                                value={
                                  levelGrades.some(
                                    (g) => g.id === selectedGrade
                                  )
                                    ? selectedGrade
                                    : ""
                                }
                                onValueChange={handleGradeChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {levelGrades.map((grade) => (
                                    <SelectItem key={grade.id} value={grade.id}>
                                      {grade.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Class/Stream Dropdown */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">
                                Class / Stream
                              </label>
                              <Select
                                value={selectedClass}
                                onValueChange={setSelectedClass}
                                disabled={
                                  !selectedGrade || filteredClasses.length === 0
                                }>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      !selectedGrade
                                        ? "Select grade first"
                                        : filteredClasses.length === 0
                                        ? "No classes available"
                                        : "Select class"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredClasses.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                      {selectedGradeObj?.name} {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Summary Stats */}
                            {selectedClassObj && (
                              <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Selected Subjects
                                  </span>
                                  <Badge variant="secondary">
                                    {selectedSubjects.size}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Core Subjects
                                  </span>
                                  <Badge variant="default">
                                    {coreSubjects.size}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Elective Subjects
                                  </span>
                                  <Badge variant="outline">
                                    {selectedSubjects.size - coreSubjects.size}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Total Periods/Week
                                  </span>
                                  <Badge variant="secondary" className="font-mono">
                                    {Array.from(selectedSubjects).reduce(
                                      (sum, subjectId) => sum + (periodsPerWeek.get(subjectId) || 5),
                                      0
                                    )}
                                  </Badge>
                                </div>
                                <div className="pt-2 border-t mt-2">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Enrolled Students</span>
                                    <span>
                                      {selectedClassObj.currentEnrolled} /{" "}
                                      {selectedClassObj.capacity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Step 3: Subject Selection */}
                        <Card className="lg:col-span-2 border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Subjects for{" "}
                              {selectedClassObj
                                ? `${selectedGradeObj?.name} ${selectedClassObj.name}`
                                : "Selected Stream"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Select subjects, mark as core/elective, and set periods per week
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {!selectedClass ? (
                              <div className="text-center py-12 text-muted-foreground">
                                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">
                                  Select a grade and class to configure subjects
                                </p>
                              </div>
                            ) : (
                              <ScrollArea className="h-100">
                                <div className="space-y-2 pr-4">
                                  {subjects.map((subject) => {
                                    const isSelected = selectedSubjects.has(
                                      subject.id
                                    );
                                    const isCore = coreSubjects.has(subject.id);

                                    return (
                                      <div
                                        key={subject.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                          isSelected
                                            ? "bg-primary/10 border-primary/30 dark:bg-primary/15 dark:border-primary/40"
                                            : "border-transparent hover:bg-muted/50 hover:border-border"
                                        }`}>
                                        <div className="flex items-center gap-3 flex-1">
                                          <Checkbox
                                            id={`subject-${subject.id}`}
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              toggleSubjectSelection(subject.id)
                                            }
                                          />
                                          <label
                                            htmlFor={`subject-${subject.id}`}
                                            className="flex-1 cursor-pointer">
                                            <div className="font-medium">
                                              {subject.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {subject.code}
                                              {subject.department && (
                                                <span className="ml-2">
                                                  • {subject.department.name}
                                                </span>
                                              )}
                                            </div>
                                          </label>
                                        </div>

                                        {isSelected && (
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              id={`core-${subject.id}`}
                                              checked={isCore}
                                              onCheckedChange={() =>
                                                toggleCoreStatus(subject.id)
                                              }
                                            />
                                            <label
                                              htmlFor={`core-${subject.id}`}
                                              className="text-sm font-medium cursor-pointer">
                                              Core
                                            </label>
                                            <div className="flex items-center gap-2 ml-2">
                                              <Input
                                                type="number"
                                                min="1"
                                                max="15"
                                                value={periodsPerWeek.get(subject.id) || 5}
                                                onChange={(e) => {
                                                  const value = parseInt(e.target.value) || 5;
                                                  setPeriodsPerWeek((prev) => {
                                                    const newMap = new Map(prev);
                                                    newMap.set(subject.id, Math.min(15, Math.max(1, value)));
                                                    return newMap;
                                                  });
                                                }}
                                                className="w-16 h-8 text-sm"
                                              />
                                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                periods/wk
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Save Button - Below the main card */}
      {grades.length > 0 && classes.length > 0 && subjects.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !selectedClass}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Stream Curriculum
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
