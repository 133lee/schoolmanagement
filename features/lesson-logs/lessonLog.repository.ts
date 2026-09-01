import prisma from "@/lib/db/prisma";
import { LessonLog } from "@/types/prisma-enums";

/**
 * LessonLog Repository
 *
 * Thin Prisma access for what topic/subtopic(s) were covered in a given
 * timetable slot on a given date. No business logic.
 */
export class LessonLogRepository {
  async findBySlotAndDate(timetableSlotId: string, date: Date): Promise<LessonLog | null> {
    return prisma.lessonLog.findUnique({
      where: { timetableSlotId_date: { timetableSlotId, date } },
    });
  }

  async upsert(data: {
    timetableSlotId: string;
    date: Date;
    topic: string;
    subtopics?: string;
    createdById: string;
  }): Promise<LessonLog> {
    const { timetableSlotId, date, topic, subtopics, createdById } = data;
    return prisma.lessonLog.upsert({
      where: { timetableSlotId_date: { timetableSlotId, date } },
      create: {
        timetableSlot: { connect: { id: timetableSlotId } },
        date,
        topic,
        subtopics,
        createdBy: { connect: { id: createdById } },
      },
      update: { topic, subtopics },
    });
  }
}

export const lessonLogRepository = new LessonLogRepository();
