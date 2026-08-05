import { z } from "zod";

/**
 * Department status enum validation
 */
export const departmentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"], {
  message: "Department status must be ACTIVE, INACTIVE, or ARCHIVED",
});

/**
 * Create department validation schema
 */
export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100, "Department name must not exceed 100 characters")
    .transform((val) => val.trim()),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10, "Department code must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Department code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase()),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  status: departmentStatusSchema.default("ACTIVE"),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

/**
 * Update department validation schema (all fields optional except id)
 */
export const updateDepartmentSchema = z.object({
  id: z.string().min(1, "Department ID is required"),
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100, "Department name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10, "Department code must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Department code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase())
    .optional(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  status: departmentStatusSchema.optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

/**
 * Department query/filter validation schema
 */
export const departmentQuerySchema = z.object({
  status: departmentStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type DepartmentQueryInput = z.infer<typeof departmentQuerySchema>;
