import { GradeLevel, SchoolLevel } from "@prisma/client";
import { gradeRepository } from "./grade.repository";

const DEFAULT_GRADES = [
  { level: GradeLevel.GRADE_1, name: "Grade 1", schoolLevel: SchoolLevel.PRIMARY, sequence: 1 },
  { level: GradeLevel.GRADE_2, name: "Grade 2", schoolLevel: SchoolLevel.PRIMARY, sequence: 2 },
  { level: GradeLevel.GRADE_3, name: "Grade 3", schoolLevel: SchoolLevel.PRIMARY, sequence: 3 },
  { level: GradeLevel.GRADE_4, name: "Grade 4", schoolLevel: SchoolLevel.PRIMARY, sequence: 4 },
  { level: GradeLevel.GRADE_5, name: "Grade 5", schoolLevel: SchoolLevel.PRIMARY, sequence: 5 },
  { level: GradeLevel.GRADE_6, name: "Grade 6", schoolLevel: SchoolLevel.PRIMARY, sequence: 6 },
  { level: GradeLevel.GRADE_7, name: "Grade 7", schoolLevel: SchoolLevel.PRIMARY, sequence: 7 },
  { level: GradeLevel.GRADE_8, name: "Grade 8", schoolLevel: SchoolLevel.SECONDARY, sequence: 8 },
  { level: GradeLevel.GRADE_9, name: "Grade 9", schoolLevel: SchoolLevel.SECONDARY, sequence: 9 },
  { level: GradeLevel.GRADE_10, name: "Grade 10", schoolLevel: SchoolLevel.SECONDARY, sequence: 10 },
  { level: GradeLevel.GRADE_11, name: "Grade 11", schoolLevel: SchoolLevel.SECONDARY, sequence: 11 },
  { level: GradeLevel.GRADE_12, name: "Grade 12", schoolLevel: SchoolLevel.SECONDARY, sequence: 12 },
];

/**
 * Idempotently seeds the default Grade 1-12 records. Existing grades (by
 * level) are left untouched — used by the one-off admin setup utility.
 */
export class GradeSeedService {
  async seedDefaultGrades() {
    const results = await Promise.all(
      DEFAULT_GRADES.map((g) => gradeRepository.upsertByLevel(g))
    );

    return {
      count: results.length,
      grades: results.map((g) => ({ id: g.id, name: g.name, sequence: g.sequence })),
    };
  }
}

export const gradeSeedService = new GradeSeedService();
