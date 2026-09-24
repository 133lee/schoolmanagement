/**
 * ECZ (Examinations Council of Zambia) Grading System
 *
 * This is the single source of truth for all grading calculations
 * across the school management system.
 */

import { GradeLevel as PrismaGradeLevel } from "@prisma/client";
import { ECZGrade } from "@/types/prisma-enums";

export type GradeLevel = "PRIMARY" | "JUNIOR" | "SENIOR";

export interface GradeInfo {
  symbol: string;
  grade: ECZGrade;
  descriptor: string;
  minPercentage: number;
  maxPercentage: number;
  displayName: string;
}

/**
 * Grade 8-9 (Junior Secondary) Grading System
 * Letter-based grading system
 */
export const JUNIOR_GRADING: GradeInfo[] = [
  {
    symbol: "1",
    grade: "GRADE_1",
    descriptor: "Distinction",
    minPercentage: 75,
    maxPercentage: 100,
    displayName: "Distinction 1",
  },
  {
    symbol: "2",
    grade: "GRADE_2",
    descriptor: "Merit",
    minPercentage: 60,
    maxPercentage: 74,
    displayName: "Merit 2",
  },
  {
    symbol: "3",
    grade: "GRADE_3",
    descriptor: "Credit",
    minPercentage: 50,
    maxPercentage: 59,
    displayName: "Credit 3",
  },
  {
    symbol: "4",
    grade: "GRADE_4",
    descriptor: "Pass",
    minPercentage: 40,
    maxPercentage: 49,
    displayName: "Pass 4",
  },
  {
    symbol: "F",
    grade: "GRADE_9",
    descriptor: "Fail",
    minPercentage: 0,
    maxPercentage: 39,
    displayName: "Fail",
  },
];

/**
 * Grade 10-12 / Form 1-4 (Senior Secondary) Grading System
 * Symbol-based grading (1-9)
 * Also used for school leaving certificates and GCE O-Level equivalents
 */
export const SENIOR_GRADING: GradeInfo[] = [
  {
    symbol: "1",
    grade: "GRADE_1",
    descriptor: "Distinction",
    minPercentage: 75,
    maxPercentage: 100,
    displayName: "Distinction 1",
  },
  {
    symbol: "2",
    grade: "GRADE_2",
    descriptor: "Distinction",
    minPercentage: 70,
    maxPercentage: 74,
    displayName: "Distinction 2",
  },
  {
    symbol: "3",
    grade: "GRADE_3",
    descriptor: "Merit",
    minPercentage: 65,
    maxPercentage: 69,
    displayName: "Merit 3",
  },
  {
    symbol: "4",
    grade: "GRADE_4",
    descriptor: "Merit",
    minPercentage: 60,
    maxPercentage: 64,
    displayName: "Merit 4",
  },
  {
    symbol: "5",
    grade: "GRADE_5",
    descriptor: "Credit",
    minPercentage: 55,
    maxPercentage: 59,
    displayName: "Credit 5",
  },
  {
    symbol: "6",
    grade: "GRADE_6",
    descriptor: "Credit",
    minPercentage: 50,
    maxPercentage: 54,
    displayName: "Credit 6",
  },
  {
    symbol: "7",
    grade: "GRADE_7",
    descriptor: "Satisfactory",
    minPercentage: 45,
    maxPercentage: 49,
    displayName: "Satisfactory 7",
  },
  {
    symbol: "8",
    grade: "GRADE_8",
    descriptor: "Satisfactory",
    minPercentage: 40,
    maxPercentage: 44,
    displayName: "Satisfactory 8",
  },
  {
    symbol: "9",
    grade: "GRADE_9",
    descriptor: "Unsatisfactory",
    minPercentage: 0,
    maxPercentage: 39,
    displayName: "Unsatisfactory 9",
  },
];

/**
 * Primary (Grade 1-7) Grading System
 * Percentage-band descriptors used by Zambian government primary schools
 */
