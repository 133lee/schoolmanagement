"use client";

import { SeniorSecondaryReportCard } from "./templates/SeniorSecondaryReportCard";
import { JuniorSecondaryReportCard } from "./templates/JuniorSecondaryReportCard";
import { computeBestOfSixFromReportCard } from "@/lib/services/performance-calculator-pure";
import { resolveReportCardLevel } from "@/lib/grading/ecz-grading-system";
import { formatTeacherLabel, formatCompactClassLabel } from "@/lib/utils";
import { formatAttendanceLabel } from "@/lib/report-cards/attendance-label";

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
      };
      catMark: number | null;
      midMark: number | null;
      eotMark: number | null;
      catAbsent?: boolean;
      midAbsent?: boolean;
      eotAbsent?: boolean;
      totalMark?: number | null;
      grade: string;
    }>;
    averageMark?: number;
    attendance?: number;
    daysPresent?: number;
    daysAbsent?: number;
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
  // Grade-prefixed for display ("12 A") — Form classes ("F1-B") keep their
  // own self-identifying name as-is.
  const displayClassName = formatCompactClassLabel(reportCard.class?.grade?.name, className);

  // Build class teacher name — "Surname F."
  const classTeacher = formatTeacherLabel(reportCard.classTeacher);

  // Build year
  const year = reportCard.term?.academicYear?.year?.toString() || "";

  // Calculate Best of Six using ECZ rules
  const gradeName = reportCard.class?.grade?.name || null;
  const subjectsForBestSix = (reportCard.subjects || []).map((sub) => ({
    name: sub.subject.name,
    totalMark: sub.totalMark ?? null,
    grade: sub.grade ?? null,
  }));
  const gradeLevel = reportCard.class?.grade?.level || "";
  const bestOfSix = computeBestOfSixFromReportCard(subjectsForBestSix, gradeLevel, gradeName, className);

  // Build attendance
  const attendance = formatAttendanceLabel(reportCard);

  // Map subjects to template format
  const grades = reportCard.subjects?.map((subject) => ({
    subject: subject.subject.name.toUpperCase(),
    cat: subject.catAbsent ? "AB" : subject.catMark?.toString() ?? "-",
    mid: subject.midAbsent ? "AB" : subject.midMark?.toString() ?? "-",
    eot: subject.eotAbsent ? "AB" : subject.eotMark?.toString() ?? "-",
  })) || [];

  // Get teacher comments
  const teacherComment = reportCard.classTeacherRemarks || "";
  const headTeacherComment = reportCard.headTeacherRemarks || "";

  // Determine which template to use based on grade level and class name

  /**
   * Template selection — delegates to the single shared
   * resolveReportCardLevel so this preview never disagrees with the
   * generated PDF about which template a class gets.
   */
  const renderTemplate = () => {
    const commonProps = {
      pupilName,
      className: displayClassName,
      classTeacher,
      year,
      bestOfSix,
      attendance,
      grades,
      teacherComment,
      headTeacherComment,
      schoolName,
      logoUrl,
    };

    return resolveReportCardLevel(gradeLevel, gradeName, className) === "JUNIOR" ? (
      <JuniorSecondaryReportCard {...commonProps} />
    ) : (
      <SeniorSecondaryReportCard {...commonProps} />
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
