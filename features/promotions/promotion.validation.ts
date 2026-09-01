import { z } from "zod";

/**
 * Evaluate-class-for-promotion query validation schema
 */
export const evaluateQuerySchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
});

export type EvaluateQueryInput = z.infer<typeof evaluateQuerySchema>;

/**
 * Execute-promotions body validation schema
 */
export const promotionActionSchema = z.enum(
  ["PROMOTE", "REPEAT", "GRADUATE", "SKIP"],
  { message: "Invalid promotion action" }
);

export const promotionEntrySchema = z
  .object({
    studentId: z.string().min(1, "Student ID is required"),
    action: promotionActionSchema,
    targetClassId: z.string().min(1).optional(),
  })
  .refine(
    (entry) =>
      entry.action !== "PROMOTE" && entry.action !== "REPEAT"
        ? true
        : !!entry.targetClassId,
    {
      message: "targetClassId is required when action is PROMOTE or REPEAT",
      path: ["targetClassId"],
    }
  );

export const executeBodySchema = z.object({
  sourceClassId: z.string().min(1, "Source class ID is required"),
  targetAcademicYearId: z.string().min(1, "Target academic year ID is required"),
  remarks: z.string().max(500, "Remarks must not exceed 500 characters").optional(),
  promotions: z
    .array(promotionEntrySchema)
    .min(1, "At least one promotion entry is required"),
});

export type ExecuteBodyInput = z.infer<typeof executeBodySchema>;
