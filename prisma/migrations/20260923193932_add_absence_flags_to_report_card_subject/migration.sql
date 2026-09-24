-- AlterTable
ALTER TABLE "report_card_subjects" ADD COLUMN     "catAbsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "report_card_subjects" ADD COLUMN     "midAbsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "report_card_subjects" ADD COLUMN     "eotAbsent" BOOLEAN NOT NULL DEFAULT false;
