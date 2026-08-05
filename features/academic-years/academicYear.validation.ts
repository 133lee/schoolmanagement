import { z } from "zod";

/**
 * Term type enum validation
 */
export const termTypeSchema = z.enum(["TERM_1", "TERM_2", "TERM_3"], {
  message: "Term type must be TERM_1, TERM_2, or TERM_3",
});

/**
 * Create academic year validation schema
 */
export const createAcademicYearSchema = z.object({
  year: z
    .number()
    .int("Year must be a whole number")
    .min(2000, "Year must be 2000 or later")
    .max(2100, "Year must be 2100 or earlier"),
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid start date"),
  endDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid end date"),
  isActive: z.boolean().default(false),
  isClosed: z.boolean().default(false),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    const duration = data.endDate.getTime() - data.startDate.getTime();
    const daysInYear = 365 * 24 * 60 * 60 * 1000;
    return duration >= (200 * 24 * 60 * 60 * 1000) && duration <= (daysInYear * 1.5);
  },
  {
    message: "Academic year must be between 200 days and 1.5 years",
    path: ["endDate"],
  }
);

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

/**
 * Update academic year validation schema (all fields optional except id)
 */
export const updateAcademicYearSchema = z.object({
  id: z.string().min(1, "Academic year ID is required"),
  year: z
    .number()
    .int("Year must be a whole number")
    .min(2000, "Year must be 2000 or later")
    .max(2100, "Year must be 2100 or earlier")
    .optional(),
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid start date")
    .optional(),
  endDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid end date")
    .optional(),
  isActive: z.boolean().optional(),
  isClosed: z.boolean().optional(),
});

export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

/**
 * Create term validation schema
 */
export const createTermSchema = z.object({
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termType: termTypeSchema,
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid start date"),
  endDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid end date"),
  isActive: z.boolean().default(false),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    const duration = data.endDate.getTime() - data.startDate.getTime();
    const minDuration = 60 * 24 * 60 * 60 * 1000; // 60 days
    const maxDuration = 120 * 24 * 60 * 60 * 1000; // 120 days
    return duration >= minDuration && duration <= maxDuration;
  },
  {
    message: "Term duration must be between 60 and 120 days",
    path: ["endDate"],
  }
);

export type CreateTermInput = z.infer<typeof createTermSchema>;

/**
 * Update term validation schema (all fields optional except id)
 */
export const updateTermSchema = z.object({
  id: z.string().min(1, "Term ID is required"),
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid start date")
    .optional(),
  endDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid end date")
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTermInput = z.infer<typeof updateTermSchema>;

/**
 * Activate academic year validation schema
 */
export const activateAcademicYearSchema = z.object({
  id: z.string().min(1, "Academic year ID is required"),
});

export type ActivateAcademicYearInput = z.infer<typeof activateAcademicYearSchema>;

/**
 * Close academic year validation schema
 */
export const closeAcademicYearSchema = z.object({
  id: z.string().min(1, "Academic year ID is required"),
  confirmation: z.literal(true, {
    message: "You must confirm closing the academic year",
  }),
});

export type CloseAcademicYearInput = z.infer<typeof closeAcademicYearSchema>;

/**
 * Academic year query/filter validation schema
 */
export const academicYearQuerySchema = z.object({
  isActive: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  year: z.number().int().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type AcademicYearQueryInput = z.infer<typeof academicYearQuerySchema>;