export const PRIMARY_GRADING: GradeInfo[] = [
  {
    symbol: "E",
    grade: "GRADE_1",
    descriptor: "Excellent",
    minPercentage: 80,
    maxPercentage: 100,
    displayName: "Excellent",
  },
  {
    symbol: "VG",
    grade: "GRADE_2",
    descriptor: "Very Good",
    minPercentage: 70,
    maxPercentage: 79,
    displayName: "Very Good",
  },
  {
    symbol: "G",
    grade: "GRADE_3",
    descriptor: "Good",
    minPercentage: 60,
    maxPercentage: 69,
    displayName: "Good",
  },
  {
    symbol: "Av",
    grade: "GRADE_4",
    descriptor: "Average",
    minPercentage: 50,
    maxPercentage: 59,
    displayName: "Average",
  },
  {
    symbol: "P",
    grade: "GRADE_5",
    descriptor: "Pass",
    minPercentage: 40,
    maxPercentage: 49,
    displayName: "Pass",
  },
  {
    symbol: "NI",
    grade: "GRADE_9",
    descriptor: "Needs Improvement",
    minPercentage: 0,
    maxPercentage: 39,
    displayName: "Needs Improvement",
  },
];

/**
 * Get the appropriate grading scale based on grade level
 */
export function getGradingScale(gradeLevel: GradeLevel): GradeInfo[] {
  switch (gradeLevel) {
    case "JUNIOR":
      return JUNIOR_GRADING;
    case "SENIOR":
      return SENIOR_GRADING;
    case "PRIMARY":
      return PRIMARY_GRADING;
    default:
      return SENIOR_GRADING; // Default to senior
  }
}

/**
 * Calculate ECZ grade based on percentage and grade level
 */
export function calculateECZGrade(
  percentage: number,
  gradeLevel: GradeLevel = "SENIOR"
): ECZGrade {
  const gradingScale = getGradingScale(gradeLevel);

  for (const gradeInfo of gradingScale) {
    if (percentage >= gradeInfo.minPercentage && percentage <= gradeInfo.maxPercentage) {
      return gradeInfo.grade;
    }
  }

  // Fallback to lowest grade if no match found
  return "GRADE_9";
}

/**
 * Get grade information by ECZGrade enum value
 */
export function getGradeInfo(
  grade: ECZGrade,
  gradeLevel: GradeLevel = "SENIOR"
): GradeInfo | undefined {
  const gradingScale = getGradingScale(gradeLevel);
  return gradingScale.find((g) => g.grade === grade);
}

/**
 * Get all passing grades for a grade level
 */
export function getPassingGrades(gradeLevel: GradeLevel): ECZGrade[] {
  const gradingScale = getGradingScale(gradeLevel);
  // Passing grades are those with minPercentage >= 40
  return gradingScale
    .filter((g) => g.minPercentage >= 40)
    .map((g) => g.grade);
}

/**
 * Get distinction grades for a grade level
 */
export function getDistinctionGrades(gradeLevel: GradeLevel): ECZGrade[] {
  const gradingScale = getGradingScale(gradeLevel);
  // Distinction grades are those with descriptor "Distinction"
  return gradingScale
    .filter((g) => g.descriptor === "Distinction")
    .map((g) => g.grade);
}

/**
 * Check if a grade is passing
 */
export function isPassingGrade(grade: ECZGrade, gradeLevel: GradeLevel = "SENIOR"): boolean {
  const passingGrades = getPassingGrades(gradeLevel);
  return passingGrades.includes(grade);
}

/**
 * Check if a grade is distinction
 */
export function isDistinctionGrade(grade: ECZGrade, gradeLevel: GradeLevel = "SENIOR"): boolean {
  const distinctionGrades = getDistinctionGrades(gradeLevel);
  return distinctionGrades.includes(grade);
}

/**
 * Get grade distribution structure for analysis
 * Returns an array ready to be populated with student counts
 */
export function getGradeDistributionStructure(gradeLevel: GradeLevel = "SENIOR") {
  const gradingScale = getGradingScale(gradeLevel);

  return gradingScale.map((gradeInfo) => ({
    grade: gradeInfo.displayName,
    range: `${gradeInfo.minPercentage}-${gradeInfo.maxPercentage}%`,
    male: 0,
    female: 0,
    total: 0,
    percentage: 0,
    gradeEnum: gradeInfo.grade,
  }));
}

/**
 * Format grade for display
 */
export function formatGrade(grade: ECZGrade, gradeLevel: GradeLevel = "SENIOR"): string {
  const gradeInfo = getGradeInfo(grade, gradeLevel);
  return gradeInfo ? gradeInfo.displayName : grade;
}

