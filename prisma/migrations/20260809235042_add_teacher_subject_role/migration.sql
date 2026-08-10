-- CreateEnum
CREATE TYPE "TeacherSubjectRole" AS ENUM ('PRIMARY', 'SECONDARY', 'PERMISSIBLE');

-- AlterTable
ALTER TABLE "teacher_subjects" ADD COLUMN     "role" "TeacherSubjectRole" NOT NULL DEFAULT 'PERMISSIBLE';

-- Backfill: existing rows predate this column and have no recorded intent,
-- so there is no way to recover which subject a teacher's admin originally
-- picked as "primary" vs "secondary". Best-effort heuristic: per teacher,
-- the earliest-created row (id is a cuid, which sorts ~chronologically)
-- becomes PRIMARY and the next becomes SECONDARY; everything else stays the
-- PERMISSIBLE default. Review/correct these via Edit Teacher after deploying
-- if a teacher's real primary subject doesn't match.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "teacherId" ORDER BY id ASC) AS rn
  FROM "teacher_subjects"
)
UPDATE "teacher_subjects" ts
SET "role" = CASE WHEN ranked.rn = 1 THEN 'PRIMARY' ELSE 'SECONDARY' END::"TeacherSubjectRole"
FROM ranked
WHERE ts.id = ranked.id AND ranked.rn IN (1, 2);
