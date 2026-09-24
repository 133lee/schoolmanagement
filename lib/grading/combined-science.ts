import { calculateECZGrade } from "./ecz-grading-system";
import { ECZGrade } from "@/types/prisma-enums";

/**
 * Grade 12 combined-science rule: Physics and Chemistry are taught and
 * marked separately, but whenever a student has a real mark in BOTH,
 * report cards, subject analysis and the grade-wide report must present
 * them as a single "SCIENCE" entry — each subject's score halved and
 * summed (i.e. their average). When only one of the two has a real mark
 * (the other teacher hasn't entered scores yet, or the student doesn't
 * take it), that subject stands alone under its own name — no merge.
 */
export const COMBINED_SCIENCE_LABEL = "SCIENCE";
/** Synthetic subject ID for the merged view — no real Subject row backs it. */
export const COMBINED_SCIENCE_SUBJECT_ID = "combined-science";

export function isPhysicsSubjectName(name: string): boolean {
  return /\bphysics\b/i.test(name);
}

export function isChemistrySubjectName(name: string): boolean {
  return /\bchemistry\b/i.test(name);
}

export interface MergeableSubjectMark {
  catMark: number | null;
  midMark: number | null;
  eotMark: number | null;
  catAbsent: boolean;
  midAbsent: boolean;
  eotAbsent: boolean;
  totalMark: number | null;
}

/** Shape a report-card-subject-like row needs for isPhysicsSubjectName/find lookups by callers. */
export interface SubjectMarkRow extends MergeableSubjectMark {
  subjectId: string;
  subject: { name: string; code: string };
  grade: string | null;
}

/** A subject only counts as "really sat" if at least one component mark was recorded. */
export function hasRealMark(m: MergeableSubjectMark): boolean {
  return m.catMark !== null || m.midMark !== null || m.eotMark !== null;
}

function averageComponent(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return Math.round((a + b) / 2);
  return a ?? b ?? null;
}

export interface CombinedScienceMark {
  catMark: number | null;
  midMark: number | null;
  eotMark: number | null;
  catAbsent: boolean;
  midAbsent: boolean;
  eotAbsent: boolean;
  totalMark: number;
  grade: ECZGrade;
}

/** Averages a Physics + Chemistry mark pair into one Science mark. Callers must have already confirmed both have a real mark via hasRealMark. */
export function combinePhysicsChemistryMark(
  physics: MergeableSubjectMark,
  chemistry: MergeableSubjectMark
): CombinedScienceMark {
  const totalMark = Math.round(((physics.totalMark ?? 0) + (chemistry.totalMark ?? 0)) / 2);
  return {
    catMark: averageComponent(physics.catMark, chemistry.catMark),
    midMark: averageComponent(physics.midMark, chemistry.midMark),
    eotMark: averageComponent(physics.eotMark, chemistry.eotMark),
    catAbsent: physics.catAbsent && chemistry.catAbsent,
    midAbsent: physics.midAbsent && chemistry.midAbsent,
    eotAbsent: physics.eotAbsent && chemistry.eotAbsent,
    totalMark,
    grade: calculateECZGrade(totalMark, "SENIOR"),
  };
}
