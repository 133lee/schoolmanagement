import { systemSettingsRepository } from "./systemSettings.repository";
import { ACADEMIC_POLICY_DEFAULTS, type AcademicPolicy } from "@/lib/settings/academic-policy";
import { ValidationError } from "@/lib/http/errors";
import type { GradeLevel } from "@/lib/grading/ecz-grading-system";

const CATEGORY = "academic_policy";

/**
 * Academic Policy Service
 *
 * Thin wrapper over SystemSettings for the small set of school-wide
 * pass-mark / attendance-threshold values, stored as individual key-value
 * rows under the "academic_policy" category.
 */
export class AcademicPolicyService {
  async getPolicy(): Promise<AcademicPolicy> {
    const rows = await systemSettingsRepository.findByCategory(CATEGORY);

    const stored: Record<string, unknown> = {};
    rows.forEach((r) => {
      stored[r.key] = r.value;
    });

    return { ...ACADEMIC_POLICY_DEFAULTS, ...stored } as AcademicPolicy;
  }

  /**
   * The configured subject pass mark for a grade level. Distinction is
   * intentionally NOT exposed here — it's tied to the fixed ECZ national
   * grading scale (lib/grading/ecz-grading-system.ts), not a school-level
   * policy, so schools can't drift their pass-rate stats away from official
   * ECZ reporting. Only the pass mark is a real school policy choice.
   */
  async getSubjectPassMark(gradeLevel: GradeLevel): Promise<number> {
    const policy = await this.getPolicy();
    return gradeLevel === "PRIMARY"
      ? policy.primary_subject_pass_mark
      : policy.secondary_subject_pass_mark;
  }

  async updatePolicy(body: Partial<AcademicPolicy>): Promise<AcademicPolicy> {
    const validate = (val: unknown, min: number, max: number, name: string) => {
      const n = Number(val);
      if (isNaN(n) || n < min || n > max) {
        throw new ValidationError(`${name} must be between ${min} and ${max}`);
      }
    };

    if (body.min_attendance_percentage !== undefined)
      validate(body.min_attendance_percentage, 0, 100, "Minimum attendance");
    if (body.primary_subject_pass_mark !== undefined)
      validate(body.primary_subject_pass_mark, 0, 100, "Primary subject pass mark");
    if (body.primary_min_subjects_passed !== undefined)
      validate(body.primary_min_subjects_passed, 1, 20, "Primary minimum subjects passed");
    if (body.primary_max_subjects_failed !== undefined)
      validate(body.primary_max_subjects_failed, 0, 20, "Primary maximum subjects failed");
    if (body.secondary_subject_pass_mark !== undefined)
      validate(body.secondary_subject_pass_mark, 0, 100, "Secondary subject pass mark");
    if (body.secondary_min_subjects_passed !== undefined)
      validate(body.secondary_min_subjects_passed, 1, 20, "Secondary minimum subjects passed");
    if (body.secondary_max_subjects_failed !== undefined)
      validate(body.secondary_max_subjects_failed, 0, 20, "Secondary maximum subjects failed");

    const entries = Object.entries(body) as [string, unknown][];
    await Promise.all(
      entries.map(([key, value]) => systemSettingsRepository.upsert(key, value, CATEGORY))
    );

    return this.getPolicy();
  }
}

export const academicPolicyService = new AcademicPolicyService();
