-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('REGULAR_CLASSROOM', 'SCIENCE_LAB', 'COMPUTER_LAB', 'LIBRARY', 'SPORTS_HALL', 'ART_ROOM', 'MUSIC_ROOM', 'OTHER');

-- AlterTable
ALTER TABLE "timetable_slots" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "RoomType" NOT NULL DEFAULT 'REGULAR_CLASSROOM',
    "capacity" INTEGER,
    "building" TEXT,
    "floor" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "timetable_slots_roomId_idx" ON "timetable_slots"("roomId");

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
