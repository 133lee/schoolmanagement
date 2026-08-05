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
import { Loader2, Save, Clock, Calendar, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
  allowSubjectPreferences: boolean;
  allowTeacherPreferences: boolean;
  autoAssignRooms: boolean;
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

export default function TimetableConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configuration, setConfiguration] = useState<TimetableConfiguration | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [doublePeriodConfigs, setDoublePeriodConfigs] = useState<DoublePeriodConfig[]>([]);

  const [formData, setFormData] = useState({
    schoolStartTime: "07:00",
    periodDuration: 40,
    breakStartPeriod: 4,
    breakDuration: 15,
    periodsBeforeBreak: 4,
    periodsAfterBreak: 4,
    allowSubjectPreferences: false,
    allowTeacherPreferences: false,
    autoAssignRooms: true,
  });

  useEffect(() => {
    fetchConfiguration();
    fetchSubjects();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/timetable/configuration", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch configuration");

      const data = await response.json();

      if (data.configuration) {
        setConfiguration(data.configuration);
        setFormData({
          schoolStartTime: data.configuration.schoolStartTime,
          periodDuration: data.configuration.periodDuration,
          breakStartPeriod: data.configuration.breakStartPeriod,
          breakDuration: data.configuration.breakDuration,
          periodsBeforeBreak: data.configuration.periodsBeforeBreak,
          periodsAfterBreak: data.configuration.periodsAfterBreak,
          allowSubjectPreferences: data.configuration.allowSubjectPreferences,
          allowTeacherPreferences: data.configuration.allowTeacherPreferences,
          autoAssignRooms: data.configuration.autoAssignRooms,
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Remove if already exists
        return prev.filter((c) => c.subjectId !== subjectId);
      } else {
        // Add new config
        return [
          ...prev,
          {
            subjectId,
            subjectName,
            requiresDoublePeriod: true,
            preferTimeOfDay: "ANY",
          },
        ];
      }
    });
  };

  const updateDoublePeriodPreference = (
    subjectId: string,
    preference: "MORNING" | "AFTERNOON" | "ANY"
  ) => {
    setDoublePeriodConfigs((prev) =>
      prev.map((c) =>
        c.subjectId === subjectId ? { ...c, preferTimeOfDay: preference } : c
      )
    );
  };

  const calculateTotalPeriods = () => {
    return formData.periodsBeforeBreak + formData.periodsAfterBreak;
  };

  const calculateSchoolEndTime = () => {
    const [hours, minutes] = formData.schoolStartTime.split(":").map(Number);
    const totalMinutes =
      (formData.periodsBeforeBreak + formData.periodsAfterBreak) * formData.periodDuration +
      formData.breakDuration;

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div>
        {[0, 1, 2].map(i => (
          <Card key={i}><CardContent className="pt-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="grid grid-cols-2 gap-4">
              {[0,1,2,3].map(j => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent></Card>
        ))}
        <Skeleton className="h-9 w-28" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timetable Configuration</h1>
        <p className="text-muted-foreground">
          Configure school timing and timetable settings
          {academicYear && ` for ${academicYear.year}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>School Timing</CardTitle>
              <CardDescription>
                Set up your school's daily schedule and period configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* School Start Time */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schoolStartTime">
                      School Start Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="schoolStartTime"
                      type="time"
                      value={formData.schoolStartTime}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolStartTime: e.target.value })
                      }
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
                        setFormData({
                          ...formData,
                          periodDuration: parseInt(e.target.value) || 40,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Periods Configuration */}
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
                        setFormData({
                          ...formData,
                          periodsBeforeBreak: parseInt(e.target.value) || 4,
                        })
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
                        setFormData({
                          ...formData,
                          periodsAfterBreak: parseInt(e.target.value) || 4,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Break Configuration */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="breakStartPeriod">
                      Break After Period # <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="breakStartPeriod"
                      type="number"
                      min="1"
                      max={calculateTotalPeriods()}
                      value={formData.breakStartPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          breakStartPeriod: parseInt(e.target.value) || 4,
                        })
                      }
                      required
                    />
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
                        setFormData({
                          ...formData,
                          breakDuration: parseInt(e.target.value) || 15,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Optional Features */}
                <div className="space-y-3">
                  <Label className="text-base">Optional Features</Label>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoAssignRooms"
                      checked={formData.autoAssignRooms}
                      onChange={(e) =>
                        setFormData({ ...formData, autoAssignRooms: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="autoAssignRooms" className="cursor-pointer font-normal">
                      Automatically assign rooms during timetable generation
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowSubjectPreferences"
                      checked={formData.allowSubjectPreferences}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowSubjectPreferences: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="allowSubjectPreferences"
                      className="cursor-pointer font-normal"
                    >
                      Allow subject-specific time preferences
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowTeacherPreferences"
                      checked={formData.allowTeacherPreferences}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowTeacherPreferences: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="allowTeacherPreferences"
                      className="cursor-pointer font-normal"
                    >
                      Allow teacher time preferences
                    </Label>
                  </div>
                </div>

                {/* Double Period Configuration */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Double Periods (80 minutes for Practicals)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select subjects that require consecutive double periods (e.g., Science
                    practicals, workshops)
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                    {subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No subjects available. Please add subjects first.
                      </p>
                    ) : (
                      subjects.map((subject) => {
                        const config = doublePeriodConfigs.find(
                          (c) => c.subjectId === subject.id
                        );
                        const isEnabled = !!config;

                        return (
                          <div
                            key={subject.id}
                            className="flex items-center justify-between gap-4 p-2 rounded hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                id={`double-${subject.id}`}
                                checked={isEnabled}
                                onChange={() =>
                                  toggleDoublePeriod(subject.id, subject.name)
                                }
                                className="h-4 w-4"
                              />
                              <Label
                                htmlFor={`double-${subject.id}`}
                                className="cursor-pointer font-normal"
                              >
                                {subject.name} ({subject.code})
                              </Label>
                            </div>

                            {isEnabled && (
                              <select
                                value={config?.preferTimeOfDay || "ANY"}
                                onChange={(e) =>
                                  updateDoublePeriodPreference(
                                    subject.id,
                                    e.target.value as any
                                  )
                                }
                                className="text-sm border rounded px-2 py-1"
                              >
                                <option value="ANY">Any time</option>
                                <option value="MORNING">Morning preferred</option>
                                <option value="AFTERNOON">Afternoon preferred</option>
                              </select>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {doublePeriodConfigs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {doublePeriodConfigs.length} subject(s) configured for double
                      periods
                    </p>
                  )}
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.breakDuration} minutes
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total School Time</p>
                <p className="text-lg font-semibold">
                  {Math.floor(
                    (calculateTotalPeriods() * formData.periodDuration +
                      formData.breakDuration) /
                      60
                  )}h{" "}
                  {(calculateTotalPeriods() * formData.periodDuration +
                    formData.breakDuration) %
                    60}
                  m
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
