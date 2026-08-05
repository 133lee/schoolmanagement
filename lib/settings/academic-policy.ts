export const ACADEMIC_POLICY_DEFAULTS = {
  promotion_auto_enabled: false,
  promotion_basis: "eot" as "eot" | "average",
  min_attendance_percentage: 75,
  attendance_blocks_promotion: false,
  primary_subject_pass_mark: 40,
  primary_min_subjects_passed: 5,
  primary_max_subjects_failed: 2,
  secondary_subject_pass_mark: 40,
  secondary_min_subjects_passed: 6,
  secondary_max_subjects_failed: 2,
};

export type AcademicPolicy = typeof ACADEMIC_POLICY_DEFAULTS;
