"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Settings2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopOnlyNotice } from "@/components/shared/desktop-only-notice";

interface DoublePeriodConfig {
  subjectId: string;
  subjectName: string;
  requiresDoublePeriod: boolean;
  preferTimeOfDay?: "MORNING" | "AFTERNOON" | "ANY";
}

interface TimetableConfiguration {
  id: string;
  academicYearId: string;
  schoolStartTime: string;
  periodDuration: number;
  breakStartPeriod: number;
  breakDuration: number;
  periodsBeforeBreak: number;
  periodsAfterBreak: number;
  totalPeriods: number;
  doublePeriodConfigs?: DoublePeriodConfig[];
  lastGeneratedAt?: string;
  generatedBy?: string;
}

interface AcademicYear {
  id: string;
  year: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface GenerationStats {
  totalAssignments: number;
  slotsGenerated: number;
  conflicts: number;
  successRate: number;
}

interface Conflict {
  className: string;
  subjectName: string;
  teacherName: string;
  reason: string;
}

interface GenerationResult {
  stats: GenerationStats;
  conflicts: Conflict[];
}

export default function TimetableGeneratePage() {
  const isMobile = useIsMobile();

  // ── Configuration state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configuration, setConfiguration] = useState<TimetableConfiguration | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [doublePeriodConfigs, setDoublePeriodConfigs] = useState<DoublePeriodConfig[]>([]);

  const [formData, setFormData] = useState({
    schoolStartTime: "07:00",
    periodDuration: 40,
    breakDuration: 15,
    periodsBeforeBreak: 4,
    periodsAfterBreak: 4,
  });

  // ── Generation state ─────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showCaution, setShowCaution] = useState(true);

  useEffect(() => {
    fetchConfiguration();
    fetchSubjects();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/timetable/configuration", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch configuration");

      const data = await response.json();

      if (data.configuration) {
        setConfiguration(data.configuration);
        setFormData({
          schoolStartTime: data.configuration.schoolStartTime,
          periodDuration: data.configuration.periodDuration,
          breakDuration: data.configuration.breakDuration,
          periodsBeforeBreak: data.configuration.periodsBeforeBreak,
          periodsAfterBreak: data.configuration.periodsAfterBreak,
        });

        if (data.configuration.doublePeriodConfigs) {
          setDoublePeriodConfigs(data.configuration.doublePeriodConfigs);
        }
      }

      if (data.academicYear) {
        setAcademicYear(data.academicYear);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/subjects?mode=all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch subjects");

      const data = await response.json();
      if (data.data) {
        setSubjects(data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!academicYear?.id) {
      toast.error("No active academic year found. Please create one first.");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/timetable/configuration", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId: academicYear?.id,
          ...formData,
          // Break placement is derived from periodsBeforeBreak, not
          // independently configurable — see the read-only display below.
          breakStartPeriod: formData.periodsBeforeBreak,
          totalPeriods: formData.periodsBeforeBreak + formData.periodsAfterBreak,
          doublePeriodConfigs,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save configuration");
      }

      toast.success("Timetable configuration saved successfully");
      fetchConfiguration();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDoublePeriod = (subjectId: string, subjectName: string) => {
    setDoublePeriodConfigs((prev) => {
      const existing = prev.find((c) => c.subjectId === subjectId);
      if (existing) {
        return prev.filter((c) => c.subjectId !== subjectId);
      }
      return [
        ...prev,
        { subjectId, subjectName, requiresDoublePeriod: true, preferTimeOfDay: "ANY" },
      ];
    });
  };

  const updateDoublePeriodPreference = (
    subjectId: string,
    preference: "MORNING" | "AFTERNOON" | "ANY"
  ) => {
    setDoublePeriodConfigs((prev) =>
      prev.map((c) => (c.subjectId === subjectId ? { ...c, preferTimeOfDay: preference } : c))
    );
  };

  const calculateTotalPeriods = () => formData.periodsBeforeBreak + formData.periodsAfterBreak;

  const calculateSchoolEndTime = () => {
    const [hours, minutes] = formData.schoolStartTime.split(":").map(Number);
    const totalMinutes = calculateTotalPeriods() * formData.periodDuration + formData.breakDuration;
    const endHours = Math.floor((hours * 60 + minutes + totalMinutes) / 60);
    const endMinutes = (hours * 60 + minutes + totalMinutes) % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const calculateBreakTime = () => {
    const [hours, minutes] = formData.schoolStartTime.split(":").map(Number);
    const minutesUntilBreak = formData.periodsBeforeBreak * formData.periodDuration;
    const breakStartHours = Math.floor((hours * 60 + minutes + minutesUntilBreak) / 60);
    const breakStartMinutes = (hours * 60 + minutes + minutesUntilBreak) % 60;
    const breakEndHours = Math.floor((hours * 60 + minutes + minutesUntilBreak + formData.breakDuration) / 60);
    const breakEndMinutes = (hours * 60 + minutes + minutesUntilBreak + formData.breakDuration) % 60;
    return `${String(breakStartHours).padStart(2, "0")}:${String(breakStartMinutes).padStart(2, "0")} - ${String(breakEndHours).padStart(2, "0")}:${String(breakEndMinutes).padStart(2, "0")}`;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/timetable/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate timetable");
      }

      const data = await response.json();

      setResult({ stats: data.stats, conflicts: data.conflicts || [] });

      if (data.stats.conflicts === 0) {
        toast.success("Timetable generated successfully with no conflicts!");
      } else {
        toast.warning(
          `Timetable generated with ${data.stats.conflicts} conflict${data.stats.conflicts !== 1 ? "s" : ""}`
        );
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (isMobile) {
    return (
      <DesktopOnlyNotice description="Timetable configuration and generation need a larger screen — please switch to a tablet or computer to continue." />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div>
        {[0, 1].map(i => (
          <Card key={i}><CardContent className="pt-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(j => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Timetable</h1>
        <p className="text-muted-foreground">
          Configure your school's schedule, then generate the timetable
          {academicYear && ` for ${academicYear.year}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* ── Configuration ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                Configuration
              </CardTitle>
              <CardDescription>
                School timing, periods, and which subjects need double periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfiguration} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schoolStartTime">
                      School Start Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="schoolStartTime"
                      type="time"
                      value={formData.schoolStartTime}
                      onChange={(e) => setFormData({ ...formData, schoolStartTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodDuration">
                      Period Duration (minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="periodDuration"
                      type="number"
                      min="20"
                      max="90"
                      value={formData.periodDuration}
                      onChange={(e) =>
                        setFormData({ ...formData, periodDuration: parseInt(e.target.value) || 40 })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="periodsBeforeBreak">
                      Periods Before Break <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="periodsBeforeBreak"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.periodsBeforeBreak}
                      onChange={(e) =>
                        setFormData({ ...formData, periodsBeforeBreak: parseInt(e.target.value) || 4 })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodsAfterBreak">
                      Periods After Break <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="periodsAfterBreak"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.periodsAfterBreak}
                      onChange={(e) =>
                        setFormData({ ...formData, periodsAfterBreak: parseInt(e.target.value) || 4 })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Break Falls After</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                      Period {formData.periodsBeforeBreak}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Follows "Periods Before Break" automatically
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breakDuration">
                      Break Duration (minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      min="5"
                      max="60"
                      value={formData.breakDuration}
                      onChange={(e) =>
                        setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 15 })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Double Periods (80 minutes for Practicals)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select subjects that require consecutive double periods (e.g., Science
                    practicals, workshops)
                  </p>

                  <div className="space-y-1 max-h-72 overflow-y-auto border rounded-lg p-2">
                    {subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">
                        No subjects available. Please add subjects first.
                      </p>
                    ) : (
                      subjects.map((subject) => {
                        const config = doublePeriodConfigs.find((c) => c.subjectId === subject.id);
                        const isEnabled = !!config;

                        return (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <Checkbox
                                id={`double-${subject.id}`}
                                checked={isEnabled}
                                onCheckedChange={() => toggleDoublePeriod(subject.id, subject.name)}
                              />
                              <Label
                                htmlFor={`double-${subject.id}`}
                                className="cursor-pointer font-normal truncate"
                              >
                                {subject.name} <span className="text-muted-foreground">({subject.code})</span>
                              </Label>
                            </div>

                            {isEnabled && (
                              <Select
                                value={config?.preferTimeOfDay || "ANY"}
                                onValueChange={(value) =>
                                  updateDoublePeriodPreference(subject.id, value as any)
                                }
                              >
                                <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ANY">Any time</SelectItem>
                                  <SelectItem value="MORNING">Morning preferred</SelectItem>
                                  <SelectItem value="AFTERNOON">Afternoon preferred</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {doublePeriodConfigs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {doublePeriodConfigs.length} subject(s) configured for double periods
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ── Generation ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Run Generation</CardTitle>
                  <CardDescription>
                    Creates timetable slots for all classes based on subject-teacher
                    assignments and the configuration above. Any existing timetable will
                    be replaced.
                  </CardDescription>
                </div>
                {!showCaution && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setShowCaution(true)}
                    title="Show prerequisites"
                  >
                    <AlertCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCaution && (
                <Alert className="relative pr-10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Before generating the timetable, ensure you have:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Set up the configuration above (school timing, periods, etc.)</li>
                      <li>Created and activated rooms/classrooms</li>
                      <li>Assigned teachers to subjects for all classes</li>
                      <li>Set an active academic year</li>
                    </ul>
                  </AlertDescription>
                  <button
                    type="button"
                    onClick={() => setShowCaution(false)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Alert>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating}
                size="lg"
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Timetable...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Timetable
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.stats.conflicts === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    Generation Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Assignments</p>
                      <p className="text-2xl font-bold">{result.stats.totalAssignments}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Slots Generated</p>
                      <p className="text-2xl font-bold text-green-600">{result.stats.slotsGenerated}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Conflicts</p>
                      <p
                        className={`text-2xl font-bold ${result.stats.conflicts === 0 ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {result.stats.conflicts}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {typeof result.stats.successRate === "number"
                          ? `${result.stats.successRate.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {result.stats.conflicts === 0 && (
                    <Alert className="mt-4 border-green-600 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Perfect Generation!</AlertTitle>
                      <AlertDescription className="text-green-600">
                        All subject-teacher assignments have been successfully scheduled with
                        no conflicts.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {result.conflicts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-yellow-600" />
                      Conflicts ({result.conflicts.length})
                    </CardTitle>
                    <CardDescription>
                      The following assignments could not be scheduled due to conflicts or
                      lack of available time slots. You may need to adjust your configuration
                      or assignments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.conflicts.map((conflict, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{conflict.className}</TableCell>
                            <TableCell>{conflict.subjectName}</TableCell>
                            <TableCell>{conflict.teacherName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{conflict.reason}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>How to Resolve Conflicts</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Increase the number of periods per day in your configuration</li>
                          <li>Add more rooms to accommodate simultaneous classes</li>
                          <li>Reduce the number of subject assignments per teacher</li>
                          <li>Review and optimize your subject-teacher assignments</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* ── Summary sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Periods</p>
                <p className="text-2xl font-bold">{calculateTotalPeriods()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">School Hours</p>
                <p className="text-lg font-semibold">
                  {formData.schoolStartTime} - {calculateSchoolEndTime()}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Break Time</p>
                <p className="text-lg font-semibold">{calculateBreakTime()}</p>
                <p className="text-xs text-muted-foreground mt-1">{formData.breakDuration} minutes</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total School Time</p>
                <p className="text-lg font-semibold">
                  {Math.floor((calculateTotalPeriods() * formData.periodDuration + formData.breakDuration) / 60)}h{" "}
                  {(calculateTotalPeriods() * formData.periodDuration + formData.breakDuration) % 60}m
                </p>
              </div>
            </CardContent>
          </Card>

          {configuration?.lastGeneratedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Last Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Generated At</p>
                <p className="text-sm font-medium">
                  {new Date(configuration.lastGeneratedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
