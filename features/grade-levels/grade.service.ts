import { gradeRepository } from "./grade.repository";
import { getSchoolInfo } from "@/lib/settings/school-info-helper";
import { SchoolLevel } from "@/types/prisma-enums";

const SCHOOL_TYPE_TO_LEVEL: Record<string, SchoolLevel | null> = {
  Primary: SchoolLevel.PRIMARY,
  Secondary: SchoolLevel.SECONDARY,
  "Combined (Primary & Secondary)": null,
};

/**
 * Grade Level Service
 *
 * Read-side lookups for the Grade 1-12 reference list used across many
 * filter dropdowns. See gradeSeed.service.ts for the one-off default-data
 * seeding utility — kept separate since that's a distinct concern.
 */
export class GradeService {
  /**
   * Fetch grade levels, auto-filtered by the school's configured type
   * (Primary/Secondary) unless an explicit level or "ALL" is requested.
   */
  async getGradeLevels(explicitLevel: string | null) {
    let resolvedLevel: SchoolLevel | null = null;

    if (explicitLevel === "ALL") {
      resolvedLevel = null;
    } else if (explicitLevel === "PRIMARY" || explicitLevel === "SECONDARY") {
      resolvedLevel = explicitLevel;
    } else {
      const schoolInfo = await getSchoolInfo();
      resolvedLevel = SCHOOL_TYPE_TO_LEVEL[schoolInfo.schoolType] ?? null;
    }

    return resolvedLevel ? gradeRepository.findBySchoolLevel(resolvedLevel) : gradeRepository.findAll();
  }
}

export const gradeService = new GradeService();
