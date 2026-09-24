import { describe, it, expect } from "vitest";
import {
  computeBestOfSixFromReportCard,
  calculateBestSixPoints,
  type SubjectWithCore,
} from "@/lib/services/performance-calculator-pure";

// No DB/route needed — these are pure functions. Covers the ECZ Best Six
// rule fix: English Language grade + the five best grades from ALL other
// subjects. Mathematics is NOT mandatory — it was previously hardcoded
// alongside English, which this regression-tests against.

describe("computeBestOfSixFromReportCard (NEW_SYSTEM / 9-point scale)", () => {
  it("always includes English even when it's the worst grade", () => {
    const subjects = [
      { name: "English Language", totalMark: 10, grade: "GRADE_9" }, // worst
      { name: "Biology", totalMark: 90, grade: "GRADE_1" },
      { name: "Physics", totalMark: 90, grade: "GRADE_1" },
      { name: "Chemistry", totalMark: 90, grade: "GRADE_1" },
      { name: "Geography", totalMark: 90, grade: "GRADE_1" },
      { name: "History", totalMark: 90, grade: "GRADE_1" },
      { name: "Civic Education", totalMark: 90, grade: "GRADE_1" },
    ];
    // English (9) is mandatory + best 5 of the rest (all GRADE_1 = 1 each).
    const result = computeBestOfSixFromReportCard(subjects, "GRADE_12");
    expect(result).toBe((9 + 1 * 5).toString());
  });

  it("does NOT force Mathematics in when it's a bad grade — it competes like any other subject", () => {
    const subjects = [
      { name: "English Language", totalMark: 60, grade: "GRADE_3" },
      { name: "Mathematics", totalMark: 5, grade: "GRADE_9" }, // bad — must be excluded
      { name: "Biology", totalMark: 90, grade: "GRADE_1" },
      { name: "Physics", totalMark: 90, grade: "GRADE_1" },
      { name: "Chemistry", totalMark: 90, grade: "GRADE_1" },
      { name: "Geography", totalMark: 90, grade: "GRADE_1" },
      { name: "History", totalMark: 85, grade: "GRADE_2" },
    ];
    // English (3, mandatory) + best 5 of the OTHER 6 subjects (Maths
    // included in that pool, but it loses out to the five GRADE_1/2s).
    const result = computeBestOfSixFromReportCard(subjects, "GRADE_12");
    expect(result).toBe((3 + 1 + 1 + 1 + 1 + 2).toString());
    // If Maths were still hardcoded mandatory, the (wrong) result would be
    // 3 + 9 + four best of the remaining five (1+1+1+1) = 16.
    expect(result).not.toBe("16");
  });

  it("Form-named classes use the 9-point scale even if the grade level enum says otherwise", () => {
    const subjects = [
      { name: "English Language", totalMark: 60, grade: "GRADE_3" },
      { name: "Mathematics", totalMark: 5, grade: "GRADE_9" },
      { name: "Biology", totalMark: 90, grade: "GRADE_1" },
      { name: "Physics", totalMark: 90, grade: "GRADE_1" },
      { name: "Chemistry", totalMark: 90, grade: "GRADE_1" },
      { name: "Geography", totalMark: 90, grade: "GRADE_1" },
      { name: "History", totalMark: 85, grade: "GRADE_2" },
    ];
    const result = computeBestOfSixFromReportCard(subjects, "GRADE_9", "Grade 9", "F1-B");
    expect(result).toBe((3 + 1 + 1 + 1 + 1 + 2).toString());
  });
});

describe("calculateBestSixPoints (NEW_SYSTEM / points, used by teacher & student performance pages)", () => {
  function subj(overrides: Partial<SubjectWithCore> & { subject: string }): SubjectWithCore {
    return {
      subjectId: overrides.subject,
      score: 0,
      totalMarks: 100,
      isCore: false,
      percentage: 0,
      points: 5,
      ...overrides,
    };
  }

  it("mirrors computeBestOfSixFromReportCard: English mandatory, isCore ignored", () => {
    const scores: SubjectWithCore[] = [
      subj({ subject: "English Language", points: 3, isCore: false }),
      // Marked isCore in the curriculum, but a bad score — must NOT be
      // force-included just because isCore is true.
      subj({ subject: "Mathematics", points: 9, isCore: true }),
      subj({ subject: "Biology", points: 1, isCore: false }),
      subj({ subject: "Physics", points: 1, isCore: false }),
      subj({ subject: "Chemistry", points: 1, isCore: false }),
      subj({ subject: "Geography", points: 1, isCore: false }),
      subj({ subject: "History", points: 2, isCore: false }),
    ];

    const result = calculateBestSixPoints(scores, "NEW_SYSTEM");

    expect(result).not.toBeNull();
    expect(result!.type).toBe("points");
    expect(result!.count).toBe(6);
    expect(result!.value).toBe(3 + 1 + 1 + 1 + 1 + 2);
  });
});
