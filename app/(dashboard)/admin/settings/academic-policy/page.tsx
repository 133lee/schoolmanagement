"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  GraduationCap,
  BookCheck,
  Users,
  CalendarCheck,
  Info,
} from "lucide-react";
import { type AcademicPolicy, ACADEMIC_POLICY_DEFAULTS } from "@/lib/settings/academic-policy";

// ── helpers ────────────────────────────────────────────────────────────────────

function clamp(value: string, min: number, max: number): number {
  const n = parseInt(value, 10);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ── sub-components ─────────────────────────────────────────────────────────────

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (n: number) => void;
}

function NumberField({ id, label, hint, value, min, max, unit, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(e.target.value, min, max))}
          className="w-28"
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <FieldHint>{hint}</FieldHint>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function AcademicPolicyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<AcademicPolicy>(ACADEMIC_POLICY_DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/admin/settings/academic-policy", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setPolicy(data.data.policy);
      } catch {
        toast.error("Failed to load academic policy");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof AcademicPolicy>(key: K, value: AcademicPolicy[K]) =>
    setPolicy((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/settings/academic-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(policy),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Academic policy saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 px-4 lg:px-0">
        <div className="flex items-center justify-between mt-5 lg:mt-1">
          <Skeleton className="h-9 w-32" />
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right space-y-1">
              <Skeleton className="h-5 w-40 ml-auto" />
              <Skeleton className="h-3.5 w-56 ml-auto" />
            </div>
            <Skeleton className="h-9 w-9 lg:w-32" />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-3 w-64" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 lg:px-0">
      {/* ── Header — title hidden on mobile (top bar shows "Academic
          Policy"); Save button becomes icon-only there instead of the
          desktop's full-width labeled button. ─────────────────────────── */}
      <div className="flex items-start justify-between mt-5 lg:mt-1">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back to Settings</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
        <div className="lg:text-right lg:space-y-2">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold">Academic Policy</h1>
            <p className="text-sm text-muted-foreground">
              Student progression rules and pass criteria
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="icon"
            className="lg:h-9 lg:w-full lg:px-4 lg:py-2"
          >
            <Save className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">{saving ? "Saving..." : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      {/* ── 1. Student Progression ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Student Progression
          </CardTitle>
          <CardDescription>
            Controls whether students are promoted to the next grade automatically
            or require manual approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {/* Auto promotion toggle */}
          <div className="flex items-start justify-between gap-3 lg:gap-6">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Automatic Promotion</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, students who meet all pass criteria at the end of the
                year are promoted automatically without requiring admin action.
                When disabled, every promotion must be manually approved.
              </p>
            </div>
            <Switch
              checked={policy.promotion_auto_enabled}
              onCheckedChange={(v) => set("promotion_auto_enabled", v)}
            />
          </div>

          <Separator />

          {/* Evaluation basis */}
          <div className="space-y-1.5">
            <Label htmlFor="basis">Promotion Evaluated On</Label>
            <Select
              value={policy.promotion_basis}
              onValueChange={(v) => set("promotion_basis", v as "eot" | "average")}
            >
              <SelectTrigger id="basis" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eot">End-of-Year (EOT) results only</SelectItem>
                <SelectItem value="average">Cumulative term average (all terms)</SelectItem>
              </SelectContent>
            </Select>
            <FieldHint>
              "EOT only" uses the final term exam marks exclusively.
              "Cumulative average" averages all terms (CAT, MID, EOT) across the year.
            </FieldHint>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Primary Pass Criteria ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookCheck className="h-5 w-5" />
            Pass Criteria — Primary
            <span className="text-xs font-normal text-muted-foreground ml-1">Grades 1–7</span>
          </CardTitle>
          <CardDescription>
            Defines what counts as passing for primary school students.
            These thresholds align with the Zambian primary grading scale
            (Excellent · Very Good · Good · Average · Pass · Needs Improvement).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {/* Quality */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Quality — minimum mark per subject
            </p>
            <NumberField
              id="primary_pass_mark"
              label="Subject Pass Mark"
              hint='A student must score at least this percentage in a subject for it to count as "passed". Maps to "Pass" (40%) in the primary grading scale by default.'
              value={policy.primary_subject_pass_mark}
              min={0}
              max={100}
              unit="%"
              onChange={(n) => set("primary_subject_pass_mark", n)}
            />
          </div>

          <Separator />

          {/* Quantity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Quantity — number of subjects
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <NumberField
                id="primary_min_passed"
                label="Minimum Subjects Passed"
                hint="Student must pass at least this many subjects to qualify for promotion."
                value={policy.primary_min_subjects_passed}
                min={1}
                max={20}
                unit="subjects"
                onChange={(n) => set("primary_min_subjects_passed", n)}
              />
              <NumberField
                id="primary_max_failed"
                label="Maximum Subjects Failed (Grace)"
                hint="Even if the minimum passed count is met, failing more than this many subjects blocks promotion. Set to 0 to enforce strictly."
                value={policy.primary_max_subjects_failed}
                min={0}
                max={20}
                unit="subjects"
                onChange={(n) => set("primary_max_subjects_failed", n)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Secondary Pass Criteria ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookCheck className="h-5 w-5" />
            Pass Criteria — Secondary
            <span className="text-xs font-normal text-muted-foreground ml-1">
              Grades 8–12 / Form 1–5
            </span>
          </CardTitle>
          <CardDescription>
            Defines what counts as passing for secondary school students across both
            junior secondary (Grades 8–9) and senior secondary (Grades 10–12 / Forms 1–5).
            Both levels share the same promotion criteria since they use compatible grading scales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {/* Quality */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Quality — minimum mark per subject
            </p>
            <NumberField
              id="secondary_pass_mark"
              label="Subject Pass Mark"
              hint='A student must score at least this percentage in a subject for it to count as "passed". Corresponds to Grade 4 (Pass, 40–49%) in the junior scale and Grade 8 (40–44%) in the senior 9-point scale.'
              value={policy.secondary_subject_pass_mark}
              min={0}
              max={100}
              unit="%"
              onChange={(n) => set("secondary_subject_pass_mark", n)}
            />
          </div>

          <Separator />

          {/* Quantity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Quantity — number of subjects
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <NumberField
                id="secondary_min_passed"
                label="Minimum Subjects Passed"
                hint="Student must pass at least this many subjects to qualify for promotion."
                value={policy.secondary_min_subjects_passed}
                min={1}
                max={20}
                unit="subjects"
                onChange={(n) => set("secondary_min_subjects_passed", n)}
              />
              <NumberField
                id="secondary_max_failed"
                label="Maximum Subjects Failed (Grace)"
                hint="Even if the minimum passed count is met, failing more than this many subjects blocks promotion. Set to 0 to enforce strictly."
                value={policy.secondary_max_subjects_failed}
                min={0}
                max={20}
                unit="subjects"
                onChange={(n) => set("secondary_max_subjects_failed", n)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Attendance Requirement ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Attendance Requirement
          </CardTitle>
          <CardDescription>
            Minimum attendance a student must maintain to be eligible for promotion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          <NumberField
            id="min_attendance"
            label="Minimum Attendance Percentage"
            hint="Students below this attendance threshold will be flagged when promotion is evaluated. A student who attended 60 out of 80 school days has 75% attendance."
            value={policy.min_attendance_percentage}
            min={0}
            max={100}
            unit="%"
            onChange={(n) => set("min_attendance_percentage", n)}
          />

          <Separator />

          <div className="flex items-start justify-between gap-3 lg:gap-6">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Block Promotion on Low Attendance</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, a student who falls below the attendance threshold is
                automatically ineligible for promotion regardless of their academic
                results. When disabled, low attendance raises a warning but does not
                block the promotion decision.
              </p>
            </div>
            <Switch
              checked={policy.attendance_blocks_promotion}
              onCheckedChange={(v) => set("attendance_blocks_promotion", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom save ── */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
