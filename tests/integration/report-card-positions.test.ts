import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { reportCardService } from "@/features/report-cards/reportCard.service";
import prisma from "@/lib/db/prisma";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
} from "../helpers/db";

describe("report card position calculation (N+1 / partial-write regression)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("assigns sequential positions 1..N ordered by averageMark, batched atomically", async () => {
    // Regression test for a real bug found and fixed this session:
    // calculateClassPositions used to update each report card's position in
    // a sequential awaited loop with no transaction — a failure partway
    // through left positions half-written. It now runs as one batched
    // $transaction.
    const { user, teacherProfile } = await createTestUser({ role: Role.TEACHER });
    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);

    const averages = [55, 90, 70, 40, 82];
    const reportCards = await Promise.all(
      averages.map(async (averageMark) => {
        const student = await createTestStudent();
        return prisma.reportCard.create({
          data: {
            studentId: student.id,
            classId: testClass.id,
            termId: term.id,
            academicYearId: academicYear.id,
            classTeacherId: teacherProfile!.id,
            averageMark,
          },
        });
      })
    );

    const context = { userId: user.id, role: Role.TEACHER };
    const result = await reportCardService.calculateClassPositions(testClass.id, term.id, context);

    expect(result.totalStudents).toBe(5);
    expect(result.updated).toBe(5);

    const updated = await prisma.reportCard.findMany({
      where: { id: { in: reportCards.map((rc) => rc.id) } },
      orderBy: { position: "asc" },
    });

    // Every card ranked 1..N with no gaps/duplicates, and outOf is correct everywhere.
    expect(updated.map((rc) => rc.position)).toEqual([1, 2, 3, 4, 5]);
    expect(updated.every((rc) => rc.outOf === 5)).toBe(true);

    // Highest average gets position 1, lowest gets position 5.
    const byPosition = new Map(updated.map((rc) => [rc.position, rc.averageMark]));
    expect(byPosition.get(1)).toBe(90);
    expect(byPosition.get(5)).toBe(40);
  });
});
