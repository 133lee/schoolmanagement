import { Prisma } from "@prisma/client";
import { lessonLogRepository } from "./lessonLog.repository";
import { attendanceRecordRepository } from "../attendance/attendanceRecord.repository";
import { teacherRepository } from "../teachers/teacher.repository";
import { verifySlotOwnership, SlotOwnershipContext } from "@/lib/timetable/verify-slot-ownership";
import { ValidationError } from "@/lib/errors";
import { LessonLog } from "@/types/prisma-enums";

type AttendanceRecordWithStudent = Prisma.AttendanceRecordGetPayload<{
  include: { student: true };
}>;

export interface LogLessonInput {
  timetableSlotId: string;
  date: Date;
  topic: string;
  subtopics?: string;
}

export interface RemedialView {
  log: LessonLog | null;
  absentees: Array<{ id: string; name: string; studentNumber: string }>;
}

/**
 * Lesson Log Service
 *
 * Records what topic/subtopic(s) were covered in a lesson, and derives the
 * remedial view (which students missed that lesson) on read by joining the
 * log against real AttendanceRecord rows — deliberately not a stored list,
 * so it can never drift from the actual attendance record.
 */
export class LessonLogService {
  async logLesson(input: LogLessonInput, context: SlotOwnershipContext): Promise<LessonLog> {
    const slot = await verifySlotOwnership(input.timetableSlotId, input.date, context);

    const createdById =
      context.teacherProfileId ?? (await teacherRepository.findByUserId(context.userId))?.id ?? slot.teacherId;

    return lessonLogRepository.upsert({
      timetableSlotId: input.timetableSlotId,
      date: input.date,
      topic: input.topic,
      subtopics: input.subtopics,
      createdById,
    });
  }

  async getLessonLog(
    timetableSlotId: string,
    date: Date,
    context: SlotOwnershipContext
  ): Promise<LessonLog | null> {
    await verifySlotOwnership(timetableSlotId, date, context);
    return lessonLogRepository.findBySlotAndDate(timetableSlotId, date);
  }

  /**
   * The remedial view for a single period: the topic covered (if logged)
   * and every student who was marked ABSENT for that same slot+date.
   */
  async getRemedialView(
    timetableSlotId: string,
    date: Date,
    context: SlotOwnershipContext
  ): Promise<RemedialView> {
    await verifySlotOwnership(timetableSlotId, date, context);

    const [log, records] = await Promise.all([
      lessonLogRepository.findBySlotAndDate(timetableSlotId, date),
      attendanceRecordRepository.findBySlotAndDate(timetableSlotId, date),
    ]);

    const absentees = (records as AttendanceRecordWithStudent[])
      .filter((r) => r.status === "ABSENT")
      .map((r) => ({
        id: r.student.id,
        name: `${r.student.firstName} ${r.student.lastName}`,
        studentNumber: r.student.studentNumber,
      }));

    return { log, absentees };
  }

  /**
   * Same as getRemedialView but throws if there's nothing to show — used by
   * the PDF route, where an empty export would be a confusing PDF to hand
   * someone rather than a clear error.
   */
  async getRemedialViewForExport(
    timetableSlotId: string,
    date: Date,
    context: SlotOwnershipContext
  ): Promise<Required<Pick<RemedialView, "absentees">> & { log: LessonLog }> {
    const view = await this.getRemedialView(timetableSlotId, date, context);
    if (!view.log) {
      throw new ValidationError("Log this lesson's topic before exporting a remedial list");
    }
    if (view.absentees.length === 0) {
      throw new ValidationError("No absent students to include in a remedial list");
    }
    return { log: view.log, absentees: view.absentees };
  }
}

export const lessonLogService = new LessonLogService();
