import prisma from "@/lib/db/prisma";
import { Prisma, ECZGrade } from "@prisma/client";

/**
 * Student Assessment Result Repository
 * Handles all database operations for student assessment results (marks/grades on exams)
 */

export type CreateAssessmentResultInput = {
  studentId: string;
  assessmentId: string;
  subjectId: string;
  marksObtained: number;
  isAbsent?: boolean;
  grade?: ECZGrade;
  remarks?: string;
};

export type UpdateAssessmentResultInput = Partial<Omit<CreateAssessmentResultInput, "studentId" | "assessmentId">>;

export const studentAssessmentResultRepository = {
  /**
   * Create a new assessment result record
   */
  async create(data: CreateAssessmentResultInput) {
    return await prisma.studentAssessmentResult.create({
      data,
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            totalMarks: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find all grades
   */
  async findAll() {
    return await prisma.studentAssessmentResult.findMany({
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find grade by ID
   */
  async findById(id: string) {
    return await prisma.studentAssessmentResult.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            totalMarks: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find grades by student ID
   */
  async findByStudentId(studentId: string) {
    return await prisma.studentAssessmentResult.findMany({
      where: { studentId },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            totalMarks: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find grades by assessment ID
   */
  async findByAssessmentId(assessmentId: string) {
    return await prisma.studentAssessmentResult.findMany({
      where: { assessmentId },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Update an assessment result record
   */
  async update(id: string, data: UpdateAssessmentResultInput) {
    return await prisma.studentAssessmentResult.update({
      where: { id },
      data,
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Delete a grade record
   */
  async delete(id: string) {
    return await prisma.studentAssessmentResult.delete({
      where: { id },
    });
  },

  /**
   * Find result by student and assessment (unique constraint)
   */
  async findUnique(studentId: string, assessmentId: string) {
    return await prisma.studentAssessmentResult.findUnique({
      where: {
        studentId_assessmentId: {
          studentId,
          assessmentId,
        },
      },
    });
  },

  /**
   * Find result by student, assessment, and subject
   */
  async findByStudentAssessmentSubject(studentId: string, assessmentId: string, subjectId: string) {
    return await prisma.studentAssessmentResult.findFirst({
      where: {
        studentId,
        assessmentId,
        subjectId,
      },
    });
  },
};
