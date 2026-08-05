import { z } from "zod";

/**
 * Parent relationship enum validation
 */
export const parentRelationshipSchema = z.enum([
  "MOTHER",
  "FATHER",
  "GUARDIAN",
  "GRANDPARENT",
  "SIBLING",
  "OTHER",
], {
  message: "Invalid parent relationship",
});

/**
 * Parent status enum validation
 */
export const parentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "DECEASED"], {
  message: "Parent status must be ACTIVE, INACTIVE, or DECEASED",
});

/**
 * Create guardian validation schema
 */
export const createGuardianSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must not exceed 100 characters")
    .transform((val) => val.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must not exceed 100 characters")
    .transform((val) => val.trim()),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^(\+260|0)[0-9]{9}$/, "Invalid Zambian phone number format (e.g., +260977123456 or 0977123456)"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((val) => val.toLowerCase())
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  occupation: z
    .string()
    .max(100, "Occupation must not exceed 100 characters")
    .optional()
    .nullable(),
  status: parentStatusSchema.default("ACTIVE"),
});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;

/**
 * Update guardian validation schema (all fields optional except id)
 */
export const updateGuardianSchema = z.object({
  id: z.string().min(1, "Guardian ID is required"),
  firstName: z
    .string()
    .min(1, "First name cannot be empty")
    .max(100, "First name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name cannot be empty")
    .max(100, "Last name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  phone: z
    .string()
    .min(1, "Phone number cannot be empty")
    .regex(/^(\+260|0)[0-9]{9}$/, "Invalid Zambian phone number format (e.g., +260977123456 or 0977123456)")
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .transform((val) => val.toLowerCase())
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  occupation: z
    .string()
    .max(100, "Occupation must not exceed 100 characters")
    .optional()
    .nullable(),
  status: parentStatusSchema.optional(),
});

export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;

/**
 * Link student to guardian validation schema
 */
export const linkStudentToGuardianSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  guardianId: z.string().min(1, "Guardian ID is required"),
  relationship: parentRelationshipSchema,
  isPrimary: z.boolean().default(false),
});

export type LinkStudentToGuardianInput = z.infer<typeof linkStudentToGuardianSchema>;

/**
 * Update student-guardian relationship validation schema
 */
export const updateStudentGuardianSchema = z.object({
  id: z.string().min(1, "Student-Guardian relationship ID is required"),
  relationship: parentRelationshipSchema.optional(),
  isPrimary: z.boolean().optional(),
});

export type UpdateStudentGuardianInput = z.infer<typeof updateStudentGuardianSchema>;

/**
 * Create guardian with student link validation schema
 * (Helper for creating a guardian and immediately linking to a student)
 */
export const createGuardianWithStudentSchema = createGuardianSchema.extend({
  studentId: z.string().min(1, "Student ID is required"),
  relationship: parentRelationshipSchema,
  isPrimary: z.boolean().default(false),
});

export type CreateGuardianWithStudentInput = z.infer<typeof createGuardianWithStudentSchema>;

/**
 * Guardian query/filter validation schema
 */
export const guardianQuerySchema = z.object({
  status: parentStatusSchema.optional(),
  studentId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type GuardianQueryInput = z.infer<typeof guardianQuerySchema>;