/**
 * Resolve the ECZ grading level using both the grade level enum and the display name.
 *
 * The "Form" naming convention always maps to Senior Secondary (9-point scale),
 * regardless of the underlying GradeLevel enum. This handles schools that run
 * standard Grade 8-9 classes (Junior, 5-point) alongside Form 1-5 classes
 * (Senior, 9-point) that may share the same GRADE_8/9 enum value in the DB.
 *
 * Call this instead of mapPrismaGradeLevelToECZLevel whenever a class or grade
 * name is available.
 */
export function resolveECZLevel(
  gradeLevel: PrismaGradeLevel,
  gradeName?: string | null,
  className?: string | null
): GradeLevel {
  if (isFormNamed(gradeName) || isFormNamed(className)) {
    return "SENIOR";
  }
  return mapPrismaGradeLevelToECZLevel(gradeLevel);
}

/**
 * True for the "Form" naming convention — "Form 1".."Form 9", or the short
 * "F1-A" / "F2 Blue" style. Checked against both the grade name and the
 * class name by callers, since a school's Grade 8/9 records can carry
 * Form-prefixed class names while the Grade record itself is still called
 * "Grade 8"/"Grade 9".
 */
function isFormNamed(name?: string | null): boolean {
  return !!name && /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(name.trim());
}

/**
 * Map Prisma's GradeLevel enum to ECZ grading system's GradeLevel type
 * This is the production-ready, type-safe way to determine which grading scale to use
 *
 * Prisma GradeLevel (GRADE_1 to GRADE_12) -> ECZ GradeLevel (PRIMARY/JUNIOR/SENIOR)
 */
export function mapPrismaGradeLevelToECZLevel(prismaLevel: PrismaGradeLevel): GradeLevel {
  switch (prismaLevel) {
    case "GRADE_5":
    case "GRADE_6":
    case "GRADE_7":
      return "PRIMARY";

    // Junior: Grades 8-9
    case "GRADE_8":
    case "GRADE_9":
      return "JUNIOR";

    // Senior: Grades 10-12 (also covers Form 1-4 equivalent)
    case "GRADE_10":
    case "GRADE_11":
    case "GRADE_12":
      return "SENIOR";

    case "GRADE_1":
    case "GRADE_2":
    case "GRADE_3":
    case "GRADE_4":
      return "PRIMARY";

    // Default to SENIOR for safety
    default:
      return "SENIOR";
  }
}

/**
 * Which report card DOCUMENT (title + layout) to render for a class — not
 * to be confused with resolveECZLevel's 9-point-vs-5-point GRADING SCALE
 * decision.
 *
 * Every Form-named class — Form 1 through Form 5, or "F1-A"/"F2-B" style —
 * uses the Senior Secondary report card, the same document as Grade 10-12.
 * Only a Grade 8/9 class that is NOT Form-named gets the Junior Secondary
 * document.
 *
 * Real class-naming quirk this must handle: a school's Grade 8/9 records
 * can have Form-prefixed class names ("F1-A", "F2-B") while the Grade
 * record itself is still named "Grade 8"/"Grade 9" — so both gradeName and
 * className are checked for the Form prefix, not just one.
 */
export function resolveReportCardLevel(
  gradeLevel: PrismaGradeLevel | string,
  gradeName?: string | null,
  className?: string | null
): "JUNIOR" | "SENIOR" {
  if (isFormNamed(gradeName) || isFormNamed(className)) return "SENIOR";

  if (gradeLevel === "GRADE_8" || gradeLevel === "GRADE_9") return "JUNIOR";
  return "SENIOR";
}

/**
 * Determine grade level from class name or grade number
 * Examples: "Grade 8 A" -> JUNIOR, "Grade 10 B" -> SENIOR, "Form 2" -> SENIOR
 *
 * NOTE: Prefer using mapPrismaGradeLevelToECZLevel() when you have access to the Prisma Grade model
 */
export function determineGradeLevel(className: string): GradeLevel {
  const gradeMatch = className.match(/(Grade|Form)\s*(\d+)/i);

  if (!gradeMatch) {
    return "SENIOR";
  }

  const prefix = gradeMatch[1].toLowerCase();
  const gradeNumber = parseInt(gradeMatch[2], 10);

  // "Form X" naming always means secondary
  if (prefix === "form") {
    return "SENIOR";
  }

  // "Grade X" naming
  if (gradeNumber >= 1 && gradeNumber <= 7) return "PRIMARY";
  if (gradeNumber >= 8 && gradeNumber <= 9) return "JUNIOR";
  if (gradeNumber >= 10 && gradeNumber <= 12) return "SENIOR";

  return "SENIOR";
}
