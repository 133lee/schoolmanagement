"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  subject: string;
  subjectCode: string;
  enrolled: number;
}

interface TermOption {
  id: string;
  name: string;
  termType: string;
  academicYear: string;
}

// "TERM_1" → "Term 1", combined with academic year → "Term 1 · 2026"
const TERM_LABELS: Record<string, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  TERM_3: "Term 3",
};

function formatTermLabel(term: TermOption): string {
  const label = TERM_LABELS[term.termType] ?? term.termType;
  return term.academicYear ? `${label} · ${term.academicYear}` : label;
}

interface ClassReportsHeaderProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedTerm: string;
  onTermChange: (termId: string) => void;
  classes: ClassOption[];
  terms: TermOption[];
}

export function ClassReportsHeader({
  selectedClass,
  onClassChange,
  selectedTerm,
  onTermChange,
  classes,
  terms,
}: ClassReportsHeaderProps) {
  const selectedClassData = classes.find((c) => c.id === selectedClass);

  return (
    <Card className="shadow-none">
      {/* ── Mobile layout ─────────────────────────────────────────────────────── */}
      <div className="lg:hidden p-4 space-y-3">
        {/* Subtitle */}
        <p className="text-xs text-muted-foreground">
          {selectedClassData
            ? `${selectedClassData.subject} · ${selectedClassData.name} · ${selectedClassData.enrolled} students`
            : "Select a class and term to view reports"}
        </p>
        {/* Selects: 2-col grid */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedClass} onValueChange={onClassChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classOption) => (
                <SelectItem key={classOption.id} value={classOption.id}>
                  {classOption.subject} - {classOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTerm} onValueChange={onTermChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select Term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {formatTermLabel(term)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Desktop layout ────────────────────────────────────────────────────── */}
      <CardHeader className="hidden lg:block">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-0">
            <CardTitle className="text-base">Class Reports</CardTitle>
            <p className="text-muted-foreground text-sm">
              {selectedClassData
                ? `${selectedClassData.subject} - ${selectedClassData.name} • ${selectedClassData.enrolled} students`
                : "View and analyze student report cards by class and term"}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classOption) => (
                  <SelectItem key={classOption.id} value={classOption.id}>
                    {classOption.subject} - {classOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={onTermChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {formatTermLabel(term)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
