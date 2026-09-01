import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel } from "@prisma/client";
import { studentPromotionService } from "@/features/promotions/studentPromotion.service";
import { academicPolicyService } from "@/features/settings/academicPolicy.service";
import prisma from "@/lib/db/prisma";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
  createTestSubject,
  createTestClassSubject,
  createTestAssessment,
  createTestAssessmentResult,
  enrollTestStudent,
} from "../helpers/db";

describe("student promotions", () => {
  beforeEach(async () => {
    await resetDb();
    // Reachable with the small (2-subject) fixture classes below — the real
    // default policy expects 6 subjects, which these tests don't set up.
    await academicPolicyService.updatePolicy({
      secondary_min_subjects_passed: 1,
      secondary_max_subjects_failed: 1,
    });
  });

  async function setupSourceAndNextGrade() {
    const sourceGrade = await createTestGrade({ level: GradeLevel.GRADE_8, sequence: 8 });
    const nextGrade = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });
    await prisma.grade.update({ where: { id: sourceGrade.id }, data: { nextGradeId: nextGrade.id } });
    return { sourceGrade, nextGrade };
  }

  describe("evaluateClassForPromotion", () => {
    it("computes pass/fail counts against policy thresholds and resolves the same-letter destination class", async () => {
      const { user } = await createTestUser({ role: Role.ADMIN });
      const context = { userId: user.id, role: Role.ADMIN };

      const { sourceGrade, nextGrade } = await setupSourceAndNextGrade();
      const sourceClass = await createTestClass(sourceGrade.id, { name: "A" });
      const destinationClass = await createTestClass(nextGrade.id, { name: "A" });

      const academicYear = await createTestAcademicYear({ isActive: true });
      const term = await createTestTerm(academicYear.id, { isActive: true });

      const subjectOne = await createTestSubject();
      const subjectTwo = await createTestSubject();
      await createTestClassSubject(sourceClass.id, subjectOne.id);
      await createTestClassSubject(sourceClass.id, subjectTwo.id);

      const passingStudent = await createTestStudent({ firstName: "Pass" });
      const failingStudent = await createTestStudent({ firstName: "Fail" });
      await enrollTestStudent(passingStudent.id, sourceClass.id, academicYear.id);
      await enrollTestStudent(failingStudent.id, sourceClass.id, academicYear.id);

      const assessmentOne = await createTestAssessment(subjectOne.id, sourceClass.id, term.id, { examType: "EOT" });
      const assessmentTwo = await createTestAssessment(subjectTwo.id, sourceClass.id, term.id, { examType: "EOT" });

      // Passing student: both subjects well above the 40% pass mark.
      await createTestAssessmentResult(passingStudent.id, assessmentOne.id, 80);
      await createTestAssessmentResult(passingStudent.id, assessmentTwo.id, 85);
      // Failing student: both subjects well below it.
      await createTestAssessmentResult(failingStudent.id, assessmentOne.id, 20);
      await createTestAssessmentResult(failingStudent.id, assessmentTwo.id, 15);

      const result = await studentPromotionService.evaluateClassForPromotion(
        sourceClass.id,
        academicYear.id,
        context
      );

      expect(result.evaluations).toHaveLength(2);

      const passEval = result.evaluations.find((e) => e.studentId === passingStudent.id)!;
      expect(passEval.subjectsPassed).toBe(2);
      expect(passEval.subjectsFailed).toBe(0);
      expect(passEval.meetsCriteria).toBe(true);
      expect(passEval.suggestedNextClassId).toBe(destinationClass.id);

      const failEval = result.evaluations.find((e) => e.studentId === failingStudent.id)!;
      expect(failEval.subjectsPassed).toBe(0);
      expect(failEval.subjectsFailed).toBe(2);
      expect(failEval.meetsCriteria).toBe(false);
    });
  });

  describe("executePromotions", () => {
    it("PROMOTE creates an enrollment + PROMOTED audit record; a capacity-full target fails only that student", async () => {
      const { user } = await createTestUser({ role: Role.ADMIN });
      const context = { userId: user.id, role: Role.ADMIN };

      const { sourceGrade, nextGrade } = await setupSourceAndNextGrade();
      const sourceClass = await createTestClass(sourceGrade.id, { name: "A" });
      const destinationClass = await createTestClass(nextGrade.id, { name: "A", capacity: 1 });

      const sourceYear = await createTestAcademicYear({ year: 2026, isActive: true });
      const targetYear = await createTestAcademicYear({ year: 2027, isActive: false });

      const studentA = await createTestStudent({ firstName: "A" });
      const studentB = await createTestStudent({ firstName: "B" });
      await enrollTestStudent(studentA.id, sourceClass.id, sourceYear.id);
      await enrollTestStudent(studentB.id, sourceClass.id, sourceYear.id);

      const result = await studentPromotionService.executePromotions(
        {
          sourceClassId: sourceClass.id,
          targetAcademicYearId: targetYear.id,
          promotions: [
            { studentId: studentA.id, action: "PROMOTE", targetClassId: destinationClass.id },
            { studentId: studentB.id, action: "PROMOTE", targetClassId: destinationClass.id },
          ],
        },
        context
      );

      expect(result.successful).toBe(1);
      expect(result.failed).toHaveLength(1);

      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: { classId: destinationClass.id, academicYearId: targetYear.id },
      });
      expect(enrollments).toHaveLength(1);

      const promotionRecords = await prisma.studentPromotion.findMany({
        where: { academicYear: targetYear.year },
      });
      expect(promotionRecords).toHaveLength(1);
      expect(promotionRecords[0].status).toBe("PROMOTED");
      expect(promotionRecords[0].fromGradeLevel).toBe(sourceGrade.level);
      expect(promotionRecords[0].toGradeLevel).toBe(nextGrade.level);
    });

    it("GRADUATE marks the student GRADUATED and creates no enrollment", async () => {
      const { user } = await createTestUser({ role: Role.ADMIN });
      const context = { userId: user.id, role: Role.ADMIN };

      const { sourceGrade } = await setupSourceAndNextGrade();
      const sourceClass = await createTestClass(sourceGrade.id);
      const sourceYear = await createTestAcademicYear({ year: 2026, isActive: true });
      const targetYear = await createTestAcademicYear({ year: 2027, isActive: false });

      const student = await createTestStudent();
      await enrollTestStudent(student.id, sourceClass.id, sourceYear.id);

      const result = await studentPromotionService.executePromotions(
        {
          sourceClassId: sourceClass.id,
          targetAcademicYearId: targetYear.id,
          promotions: [{ studentId: student.id, action: "GRADUATE" }],
        },
        context
      );

      expect(result.successful).toBe(1);

      const updated = await prisma.student.findUnique({ where: { id: student.id } });
      expect(updated?.status).toBe("GRADUATED");

      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: { studentId: student.id, academicYearId: targetYear.id },
      });
      expect(enrollments).toHaveLength(0);
    });

    it("rejects with a clear error when the caller has no TeacherProfile", async () => {
      const { user } = await createTestUser({ role: Role.ADMIN });
      await prisma.teacherProfile.delete({ where: { userId: user.id } });
      const context = { userId: user.id, role: Role.ADMIN };

      const { sourceGrade } = await setupSourceAndNextGrade();
      const sourceClass = await createTestClass(sourceGrade.id);
      const targetYear = await createTestAcademicYear({ year: 2027, isActive: false });
      const student = await createTestStudent();

      await expect(
        studentPromotionService.executePromotions(
          {
            sourceClassId: sourceClass.id,
            targetAcademicYearId: targetYear.id,
            promotions: [{ studentId: student.id, action: "GRADUATE" }],
          },
          context
        )
      ).rejects.toThrow(/teacher profile/i);
    });
  });
});
