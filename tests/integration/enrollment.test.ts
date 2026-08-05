import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import prisma from "@/lib/db/prisma";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestStudent,
} from "../helpers/db";

describe("enrollment capacity race (TOCTOU regression)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("never lets two concurrent enrollments exceed a class's capacity", async () => {
    // Regression test for a real bug found and fixed this session:
    // createEnrollment used to check capacity and create the enrollment as
    // two separate, non-transactional steps, so two concurrent requests
    // could both read "under capacity" before either committed and over-fill
    // the class. It's now wrapped in a single prisma.$transaction.
    const { user } = await createTestUser({ role: Role.ADMIN });
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id, { capacity: 1 });
    const studentA = await createTestStudent({ firstName: "A" });
    const studentB = await createTestStudent({ firstName: "B" });

    const context = { userId: user.id, role: Role.ADMIN };

    const results = await Promise.allSettled([
      enrollmentService.createEnrollment(
        { studentId: studentA.id, classId: testClass.id, academicYearId: academicYear.id },
        context
      ),
      enrollmentService.createEnrollment(
        { studentId: studentB.id, classId: testClass.id, academicYearId: academicYear.id },
        context
      ),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const enrolledCount = await prisma.studentClassEnrollment.count({
      where: { classId: testClass.id, academicYearId: academicYear.id },
    });
    expect(enrolledCount).toBe(1);
    expect(enrolledCount).toBeLessThanOrEqual(testClass.capacity);
  });

  it("rejects enrolling the same student twice in the same academic year", async () => {
    const { user } = await createTestUser({ role: Role.ADMIN });
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id, { capacity: 40 });
    const student = await createTestStudent();
    const context = { userId: user.id, role: Role.ADMIN };

    await enrollmentService.createEnrollment(
      { studentId: student.id, classId: testClass.id, academicYearId: academicYear.id },
      context
    );

    await expect(
      enrollmentService.createEnrollment(
        { studentId: student.id, classId: testClass.id, academicYearId: academicYear.id },
        context
      )
    ).rejects.toThrow();
  });
});
