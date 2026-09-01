import { Prisma } from "@prisma/client";
import { AttendanceRecord, AttendanceStatus, Role } from "@/types/prisma-enums";
import { attendanceRecordRepository } from "./attendanceRecord.repository";
import { classRepository } from "../classes/class.repository";
import { termRepository } from "../terms/term.repository";
import { studentRepository } from "../students/student.repository";
import { verifySlotOwnership } from "@/lib/timetable/verify-slot-ownership";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import {
  normalizeToUtcMidnight,
  normalizeToUtcEndOfDay,
  getTodayUtcMidnight,
} from "@/lib/utils/date-utils";
import prisma from "@/lib/db/prisma";

export type ServiceContext = AuthContext & {
  teacherProfileId?: string;
};

// ── Input DTOs ──────────────────────────────────────────────────────────────

export interface MarkAttendanceInput {
  studentId: string;
  classId: string;
  termId: string;
  date: Date;
  status: AttendanceStatus;
  remarks?: string;
  /** Omit (or pass null) for the daily class register. */
  timetableSlotId?: string | null;
}

export interface BulkMarkAttendanceInput {
  classId: string;
  termId: string;
  date: Date;
  /** Omit (or pass null) for the daily class register. */
  timetableSlotId?: string | null;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface AttendanceFilters {
  studentId?: string;
  classId?: string;
  termId?: string;
  timetableSlotId?: string | null;
  status?: AttendanceStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class AttendanceRecordService {
  // ── Validation ─────────────────────────────────────────────────────────

  private async validateDateInTerm(date: Date, termId: string): Promise<void> {
    const term = await termRepository.findById(termId);
    if (!term) throw new NotFoundError("Term not found");

    const dateOnly = normalizeToUtcMidnight(date);
    const termStart = normalizeToUtcMidnight(term.startDate);
    const termEnd = normalizeToUtcEndOfDay(term.endDate);

    if (dateOnly < termStart || dateOnly > termEnd) {
      throw new ValidationError("Attendance date must be within term dates");
    }
  }

  private validateDateNotFuture(date: Date): void {
    const today = getTodayUtcMidnight();
    if (normalizeToUtcMidnight(date) > today) {
      throw new ValidationError("Cannot mark attendance for future dates");
    }
  }

  /**
   * A plain TEACHER may only mark period attendance for a slot that is
   * genuinely theirs, on the day it's actually scheduled — previously
   * enforced only by the UI only ever offering the caller's own slots, with
   * no check at the API layer. Daily register calls (no timetableSlotId)
   * are unaffected. See lib/timetable/verify-slot-ownership.ts for the
   * shared check (also used by lesson logging).
   */
  private async verifySlotOwnership(
    timetableSlotId: string | null | undefined,
    date: Date,
    context: ServiceContext
  ): Promise<void> {
    if (!timetableSlotId) return;
    await verifySlotOwnership(timetableSlotId, date, context);
  }

  private async validateReferences(studentId: string, classId: string, termId: string) {
    const [student, classEntity, term] = await Promise.all([
      studentRepository.findById(studentId),
      classRepository.findById(classId),
      termRepository.findByIdWithRelations(termId),
    ]);
    if (!student) throw new NotFoundError("Student not found");
    if (!classEntity) throw new NotFoundError("Class not found");
    if (!term) throw new NotFoundError("Term not found");
    if (term.academicYear.isClosed) {
      throw new ValidationError("Cannot mark attendance in a closed academic year");
    }
    return { term };
  }

  // ── Core mark (shared by daily + period paths) ──────────────────────────

  /**
   * Mark attendance for a single student.
   *
   * Daily register:  leave timetableSlotId undefined / null (class teacher).
   * Period register: pass the timetableSlotId for the lesson slot (subject teacher).
   */
  async markAttendance(
    data: MarkAttendanceInput,
    context: ServiceContext
  ): Promise<AttendanceRecord> {
    requireMinimumRole(context, Role.TEACHER, "You do not have permission to mark attendance");
    await this.verifySlotOwnership(data.timetableSlotId, data.date, context);

    this.validateDateNotFuture(data.date);
    await this.validateDateInTerm(data.date, data.termId);
    await this.validateReferences(data.studentId, data.classId, data.termId);

    const dateOnly = normalizeToUtcMidnight(data.date);
    const slotId = data.timetableSlotId ?? null;

    // Look up existing record using the correct finder for each type
    const existing = slotId
      ? await attendanceRecordRepository.findPeriodRecord(
          data.studentId, data.classId, dateOnly, slotId
        )
      : await attendanceRecordRepository.findDailyRecord(
          data.studentId, data.classId, dateOnly
        );

    const markerConnect = context.teacherProfileId
      ? { markedBy: { connect: { id: context.teacherProfileId } } }
      : {};

    if (existing) {
      return attendanceRecordRepository.update(existing.id, {
        status: data.status,
        remarks: data.remarks,
        ...markerConnect,
      });
    }

    return attendanceRecordRepository.create({
      student: { connect: { id: data.studentId } },
      class: { connect: { id: data.classId } },
      term: { connect: { id: data.termId } },
      date: dateOnly,
      status: data.status,
      remarks: data.remarks,
      ...(slotId ? { timetableSlot: { connect: { id: slotId } } } : {}),
      ...markerConnect,
    });
  }

  /**
   * Bulk mark attendance for a class.
   *
   * Daily register:  omit / null timetableSlotId (class teacher).
   * Period register: pass timetableSlotId (subject teacher).
   */
  /**
   * Bulk mark attendance for a class in one batch instead of one
   * validate+lookup+write round trip per student. classId/termId/date are
   * shared across the whole call, so those checks run once; only the
   * per-student existence check and the existing-record lookup need to
   * cover the whole list, and both do so in a single query each. All
   * writes then run in one $transaction (same shape as bulkEnterResults in
   * assessment.service.ts).
   */
  async bulkMarkAttendance(data: BulkMarkAttendanceInput, context: ServiceContext) {
    requireMinimumRole(context, Role.TEACHER, "You do not have permission to mark attendance");
    await this.verifySlotOwnership(data.timetableSlotId, data.date, context);

    const failed: Array<{ studentId: string; error: string }> = [];

    if (data.records.length === 0) {
      return { successful: 0, failed };
    }

    this.validateDateNotFuture(data.date);
    await this.validateDateInTerm(data.date, data.termId);

    const [classEntity, term] = await Promise.all([
      classRepository.findById(data.classId),
      termRepository.findByIdWithRelations(data.termId),
    ]);
    if (!classEntity) throw new NotFoundError("Class not found");
    if (!term) throw new NotFoundError("Term not found");
    if (term.academicYear.isClosed) {
      throw new ValidationError("Cannot mark attendance in a closed academic year");
    }

    const dateOnly = normalizeToUtcMidnight(data.date);
    const slotId = data.timetableSlotId ?? null;
    const studentIds = data.records.map((r) => r.studentId);

    const [validStudents, existingRecords] = await Promise.all([
      studentRepository.findManyByIds(studentIds),
      attendanceRecordRepository.findManyForBulk(studentIds, data.classId, dateOnly, slotId),
    ]);
    const validStudentIds = new Set(validStudents.map((s) => s.id));
    const existingMap = new Map(existingRecords.map((r) => [r.studentId, r.id]));

    const toCreate: Prisma.AttendanceRecordCreateManyInput[] = [];
    const toUpdate: Array<{ id: string; status: AttendanceStatus; remarks?: string }> = [];

    for (const record of data.records) {
      if (!validStudentIds.has(record.studentId)) {
        failed.push({ studentId: record.studentId, error: "Student not found" });
        continue;
      }

      const existingId = existingMap.get(record.studentId);
      if (existingId) {
        toUpdate.push({ id: existingId, status: record.status, remarks: record.remarks });
      } else {
        toCreate.push({
          studentId: record.studentId,
          classId: data.classId,
          termId: data.termId,
          date: dateOnly,
          status: record.status,
          remarks: record.remarks,
          timetableSlotId: slotId,
          markedById: context.teacherProfileId ?? null,
        });
      }
    }

    const markerConnect = context.teacherProfileId
      ? { markedBy: { connect: { id: context.teacherProfileId } } }
      : {};

    await attendanceRecordRepository.withTransaction(async (tx) => {
      if (toCreate.length > 0) {
        await tx.attendanceRecord.createMany({ data: toCreate });
      }
      await Promise.all(
        toUpdate.map(({ id, ...rest }) =>
          attendanceRecordRepository.updateInTransaction(tx, id, { ...rest, ...markerConnect })
        )
      );
    });

    return { successful: toCreate.length + toUpdate.length, failed };
  }

  // ── Convenience wrappers (keep call-sites readable) ─────────────────────

  /** Subject teacher marks attendance for a specific lesson period. */
  async markPeriodAttendance(
    data: MarkAttendanceInput & { timetableSlotId: string },
    context: ServiceContext
  ): Promise<AttendanceRecord> {
    return this.markAttendance(data, context);
  }

  /** Subject teacher bulk-marks attendance for their lesson period. */
  async bulkMarkPeriodAttendance(
    data: BulkMarkAttendanceInput & { timetableSlotId: string },
    context: ServiceContext
  ) {
    return this.bulkMarkAttendance(data, context);
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async getAttendanceById(id: string, context: ServiceContext): Promise<AttendanceRecord> {
    const record = await attendanceRecordRepository.findById(id);
    if (!record) throw new NotFoundError("Attendance record not found");
    return record;
  }

  async getAttendanceWithRelations(id: string, context: ServiceContext) {
    const record = await attendanceRecordRepository.findByIdWithRelations(id);
    if (!record) throw new NotFoundError("Attendance record not found");
    return record;
  }

  async getClassAttendance(classId: string, date: Date, context: ServiceContext) {
    return attendanceRecordRepository.findByClassAndDate(classId, date, null);
  }

  /**
   * Get all period attendance records for a specific timetable slot on a date.
   * Used by the subject teacher to load their per-period register.
   */
  async getPeriodAttendanceForSlot(
    timetableSlotId: string,
    date: Date,
    context: ServiceContext
  ) {
    return attendanceRecordRepository.findBySlotAndDate(timetableSlotId, date);
  }

  async getStudentAttendance(
    studentId: string,
    termId: string | undefined,
    context: ServiceContext
  ) {
    if (termId) {
      return attendanceRecordRepository.findByStudentAndTerm(studentId, termId);
    }
    return attendanceRecordRepository.findByStudent(studentId);
  }

  async listAttendance(
    filters: AttendanceFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AttendanceRecordWhereInput = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.classId) where.classId = filters.classId;
    if (filters.termId) where.termId = filters.termId;
    if (filters.status) where.status = filters.status;
    // explicit null → daily only; string → that slot; undefined → all
    if (filters.timetableSlotId !== undefined) {
      where.timetableSlotId = filters.timetableSlotId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) where.date.lte = filters.dateTo;
    }

    const [records, total] = await Promise.all([
      attendanceRecordRepository.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          student: true,
          class: { include: { grade: true } },
          term: { include: { academicYear: true } },
          markedBy: { include: { user: true } },
          timetableSlot: { include: { subject: true } },
        },
        orderBy: { date: "desc" },
      }),
      attendanceRecordRepository.count(where),
    ]);

    return {
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ── Update / Delete ───────────────────────────────────────────────────────

  async updateAttendance(
    id: string,
    data: { status?: AttendanceStatus; remarks?: string },
    context: ServiceContext
  ): Promise<AttendanceRecord> {
    requireMinimumRole(context, Role.TEACHER, "You do not have permission to update attendance");

    const existingRecord = await attendanceRecordRepository.findByIdWithRelations(id);
    if (!existingRecord) throw new NotFoundError("Attendance record not found");
    if (existingRecord.term.academicYear.isClosed) {
      throw new ValidationError("Cannot update attendance in a closed academic year");
    }

    return attendanceRecordRepository.update(id, {
      ...(data.status && { status: data.status }),
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      ...(context.teacherProfileId && {
        markedBy: { connect: { id: context.teacherProfileId } },
      }),
    });
  }

  async deleteAttendance(id: string, context: ServiceContext): Promise<void> {
    requireMinimumRole(context, Role.HEAD_TEACHER, "You do not have permission to delete attendance");

    const record = await attendanceRecordRepository.findByIdWithRelations(id);
    if (!record) throw new NotFoundError("Attendance record not found");
    if (record.term.academicYear.isClosed) {
      throw new ValidationError("Cannot delete attendance from a closed academic year");
    }

    await attendanceRecordRepository.delete(id);
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  /**
   * Daily register stats — used directly by report card generation.
   * Period records are intentionally excluded.
   */
  async getStudentTermStatistics(
    studentId: string,
    termId: string,
    context: ServiceContext
  ) {
    const stats = await attendanceRecordRepository.getStudentTermStats(studentId, termId);
    const total = stats.total;
    const attendanceRate = total > 0 ? ((stats.present + stats.late) / total) * 100 : 0;
    const absenteeRate = total > 0 ? (stats.absent / total) * 100 : 0;
    return {
      ...stats,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      absenteeRate: Math.round(absenteeRate * 100) / 100,
    };
  }

  /**
   * Period attendance stats for a student — for subject-level reporting only.
   * Never used in report cards.
   */
  async getPeriodStatistics(
    studentId: string,
    termId: string,
    timetableSlotId: string | undefined,
    context: ServiceContext
  ) {
    const stats = await attendanceRecordRepository.getPeriodStats(
      studentId,
      termId,
      timetableSlotId
    );
    const total = stats.total;
    const attendanceRate = total > 0 ? ((stats.present + stats.late) / total) * 100 : 0;
    return {
      ...stats,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }

  async getClassDateStatistics(classId: string, date: Date, context: ServiceContext) {
    return attendanceRecordRepository.getClassDateStats(classId, date);
  }

  async getClassAttendanceSummary(
    classId: string,
    startDate: Date,
    endDate: Date,
    context: ServiceContext
  ) {
    const records = await attendanceRecordRepository.findMany({
      where: {
        classId,
        timetableSlotId: null, // daily register only for summaries
        date: { gte: startDate, lte: endDate },
      },
    });

    const stats = { totalRecords: records.length, present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status === "PRESENT") stats.present++;
      else if (r.status === "ABSENT") stats.absent++;
      else if (r.status === "LATE") stats.late++;
      else if (r.status === "EXCUSED") stats.excused++;
    }

    const attendanceRate =
      stats.totalRecords > 0
        ? ((stats.present + stats.late) / stats.totalRecords) * 100
        : 0;

    return {
      ...stats,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      dateRange: { start: startDate, end: endDate },
    };
  }

  private static readonly TERM_LABELS: Record<string, string> = {
    TERM_1: "Term 1",
    TERM_2: "Term 2",
    TERM_3: "Term 3",
  };

  /**
   * Full period-attendance session record for a class + subject over a
   * term, for the teacher-facing Session Record sheet. For double periods
   * on the same day only the earlier period's records are kept (auto-fill
   * makes them identical; corrections to the second half can be viewed by
   * opening that period separately).
   */
  async getSessionRegister(userId: string, classId: string, subjectId: string, termId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });
    if (!term) throw new ValidationError("Term not found");

    const hasAccess = await prisma.timetableSlot.findFirst({
      where: { classId, subjectId, teacher: { userId } },
      select: { id: true },
    });
    if (!hasAccess) {
      throw new ValidationError("You do not teach this class/subject combination");
    }

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classId, academicYearId: term.academicYearId, status: "ACTIVE" },
      include: {
        student: {
          select: { id: true, firstName: true, middleName: true, lastName: true, gender: true },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    const students = enrollments.map((e) => ({
      id: e.student.id,
      name: [e.student.firstName, e.student.middleName, e.student.lastName].filter(Boolean).join(" "),
      gender: (e.student.gender === "MALE" ? "M" : "F") as "M" | "F",
    }));

    const rawRecords = await prisma.attendanceRecord.findMany({
      where: {
        classId,
        termId,
        timetableSlotId: { not: null },
        timetableSlot: { subjectId },
      },
      select: {
        studentId: true,
        status: true,
        date: true,
        timetableSlot: { select: { periodNumber: true } },
      },
      orderBy: [{ date: "asc" }, { timetableSlot: { periodNumber: "asc" } }],
    });

    const sessionMap = new Map<string, { minPeriod: number; records: Record<string, string> }>();

    for (const r of rawRecords) {
      const isoDate = r.date.toISOString().split("T")[0];
      const period = r.timetableSlot?.periodNumber ?? 99;

      if (!sessionMap.has(isoDate)) {
        sessionMap.set(isoDate, { minPeriod: period, records: { [r.studentId]: r.status } });
      } else {
        const entry = sessionMap.get(isoDate)!;
        if (period < entry.minPeriod) {
          entry.minPeriod = period;
          entry.records = { [r.studentId]: r.status };
        } else if (period === entry.minPeriod) {
          entry.records[r.studentId] = r.status;
        }
      }
    }

    const sessions = Array.from(sessionMap.entries()).map(([isoDate, { records }]) => ({ isoDate, records }));

    const termLabel = `${AttendanceRecordService.TERM_LABELS[term.termType] ?? term.termType} · ${term.academicYear.year}`;
    const termStartDate = term.startDate.toISOString().split("T")[0];

    return { termStartDate, termLabel, students, sessions };
  }
}

export const attendanceRecordService = new AttendanceRecordService();
