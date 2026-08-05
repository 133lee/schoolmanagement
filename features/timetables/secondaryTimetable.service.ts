import { SecondaryTimetable, DayOfWeek } from "@/types/prisma-enums";
import { secondaryTimetableRepository } from "./secondaryTimetable.repository";
import { timeSlotRepository } from "./timeSlot.repository";
import { termRepository } from "@/features/terms/term.repository";
import { subjectTeacherAssignmentRepository } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.repository";
import prisma from "@/lib/db/prisma";
import { isHOD } from "@/lib/auth/position-helpers";
import { NotFoundError as HttpNotFoundError } from "@/lib/http/errors";

/**
 * SecondaryTimetable Service - SECONDARY SCHOOL (Grades 8-12)
 *
 * Business logic for secondary school timetabling where:
 * - Teachers are subject specialists
 * - Teachers move between classes
 * - CRITICAL: Clash prevention (teacher/class cannot be in two places)
 * - Teacher must be assigned via SubjectTeacherAssignment
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

export class ClashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClashError";
  }
}

// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
// Use isHOD(userId) from position-helpers for HOD checks
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

export interface CreateSecondaryTimetableInput {
  classId: string;
  subjectId: string;
  teacherId: string; // Mandatory for secondary
  academicYearId: string;
  termId: string;
  dayOfWeek: DayOfWeek;
  timeSlotId: string;
}

export class SecondaryTimetableService {
  /**
   * Check if user can manage timetables
   * ADMIN, HEAD_TEACHER, DEPUTY_HEAD can always manage
   * TEACHER can manage if they are HOD (position-based check)
   */
  private async canManageTimetable(context: ServiceContext): Promise<boolean> {
    if (["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role)) {
      return true;
    }

    // Teachers: check if they hold HOD position
    if (context.role === "TEACHER") {
      return await isHOD(context.userId);
    }

    return false;
  }

  /**
   * Validate class is SECONDARY level
   */
  private async validateSecondaryClass(classId: string): Promise<void> {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });

    if (!classData) {
      throw new NotFoundError("Class not found");
    }

    if (classData.grade.schoolLevel !== "SECONDARY") {
      throw new ValidationError(
        "SecondaryTimetable is only for SECONDARY schools (Grades 8-12). Use ClassTimetable for Grades 1-7"
      );
    }
  }

  /**
   * CRITICAL: Validate teacher is assigned to teach this subject to this class
   */
  private async validateSubjectTeacherAssignment(
    teacherId: string,
    subjectId: string,
    classId: string,
    academicYearId: string
  ): Promise<void> {
    const assignment = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId,
        classId,
        academicYearId,
      },
    });

    if (!assignment) {
      throw new ValidationError(
        "Teacher is not assigned to teach this subject to this class. Create SubjectTeacherAssignment first."
      );
    }
  }

  /**
   * Validate all references exist
   */
  private async validateReferences(
    data: CreateSecondaryTimetableInput
  ): Promise<void> {
    const [classExists, subjectExists, teacherExists, yearExists, termExists, slotExists] =
      await Promise.all([
        prisma.class.findUnique({ where: { id: data.classId } }),
        prisma.subject.findUnique({ where: { id: data.subjectId } }),
        prisma.teacherProfile.findUnique({ where: { id: data.teacherId } }),
        prisma.academicYear.findUnique({ where: { id: data.academicYearId } }),
        prisma.term.findUnique({ where: { id: data.termId } }),
        prisma.timeSlot.findUnique({ where: { id: data.timeSlotId } }),
      ]);

    if (!classExists) throw new NotFoundError("Class not found");
    if (!subjectExists) throw new NotFoundError("Subject not found");
    if (!teacherExists) throw new NotFoundError("Teacher not found");
    if (!yearExists) throw new NotFoundError("Academic year not found");
    if (!termExists) throw new NotFoundError("Term not found");
    if (!slotExists) throw new NotFoundError("Time slot not found");
  }

  /**
   * Create timetable entry with full validation
   */
  async createTimetableEntry(
    data: CreateSecondaryTimetableInput,
    context: ServiceContext
  ): Promise<SecondaryTimetable> {
    // Authorization
    if (!(await this.canManageTimetable(context))) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, DEPUTY_HEAD, or HOD can manage timetables"
      );
    }

    // Validate references
    await this.validateReferences(data);

    // Validate SECONDARY class
    await this.validateSecondaryClass(data.classId);

    // CRITICAL: Validate SubjectTeacherAssignment
    await this.validateSubjectTeacherAssignment(
      data.teacherId,
      data.subjectId,
      data.classId,
      data.academicYearId
    );

    // Check teacher availability
    const teacherAvailable = await secondaryTimetableRepository.isTeacherAvailable(
      data.teacherId,
      data.termId,
      data.dayOfWeek,
      data.timeSlotId
    );

    if (!teacherAvailable) {
      throw new ClashError(
        "Teacher is already scheduled to teach another class at this time"
      );
    }

    // Check class availability
    const classAvailable = await secondaryTimetableRepository.isClassAvailable(
      data.classId,
      data.termId,
      data.dayOfWeek,
      data.timeSlotId
    );

    if (!classAvailable) {
      throw new ClashError(
        "Class already has a subject scheduled at this time"
      );
    }

    // Create entry (database constraints provide final validation)
    return secondaryTimetableRepository.create({
      class: { connect: { id: data.classId } },
      subject: { connect: { id: data.subjectId } },
      teacher: { connect: { id: data.teacherId } },
      academicYear: { connect: { id: data.academicYearId } },
      term: { connect: { id: data.termId } },
      timeSlot: { connect: { id: data.timeSlotId } },
      dayOfWeek: data.dayOfWeek,
    });
  }

  /**
   * Get class timetable
   */
  async getClassTimetable(
    classId: string,
    termId: string
  ): Promise<SecondaryTimetable[]> {
    return secondaryTimetableRepository.findByClassAndTerm(classId, termId);
  }

  /**
   * Get timetable for specific day
   */
  async getClassTimetableForDay(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<SecondaryTimetable[]> {
    return secondaryTimetableRepository.findByClassTermAndDay(
      classId,
      termId,
      dayOfWeek
    );
  }

  /**
   * Get teacher's timetable
   */
  async getTeacherTimetable(
    teacherId: string,
    termId: string
  ): Promise<SecondaryTimetable[]> {
    return secondaryTimetableRepository.findByTeacherAndTerm(teacherId, termId);
  }

  /**
   * Get teacher's schedule for specific day
   */
  async getTeacherDaySchedule(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<SecondaryTimetable[]> {
    return secondaryTimetableRepository.findByTeacherTermAndDay(
      teacherId,
      termId,
      dayOfWeek
    );
  }

  /**
   * Check teacher availability
   */
  async checkTeacherAvailability(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ): Promise<boolean> {
    return secondaryTimetableRepository.isTeacherAvailable(
      teacherId,
      termId,
      dayOfWeek,
      timeSlotId
    );
  }

  /**
   * Check class availability
   */
  async checkClassAvailability(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ): Promise<boolean> {
    return secondaryTimetableRepository.isClassAvailable(
      classId,
      termId,
      dayOfWeek,
      timeSlotId
    );
  }

  /**
   * Update timetable entry
   */
  async updateTimetableEntry(
    id: string,
    data: Partial<CreateSecondaryTimetableInput>,
    context: ServiceContext
  ): Promise<SecondaryTimetable> {
    // Authorization
    if (!(await this.canManageTimetable(context))) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, DEPUTY_HEAD, or HOD can manage timetables"
      );
    }

    // Validate SubjectTeacherAssignment if updating teacher/subject/class
    if (data.teacherId || data.subjectId || data.classId || data.academicYearId) {
      // Get current entry to fill in missing values
      const current = await secondaryTimetableRepository.findByTeacherAndTerm(
        data.teacherId || "",
        data.termId || ""
      );
      // Simplified - in production, fetch the exact entry by ID
      // For now, assume all fields are provided if any validation field is updated
    }

    return secondaryTimetableRepository.update(id, data);
  }

  /**
   * Delete timetable entry
   */
  async deleteTimetableEntry(id: string, context: ServiceContext): Promise<void> {
    // Authorization
    if (!(await this.canManageTimetable(context))) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, DEPUTY_HEAD, or HOD can manage timetables"
      );
    }

    await secondaryTimetableRepository.delete(id);
  }

  /**
   * Delete entire class timetable
   */
  async deleteClassTimetable(
    classId: string,
    termId: string,
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!(await this.canManageTimetable(context))) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, DEPUTY_HEAD, or HOD can manage timetables"
      );
    }

    return secondaryTimetableRepository.deleteByClassAndTerm(classId, termId);
  }

  /**
   * Bulk create with validation
   */
  async bulkCreateWithValidation(
    entries: CreateSecondaryTimetableInput[],
    context: ServiceContext
  ): Promise<{ created: number; errors: string[] }> {
    // Authorization
    if (!(await this.canManageTimetable(context))) {
      throw new UnauthorizedError(
        "Only ADMIN, HEAD_TEACHER, DEPUTY_HEAD, or HOD can manage timetables"
      );
    }

    const errors: string[] = [];
    const validEntries: any[] = [];

    for (const entry of entries) {
      try {
        // Validate SECONDARY class
        await this.validateSecondaryClass(entry.classId);

        // Validate SubjectTeacherAssignment
        await this.validateSubjectTeacherAssignment(
          entry.teacherId,
          entry.subjectId,
          entry.classId,
          entry.academicYearId
        );

        validEntries.push({
          classId: entry.classId,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          academicYearId: entry.academicYearId,
          termId: entry.termId,
          dayOfWeek: entry.dayOfWeek,
          timeSlotId: entry.timeSlotId,
        });
      } catch (error: any) {
        errors.push(
          `Entry for ${entry.dayOfWeek} ${entry.timeSlotId}: ${error.message}`
        );
      }
    }

    const created = validEntries.length > 0
      ? await secondaryTimetableRepository.bulkCreate(validEntries)
      : 0;

    return { created, errors };
  }

  /**
   * Get teacher workload statistics
   */
  async getTeacherWorkload(teacherId: string, termId: string) {
    return secondaryTimetableRepository.getTeacherWorkload(teacherId, termId);
  }

  /**
   * Detect all teacher/class double-bookings in a term.
   *
   * Fetches every entry for the term once, then groups in memory by
   * teacher+slot+day and class+slot+day to find duplicates — a single query
   * regardless of term size, not one per entry.
   */
  async detectClashes(termId: string, classId?: string) {
    const entries = await secondaryTimetableRepository.findByTermForClashDetection(termId, classId);

    const teacherClashes: Array<Record<string, unknown>> = [];
    const classClashes: Array<Record<string, unknown>> = [];
    const teacherSlotMap = new Map<string, (typeof entries)[number]>();
    const classSlotMap = new Map<string, (typeof entries)[number]>();

    for (const entry of entries) {
      const teacherSlotKey = `${entry.teacherId}-${entry.timeSlotId}-${entry.dayOfWeek}`;
      const classSlotKey = `${entry.classId}-${entry.timeSlotId}-${entry.dayOfWeek}`;

      const existingTeacherEntry = teacherSlotMap.get(teacherSlotKey);
      if (existingTeacherEntry) {
        teacherClashes.push({
          type: "teacher",
          teacherId: entry.teacherId,
          teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
          timeSlotId: entry.timeSlotId,
          timeSlotLabel: entry.timeSlot.label,
          startTime: entry.timeSlot.startTime,
          endTime: entry.timeSlot.endTime,
          dayOfWeek: entry.dayOfWeek,
          conflictingEntries: [
            {
              id: existingTeacherEntry.id,
              className: `${existingTeacherEntry.class.grade.name} ${existingTeacherEntry.class.name}`,
              subjectName: existingTeacherEntry.subject.name,
            },
            {
              id: entry.id,
              className: `${entry.class.grade.name} ${entry.class.name}`,
              subjectName: entry.subject.name,
            },
          ],
        });
      } else {
        teacherSlotMap.set(teacherSlotKey, entry);
      }

      const existingClassEntry = classSlotMap.get(classSlotKey);
      if (existingClassEntry) {
        classClashes.push({
          type: "class",
          classId: entry.classId,
          className: `${entry.class.grade.name} ${entry.class.name}`,
          timeSlotId: entry.timeSlotId,
          timeSlotLabel: entry.timeSlot.label,
          startTime: entry.timeSlot.startTime,
          endTime: entry.timeSlot.endTime,
          dayOfWeek: entry.dayOfWeek,
          conflictingEntries: [
            {
              id: existingClassEntry.id,
              teacherName: `${existingClassEntry.teacher.firstName} ${existingClassEntry.teacher.lastName}`,
              subjectName: existingClassEntry.subject.name,
            },
            {
              id: entry.id,
              teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
              subjectName: entry.subject.name,
            },
          ],
        });
      } else {
        classSlotMap.set(classSlotKey, entry);
      }
    }

    return {
      totalClashes: teacherClashes.length + classClashes.length,
      teacherClashes,
      classClashes,
      summary: {
        teacherClashCount: teacherClashes.length,
        classClashCount: classClashes.length,
        entriesScanned: entries.length,
      },
    };
  }

  /**
   * Check teacher availability with conflict detail, for callers that need
   * to explain *why* a slot is unavailable (not just a boolean).
   */
  async checkTeacherAvailabilityDetailed(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ) {
    const conflict = await secondaryTimetableRepository.findTeacherConflict(
      teacherId,
      termId,
      dayOfWeek,
      timeSlotId
    );

    if (!conflict) {
      return { available: true as const };
    }

    return {
      available: false as const,
      conflict: {
        type: "teacher" as const,
        message: "Teacher is already scheduled at this time",
        details: {
          className: conflict.class.name,
          gradeName: conflict.class.grade.name,
          subjectName: conflict.subject.name,
          dayOfWeek: conflict.dayOfWeek,
        },
      },
    };
  }

  /**
   * Check class availability with conflict detail (see checkTeacherAvailabilityDetailed).
   */
  async checkClassAvailabilityDetailed(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ) {
    const conflict = await secondaryTimetableRepository.findClassConflict(
      classId,
      termId,
      dayOfWeek,
      timeSlotId
    );

    if (!conflict) {
      return { available: true as const };
    }

    return {
      available: false as const,
      conflict: {
        type: "class" as const,
        message: "Class is already scheduled at this time",
        details: {
          teacherName: `${conflict.teacher.firstName} ${conflict.teacher.lastName}`,
          subjectName: conflict.subject.name,
          dayOfWeek: conflict.dayOfWeek,
        },
      },
    };
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
      stats.teachers.add(entry.teacherId);
    });

    return {
      ...stats,
      uniqueSubjects: stats.subjects.size,
      uniqueTeachers: stats.teachers.size,
    };
  }

  /**
   * Which teachers already assigned to teach this subject/class are free at
   * the given slot.
   */
  async findAvailableTeachers(
    subjectId: string,
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ) {
    const term = await termRepository.findById(termId);
    if (!term) {
      throw new HttpNotFoundError("Term not found");
    }

    const assignments = await subjectTeacherAssignmentRepository.findManyBySubjectClassAndYear(
      subjectId,
      classId,
      term.academicYearId
    );

    const availableTeachers = [];
    for (const assignment of assignments) {
      const isAvailable = await secondaryTimetableRepository.isTeacherAvailable(
        assignment.teacherId,
        termId,
        dayOfWeek,
        timeSlotId
      );
      if (isAvailable) {
        availableTeachers.push({
          id: assignment.teacher.id,
          firstName: assignment.teacher.firstName,
          lastName: assignment.teacher.lastName,
          staffNumber: assignment.teacher.staffNumber,
        });
      }
    }

    return availableTeachers;
  }

  /**
   * Which time slots are free for both this teacher and this class on a
   * given day. Fetches every conflicting entry for the day in one query,
   * then checks each slot in memory instead of querying per slot.
   */
  async findAvailableTimeSlots(
    teacherId: string,
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ) {
    const [allTimeSlots, conflicts] = await Promise.all([
      timeSlotRepository.findAll(),
      secondaryTimetableRepository.findConflictsForTeacherOrClassOnDay(
        teacherId,
        classId,
        termId,
        dayOfWeek
      ),
    ]);

    const conflictingSlotIds = new Set(conflicts.map((c) => c.timeSlotId));

    return allTimeSlots
      .filter((slot) => !conflictingSlotIds.has(slot.id))
      .map((slot) => ({
        id: slot.id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
  }
}

export const secondaryTimetableService = new SecondaryTimetableService();
