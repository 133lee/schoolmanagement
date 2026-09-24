-- CreateTable
CREATE TABLE "lesson_logs" (
    "id" TEXT NOT NULL,
    "timetableSlotId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopics" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_logs_timetableSlotId_idx" ON "lesson_logs"("timetableSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_logs_timetableSlotId_date_key" ON "lesson_logs"("timetableSlotId", "date");

-- AddForeignKey
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "timetable_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
