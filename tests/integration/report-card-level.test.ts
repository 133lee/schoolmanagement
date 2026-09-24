import { describe, it, expect } from "vitest";
import { resolveReportCardLevel, resolveECZLevel } from "@/lib/grading/ecz-grading-system";

// Which report card DOCUMENT a class gets. Rule: every Form-named class
// (Form 1-5, or "F1-A"/"F2-B" style) uses the Senior Secondary report card,
// the same as Grade 10-12. Only a Grade 8/9 class that is NOT Form-named
// gets the Junior Secondary one.
describe("resolveReportCardLevel", () => {
  it.each([
    // Form-prefixed class names on Grade 8/9 records — the real-world case
    ["GRADE_8", "Grade 8", "F1-A"],
    ["GRADE_8", "Grade 8", "F1-B"],
    ["GRADE_9", "Grade 9", "F2-A"],
    ["GRADE_9", "Grade 9", "F2-B"],
    ["GRADE_8", "Grade 8", "F1 Blue"],
    ["GRADE_8", "Grade 8", "Form 1 Blue"],
    // Form-named on the grade record itself
    ["GRADE_8", "Form 1", "A"],
    ["GRADE_9", "Form 2", "A"],
    // Forms 3-5 were already Senior
    ["GRADE_10", "Form 3", "A"],
    ["GRADE_11", "Form 4", "F4-A"],
    ["GRADE_12", "Form 5", "F5-B"],
  ])("gives the Senior report card to Form-named class: %s / %s / %s", (level, gradeName, className) => {
    expect(resolveReportCardLevel(level, gradeName, className)).toBe("SENIOR");
  });

  it.each([
    ["GRADE_10", "Grade 10", "A"],
    ["GRADE_11", "Grade 11", "B"],
    ["GRADE_12", "Grade 12", "A"],
  ])("gives the Senior report card to Grade 10-12: %s", (level, gradeName, className) => {
    expect(resolveReportCardLevel(level, gradeName, className)).toBe("SENIOR");
  });

  it.each([
    ["GRADE_8", "Grade 8", "A"],
    ["GRADE_9", "Grade 9", "B"],
  ])("still gives Grade 8/9 that are NOT Form-named the Junior report card: %s", (level, gradeName, className) => {
    expect(resolveReportCardLevel(level, gradeName, className)).toBe("JUNIOR");
  });

  it("does not mistake an ordinary class name that merely starts with F for a Form class", () => {
    expect(resolveReportCardLevel("GRADE_8", "Grade 8", "Falcons")).toBe("JUNIOR");
    expect(resolveReportCardLevel("GRADE_9", "Grade 9", "F")).toBe("JUNIOR");
  });

  it("keeps the report card document and the grading scale agreeing for Form classes (both Senior)", () => {
    expect(resolveECZLevel("GRADE_8", "Grade 8", "F1-A")).toBe("SENIOR");
    expect(resolveReportCardLevel("GRADE_8", "Grade 8", "F1-A")).toBe("SENIOR");
  });
});
