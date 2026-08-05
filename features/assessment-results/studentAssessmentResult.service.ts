import { studentAssessmentResultRepository, CreateAssessmentResultInput, UpdateAssessmentResultInput } from "./studentAssessmentResult.repository";
import { Prisma } from "@prisma/client";
import { Role } from "@/types/prisma-enums";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import prisma from "@/lib/db/prisma";
import { calculateECZGrade, mapPrismaGradeLevelToECZLevel } from "@/lib/grading/ecz-grading-system";

/**
 * Student Assessment Result Service Layer
 * Handles business logic and validation for student assessment results (marks/grades on exams)
 */

// Service context for authorization
export type ServiceContext = AuthContext;

export const studentAssessmentResultService = {
  /**
   * Create a new assessment result with validation
   * Only TEACHER and above can create grades
   */
  async createGrade(data: CreateAssessmentResultInput, context: ServiceContext) {
    // Authorization: Teachers and above can create grades
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to create grades"
    );

    // Business rule: Validate marks are within range
    if (data.marksObtained < 0 || data.marksObtained > 100) {
      throw new ValidationError("Marks must be between 0 and 100");
    }

    // Check if grade already exists for this student/assessment/subject combination
    const existing = await studentAssessmentResultRepository.findByStudentAssessmentSubject(
      data.studentId,
      data.assessmentId,
      data.subjectId
    );

    if (existing) {
      throw new ValidationError("Grade already exists for this student, assessment, and subject");
    }

    return await studentAssessmentResultRepository.create(data);
  },

  /**
   * Get all assessment results
   * All authenticated users can read grades
   */
  async getAllGrades(_context: ServiceContext) {
    return await studentAssessmentResultRepository.findAll();
  },

  /**
   * Get assessment result by ID
   * All authenticated users can read grades
   */
  async getGradeById(id: string, _context: ServiceContext) {
    const grade = await studentAssessmentResultRepository.findById(id);

    if (!grade) {
      throw new NotFoundError("Grade not found");
    }

    return grade;
  },

  /**
   * Get all assessment results for a student
   * All authenticated users can read grades
   */
  async getGradesByStudent(studentId: string, _context: ServiceContext) {
    return await studentAssessmentResultRepository.findByStudentId(studentId);
  },

  /**
   * Get all assessment results for an assessment
   * All authenticated users can read grades
   */
  async getGradesByAssessment(assessmentId: string, _context: ServiceContext) {
    return await studentAssessmentResultRepository.findByAssessmentId(assessmentId);
  },

  /**
   * Update an assessment result with validation
   * Only TEACHER and above can update grades
   */
  async updateGrade(id: string, data: UpdateAssessmentResultInput, context: ServiceContext) {
    // Authorization: Teachers and above can update grades
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to update grades"
    );

    // Check if grade exists
    const existing = await studentAssessmentResultRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Grade not found");
    }

    // Validate marks if provided
    if (data.marksObtained !== undefined) {
      if (data.marksObtained < 0 || data.marksObtained > 100) {
        throw new ValidationError("Marks must be between 0 and 100");
      }
    }

    return await studentAssessmentResultRepository.update(id, data);
  },

  /**
   * Delete an assessment result
   * Only ADMIN can delete grades
   */
  async deleteGrade(id: string, context: ServiceContext) {
    // Authorization: Only ADMIN can delete grades
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can delete grades"
    );

    // Check if grade exists
    const existing = await studentAssessmentResultRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Grade not found");
    }

    return await studentAssessmentResultRepository.delete(id);
  },

  /**
   * Bulk create assessment results for an assessment
   * Only TEACHER and above can bulk create grades
   */
  async bulkCreateGrades(grades: CreateAssessmentResultInput[], context: ServiceContext) {
    // Authorization: Teachers and above can bulk create grades
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to create grades"
    );

    const results = [];
    const errors = [];

    for (const gradeData of grades) {
      try {
        const result = await this.createGrade(gradeData, context);
        results.push(result);
      } catch (error) {
        errors.push({
          studentId: gradeData.studentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    };
  },

  /**
   * Calculate class average for an assessment
   */
  async getClassAverage(assessmentId: string) {
    const grades = await studentAssessmentResultRepository.findByAssessmentId(assessmentId);

    if (grades.length === 0) {
      return {
        average: 0,
        totalStudents: 0,
        gradedStudents: 0,
      };
    }

    const total = grades.reduce((sum, grade) => sum + grade.marksObtained, 0);
    const average = total / grades.length;

    return {
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
      totalStudents: grades.length,
      gradedStudents: grades.length,
    };
  },

  /**
   * Get grade distribution for an assessment
   */
  async getGradeDistribution(assessmentId: string) {
    const grades = await studentAssessmentResultRepository.findByAssessmentId(assessmentId);

    const distribution = {
      GRADE_1: 0, // 80-100
      GRADE_2: 0, // 70-79
      GRADE_3: 0, // 60-69
      GRADE_4: 0, // 50-59
      GRADE_5: 0, // 40-49
      GRADE_6: 0, // 30-39
      GRADE_7: 0, // 20-29
      GRADE_8: 0, // 10-19
      GRADE_9: 0, // 0-9
    };

    grades.forEach((grade) => {
      const marks = grade.marksObtained;
      if (marks >= 80) distribution.GRADE_1++;
      else if (marks >= 70) distribution.GRADE_2++;
      else if (marks >= 60) distribution.GRADE_3++;
      else if (marks >= 50) distribution.GRADE_4++;
      else if (marks >= 40) distribution.GRADE_5++;
      else if (marks >= 30) distribution.GRADE_6++;
      else if (marks >= 20) distribution.GRADE_7++;
      else if (marks >= 10) distribution.GRADE_8++;
      else distribution.GRADE_9++;
    });

    return distribution;
  },

  /**
   * Maintenance operation: recalculate and fix any assessment result whose
   * stored grade doesn't match what the ECZ grading rules would produce.
   * ADMIN only.
   */
  async fixGrades(context: ServiceContext) {
    requireMinimumRole(context, Role.ADMIN, "Only administrators can fix grades");

    const results = await prisma.studentAssessmentResult.findMany({
      include: {
        assessment: { include: { class: { include: { grade: true } } } },
      },
    });

    let updatedCount = 0;
    let unchangedCount = 0;
    const errors: Array<{ resultId: string; error: string }> = [];
    const updates: Array<{
      studentId: string;
      assessmentType: string;
      subject: string;
      oldGrade: string;
      newGrade: string;
      percentage: string;
    }> = [];

    for (const result of results) {
      try {
        const { assessment } = result;

        if (!assessment.class || !assessment.class.grade) {
          errors.push({ resultId: result.id, error: "Missing class or grade information" });
          continue;
        }

        const percentage = (result.marksObtained! / assessment.totalMarks) * 100;
        const gradeLevel = mapPrismaGradeLevelToECZLevel(assessment.class.grade.level);
        const correctGrade = calculateECZGrade(percentage, gradeLevel);

        if (result.grade !== correctGrade) {
          await prisma.studentAssessmentResult.update({
            where: { id: result.id },
            data: { grade: correctGrade },
          });

          updates.push({
            studentId: result.studentId,
            assessmentType: assessment.examType,
            subject: assessment.subjectId,
            oldGrade: result.grade || "NULL",
            newGrade: correctGrade,
            percentage: percentage.toFixed(1),
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (err) {
        errors.push({
          resultId: result.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      summary: {
        totalChecked: results.length,
        updated: updatedCount,
        unchanged: unchangedCount,
        errors: errors.length,
      },
      updates,
      errors,
    };
  },
};
