import { ClassTimetable, DayOfWeek } from "@/types/prisma-enums";
import { classTimetableRepository } from "./classTimetable.repository";
import prisma from "@/lib/db/prisma";

/**
 * ClassTimetable Service - PRIMARY SCHOOL (Grades 1-7)
 *
 * Business logic for primary school timetabling where:
 * - One class teacher handles most subjects
 * - Specialist teachers (ICT, PE, Art) are optional
 * - Timetable rarely changes during term
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

export interface CreateTimetableEntryInput {
  classId: string;
  academicYearId: string;
  termId: string;
  dayOfWeek: DayOfWeek;
  timeSlotId: string;
  subjectId: string;
  teacherId?: string; // Optional for primary
}

export class ClassTimetableService {
  /**
   * Check if user can manage timetables
   */
  private canManageTimetable(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role);
  }

  /**
   * Validate class is PRIMARY level
   */
  private async validatePrimaryClass(classId: string): Promise<void> {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });

    if (!classData) {
      throw new NotFoundError("Class not found");
    }

    if (classData.grade.schoolLevel !== "PRIMARY") {
      throw new ValidationError(
        "ClassTimetable is only for PRIMARY schools (Grades 1-7). Use SecondaryTimetable for Grades 8-12"
      );
    }
  }

  /**
   * Validate teacher is qualified for subject (if teacher specified)
   */
  private async validateTeacherQualification(
    teacherId: string,
    subjectId: string
  ): Promise<void> {
    const qualification = await prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId,
      },
    });

    if (!qualification) {
      throw new ValidationError(
        "Teacher is not qualified to teach this subject. Add qualification in TeacherSubject first."
      );
    }
  }

  /**
   * Validate all references exist
   */
  private async validateReferences(data: CreateTimetableEntryInput): Promise<void> {
    const [classExists, yearExists, termExists, slotExists, subjectExists] =
      await Promise.all([
        prisma.class.findUnique({ where: { id: data.classId } }),
        prisma.academicYear.findUnique({ where: { id: data.academicYearId } }),
        prisma.term.findUnique({ where: { id: data.termId } }),
        prisma.timeSlot.findUnique({ where: { id: data.timeSlotId } }),
        prisma.subject.findUnique({ where: { id: data.subjectId } }),
      ]);

    if (!classExists) throw new NotFoundError("Class not found");
    if (!yearExists) throw new NotFoundError("Academic year not found");
    if (!termExists) throw new NotFoundError("Term not found");
    if (!slotExists) throw new NotFoundError("Time slot not found");
    if (!subjectExists) throw new NotFoundError("Subject not found");

    if (data.teacherId) {
      const teacherExists = await prisma.teacherProfile.findUnique({
        where: { id: data.teacherId },
      });
      if (!teacherExists) throw new NotFoundError("Teacher not found");
    }
  }

  /**
   * Create timetable entry
   */
  async createTimetableEntry(
    data: CreateTimetableEntryInput,
    context: ServiceContext
  ): Promise<ClassTimetable> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    // Validate references
    await this.validateReferences(data);

    // Validate PRIMARY class
    await this.validatePrimaryClass(data.classId);

    // Validate teacher qualification if teacher specified
    if (data.teacherId) {
      await this.validateTeacherQualification(data.teacherId, data.subjectId);
    }

    // Create entry (repository handles duplicate prevention)
    return classTimetableRepository.create({
      class: { connect: { id: data.classId } },
      academicYear: { connect: { id: data.academicYearId } },
      term: { connect: { id: data.termId } },
      timeSlot: { connect: { id: data.timeSlotId } },
      subject: { connect: { id: data.subjectId } },
      ...(data.teacherId && {
        teacher: { connect: { id: data.teacherId } },
      }),
      dayOfWeek: data.dayOfWeek,
    });
  }

  /**
   * Get class timetable for a term
   */
  async getClassTimetable(
    classId: string,
    termId: string
  ): Promise<ClassTimetable[]> {
    return classTimetableRepository.findByClassAndTerm(classId, termId);
  }

  /**
   * Get timetable for specific day
   */
  async getClassTimetableForDay(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<ClassTimetable[]> {
    return classTimetableRepository.findByClassTermAndDay(classId, termId, dayOfWeek);
  }

  /**
   * Get teacher's timetable (for specialist teachers)
   */
  async getTeacherTimetable(
    teacherId: string,
    termId: string
  ): Promise<ClassTimetable[]> {
    return classTimetableRepository.findByTeacherAndTerm(teacherId, termId);
  }

  /**
   * Update timetable entry
   */
  async updateTimetableEntry(
    id: string,
    data: Partial<CreateTimetableEntryInput>,
    context: ServiceContext
  ): Promise<ClassTimetable> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    // Validate entry exists
    const existing = await classTimetableRepository.findUnique(
      id,
      data.termId || "",
      data.dayOfWeek || "MONDAY",
      data.timeSlotId || ""
    );

    if (!existing) {
      throw new NotFoundError("Timetable entry not found");
    }

    // Validate teacher qualification if updating teacher
    if (data.teacherId && data.subjectId) {
      await this.validateTeacherQualification(data.teacherId, data.subjectId);
    }

    return classTimetableRepository.update(id, data);
  }

  /**
   * Delete timetable entry
   */
  async deleteTimetableEntry(id: string, context: ServiceContext): Promise<void> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    await classTimetableRepository.delete(id);
  }

  /**
   * Delete entire class timetable for a term
   */
  async deleteClassTimetable(
    classId: string,
    termId: string,
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    return classTimetableRepository.deleteByClassAndTerm(classId, termId);
  }

  /**
   * Bulk create timetable (transaction-safe)
   */
  async bulkCreateTimetable(
    entries: CreateTimetableEntryInput[],
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    // Validate first entry's class is PRIMARY
    if (entries.length > 0) {
      await this.validatePrimaryClass(entries[0].classId);
    }

    // Validate all teacher qualifications
    for (const entry of entries) {
      if (entry.teacherId) {
        await this.validateTeacherQualification(entry.teacherId, entry.subjectId);
      }
    }

    // Convert to Prisma format
    const prismaEntries = entries.map((entry) => ({
      classId: entry.classId,
      academicYearId: entry.academicYearId,
      termId: entry.termId,
      dayOfWeek: entry.dayOfWeek,
      timeSlotId: entry.timeSlotId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
    }));

    return classTimetableRepository.bulkCreate(prismaEntries);
  }

  /**
   * Copy timetable from one term to another
   */
  async copyTimetable(
    sourceClassId: string,
    sourceTermId: string,
    targetClassId: string,
    targetTermId: string,
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!this.canManageTimetable(context)) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, or DEPUTY_HEAD can manage timetables"
      );
    }

    // Validate both classes are PRIMARY
    await this.validatePrimaryClass(sourceClassId);
    await this.validatePrimaryClass(targetClassId);

    return classTimetableRepository.copyTimetable(
      sourceClassId,
      sourceTermId,
      targetClassId,
      targetTermId
    );
  }

  /**
   * Get timetable statistics
   */
  async getTimetableStats(classId: string, termId: string) {
    const entries = await this.getClassTimetable(classId, termId);

    const stats = {
      totalEntries: entries.length,
      byDay: {
        MONDAY: 0,
        TUESDAY: 0,
        WEDNESDAY: 0,
        THURSDAY: 0,
        FRIDAY: 0,
      },
      subjects: new Set<string>(),
      teachers: new Set<string>(),
    };

    entries.forEach((entry) => {
      stats.byDay[entry.dayOfWeek]++;
      stats.subjects.add(entry.subjectId);
      if (entry.teacherId) {
        stats.teachers.add(entry.teacherId);
      }
    });

    return {
      ...stats,
      uniqueSubjects: stats.subjects.size,
      uniqueTeachers: stats.teachers.size,
    };
  }
}

export const classTimetableService = new ClassTimetableService();
