"use client";

import { SeniorSecondaryReportCard } from "./templates/SeniorSecondaryReportCard";
import { JuniorSecondaryReportCard } from "./templates/JuniorSecondaryReportCard";
import { computeBestOfSixFromReportCard } from "@/lib/services/performance-calculator-pure";

/**
 * Check if class name follows the Form naming convention (F1, F2, etc.)
 * Returns the form number if matched, null otherwise.
 *
 * Class naming convention: F{number} {className} or F{number}-{className}
 * Examples: F1 Blue, F1-B, F2 A, F3-Gold
 */
function getFormNumber(className: string): number | null {
  const match = className.match(/^F(\d+)[\s-]/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

interface ReportCardPreviewProps {
  reportCard: {
    id?: string;
    student?: {
      firstName: string;
      middleName?: string;
      lastName: string;
    };
    class?: {
      name: string;
      grade?: {
        id?: string;
        name?: string;
        level: string;
      };
    };
    term?: {
      termType: string;
      academicYear?: {
        year: number;
      };
    };
    classTeacher?: {
      firstName: string;
      lastName: string;
    };
    subjects?: Array<{
      subject: {
        name: string;
        gradeSubjects?: Array<{ gradeId: string; isCore: boolean }>;
      };
      catMark: number | null;
      midMark: number | null;
      eotMark: number | null;
      totalMark?: number | null;
      grade: string;
    }>;
    averageMark?: number;
    attendance?: number;
    promotionStatus?: string;
    classTeacherRemarks?: string;
    headTeacherRemarks?: string;
  };
  schoolName?: string;
  logoUrl?: string;
}

export function ReportCardPreview({ reportCard, schoolName, logoUrl }: ReportCardPreviewProps) {
  // Build student name
  const pupilName = reportCard.student
    ? `${reportCard.student.firstName} ${reportCard.student.middleName ? reportCard.student.middleName + " " : ""}${reportCard.student.lastName}`
    : "";

  // Build class name
  const className = reportCard.class?.name || "";

  // Build class teacher name
  const classTeacher = reportCard.classTeacher
    ? `${reportCard.classTeacher.firstName} ${reportCard.classTeacher.lastName}`
    : "";

  // Build year
  const year = reportCard.term?.academicYear?.year?.toString() || "";

  // Calculate Best of Six using ECZ rules
  const gradeId = reportCard.class?.grade?.id || "";
  const gradeName = reportCard.class?.grade?.name || null;
  const subjectsForBestSix = (reportCard.subjects || []).map((sub) => {
    const gs = sub.subject.gradeSubjects?.find((g) => g.gradeId === gradeId);
    return {
      totalMark: sub.totalMark ?? null,
      grade: sub.grade ?? null,
      isCore: gs?.isCore ?? true,
    };
  });
  const gradeLevel = reportCard.class?.grade?.level || "";
  const bestOfSix = computeBestOfSixFromReportCard(subjectsForBestSix, gradeLevel, gradeName, className);

  // Build attendance
  const attendance = reportCard.attendance?.toString() || "0";

  // Map subjects to template format
  const grades = reportCard.subjects?.map((subject) => ({
    subject: subject.subject.name.toUpperCase(),
    cat: subject.catMark?.toString() || "",
    mid: subject.midMark?.toString() || "",
    eot: subject.eotMark?.toString() || "",
  })) || [];

  // Get teacher comments
  const teacherComment = reportCard.classTeacherRemarks || "";
  const headTeacherComment = reportCard.headTeacherRemarks || "";

  // Determine which template to use based on grade level and class name

  /**
   * Template selection logic:
   * - Form 1-5 (F1, F2, F3, F4, F5 classes): SeniorSecondaryReportCard (9-point ECZ scale)
   * - Old Grades 8-9 (no F prefix): JuniorSecondaryReportCard (5-point ECZ scale)
   * - Old Grades 10-12 (no F prefix): SeniorSecondaryReportCard (9-point ECZ scale)
   * - Grades 1-7: SeniorSecondaryReportCard as fallback
   */
  const renderTemplate = () => {
    // Check for Form naming convention first (F1, F2, F3, etc.)
    const formNumber = getFormNumber(className);

    if (formNumber !== null) {
      // All Form classes (F1-F5) use Senior Secondary report card (9-point ECZ scale)
      if (formNumber >= 1 && formNumber <= 5) {
        return (
          <SeniorSecondaryReportCard
            pupilName={pupilName}
            className={className}
            classTeacher={classTeacher}
            year={year}
            bestOfSix={bestOfSix}
            attendance={attendance}
            grades={grades}
            teacherComment={teacherComment}
            headTeacherComment={headTeacherComment}
            schoolName={schoolName}
            logoUrl={logoUrl}
          />
        );
      }
    }

    // Fallback to grade level detection (for old classes without F prefix)
    // Junior Secondary: Grades 8-9 (5-point ECZ scale)
    if (gradeLevel === "GRADE_8" || gradeLevel === "GRADE_9") {
      return (
        <JuniorSecondaryReportCard
          pupilName={pupilName}
          className={className}
          classTeacher={classTeacher}
          year={year}
          bestOfSix={bestOfSix}
          attendance={attendance}
          grades={grades}
          teacherComment={teacherComment}
          headTeacherComment={headTeacherComment}
          schoolName={schoolName}
          logoUrl={logoUrl}
        />
      );
    }

    // Senior Secondary: Grades 10-12 (9-point ECZ scale) or default fallback
    return (
      <SeniorSecondaryReportCard
        pupilName={pupilName}
        className={className}
        classTeacher={classTeacher}
        year={year}
        bestOfSix={bestOfSix}
        attendance={attendance}
        grades={grades}
        teacherComment={teacherComment}
        headTeacherComment={headTeacherComment}
        schoolName={schoolName}
        logoUrl={logoUrl}
      />
    );
  };

  return (
    <div className="report-card-preview-container">
      <div id={reportCard.id ? `report-card-${reportCard.id}` : undefined}>
        {renderTemplate()}
      </div>
    </div>
  );
}
