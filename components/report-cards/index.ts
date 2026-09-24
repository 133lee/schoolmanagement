/**
 * Report Card Components Export
 */

export { SeniorReportCard } from './SeniorReportCard';
export type { SeniorReportCardData } from './SeniorReportCard';

export { JuniorReportCard } from './JuniorReportCard';
export type { JuniorReportCardData } from './JuniorReportCard';

// Report card type selector — delegates to the single shared implementation
// in lib/grading/ecz-grading-system.ts so the PDF route, client-side PDF
// generator, and preview component can never disagree on which template a
// class gets.
export { resolveReportCardLevel as getReportCardType } from '@/lib/grading/ecz-grading-system';
