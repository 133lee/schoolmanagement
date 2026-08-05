import { z } from "zod";

/**
 * Grade level enum validation
 */
export const gradeLevelSchema = z.enum([
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GRADE_6",
  "GRADE_7",
  "GRADE_8",
  "GRADE_9",
  "GRADE_10",
  "GRADE_11",
  "GRADE_12",
], {
  message: "Invalid grade level",
});

/**
 * Class status enum validation
 */
export const classStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"], {
  message: "Class status must be ACTIVE, INACTIVE, or ARCHIVED",
});

/**
 * Create class validation schema
 */
export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required")
    .max(50, "Class name must not exceed 50 characters")
    .transform((val) => val.trim()),
  gradeId: z.string().min(1, "Grade ID is required"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity must not exceed 100")
    .default(40),
  status: classStatusSchema.default("ACTIVE"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

/**
 * Update class validation schema (all fields optional except id)
 */
export const updateClassSchema = z.object({
  id: z.string().min(1, "Class ID is required"),
  name: z
    .string()
    .min(1, "Class name cannot be empty")
    .max(50, "Class name must not exceed 50 characters")
    .transform((val) => val.trim())
    .optional(),
  gradeId: z.string().min(1, "Grade ID cannot be empty").optional(),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity must not exceed 100")
    .optional(),
  status: classStatusSchema.optional(),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

/**
 * Class query/filter validation schema
 */
export const classQuerySchema = z.object({
  gradeId: z.string().optional(),
  status: classStatusSchema.optional(),
  academicYearId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ClassQueryInput = z.infer<typeof classQuerySchema>;

/**
 * Get class roster validation schema
 */
export const classRosterSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
});

export type ClassRosterInput = z.infer<typeof classRosterSchema>;
