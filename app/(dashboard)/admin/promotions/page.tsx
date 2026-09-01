"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useGrades } from "@/hooks/useGrades";
import { useClasses } from "@/hooks/useClasses";
import { cn, formatCompactClassLabel } from "@/lib/utils";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type PromotionAction = "PROMOTE" | "REPEAT" | "GRADUATE" | "SKIP";

interface Evaluation {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  subjectsPassed: number;
  subjectsFailed: number;
  subjectsIncomplete: number;
  totalSubjects: number;
  attendanceRate: number | null;
  meetsCriteria: boolean;
  isGraduating: boolean;
  suggestedNextClassId: string | null;
}

interface AcademicYearOption {
  id: string;
  year: number;
  isActive: boolean;
  isClosed: boolean;
}

interface ClassOption {
  id: string;
  name: string;
  grade?: { name: string };
}

interface EvaluateResult {
  sourceClass: { id: string; name: string; grade: { id: string; name: string } };
  nextGrade: { id: string; name: string } | null;
  availableNextClasses: ClassOption[];
  evaluations: Evaluation[];
}

interface RowState {
  action: PromotionAction;
  targetClassId: string;
}

const ACTION_LABELS: Record<PromotionAction, string> = {
  PROMOTE: "Promote",
  REPEAT: "Repeat grade",
  GRADUATE: "Graduate",
  SKIP: "Skip",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SelectionSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <>
      <div className="lg:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="hidden lg:block space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-8 w-32 ml-auto" />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const { toast } = useToast();

  const { grades } = useGrades({ all: true });
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const { classes } = useClasses(
    { gradeId: selectedGradeId, mode: "all" },
    { page: 1, pageSize: 100 }
  );

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [targetAcademicYearId, setTargetAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [remarks, setRemarks] = useState("");

  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    successful: number;
    failed: Array<{ studentId: string; error: string }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/academic-years?isClosed=false&pageSize=50");
        setAcademicYears(res.data ?? []);
      } catch {
        toast({ title: "Error", description: "Failed to load academic years", variant: "destructive" });
      } finally {
        setYearsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeYear = academicYears.find((y) => y.isActive);
  const targetYearOptions = academicYears.filter((y) => y.id !== activeYear?.id);

  const handleEvaluate = async () => {
    if (!selectedClassId || !activeYear) return;
    setEvaluating(true);
    setResult(null);
    setExecResult(null);
    try {
      const res = await api.get(
        `/admin/promotions/evaluate?classId=${selectedClassId}&academicYearId=${activeYear.id}`
      );
      const data = res.data as EvaluateResult;
      setResult(data);

      const initialRows: Record<string, RowState> = {};
      for (const ev of data.evaluations) {
        if (ev.meetsCriteria && ev.isGraduating) {
          initialRows[ev.studentId] = { action: "GRADUATE", targetClassId: "" };
        } else if (ev.meetsCriteria && ev.suggestedNextClassId) {
          initialRows[ev.studentId] = { action: "PROMOTE", targetClassId: ev.suggestedNextClassId };
        } else {
          initialRows[ev.studentId] = { action: "SKIP", targetClassId: "" };
        }
      }
      setRowState(initialRows);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to evaluate class",
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const setRow = (studentId: string, patch: Partial<RowState>) => {
    setRowState((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  };

  const promotionCount = useMemo(
    () => Object.values(rowState).filter((r) => r.action !== "SKIP").length,
    [rowState]
  );

  const handleConfirm = async () => {
    if (!result || !targetAcademicYearId) return;
    setExecuting(true);
    setExecResult(null);
    try {
      const promotions = result.evaluations
        .map((ev) => ({
          studentId: ev.studentId,
          action: rowState[ev.studentId]?.action ?? "SKIP",
          targetClassId: rowState[ev.studentId]?.targetClassId || undefined,
        }))
        .filter((p) => p.action !== "SKIP");

      if (promotions.length === 0) {
        toast({ title: "Nothing to do", description: "No students selected for promotion" });
        return;
      }

      const res = await api.post("/admin/promotions/execute", {
        sourceClassId: result.sourceClass.id,
        targetAcademicYearId,
        promotions,
        remarks: remarks || undefined,
      });
      const execData = res.data as { successful: number; failed: Array<{ studentId: string; error: string }> };
      setExecResult(execData);

      if (execData.failed.length === 0) {
        toast({ title: "Success", description: `${execData.successful} student(s) promoted` });
      } else {
        toast({
          title: "Partially completed",
          description: `${execData.successful} succeeded, ${execData.failed.length} failed`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to execute promotions",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const destinationOptions = (studentAction: PromotionAction): ClassOption[] => {
    if (!result) return [];
    if (studentAction === "PROMOTE") return result.availableNextClasses;
    if (studentAction === "REPEAT") return classes.filter((c) => c.id !== result.sourceClass.id);
    return [];
  };

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
      {/* Header — title hidden on mobile (top bar shows "Promotions") */}
      <div className="hidden lg:block mt-2">
        <h1 className="text-xl font-bold">Student Promotions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Evaluate a class against the Academic Policy and promote students to the next grade
        </p>
      </div>

      {/* ── Selection ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Class</CardTitle>
          <CardDescription>
            Choose the class to evaluate and the academic year to promote students into
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yearsLoading ? (
            <SelectionSkeleton />
          ) : !activeYear ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No active academic year found.</AlertDescription>
            </Alert>
          ) : targetYearOptions.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No destination academic year yet</AlertTitle>
              <AlertDescription>
                Create the next academic year first from{" "}
                <Link href="/admin/settings/academic-calendar" className="underline font-medium">
                  Academic Calendar
                </Link>{" "}
                before running promotions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={selectedGradeId} onValueChange={(v) => { setSelectedGradeId(v); setSelectedClassId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedGradeId}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedGradeId ? "Class" : "Select grade first"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={targetAcademicYearId} onValueChange={setTargetAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Promote into year" />
                </SelectTrigger>
                <SelectContent>
                  {targetYearOptions.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeYear && targetYearOptions.length > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleEvaluate}
                disabled={!selectedClassId || !targetAcademicYearId || evaluating}
                size="sm"
              >
                {evaluating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Evaluating…</>
                ) : (
                  "Evaluate"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Review ── */}
      {evaluating && (
        <Card>
          <CardContent className="pt-6">
            <ReviewSkeleton />
          </CardContent>
        </Card>
      )}

      {result && !evaluating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {formatCompactClassLabel(result.sourceClass.grade.name, result.sourceClass.name)}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {result.nextGrade ? result.nextGrade.name : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" /> Graduating
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {result.evaluations.length} student(s) actively enrolled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.evaluations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No actively enrolled students found in this class.
              </p>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="lg:hidden space-y-2">
                  {result.evaluations.map((ev) => {
                    const row = rowState[ev.studentId] ?? { action: "SKIP" as PromotionAction, targetClassId: "" };
                    const options = destinationOptions(row.action);
                    return (
                      <div key={ev.studentId} className="rounded-lg border p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{ev.studentName}</p>
                            <p className="text-xs text-muted-foreground">{ev.admissionNumber}</p>
                          </div>
                          <Badge variant={ev.meetsCriteria ? "default" : "destructive"} className="shrink-0 text-xs">
                            {ev.meetsCriteria ? "Meets criteria" : "Below criteria"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{ev.subjectsPassed}/{ev.totalSubjects} passed</span>
                          {ev.subjectsIncomplete > 0 && <span>{ev.subjectsIncomplete} incomplete</span>}
                          {ev.attendanceRate !== null && <span>{ev.attendanceRate}% attendance</span>}
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={row.action}
                            onValueChange={(v) => setRow(ev.studentId, { action: v as PromotionAction, targetClassId: "" })}
                          >
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(["PROMOTE", "REPEAT", "GRADUATE", "SKIP"] as PromotionAction[]).map((a) => (
                                <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(row.action === "PROMOTE" || row.action === "REPEAT") && (
                            <Select value={row.targetClassId} onValueChange={(v) => setRow(ev.studentId, { targetClassId: v })}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Class" /></SelectTrigger>
                              <SelectContent>
                                {options.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: table */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr className="text-left">
                        <th className="px-4 py-2.5 font-medium">Student</th>
                        <th className="px-4 py-2.5 font-medium">Subjects</th>
                        <th className="px-4 py-2.5 font-medium">Attendance</th>
                        <th className="px-4 py-2.5 font-medium">Criteria</th>
                        <th className="px-4 py-2.5 font-medium">Action</th>
                        <th className="px-4 py-2.5 font-medium">Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.evaluations.map((ev) => {
                        const row = rowState[ev.studentId] ?? { action: "SKIP" as PromotionAction, targetClassId: "" };
                        const options = destinationOptions(row.action);
                        return (
                          <tr key={ev.studentId} className={cn(!ev.meetsCriteria && "bg-destructive/5")}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{ev.studentName}</p>
                              <p className="text-xs text-muted-foreground">{ev.admissionNumber}</p>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {ev.subjectsPassed}/{ev.totalSubjects} passed
                              {ev.subjectsIncomplete > 0 && (
                                <span className="text-muted-foreground"> · {ev.subjectsIncomplete} incomplete</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {ev.attendanceRate !== null ? `${ev.attendanceRate}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={ev.meetsCriteria ? "default" : "destructive"} className="text-xs">
                                {ev.meetsCriteria ? "Meets" : "Below"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              <Select
                                value={row.action}
                                onValueChange={(v) => setRow(ev.studentId, { action: v as PromotionAction, targetClassId: "" })}
                              >
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(["PROMOTE", "REPEAT", "GRADUATE", "SKIP"] as PromotionAction[]).map((a) => (
                                    <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2.5">
                              {(row.action === "PROMOTE" || row.action === "REPEAT") ? (
                                <Select value={row.targetClassId} onValueChange={(v) => setRow(ev.studentId, { targetClassId: v })}>
                                  <SelectTrigger className="w-32"><SelectValue placeholder="Class" /></SelectTrigger>
                                  <SelectContent>
                                    {options.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Remarks (optional, applied to all promotion records in this batch)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleConfirm} disabled={executing || promotionCount === 0}>
                      {executing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                      ) : (
                        `Promote ${promotionCount} Student${promotionCount === 1 ? "" : "s"}`
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Results ── */}
      {execResult && (
        <Alert variant={execResult.failed.length === 0 ? "default" : "destructive"}>
          {execResult.failed.length === 0 ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {execResult.successful} promoted{execResult.failed.length > 0 && `, ${execResult.failed.length} failed`}
          </AlertTitle>
          {execResult.failed.length > 0 && (
            <AlertDescription>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                {execResult.failed.slice(0, 10).map((f, i) => (
                  <li key={i} className="text-xs">{f.error}</li>
                ))}
              </ul>
            </AlertDescription>
          )}
        </Alert>
      )}
    </div>
  );
}
