"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  CheckCircle,
  Lock,
  AlertTriangle,
  ChevronLeft,
  GraduationCap,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAcademicYearDialog } from "@/components/settings/create-academic-year-dialog";
import { EditAcademicYearDialog } from "@/components/settings/edit-academic-year-dialog";
import { CreateTermDialog } from "@/components/settings/create-term-dialog";
import { EditTermDialog } from "@/components/settings/edit-term-dialog";
import { useGrades } from "@/hooks/useGrades";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AcademicYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

interface Term {
  id: string;
  termType: "TERM_1" | "TERM_2" | "TERM_3";
  startDate: string;
  endDate: string;
  isActive: boolean;
  academicYear: { id: string; year: number };
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const TERM_LABELS: Record<string, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  TERM_3: "Term 3",
};

export default function AcademicCalendarPage() {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [termsLoading, setTermsLoading] = useState(false);

  const [createYearOpen, setCreateYearOpen] = useState(false);
  const [editYearOpen, setEditYearOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [createTermOpen, setCreateTermOpen] = useState(false);
  const [editTermOpen, setEditTermOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [yearToClose, setYearToClose] = useState<string | null>(null);

  const { grades, isLoading: gradesLoading, refetch: refetchGrades } = useGrades({ all: true });
  const [seeding, setSeeding] = useState(false);

  const tok = () => localStorage.getItem("auth_token") ?? "";

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/academic-years", {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      const years: AcademicYear[] = data.data || [];
      setAcademicYears(years);
      if (!selectedYearId) {
        const active = years.find((y) => y.isActive);
        if (active) setSelectedYearId(active.id);
      }
    } catch {
      toast({ title: "Failed to load academic years", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async (yearId?: string) => {
    if (!yearId) { setTerms([]); return; }
    try {
      setTermsLoading(true);
      const res = await fetch(`/api/terms?academicYearId=${yearId}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      setTerms(data.data || []);
    } catch {
      toast({ title: "Failed to load terms", variant: "destructive" });
    } finally {
      setTermsLoading(false);
    }
  };

  useEffect(() => { fetchAcademicYears(); }, []);
  useEffect(() => { if (selectedYearId) fetchTerms(selectedYearId); }, [selectedYearId]);

  const handleSeedGrades = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/admin/settings/seed-grades", {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error("Failed to configure grades");
      toast({ title: "Grade levels configured", description: "All 12 grade levels are now set up." });
      refetchGrades();
    } catch {
      toast({ title: "Failed to configure grades", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleActivateYear = async (id: string) => {
    try {
      await fetch(`/api/academic-years/${id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      toast({ title: "Academic year activated" });
      fetchAcademicYears();
    } catch {
      toast({ title: "Failed to activate", variant: "destructive" });
    }
  };

  const handleCloseYearConfirm = async () => {
    if (!yearToClose) return;
    try {
      const res = await fetch(`/api/academic-years/${yearToClose}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to close");
      }
      toast({ title: "Academic year closed" });
      fetchAcademicYears();
    } catch (e: any) {
      toast({ title: e.message || "Failed to close", variant: "destructive" });
    } finally {
      setCloseDialogOpen(false);
      setYearToClose(null);
    }
  };

  const handleActivateTerm = async (id: string) => {
    try {
      await fetch(`/api/terms/${id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      toast({ title: "Term activated" });
      fetchTerms(selectedYearId);
    } catch {
      toast({ title: "Failed to activate term", variant: "destructive" });
    }
  };

  const handleDeactivateTerm = async (id: string) => {
    try {
      await fetch(`/api/terms/${id}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      toast({ title: "Term deactivated" });
      fetchTerms(selectedYearId);
    } catch {
      toast({ title: "Failed to deactivate term", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-9 w-64 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-1">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Button>
        </Link>
        <div className="text-right">
          <h1 className="text-xl font-bold leading-tight">Academic Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic years, terms, and grade levels
          </p>
        </div>
      </div>

      {/* ── Warning banner ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Critical configuration.</span>{" "}
          Changes here affect assessments, attendance records, and reports across the entire system.
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="years">
        <TabsList className="mb-4">
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="grades">Grade Levels</TabsTrigger>
        </TabsList>

        {/* ══ ACADEMIC YEARS ══ */}
        <TabsContent value="years">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Academic Years</CardTitle>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateYearOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  New Year
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {academicYears.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No academic years yet</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Create your first academic year to get started
                  </p>
                  <Button size="sm" onClick={() => setCreateYearOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Academic Year
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {academicYears.map((year) => (
                    <div key={year.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      {/* Year + dates */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <span className="text-xs font-bold text-primary">{year.year}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Academic Year {year.year}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {fmt(year.startDate)} — {fmt(year.endDate)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {year.isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        )}
                        {year.isClosed && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Closed
                          </span>
                        )}
                        {!year.isActive && !year.isClosed && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedYear(year); setEditYearOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!year.isActive && !year.isClosed && (
                            <DropdownMenuItem onClick={() => handleActivateYear(year.id)}>
                              <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {year.isActive && !year.isClosed && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setYearToClose(year.id); setCloseDialogOpen(true); }}
                              >
                                <Lock className="h-3.5 w-3.5 mr-2" />
                                Close Year
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TERMS ══ */}
        <TabsContent value="terms">
          <div className="space-y-4">
            {/* Year picker + add button */}
            <div className="flex items-center justify-between gap-3">
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.year}{y.isActive ? " · Active" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={!selectedYearId}
                onClick={() => setCreateTermOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Term
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {termsLoading ? (
                  <div className="divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : !selectedYearId ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Select an academic year</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a year above to view and manage its terms
                    </p>
                  </div>
                ) : terms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No terms yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Add the first term for this academic year
                    </p>
                    <Button size="sm" onClick={() => setCreateTermOpen(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create Term
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {terms.map((term) => (
                      <div key={term.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <span className="text-xs font-bold text-foreground">
                            T{term.termType.replace("TERM_", "")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">
                            {TERM_LABELS[term.termType]} · {term.academicYear.year}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {fmt(term.startDate)} — {fmt(term.endDate)}
                          </p>
                        </div>

                        {term.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 shrink-0">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border text-muted-foreground shrink-0">
                            Inactive
                          </span>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedTerm(term); setEditTermOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!term.isActive ? (
                              <DropdownMenuItem onClick={() => handleActivateTerm(term.id)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                                Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDeactivateTerm(term.id)}>
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ GRADES ══ */}
        <TabsContent value="grades">
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {grades.length} of 12 grade levels configured
              </span>
              {grades.length === 12 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Complete
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  grades.length === 12 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${(grades.length / 12) * 100}%` }}
              />
            </div>

            {/* Incomplete warning */}
            {!gradesLoading && grades.length > 0 && grades.length < 12 && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{12 - grades.length} grade{12 - grades.length !== 1 ? "s" : ""} missing.</span>{" "}
                    Click to add the remaining grade levels.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  onClick={handleSeedGrades}
                  disabled={seeding}
                >
                  {seeding ? "Configuring..." : "Configure Grades"}
                </Button>
              </div>
            )}

            {gradesLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : grades.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
                    <GraduationCap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No grades configured</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
                    Configure all 12 grade levels for the Zambian education system (Grades 1–12)
                  </p>
                  <Button onClick={handleSeedGrades} disabled={seeding}>
                    {seeding ? (
                      <><span className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />Configuring...</>
                    ) : (
                      <><GraduationCap className="h-4 w-4 mr-2" />Configure Grade Levels</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {grades.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{grade.name}</p>
                      <p className="text-xs text-muted-foreground">{grade.level}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        grade.schoolLevel === "PRIMARY"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                      )}
                    >
                      {grade.schoolLevel === "PRIMARY" ? "Pri" : "Sec"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateAcademicYearDialog
        open={createYearOpen}
        onOpenChange={setCreateYearOpen}
        onSuccess={fetchAcademicYears}
      />
      <EditAcademicYearDialog
        open={editYearOpen}
        onOpenChange={setEditYearOpen}
        year={selectedYear}
        onSuccess={fetchAcademicYears}
      />
      <CreateTermDialog
        open={createTermOpen}
        onOpenChange={setCreateTermOpen}
        academicYearId={selectedYearId}
        onSuccess={() => fetchTerms(selectedYearId)}
      />
      <EditTermDialog
        open={editTermOpen}
        onOpenChange={setEditTermOpen}
        term={selectedTerm}
        onSuccess={() => fetchTerms(selectedYearId)}
      />

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Close Academic Year</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              This will prevent further modifications to this year's data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseYearConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
