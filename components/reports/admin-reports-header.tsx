"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCompactClassLabel } from "@/lib/utils";

interface GradeOption {
  id: string;
  name: string;
  level: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TermOption {
  id: string;
  name: string;
  termType: string;
  academicYear: string;
}

interface AdminReportsHeaderProps {
  selectedGrade: string;
  onGradeChange: (gradeId: string) => void;
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedSubject: string;
  onSubjectChange: (subjectId: string) => void;
  selectedTerm: string;
  onTermChange: (termId: string) => void;
  selectedConvention?: "standard" | "form";
  onConventionChange?: (convention: "standard" | "form") => void;
  showConventionFilter?: boolean;
  grades: GradeOption[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  terms: TermOption[];
  hideClassFilter?: boolean;
  hideSubjectFilter?: boolean;
  /** Opt in to a mobile-only compact filter layout: Grade/Class/Subject
   *  share row one (the focused one grows, the others shrink), Term spans
   *  its own full-width row underneath. Desktop is unaffected either way. */
  mobileCompactFilters?: boolean;
}

export function AdminReportsHeader({
  selectedGrade,
  onGradeChange,
  selectedClass,
  onClassChange,
  selectedSubject,
  onSubjectChange,
  selectedTerm,
  onTermChange,
  selectedConvention,
  onConventionChange,
  showConventionFilter,
  grades,
  classes,
  subjects,
  terms,
  hideClassFilter = false,
  hideSubjectFilter = false,
  mobileCompactFilters = false,
}: AdminReportsHeaderProps) {
  const selectedGradeData = grades.find((g) => g.id === selectedGrade);
  const selectedClassData = classes.find((c) => c.id === selectedClass);

  // Mobile-only: which of the row-one filters is currently open, so it can
  // grow while the other(s) shrink out of its way.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "grade" | "class" | "subject" | "convention" | null
  >(null);
  const flexFor = (key: "grade" | "class" | "subject" | "convention") =>
    activeMobileFilter === key ? "flex-none max-w-[70%]" : "flex-1";
  const triggerFor = (key: "grade" | "class" | "subject" | "convention") =>
    activeMobileFilter === key ? "w-fit max-w-full" : "w-full";

  const getDescription = () => {
    if (hideClassFilter) {
      return selectedGradeData
        ? `${selectedGradeData.name} · All Classes`
        : "Select grade, subject, and term to view reports";
    }
    return selectedClassData
      ? formatCompactClassLabel(selectedClassData.gradeName, selectedClassData.name)
      : "Select grade, class, and term to view reports";
  };

  return (
    <Card>
      <CardHeader>
        {/* min-w-0: CardHeader is display:grid, and grid items default to
            min-width:auto (shrink-to-fit their content) — without this, this
            child's own content (the widest select's text) could force the
            grid track wider than the card, pushing the filters past the
            card's edge instead of actually shrinking to fit it. */}
        <div className="min-w-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-base">Report Filters</CardTitle>
            {/* Hidden on mobile/tablet — narrow viewports don't have room for
                both this and the filter row below without overflowing. */}
            <p className="hidden lg:block text-muted-foreground text-sm">{getDescription()}</p>
          </div>

          {/* Mobile compact layout (opt-in): Grade/Class/Subject share row
              one — the open one grows, the others shrink — Term spans its
              own full-width row underneath. */}
          {mobileCompactFilters && (
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="flex gap-2">
                <div className={cn("min-w-0 transition-all duration-200", flexFor("grade"))}>
                  <Select
                    value={selectedGrade}
                    onValueChange={onGradeChange}
                    onOpenChange={(open) => setActiveMobileFilter(open ? "grade" : null)}>
                    <SelectTrigger className={triggerFor("grade")}>
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!hideClassFilter && (
                  <div className={cn("min-w-0 transition-all duration-200", flexFor("class"))}>
                    <Select
                      value={selectedClass}
                      onValueChange={onClassChange}
                      disabled={!selectedGrade}
                      onOpenChange={(open) => setActiveMobileFilter(open ? "class" : null)}>
                      <SelectTrigger className={triggerFor("class")}>
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classOption) => (
                          <SelectItem key={classOption.id} value={classOption.id}>
                            {formatCompactClassLabel(classOption.gradeName, classOption.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!hideSubjectFilter && (
                  <div className={cn("min-w-0 transition-all duration-200", flexFor("subject"))}>
                    <Select
                      value={selectedSubject}
                      onValueChange={onSubjectChange}
                      onOpenChange={(open) => setActiveMobileFilter(open ? "subject" : null)}>
                      <SelectTrigger className={triggerFor("subject")}>
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showConventionFilter && selectedConvention !== undefined && onConventionChange && (
                  <div className={cn("min-w-0 transition-all duration-200", flexFor("convention"))}>
                    <Select
                      value={selectedConvention}
                      onValueChange={(v) => onConventionChange(v as "standard" | "form")}
                      onOpenChange={(open) => setActiveMobileFilter(open ? "convention" : null)}>
                      <SelectTrigger className={triggerFor("convention")}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Grade</SelectItem>
                        <SelectItem value="form">Form Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Select value={selectedTerm} onValueChange={onTermChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filters — wrap onto multiple lines on narrower viewports instead
              of overflowing the card horizontally. */}
          <div className={cn("flex-wrap items-center gap-3", mobileCompactFilters ? "hidden lg:flex" : "flex")}>
            <Select value={selectedGrade} onValueChange={onGradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showConventionFilter && selectedConvention !== undefined && onConventionChange && (
              <Select
                value={selectedConvention}
                onValueChange={(v) => onConventionChange(v as "standard" | "form")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Grade</SelectItem>
                  <SelectItem value="form">Form Grade</SelectItem>
                </SelectContent>
              </Select>
            )}

            {!hideClassFilter && (
              <Select value={selectedClass} onValueChange={onClassChange} disabled={!selectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classOption) => (
                    <SelectItem key={classOption.id} value={classOption.id}>
                      {formatCompactClassLabel(classOption.gradeName, classOption.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {!hideSubjectFilter && (
              <Select value={selectedSubject} onValueChange={onSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedTerm} onValueChange={onTermChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
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
