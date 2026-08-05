import { z } from "zod";

/**
 * Create subject validation schema
 */
export const createSubjectSchema = z.object({
  code: z
    .string()
    .min(2, "Subject code must be at least 2 characters")
    .max(10, "Subject code must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Subject code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .min(2, "Subject name must be at least 2 characters")
    .max(100, "Subject name must not exceed 100 characters")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  departmentId: z.string().optional().nullable(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/**
 * Update subject validation schema (all fields optional except id)
 */
export const updateSubjectSchema = z.object({
  id: z.string().min(1, "Subject ID is required"),
  code: z
    .string()
    .min(2, "Subject code must be at least 2 characters")
    .max(10, "Subject code must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Subject code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase())
    .optional(),
  name: z
    .string()
    .min(2, "Subject name must be at least 2 characters")
    .max(100, "Subject name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  departmentId: z.string().optional().nullable(),
});

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

/**
 * Assign subject to grade validation schema
 */
export const assignSubjectToGradeSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  gradeId: z.string().min(1, "Grade ID is required"),
  isCore: z.boolean().default(true),
});

export type AssignSubjectToGradeInput = z.infer<typeof assignSubjectToGradeSchema>;

/**
 * Subject period requirement validation schema
 */
export const subjectPeriodRequirementSchema = z.object({
  gradeId: z.string().min(1, "Grade ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  periodsPerWeek: z
    .number()
    .int("Periods per week must be a whole number")
    .min(1, "Periods per week must be at least 1")
    .max(15, "Periods per week must not exceed 15"),
});

export type SubjectPeriodRequirementInput = z.infer<typeof subjectPeriodRequirementSchema>;

/**
 * Subject query/filter validation schema
 */
export const subjectQuerySchema = z.object({
  departmentId: z.string().optional(),
  gradeId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SubjectQueryInput = z.infer<typeof subjectQuerySchema>;
