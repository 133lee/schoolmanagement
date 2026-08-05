import prisma from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/http/errors";
import { ExamType } from "@/types/prisma-enums";

export interface UpsertAssessmentWindowInput {
  termId: string;
  examType: string;
  opensAt: string;
  closesAt: string;
  createdBy: string;
}

/**
 * Assessment Window Service
 *
 * Admin/head-teacher-configured open/close windows that gate when teachers
 * may enter marks for a given term + exam type.
 */
export class AssessmentWindowService {
  async getAll(termId?: string) {
    return prisma.assessmentWindow.findMany({
      where: termId ? { termId } : undefined,
      include: { term: { include: { academicYear: true } } },
      orderBy: [{ termId: "asc" }, { examType: "asc" }],
    });
  }

  async upsert(input: UpsertAssessmentWindowInput) {
    const { termId, examType, opensAt, closesAt, createdBy } = input;

    if (!termId) throw new ValidationError("termId is required");
    if (!examType || !["CAT", "MID", "EOT"].includes(examType)) {
      throw new ValidationError("examType must be CAT, MID, or EOT");
    }
    if (!opensAt) throw new ValidationError("opensAt is required");
    if (!closesAt) throw new ValidationError("closesAt is required");

    const opens = new Date(opensAt);
    const closes = new Date(closesAt);

    if (isNaN(opens.getTime())) throw new ValidationError("opensAt is not a valid date");
    if (isNaN(closes.getTime())) throw new ValidationError("closesAt is not a valid date");
    if (closes <= opens) throw new ValidationError("closesAt must be after opensAt");

    return prisma.assessmentWindow.upsert({
      where: { termId_examType: { termId, examType: examType as ExamType } },
      create: { termId, examType: examType as ExamType, opensAt: opens, closesAt: closes, createdBy },
      update: { opensAt: opens, closesAt: closes },
      include: { term: { include: { academicYear: true } } },
    });
  }

  async delete(id: string) {
    const existing = await prisma.assessmentWindow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Assessment window not found");

    await prisma.assessmentWindow.delete({ where: { id } });
  }

  /**
   * Returns the configured window for a term+examType and its current
   * open/closed state, for the teacher-facing entry-gating check.
   */
  async getWindowState(termId: string, examType: string) {
    if (!termId || !examType) {
      return { state: "not_configured" as const, window: null };
    }

    const window = await prisma.assessmentWindow.findUnique({
      where: { termId_examType: { termId, examType: examType as ExamType } },
    });

    if (!window) {
      return { state: "not_configured" as const, window: null };
    }

    const now = new Date();
    let state: "before_open" | "open" | "closed";
    if (now < window.opensAt) state = "before_open";
    else if (now <= window.closesAt) state = "open";
    else state = "closed";

    return { state, window };
  }
}

export const assessmentWindowService = new AssessmentWindowService();
