import { DayOfWeek, TimetableConfiguration, TimetableSlot } from "@/types/prisma-enums";
type Room = any; // Room model not yet in schema
import { roomRepository } from "./room.repository";
import { timetableConfigurationRepository } from "./timetableConfiguration.repository";
import { timetableSlotRepository } from "./timetableSlot.repository";
import prisma from "@/lib/db/prisma";
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { isHOD } from "@/lib/auth/position-helpers";
import { solve, toTimetableSlotEntries, generateReport, PeriodSlot, DoublePeriodConfig } from "./solver";
import { logger } from "@/lib/logger/logger";

/**
 * Timetable Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for timetable operations.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
// Use isHOD(userId) from position-helpers for HOD checks
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
  teacherProfileId?: string;
}

// DTOs
export interface CreateRoomInput {
  name: string;
  code?: string;
  type?: string;
  capacity?: number;
  building?: string;
  floor?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoomInput {
  name?: string;
  code?: string;
  type?: string;
  capacity?: number;
  building?: string;
  floor?: string;
  description?: string;
  isActive?: boolean;
}

export interface TimetableConfigInput {
  academicYearId: string;
  termId?: string;
  schoolStartTime: string;
  periodDuration: number;
  breakStartPeriod: number;
  breakDuration: number;
  periodsBeforeBreak: number;
  periodsAfterBreak: number;
  totalPeriods: number;
  allowSubjectPreferences?: boolean;
  allowTeacherPreferences?: boolean;
  autoAssignRooms?: boolean;
  doublePeriodConfigs?: DoublePeriodConfig[];
}

export interface TeacherAssignment {
  teacherId: string;
  subjectId: string;
  classId: string;
  className: string;
  subjectName: string;
  teacherName: string;
}

export interface ConflictInfo {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  reason: string;
}

export interface GenerationResult {
  slotsGenerated: number;
  conflicts: ConflictInfo[];
  stats: {
    totalAssignments: number;
    slotsGenerated: number;
    conflicts: number;
    successRate: number;
  };
}

const DAYS_OF_WEEK: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export class TimetableService {
  // ==================== PERMISSION CHECKS ====================

  private canManageRooms(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  private canConfigureTimetable(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  private canGenerateTimetable(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can view all timetables
   * ADMIN, HEAD_TEACHER, DEPUTY_HEAD can always view
   * TEACHER can view if they are HOD (position-based check)
   */
  private async canViewAllTimetables(context: ServiceContext): Promise<boolean> {
    if (["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role)) {
      return true;
    }

    // Teachers: check if they hold HOD position
    if (context.role === "TEACHER") {
      return await isHOD(context.userId);
    }

    return false;
  }

  // ==================== ROOM MANAGEMENT ====================

  async createRoom(input: CreateRoomInput, context: ServiceContext): Promise<Room> {
    if (!this.canManageRooms(context)) {
      throw new UnauthorizedError("Only admins and head teachers can create rooms");
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("Room name is required");
    }

    // Check for duplicate name
    const existingByName = await roomRepository.findByName(input.name);
    if (existingByName) {
      throw new ConflictError("A room with this name already exists");
    }

    // Check for duplicate code if provided
    if (input.code) {
      const existingByCode = await roomRepository.findByCode(input.code);
      if (existingByCode) {
        throw new ConflictError("A room with this code already exists");
      }
    }

    return roomRepository.create({
      name: input.name,
      code: input.code,
      type: input.type as any || "REGULAR_CLASSROOM",
      capacity: input.capacity,
      building: input.building,
      floor: input.floor,
      description: input.description,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });
  }

  async updateRoom(
    roomId: string,
    input: UpdateRoomInput,
    context: ServiceContext
  ): Promise<Room> {
    if (!this.canManageRooms(context)) {
      throw new UnauthorizedError("Only admins and head teachers can update rooms");
    }

    const existing = await roomRepository.findById(roomId);
    if (!existing) {
      throw new NotFoundError("Room not found");
    }

    // Check for duplicate name if changing
    if (input.name && input.name !== existing.name) {
      const duplicate = await roomRepository.findByName(input.name);
      if (duplicate) {
        throw new ConflictError("A room with this name already exists");
      }
    }

    // Check for duplicate code if changing
    if (input.code && input.code !== existing.code) {
      const duplicate = await roomRepository.findByCode(input.code);
      if (duplicate) {
        throw new ConflictError("A room with this code already exists");
      }
    }

    return roomRepository.update(roomId, {
      ...(input.name && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.type && { type: input.type as any }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.building !== undefined && { building: input.building }),
      ...(input.floor !== undefined && { floor: input.floor }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
  }

  async deleteRoom(roomId: string, context: ServiceContext): Promise<void> {
    if (!this.canManageRooms(context)) {
      throw new UnauthorizedError("Only admins and head teachers can delete rooms");
    }

    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if room has timetable slots
    const hasSlots = await roomRepository.hasTimeTableSlots(roomId);
    if (hasSlots) {
      throw new ConflictError(
        "Cannot delete room with existing timetable slots. Please remove the timetable slots first or mark the room as inactive."
      );
    }

    await roomRepository.delete(roomId);
  }

  async getRooms(context: ServiceContext, filters?: { isActive?: boolean; type?: string }) {
    const where: any = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.type) {
      where.type = filters.type;
    }

    return roomRepository.findMany({
      where,
      include: {
        _count: {
          select: {
            timetableSlots: true,
          },
        },
      },
    });
  }

  async getRoomById(roomId: string, context: ServiceContext) {
    const room = await roomRepository.findByIdWithRelations(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }
    return room;
  }

  // ==================== TIMETABLE CONFIGURATION ====================

  async createOrUpdateConfiguration(
    input: TimetableConfigInput,
    context: ServiceContext
  ): Promise<TimetableConfiguration> {
    if (!this.canConfigureTimetable(context)) {
      throw new UnauthorizedError("Only admins and head teachers can configure timetables");
    }

    // Validate academicYearId is provided
    if (!input.academicYearId) {
      throw new ValidationError("academicYearId is required");
    }

    // Validate input
    this.validateConfigurationInput(input);

    // Check if configuration exists
    const existing = await timetableConfigurationRepository.findByAcademicYearId(
      input.academicYearId
    );

    if (existing) {
      // Update existing
      return timetableConfigurationRepository.update(existing.id, {
        termId: input.termId,
        schoolStartTime: input.schoolStartTime,
        periodDuration: input.periodDuration,
        breakStartPeriod: input.breakStartPeriod,
        breakDuration: input.breakDuration,
        periodsBeforeBreak: input.periodsBeforeBreak,
        periodsAfterBreak: input.periodsAfterBreak,
        totalPeriods: input.totalPeriods,
        allowSubjectPreferences: input.allowSubjectPreferences || false,
        allowTeacherPreferences: input.allowTeacherPreferences || false,
        autoAssignRooms: input.autoAssignRooms !== undefined ? input.autoAssignRooms : true,
        doublePeriodConfigs: (input.doublePeriodConfigs || []) as any,
      } as any);
    } else {
      // Create new
      return timetableConfigurationRepository.create({
        academicYear: {
          connect: { id: input.academicYearId },
        },
        ...(input.termId && {
          term: {
            connect: { id: input.termId },
          },
        }),
        schoolStartTime: input.schoolStartTime,
        periodDuration: input.periodDuration,
        breakStartPeriod: input.breakStartPeriod,
        breakDuration: input.breakDuration,
        periodsBeforeBreak: input.periodsBeforeBreak,
        periodsAfterBreak: input.periodsAfterBreak,
        totalPeriods: input.totalPeriods,
        allowSubjectPreferences: input.allowSubjectPreferences || false,
        allowTeacherPreferences: input.allowTeacherPreferences || false,
        doublePeriodConfigs: (input.doublePeriodConfigs || []) as any,
        autoAssignRooms: input.autoAssignRooms !== undefined ? input.autoAssignRooms : true,
      });
    }
  }

  private validateConfigurationInput(input: TimetableConfigInput): void {
    if (!input.schoolStartTime) {
      throw new ValidationError("School start time is required");
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(input.schoolStartTime)) {
      throw new ValidationError("School start time must be in HH:MM format");
    }

    if (input.periodDuration < 1 || input.periodDuration > 120) {
      throw new ValidationError("Period duration must be between 1 and 120 minutes");
    }

    if (input.breakDuration < 5 || input.breakDuration > 60) {
      throw new ValidationError("Break duration must be between 5 and 60 minutes");
    }

    if (input.totalPeriods !== input.periodsBeforeBreak + input.periodsAfterBreak) {
      throw new ValidationError(
        "Total periods must equal periods before break plus periods after break"
      );
    }
  }

  async getConfiguration(academicYearId: string, context: ServiceContext) {
    const config = await timetableConfigurationRepository.findByAcademicYearIdWithRelations(
      academicYearId
    );
    return config;
  }

  // ==================== PDF/ZIP EXPORT ====================

  /**
   * Resolve the active academic year and its generated period slots — the
   * shared context every export case (single class, single teacher, all
   * classes) needs before it can render a PDF.
   */
  async getExportContext(
    context: ServiceContext
  ): Promise<{ academicYear: { id: string; year: number }; periodSlots: PeriodSlot[] }> {
    if (!(await this.canViewAllTimetables(context))) {
      throw new UnauthorizedError("Only admins, head teachers, and HODs can export timetables");
    }

    const academicYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    const config = await timetableConfigurationRepository.findByAcademicYearId(academicYear.id);
    if (!config) {
      throw new NotFoundError("Timetable configuration not found");
    }

    const periodSlots = this.generatePeriodSlots(config);

    return {
      academicYear: { id: academicYear.id, year: academicYear.year },
      periodSlots,
    };
  }

  async getActiveClassesForExport() {
    return prisma.class.findMany({
      where: { status: "ACTIVE" },
      include: { grade: true },
      orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
    });
  }

  async getClassForExport(classId: string) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });
    if (!classData) {
      throw new NotFoundError("Class not found");
    }
    return classData;
  }

  async getTeacherForExport(teacherId: string) {
    const teacher = await prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }
    return teacher;
  }

  // ==================== TIMETABLE GENERATION ====================

  async generateTimetable(
    academicYearId: string,
    context: ServiceContext
  ): Promise<GenerationResult> {
    if (!this.canGenerateTimetable(context)) {
      throw new UnauthorizedError("Only admins and head teachers can generate timetables");
    }

    if (!context.teacherProfileId) {
      throw new ValidationError("Teacher profile ID is required");
    }

    // Get configuration
    const config = await timetableConfigurationRepository.findByAcademicYearId(academicYearId);
    if (!config) {
      throw new NotFoundError(
        "Timetable configuration not found. Please configure timetable settings first."
      );
    }

    // Get all subject teacher assignments with class relationships
    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: { academicYearId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            gradeId: true,
            grade: {
              select: {
                id: true,
                name: true,
                level: true,
                schoolLevel: true,
              },
            },
          },
        },
      },
    });

    if (assignments.length === 0) {
      throw new NotFoundError("No subject teacher assignments found for this academic year");
    }

    // Get class subjects (curriculum with periodsPerWeek)
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class: {
          enrollments: {
            some: { academicYearId },
          },
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            gradeId: true,
          },
        },
      },
    });

    if (classSubjects.length === 0) {
      throw new NotFoundError("No class subjects (curriculum) found. Please configure curriculum first.");
    }

    // Generate period slots from configuration
    const periodSlots: PeriodSlot[] = this.generatePeriodSlots(config);

    // Get teacher availabilities (if any exist)
    const teacherAvailabilities: any[] = []; // TODO: Implement TeacherAvailability model if needed

    // Parse double period configs from configuration (stored as JSON)
    const doublePeriodConfigs: DoublePeriodConfig[] = (config as any).doublePeriodConfigs || [];

    // Prepare core subject IDs (subjects marked as core in class subjects)
    const coreSubjectIds = [...new Set(
      classSubjects.filter(cs => cs.isCore).map(cs => cs.subjectId)
    )];

    // Run the FET-style solver
    const solverResult = solve({
      academicYearId,
      assignments: assignments.map(a => ({
        id: a.id,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
        classId: a.classId,
        academicYearId: a.academicYearId,
        subject: a.subject,
        teacher: a.teacher as any,
        class: a.class as any,
      })),
      classSubjects: classSubjects.map(cs => ({
        id: cs.id,
        classId: cs.classId,
        subjectId: cs.subjectId,
        isCore: cs.isCore,
        periodsPerWeek: cs.periodsPerWeek,
        subject: cs.subject,
        class: cs.class as any,
      })),
      periodSlots,
      teacherAvailabilities,
      config: {
        schoolDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY] as any,
        totalPeriodsPerDay: config.totalPeriods,
        maxLessonsPerDayPerClass: config.totalPeriods,
        maxLessonsPerDayPerTeacher: 6,
        doublePeriodConfigs,
        spreadSubjectsAcrossWeek: true,
        avoidConsecutiveDays: false,
        preferMorningForCore: false, // Disabled to allow natural variation (not always MATHS first!)
        coreSubjectIds,
        maxAttempts: 1000,
        enableBacktracking: true,
        maxBacktrackDepth: 50,
      },
    });

    // Log the solver report
    logger.debug("Timetable solver report", { report: generateReport(solverResult) });

    // Convert placements to timetable slot entries
    const slotEntries = toTimetableSlotEntries(
      solverResult.placements,
      academicYearId,
      periodSlots
    );

    // Delete existing timetable slots
    await prisma.timetableSlot.deleteMany({
      where: { academicYearId },
    });

    // Save new slots
    if (slotEntries.length > 0) {
      await prisma.timetableSlot.createMany({
        data: slotEntries.map(e => ({
          ...e,
          updatedAt: new Date(),
        })),
      });
    }

    // Update configuration with generation metadata
    await timetableConfigurationRepository.update(config.id, {
      lastGeneratedAt: new Date(),
      generatedById: context.teacherProfileId,
    } as any);

    // Convert unplaced activities to conflicts
    const conflicts: ConflictInfo[] = solverResult.unplacedActivities.map(activity => {
      const assignment = assignments.find(a => a.id === activity.assignmentId);
      return {
        classId: activity.classId,
        className: assignment?.class ? `${assignment.class.grade.name} ${assignment.class.name}` : 'Unknown',
        subjectId: activity.subjectId,
        subjectName: assignment?.subject.name || 'Unknown',
        teacherId: activity.teacherId,
        teacherName: assignment?.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : 'Unknown',
        reason: `Could not find valid slot for ${activity.label}`,
      };
    });

    const totalAssignments = assignments.length;
    const placedActivities = slotEntries.length;
    const successRate = totalAssignments > 0 ? (placedActivities / totalAssignments) * 100 : 0;

    return {
      slotsGenerated: slotEntries.length,
      conflicts,
      stats: {
        totalAssignments,
        slotsGenerated: slotEntries.length,
        conflicts: conflicts.length,
        successRate: parseFloat(successRate.toFixed(1)),
      },
    };
  }

  /**
   * Generate period slots from configuration
   */
  private generatePeriodSlots(config: TimetableConfiguration): PeriodSlot[] {
    const slots: PeriodSlot[] = [];
    const startMinutes = this.parseTime(config.schoolStartTime);
    let currentMinutes = startMinutes;
    let periodNumber = 1;

    // Periods before break
    for (let i = 0; i < config.periodsBeforeBreak; i++) {
      const startTime = this.formatTime(currentMinutes);
      currentMinutes += config.periodDuration;
      const endTime = this.formatTime(currentMinutes);

      slots.push({
        periodNumber: periodNumber++,
        startTime,
        endTime,
        isBreak: false,
      });
    }

    // Break period
    const breakStart = this.formatTime(currentMinutes);
    currentMinutes += config.breakDuration;
    const breakEnd = this.formatTime(currentMinutes);

    slots.push({
      periodNumber: periodNumber++,
      startTime: breakStart,
      endTime: breakEnd,
      isBreak: true,
    });

    // Periods after break
    for (let i = 0; i < config.periodsAfterBreak; i++) {
      const startTime = this.formatTime(currentMinutes);
      currentMinutes += config.periodDuration;
      const endTime = this.formatTime(currentMinutes);

      slots.push({
        periodNumber: periodNumber++,
        startTime,
        endTime,
        isBreak: false,
      });
    }

    return slots;
  }


  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  // ==================== VIEW TIMETABLES ====================

  async getTeacherTimetable(teacherProfileId: string, context: ServiceContext) {
    // Teachers can only view their own timetable
    if (context.role === "TEACHER" && context.teacherProfileId !== teacherProfileId) {
      throw new UnauthorizedError("You can only view your own timetable");
    }

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    const slots = await timetableSlotRepository.findByTeacher(teacherProfileId, academicYear.id);

    // Get teacher info
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    return {
      slots,
      teacher,
      academicYear: {
        id: academicYear.id,
        year: academicYear.year,
      },
    };
  }

  async getAllTimetables(
    context: ServiceContext,
    filters?: {
      classId?: string;
      teacherId?: string;
      roomId?: string;
      dayOfWeek?: DayOfWeek;
    }
  ) {
    if (!(await this.canViewAllTimetables(context))) {
      throw new UnauthorizedError("Only admins, head teachers, and HODs can view all timetables");
    }

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    const where: any = { academicYearId: academicYear.id };
    if (filters?.classId) where.classId = filters.classId;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.roomId) where.roomId = filters.roomId;
    if (filters?.dayOfWeek) where.dayOfWeek = filters.dayOfWeek;

    const slots = await timetableSlotRepository.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                name: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffNumber: true,
          },
        },
      },
    });

    // Group by day
    const byDay = {
      MONDAY: slots.filter((s) => s.dayOfWeek === "MONDAY"),
      TUESDAY: slots.filter((s) => s.dayOfWeek === "TUESDAY"),
      WEDNESDAY: slots.filter((s) => s.dayOfWeek === "WEDNESDAY"),
      THURSDAY: slots.filter((s) => s.dayOfWeek === "THURSDAY"),
      FRIDAY: slots.filter((s) => s.dayOfWeek === "FRIDAY"),
    };

    const config = await timetableConfigurationRepository.findByAcademicYearId(academicYear.id);

    return {
      slots, // Add slots array for frontend
      timetable: byDay,
      configuration: config,
      academicYear: {
        id: academicYear.id,
        year: academicYear.year,
      },
      stats: {
        totalSlots: slots.length,
        uniqueTeachers: new Set(slots.map((s) => s.teacherId)).size,
        uniqueClasses: new Set(slots.map((s) => s.classId)).size,
        uniqueRooms: new Set(slots.map((s) => (s as any).roomId).filter(Boolean)).size,
      },
    };
  }

  private canEditTimetable(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Swap two timetable slots' positions, or move one slot to an empty cell.
   * Pass targetSlotId for a swap, or targetDay+targetPeriod for a move.
   */
  async swapOrMoveSlot(
    input: {
      slotId: string;
      targetSlotId?: string;
      targetDay?: DayOfWeek;
      targetPeriod?: number;
      targetStartTime?: string;
      targetEndTime?: string;
    },
    context: ServiceContext
  ): Promise<void> {
    if (!this.canEditTimetable(context)) {
      throw new UnauthorizedError("Only admins and head teachers can edit timetables");
    }

    const slot = await timetableSlotRepository.findById(input.slotId);
    if (!slot) {
      throw new NotFoundError("Slot not found");
    }

    if (input.targetSlotId) {
      const target = await timetableSlotRepository.findById(input.targetSlotId);
      if (!target) {
        throw new NotFoundError("Target slot not found");
      }
      await timetableSlotRepository.swapSlots(input.slotId, input.targetSlotId);
      return;
    }

    if (input.targetDay === undefined || input.targetPeriod === undefined) {
      throw new ValidationError(
        "Provide either targetSlotId (swap) or targetDay+targetPeriod (move)"
      );
    }

    const conflict = await timetableSlotRepository.findConflictExcluding(
      slot.classId,
      slot.academicYearId,
      input.targetDay,
      input.targetPeriod,
      input.slotId
    );
    if (conflict) {
      throw new ConflictError("Target cell is already occupied");
    }

    await timetableSlotRepository.moveSlot(
      input.slotId,
      input.targetDay,
      input.targetPeriod,
      input.targetStartTime,
      input.targetEndTime
    );
  }
}

// Singleton instance
export const timetableService = new TimetableService();
