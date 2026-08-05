"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClassLabel } from "@/lib/utils";

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
}: AdminReportsHeaderProps) {
  const selectedGradeData = grades.find((g) => g.id === selectedGrade);
  const selectedClassData = classes.find((c) => c.id === selectedClass);

  const getDescription = () => {
    if (hideClassFilter) {
      return selectedGradeData
        ? `${selectedGradeData.name} · All Classes`
        : "Select grade, subject, and term to view reports";
    }
    return selectedClassData
      ? formatClassLabel(selectedClassData.gradeName, selectedClassData.name)
      : "Select grade, class, and term to view reports";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-base">Report Filters</CardTitle>
            {/* Hidden on mobile/tablet — narrow viewports don't have room for
                both this and the filter row below without overflowing. */}
            <p className="hidden lg:block text-muted-foreground text-sm">{getDescription()}</p>
          </div>

          {/* Filters — wrap onto multiple lines on narrower viewports instead
              of overflowing the card horizontally. */}
          <div className="flex flex-wrap items-center gap-3">
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
                      {formatClassLabel(classOption.gradeName, classOption.name)}
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
