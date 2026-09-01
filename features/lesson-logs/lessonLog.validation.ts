import { z } from "zod";

/**
 * Log-a-lesson validation schema
 */
export const logLessonSchema = z.object({
  timetableSlotId: z.string().min(1, "Timetable slot ID is required"),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date"),
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(300, "Topic must not exceed 300 characters")
    .transform((val) => val.trim()),
  subtopics: z
    .string()
    .max(1000, "Subtopics must not exceed 1000 characters")
    .transform((val) => val.trim())
    .optional(),
});

export type LogLessonInput = z.infer<typeof logLessonSchema>;

/**
 * Query schema shared by the lesson-log lookup, remedial view, and remedial
 * PDF endpoints — all keyed by the same slot + date.
 */
export const slotDateQuerySchema = z.object({
  timetableSlotId: z.string().min(1, "Timetable slot ID is required"),
  date: z
    .string()
    .min(1, "Date is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date"),
});

export type SlotDateQueryInput = z.infer<typeof slotDateQuerySchema>;
