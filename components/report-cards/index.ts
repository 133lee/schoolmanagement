/**
 * Report Card Components Export
 */

export { SeniorReportCard } from './SeniorReportCard';
export type { SeniorReportCardData } from './SeniorReportCard';

export { JuniorReportCard } from './JuniorReportCard';
export type { JuniorReportCardData } from './JuniorReportCard';

// Report card type selector based on grade level
export type ReportCardType = 'JUNIOR' | 'SENIOR';

export function getReportCardType(gradeLevel: string): ReportCardType {
  // Junior: Grades 8-9
  if (gradeLevel === 'GRADE_8' || gradeLevel === 'GRADE_9') {
    return 'JUNIOR';
  }

  // Senior: Grades 10-12, and default fallback
  return 'SENIOR';
}
