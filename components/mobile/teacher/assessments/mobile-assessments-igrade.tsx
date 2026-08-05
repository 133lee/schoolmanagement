"use client";

/**
 * Mobile Assessments — iGradePlus-inspired layout (UI prototype, static data only)
 *
 * Screens:
 *  1. List  — grouped by urgency (Needs Action / In Progress / Done)
 *             term chips · exam-type filter chips · Class/Subject tabs · FAB
 *  2. Detail — push navigation, hero section, info card, progress bar,
 *              sticky status-driven action buttons at the bottom
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  ClipboardEdit,
  CheckCircle2,
  Send,
  Trash2,
  Eye,
  BookOpen,
  GraduationCap,
  FileText,
  CalendarDays,
  SlidersHorizontal,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static mock data ───────────────────────────────────────────────────────────

interface MockAssessment {
  id: string;
  subject: string;
  subjectCode: string;
  className: string;
  gradeName: string;
  examType: "CAT" | "MID" | "EOT";
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  totalMarks: number;
  passMark: number;
  weight: number;
  entered: number;
  total: number;
  date: string | null;
  tab: "class-teacher" | "subject-teacher";
}

const MOCK: MockAssessment[] = [
  {
    id: "1", subject: "Mathematics", subjectCode: "MTH",
    className: "F1 A", gradeName: "Form 1", examType: "CAT",
    status: "DRAFT", totalMarks: 40, passMark: 20, weight: 20,
    entered: 0, total: 35, date: "2026-05-20", tab: "class-teacher",
  },
  {
    id: "2", subject: "English Language", subjectCode: "ENG",
    className: "F1 A", gradeName: "Form 1", examType: "MID",
    status: "PUBLISHED", totalMarks: 80, passMark: 40, weight: 30,
    entered: 0, total: 35, date: "2026-05-22", tab: "class-teacher",
  },
  {
    id: "3", subject: "Integrated Science", subjectCode: "SCI",
    className: "F1 A", gradeName: "Form 1", examType: "CAT",
    status: "PUBLISHED", totalMarks: 40, passMark: 20, weight: 20,
    entered: 18, total: 35, date: "2026-04-10", tab: "class-teacher",
  },
  {
    id: "4", subject: "Social Studies", subjectCode: "SST",
    className: "F1 A", gradeName: "Form 1", examType: "EOT",
    status: "COMPLETED", totalMarks: 100, passMark: 50, weight: 50,
    entered: 35, total: 35, date: "2026-04-30", tab: "class-teacher",
  },
  {
    id: "5", subject: "Religious Education", subjectCode: "RE",
    className: "F1 A", gradeName: "Form 1", examType: "CAT",
    status: "COMPLETED", totalMarks: 40, passMark: 20, weight: 20,
    entered: 33, total: 35, date: "2026-04-15", tab: "class-teacher",
  },
  {
    id: "6", subject: "Computer Studies", subjectCode: "CS",
    className: "F2 B", gradeName: "Form 2", examType: "MID",
    status: "PUBLISHED", totalMarks: 80, passMark: 40, weight: 30,
    entered: 28, total: 30, date: "2026-05-18", tab: "subject-teacher",
  },
  {
    id: "7", subject: "Physics", subjectCode: "PHY",
    className: "F2 B", gradeName: "Form 2", examType: "CAT",
    status: "DRAFT", totalMarks: 40, passMark: 20, weight: 20,
    entered: 0, total: 30, date: null, tab: "subject-teacher",
  },
];

// ── Constants ──────────────────────────────────────────────────────────────────

const EXAM_LABEL: Record<string, string> = {
  CAT: "CAT",
  MID: "Mid-Term",
  EOT: "End of Term",
};

const EXAM_CHIP: Record<string, string> = {
  CAT: "bg-blue-100 text-blue-700",
  MID: "bg-purple-100 text-purple-700",
  EOT: "bg-red-100 text-red-700",
};

const EXAM_ACTIVE: Record<string, string> = {
  CAT: "bg-blue-600 text-white",
  MID: "bg-purple-600 text-white",
  EOT: "bg-red-600 text-white",
};

// ── Grouping helper ────────────────────────────────────────────────────────────

function group(list: MockAssessment[]) {
  return {
    needsAction: list.filter(
      (a) => a.status === "DRAFT" || (a.status === "PUBLISHED" && a.entered === 0)
    ),
    inProgress: list.filter(
      (a) => a.status === "PUBLISHED" && a.entered > 0 && a.entered < a.total
    ),
    done: list.filter((a) => a.status === "COMPLETED"),
  };
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-4 pb-2">
      <span className={cn("text-[11px] font-bold uppercase tracking-widest", color)}>
        {label}
      </span>
      <span className="text-[11px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 leading-none">
        {count}
      </span>
    </div>
  );
}

// ── Assessment card ────────────────────────────────────────────────────────────

function AssessmentCard({
  a,
  onTap,
}: {
  a: MockAssessment;
  onTap: (a: MockAssessment) => void;
}) {
  const pct = a.total > 0 ? (a.entered / a.total) * 100 : 0;
  const isNeeds = a.status === "DRAFT" || (a.status === "PUBLISHED" && a.entered === 0);
  const isProgress = a.status === "PUBLISHED" && a.entered > 0;
  const isDone = a.status === "COMPLETED";

  return (
    <button
      onClick={() => onTap(a)}
      className={cn(
        "w-full text-left bg-white rounded-2xl border border-gray-100 border-l-[4px] shadow-sm px-4 py-3.5 transition-all active:scale-[0.98]",
        isNeeds && "border-l-amber-400",
        isProgress && "border-l-blue-500",
        isDone && "border-l-green-500"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{a.subject}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {a.gradeName} {a.className} · {EXAM_LABEL[a.examType]}
          </p>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", EXAM_CHIP[a.examType])}>
          {a.examType}
        </span>
      </div>

      {/* Bottom row */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {a.entered} / {a.total} students entered
          </span>
          {a.status === "DRAFT" && (
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Draft
            </span>
          )}
          {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          {isProgress && (
            <span className="text-[11px] font-semibold text-blue-600">
              {Math.round(pct)}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isDone ? "bg-green-500" : isProgress ? "bg-blue-500" : "bg-gray-200"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

// ── Detail info row ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-gray-300 shrink-0">{icon}</span>
      <span className="text-sm text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right flex-1 truncate">{value}</span>
    </div>
  );
}

// ── Detail screen ──────────────────────────────────────────────────────────────

function DetailScreen({
  a,
  onBack,
}: {
  a: MockAssessment;
  onBack: () => void;
}) {
  const pct = a.total > 0 ? (a.entered / a.total) * 100 : 0;

  const statusChip =
    a.status === "DRAFT"
      ? "bg-amber-100 text-amber-700"
      : a.status === "PUBLISHED"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";

  const statusLabel =
    a.status === "DRAFT" ? "Draft" : a.status === "PUBLISHED" ? "Published" : "Completed";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Assessments
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <MoreVertical className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="bg-white px-5 pt-5 pb-6 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", EXAM_CHIP[a.examType])}>
              {EXAM_LABEL[a.examType]}
            </span>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusChip)}>
              {statusLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{a.subject}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {a.gradeName} {a.className} · Term 1 · 2026
          </p>
        </div>

        <div className="px-4 space-y-3 py-4">
          {/* Info card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Subject" value={`${a.subject} (${a.subjectCode})`} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Class" value={`${a.gradeName} ${a.className}`} />
            <InfoRow icon={<FileText className="h-4 w-4" />} label="Total Marks" value={String(a.totalMarks)} />
            <InfoRow icon={<FileText className="h-4 w-4" />} label="Pass Mark" value={String(a.passMark)} />
            <InfoRow icon={<FileText className="h-4 w-4" />} label="Weight" value={`${a.weight}%`} />
            {a.date && (
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Date"
                value={new Date(a.date).toLocaleDateString("en-ZM", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              />
            )}
          </div>

          {/* Results progress card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Results Entered</p>
              <p className="text-sm font-bold text-gray-900">
                {a.entered}
                <span className="text-gray-400 font-normal"> / {a.total}</span>
              </p>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  a.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {Math.round(pct)}% complete
            </p>
          </div>
        </div>

        {/* Spacer so content clears the sticky buttons */}
        <div className="h-48" />
      </div>

      {/* Sticky action buttons */}
      <div className="bg-white border-t border-gray-100 px-4 pt-4 pb-8 space-y-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        {a.status === "DRAFT" && (
          <>
            <Button className="w-full h-12 text-sm font-semibold rounded-xl shadow-sm">
              <Send className="h-4 w-4 mr-2" />
              Publish Assessment
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 text-sm rounded-xl text-red-500 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Draft
            </Button>
          </>
        )}

        {a.status === "PUBLISHED" && (
          <>
            <Button className="w-full h-12 text-sm font-semibold rounded-xl shadow-sm">
              <ClipboardEdit className="h-4 w-4 mr-2" />
              Enter Marks
            </Button>
            <Button variant="secondary" className="w-full h-11 text-sm rounded-xl">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
          </>
        )}

        {a.status === "COMPLETED" && (
          <Button className="w-full h-12 text-sm font-semibold rounded-xl shadow-sm">
            <Eye className="h-4 w-4 mr-2" />
            View Results
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MobileAssessmentsIGrade() {
  const [selected, setSelected] = useState<MockAssessment | null>(null);
  const [tab, setTab] = useState<"class-teacher" | "subject-teacher">("class-teacher");
  const [examFilter, setExamFilter] = useState("ALL");
  const [activeTerm, setActiveTerm] = useState("Term 1 · 2026");

  const TERMS = ["Term 1 · 2026", "Term 2 · 2026", "Term 3 · 2026"];
  const EXAM_FILTERS = [
    { key: "ALL", label: "All" },
    { key: "CAT", label: "CAT" },
    { key: "MID", label: "Mid-Term" },
    { key: "EOT", label: "End of Term" },
  ];

  const visible = MOCK.filter(
    (a) =>
      a.tab === tab &&
      (examFilter === "ALL" || a.examType === examFilter)
  );

  const { needsAction, inProgress, done } = group(visible);
  const isEmpty = needsAction.length === 0 && inProgress.length === 0 && done.length === 0;

  if (selected) {
    return <DetailScreen a={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">

      {/* ── Top bar ── */}
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Assessments</h1>
          <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <SlidersHorizontal className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Term chips — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 no-scrollbar">
          {TERMS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTerm(t)}
              className={cn(
                "shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors",
                activeTerm === t
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-500 border-gray-200"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exam type filter chips ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex gap-2">
          {EXAM_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setExamFilter(key)}
              className={cn(
                "text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors",
                examFilter === key
                  ? key === "ALL"
                    ? "bg-gray-900 text-white"
                    : EXAM_ACTIVE[key]
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-100">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full rounded-none bg-transparent h-auto p-0 border-0">
            <TabsTrigger
              value="class-teacher"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-xs font-semibold text-gray-500 data-[state=active]:text-primary gap-1.5"
            >
              Class Teacher
              {tab === "class-teacher" && needsAction.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {needsAction.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="subject-teacher"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 text-xs font-semibold text-gray-500 data-[state=active]:text-primary gap-1.5"
            >
              Subject Teacher
              {tab === "subject-teacher" && (() => {
                const { needsAction: n } = group(MOCK.filter(a => a.tab === "subject-teacher" && (examFilter === "ALL" || a.examType === examFilter)));
                return n.length > 0 ? (
                  <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {n.length}
                  </span>
                ) : null;
              })()}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center mt-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileText className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">No assessments yet</p>
            <p className="text-xs text-gray-300 max-w-[180px]">
              Tap the + button below to create your first assessment
            </p>
          </div>
        ) : (
          <>
            {needsAction.length > 0 && (
              <>
                <SectionHeader label="Needs Action" count={needsAction.length} color="text-amber-500" />
                <div className="space-y-2.5">
                  {needsAction.map((a) => <AssessmentCard key={a.id} a={a} onTap={setSelected} />)}
                </div>
              </>
            )}

            {inProgress.length > 0 && (
              <>
                <SectionHeader label="In Progress" count={inProgress.length} color="text-blue-500" />
                <div className="space-y-2.5">
                  {inProgress.map((a) => <AssessmentCard key={a.id} a={a} onTap={setSelected} />)}
                </div>
              </>
            )}

            {done.length > 0 && (
              <>
                <SectionHeader label="Done" count={done.length} color="text-green-500" />
                <div className="space-y-2.5">
                  {done.map((a) => <AssessmentCard key={a.id} a={a} onTap={setSelected} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <div className="absolute bottom-6 right-5">
        <button
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-all hover:brightness-105"
          aria-label="Create assessment"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
