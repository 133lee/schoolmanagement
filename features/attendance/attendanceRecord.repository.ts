import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { AttendanceRecord, AttendanceStatus } from "@/types/prisma-enums";

export class AttendanceRecordRepository {
  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: Prisma.AttendanceRecordCreateInput): Promise<AttendanceRecord> {
    try {
      return await prisma.attendanceRecord.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Attendance record already exists for this student and date");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced student, class, term, or teacher not found");
        }
      }
      throw error;
    }
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.AttendanceRecordCreateInput
  ): Promise<AttendanceRecord> {
    return tx.attendanceRecord.create({ data });
  }

  // ── Single lookups ────────────────────────────────────────────────────────

  async findById(id: string): Promise<AttendanceRecord | null> {
    return prisma.attendanceRecord.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string) {
    return prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        student: true,
        class: { include: { grade: true } },
        term: { include: { academicYear: true } },
        markedBy: true,
        timetableSlot: true,
      },
    });
  }

  /**
   * Find a daily register record (timetableSlotId IS NULL).
   * Uses findFirst because Postgres allows multiple NULLs in the unique
   * constraint, so DB-level uniqueness isn't guaranteed for the null case —
   * the service enforces it at application level.
   */
  async findDailyRecord(
    studentId: string,
    classId: string,
    date: Date
  ): Promise<AttendanceRecord | null> {
    return prisma.attendanceRecord.findFirst({
      where: { studentId, classId, date, timetableSlotId: null },
    });
  }

  /**
   * Find a period attendance record by its timetable slot.
   * DB uniqueness is enforced for non-null timetableSlotId values.
   */
  async findPeriodRecord(
    studentId: string,
    classId: string,
    date: Date,
    timetableSlotId: string
  ): Promise<AttendanceRecord | null> {
    return prisma.attendanceRecord.findUnique({
      where: {
        studentId_classId_date_timetableSlotId: {
          studentId,
          classId,
          date,
          timetableSlotId,
        },
      },
    });
  }

  /**
   * Batch lookup of existing records for a set of students on one
   * class+date(+slot) — one query instead of one findFirst/findUnique per
   * student. Used by bulk attendance marking to split creates from updates.
   */
  async findManyForBulk(
    studentIds: string[],
    classId: string,
    date: Date,
    timetableSlotId: string | null
  ): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { studentId: { in: studentIds }, classId, date, timetableSlotId },
    });
  }

  async updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.AttendanceRecordUpdateInput
  ): Promise<AttendanceRecord> {
    return tx.attendanceRecord.update({ where: { id }, data });
  }

  // ── Collection lookups ────────────────────────────────────────────────────

  async findAll(): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      orderBy: { date: "desc" },
      include: {
        student: { select: { studentNumber: true, firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    });
  }

  async findByStudent(studentId: string): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      include: { class: true, term: true },
    });
  }

  async findByClass(classId: string): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { classId },
      orderBy: { date: "desc" },
      include: { student: true },
    });
  }

  async findByTerm(termId: string): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { termId },
      orderBy: { date: "desc" },
      include: { student: true, class: true },
    });
  }

  /**
   * Daily register records for a student in a term (used for report card stats).
   * Explicitly excludes period records so report card figures are never inflated.
   */
  async findByStudentAndTerm(
    studentId: string,
    termId: string
  ): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { studentId, termId, timetableSlotId: null },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Period attendance records for a student in a term, optionally filtered
   * to a specific subject via timetableSlotId's subject relation.
   */
  async findPeriodRecordsByStudentAndTerm(
    studentId: string,
    termId: string,
    timetableSlotId?: string
  ): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: {
        studentId,
        termId,
        timetableSlotId: timetableSlotId ?? { not: null },
      },
      orderBy: { date: "asc" },
      include: { timetableSlot: { include: { subject: true } } },
    });
  }

  /**
   * All attendance records for a class on a specific date.
   * Pass timetableSlotId to scope to a period; omit for daily records only.
   */
  async findByClassAndDate(
    classId: string,
    date: Date,
    timetableSlotId?: string | null
  ): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.attendanceRecord.findMany({
      where: {
        classId,
        date: { gte: startOfDay, lte: endOfDay },
        // undefined → no filter (all); null → daily only; string → that slot
        ...(timetableSlotId !== undefined
          ? { timetableSlotId }
          : {}),
      },
      include: { student: true },
    });
  }

  /**
   * All student records for a specific timetable slot on a given date.
   * Used by subject teachers to load/review period attendance.
   */
  async findBySlotAndDate(
    timetableSlotId: string,
    date: Date
  ): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.attendanceRecord.findMany({
      where: {
        timetableSlotId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { student: true },
      orderBy: { student: { lastName: "asc" } },
    });
  }

  async findByStatus(status: AttendanceStatus): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { status },
      orderBy: { date: "desc" },
      include: { student: true, class: true },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    return prisma.attendanceRecord.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
      include: { student: true, class: true },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Daily register stats for a student in a term.
   * Always scoped to timetableSlotId = null so report card figures
   * are never affected by period-level records.
   */
  async getStudentTermStats(studentId: string, termId: string) {
    const records = await this.findByStudentAndTerm(studentId, termId);

    const stats = { total: records.length, present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status === "PRESENT") stats.present++;
      else if (r.status === "ABSENT") stats.absent++;
      else if (r.status === "LATE") stats.late++;
      else if (r.status === "EXCUSED") stats.excused++;
    }
    return stats;
  }

  /**
   * Period attendance stats for a student, optionally scoped to a slot.
   */
  async getPeriodStats(
    studentId: string,
    termId: string,
    timetableSlotId?: string
  ) {
    const records = await this.findPeriodRecordsByStudentAndTerm(
      studentId,
      termId,
      timetableSlotId
    );

    const stats = { total: records.length, present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status === "PRESENT") stats.present++;
      else if (r.status === "ABSENT") stats.absent++;
      else if (r.status === "LATE") stats.late++;
      else if (r.status === "EXCUSED") stats.excused++;
    }
    return stats;
  }

  async getClassDateStats(classId: string, date: Date) {
    const records = await this.findByClassAndDate(classId, date, null);

    const stats = { total: records.length, present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status === "PRESENT") stats.present++;
      else if (r.status === "ABSENT") stats.absent++;
      else if (r.status === "LATE") stats.late++;
      else if (r.status === "EXCUSED") stats.excused++;
    }
    return stats;
  }

  // ── findMany / count ──────────────────────────────────────────────────────

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AttendanceRecordWhereInput;
    orderBy?: Prisma.AttendanceRecordOrderByWithRelationInput;
    include?: Prisma.AttendanceRecordInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;
    return prisma.attendanceRecord.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { date: "desc" },
      include: include || { student: true, class: true },
    });
  }

  async count(where?: Prisma.AttendanceRecordWhereInput): Promise<number> {
    return prisma.attendanceRecord.count({ where });
  }

  // ── Update / Delete ───────────────────────────────────────────────────────

  async update(
    id: string,
    data: Prisma.AttendanceRecordUpdateInput
  ): Promise<AttendanceRecord> {
    try {
      return await prisma.attendanceRecord.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Attendance record not found");
      }
      throw error;
    }
  }

  async updateStatus(id: string, status: AttendanceStatus): Promise<AttendanceRecord> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<AttendanceRecord> {
    try {
      return await prisma.attendanceRecord.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Attendance record not found");
      }
      throw error;
    }
  }

  async bulkCreate(
    data: Prisma.AttendanceRecordCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.attendanceRecord.createMany({ data, skipDuplicates: true });
  }

  async deleteByClassAndDate(classId: string, date: Date): Promise<Prisma.BatchPayload> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.attendanceRecord.deleteMany({
      where: { classId, date: { gte: startOfDay, lte: endOfDay } },
    });
  }

  // ── Transaction ───────────────────────────────────────────────────────────

  async withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

export const attendanceRecordRepository = new AttendanceRecordRepository();
