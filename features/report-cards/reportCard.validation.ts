import { z } from "zod";
import { PromotionStatus } from "@/types/prisma-enums";

/**
 * Body for DELETE /api/report-cards/bulk.
 *
 * Exactly one mode must be given:
 * - `ids`: an explicit selection (what the row checkboxes produce).
 * - `filters`: "delete everything matching this filter set" (the class-wide
 *   delete and "select all N matching these filters"), so a selection isn't
 *   capped to whichever page happens to be loaded.
 *
 * Whether a filter set is *scoped enough* to delete by is a business rule and
 * is enforced in the service, not here — this only guarantees shape.
 */
export const bulkDeleteReportCardsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).optional(),
    filters: z
      .object({
        studentId: z.string().min(1).optional(),
        classId: z.string().min(1).optional(),
        termId: z.string().min(1).optional(),
        academicYearId: z.string().min(1).optional(),
        promotionStatus: z.nativeEnum(PromotionStatus).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((body) => (body.ids ? 1 : 0) + (body.filters ? 1 : 0) === 1, {
    message: "Provide either ids or filters, not both and not neither",
  });

export type BulkDeleteReportCardsInput = z.infer<typeof bulkDeleteReportCardsSchema>;
