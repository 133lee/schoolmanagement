/**
 * Pure calculation functions — no server-side imports.
 * Safe to import from client components.
 */

export interface StudentScore {
  subject: string;
  score: number;
  totalMarks: number;
  grade: string | null;
}

export type CurriculumType = 'OLD_SYSTEM' | 'STANDARD' | 'NEW_SYSTEM';

export interface BestSixResult {
  value: number;
  count: number;
  type: 'percentage' | 'standard_points' | 'points';
  maxValue: number;
}

export interface SubjectWithCore {
  subject: string;
  subjectId: string;
  score: number;
  totalMarks: number;
  isCore: boolean;
  percentage: number;
  points: number;
}

export function getCurriculumType(gradeLevel: string): CurriculumType {
  const oldSystemGrades = [
    'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5',
    'GRADE_6', 'GRADE_7',
  ];
  const standardGrades = ['GRADE_8', 'GRADE_9'];
  const newSystemGrades = [
    'FORM_1', 'FORM_2', 'FORM_3', 'FORM_4', 'FORM_5',
    'GRADE_10', 'GRADE_11', 'GRADE_12',
  ];

  if (oldSystemGrades.includes(gradeLevel)) return 'OLD_SYSTEM';
  if (standardGrades.includes(gradeLevel)) return 'STANDARD';
  if (newSystemGrades.includes(gradeLevel)) return 'NEW_SYSTEM';
  return 'NEW_SYSTEM';
}

export function calculatePercentage(marksObtained: number, totalMarks: number): number {
  if (totalMarks === 0) return 0;
  return Math.round((marksObtained / totalMarks) * 100);
}

export function percentageToOldSystemGrade(percentage: number): number {
  if (percentage >= 75) return 1;
  if (percentage >= 60) return 2;
  if (percentage >= 50) return 3;
  if (percentage >= 40) return 4;
  return 0;
}

export function percentageToECZPoints(percentage: number): number {
  if (percentage >= 75) return 1;
  if (percentage >= 70) return 2;
  if (percentage >= 65) return 3;
  if (percentage >= 60) return 4;
  if (percentage >= 55) return 5;
  if (percentage >= 50) return 6;
  if (percentage >= 45) return 7;
  if (percentage >= 40) return 8;
  return 9;
}

export function calculateBestSixPoints(
  scores: SubjectWithCore[],
  curriculumType: CurriculumType = 'NEW_SYSTEM',
): BestSixResult | null {
  if (scores.length === 0) return null;

  if (curriculumType === 'OLD_SYSTEM') {
    const sortedByPercentage = [...scores].sort((a, b) => b.percentage - a.percentage);
    const topSix = sortedByPercentage.slice(0, 6);
    if (topSix.length === 0) return null;
    return {
      value: topSix.reduce((sum, s) => sum + s.percentage, 0),
      count: topSix.length,
      type: 'percentage',
      maxValue: 600,
    };
  }

  if (curriculumType === 'STANDARD') {
    const withGrades = scores.map(s => ({ ...s, grade5: percentageToOldSystemGrade(s.percentage) }));
    const passing = withGrades.filter(s => s.grade5 > 0);
    const topSix = [...passing].sort((a, b) => a.grade5 - b.grade5).slice(0, 6);
    if (topSix.length === 0) return null;
    return {
      value: topSix.reduce((sum, s) => sum + s.grade5, 0),
      count: topSix.length,
      type: 'standard_points',
      maxValue: topSix.length * 4,
    };
  }

  const cores = scores.filter(s => s.isCore);
  const electives = scores.filter(s => !s.isCore);
  const sortedElectives = [...electives].sort((a, b) => a.points - b.points);
  const bestElectives = sortedElectives.slice(0, Math.max(0, 6 - cores.length));
  const bestSix = [...cores, ...bestElectives];
  if (bestSix.length === 0) return null;
  return {
    value: bestSix.reduce((sum, s) => sum + s.points, 0),
    count: bestSix.length,
    type: 'points',
    maxValue: bestSix.length * 9,
  };
}

export function calculateBestSix(scores: StudentScore[]): number {
  if (scores.length === 0) return 0;
  const sortedScores = [...scores]
    .map(s => calculatePercentage(s.score, s.totalMarks))
    .sort((a, b) => b - a)
    .slice(0, 6);
  if (sortedScores.length === 0) return 0;
  return Math.round(sortedScores.reduce((acc, score) => acc + score, 0) / sortedScores.length);
}

export function calculateTrend(
  currentScore: number,
  previousScore: number | null,
): 'up' | 'down' | 'same' {
  if (previousScore === null) return 'same';
  const difference = currentScore - previousScore;
  if (difference > 2) return 'up';
  if (difference < -2) return 'down';
  return 'same';
}

export function absoluteStatusTrend(percentage: number): 'up' | 'down' | 'same' {
  if (percentage >= 60) return 'up';
  if (percentage >= 50) return 'same';
  return 'down';
}

function eczGradeToPoint(grade: string | null | undefined): number {
  if (!grade) return 9;
  const n = parseInt(grade.replace('GRADE_', ''), 10);
  return isNaN(n) ? 9 : n;
}

export function computeBestOfSixFromReportCard(
  subjects: Array<{
    totalMark: number | null;
    grade: string | null;
    isCore: boolean;
  }>,
  gradeLevel: string,
  gradeName?: string | null,
  className?: string | null,
): string {
  if (subjects.length === 0) return '';

  const curriculumType = getCurriculumType(gradeLevel);

  const isFormClass =
    (gradeName != null && /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(gradeName.trim())) ||
    (className != null && /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(className.trim()));
  const effectiveType: CurriculumType = isFormClass ? 'NEW_SYSTEM' : curriculumType;

  if (effectiveType === 'OLD_SYSTEM') {
    const sorted = [...subjects]
      .map(s => s.totalMark ?? 0)
      .sort((a, b) => b - a)
      .slice(0, 6);
    return Math.round(sorted.reduce((sum, p) => sum + p, 0)).toString();
  }

  if (effectiveType === 'STANDARD') {
    const passing = subjects
      .map(s => eczGradeToPoint(s.grade))
      .filter(p => p <= 4)
      .sort((a, b) => a - b)
      .slice(0, 6);
    if (passing.length === 0) return '';
    return passing.reduce((sum, p) => sum + p, 0).toString();
  }

  const cores = subjects.filter(s => s.isCore);
  const electives = subjects
    .filter(s => !s.isCore)
    .sort((a, b) => eczGradeToPoint(a.grade) - eczGradeToPoint(b.grade));
  const bestSix = [...cores, ...electives.slice(0, Math.max(0, 6 - cores.length))];
  if (bestSix.length === 0) return '';
  return bestSix.reduce((sum, s) => sum + eczGradeToPoint(s.grade), 0).toString();
}
