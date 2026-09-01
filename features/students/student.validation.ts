import { z } from "zod";

/**
 * Gender enum validation
 */
export const genderSchema = z.enum(["MALE", "FEMALE"], {
  message: "Gender must be either MALE or FEMALE",
});

/**
 * Student status enum validation
 */
export const studentStatusSchema = z.enum([
  "ACTIVE",
  "TRANSFERRED",
  "GRADUATED",
  "WITHDRAWN",
  "DECEASED",
  "SUSPENDED",
], {
  message: "Invalid student status",
});

/**
 * Vulnerability status enum validation
 */
export const vulnerabilityStatusSchema = z.enum([
  "NOT_VULNERABLE",
  "ORPHAN",
  "VULNERABLE_CHILD",
  "SPECIAL_NEEDS",
  "UNDER_FIVE_INITIATIVE",
], {
  message: "Invalid vulnerability status",
});

/**
 * Create student validation schema
 */
export const createStudentSchema = z.object({
  studentNumber: z
    .string()
    .min(1, "Student number is required")
    .max(50, "Student number must not exceed 50 characters")
    .regex(/^STU-\d{4}-\d{4}$/, "Student number must follow format: STU-YYYY-NNNN (e.g., STU-2024-0001)"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must not exceed 100 characters")
    .transform((val) => val.trim()),
  middleName: z
    .string()
    .max(100, "Middle name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must not exceed 100 characters")
    .transform((val) => val.trim()),
  dateOfBirth: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date of birth")
    .refine((date) => date < new Date(), "Date of birth must be in the past")
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 3 && age <= 50;
      },
      "Student must be between 3 and 50 years old"
    ),
  gender: genderSchema,
  admissionDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid admission date")
    .refine((date) => date <= new Date(), "Admission date cannot be in the future"),
  status: studentStatusSchema.default("ACTIVE"),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  medicalInfo: z
    .string()
    .max(1000, "Medical information must not exceed 1000 characters")
    .optional()
    .nullable(),
  vulnerability: vulnerabilityStatusSchema.default("NOT_VULNERABLE"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/**
 * Update student validation schema (all fields optional except id)
 */
export const updateStudentSchema = z.object({
  id: z.string().min(1, "Student ID is required"),
  studentNumber: z
    .string()
    .min(1, "Student number cannot be empty")
    .max(50, "Student number must not exceed 50 characters")
    .regex(/^STU-\d{4}-\d{4}$/, "Student number must follow format: STU-YYYY-NNNN (e.g., STU-2024-0001)")
    .optional(),
  firstName: z
    .string()
    .min(1, "First name cannot be empty")
    .max(100, "First name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  middleName: z
    .string()
    .max(100, "Middle name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  lastName: z
    .string()
    .min(1, "Last name cannot be empty")
    .max(100, "Last name must not exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  dateOfBirth: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date of birth")
    .refine((date) => date < new Date(), "Date of birth must be in the past")
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 3 && age <= 50;
      },
      "Student must be between 3 and 50 years old"
    )
    .optional(),
  gender: genderSchema.optional(),
  admissionDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid admission date")
    .refine((date) => date <= new Date(), "Admission date cannot be in the future")
    .optional(),
  status: studentStatusSchema.optional(),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  medicalInfo: z
    .string()
    .max(1000, "Medical information must not exceed 1000 characters")
    .optional()
    .nullable(),
  vulnerability: vulnerabilityStatusSchema.optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/**
 * Student status change validation schema
 */
export const changeStudentStatusSchema = z.object({
  id: z.string().min(1, "Student ID is required"),
  status: studentStatusSchema,
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must not exceed 500 characters")
    .optional(),
});

export type ChangeStudentStatusInput = z.infer<typeof changeStudentStatusSchema>;

/**
 * Student query/filter validation schema
 */
export const studentQuerySchema = z.object({
  status: studentStatusSchema.optional(),
  gradeId: z.string().optional(),
  classId: z.string().optional(),
  gender: genderSchema.optional(),
  vulnerability: vulnerabilityStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type StudentQueryInput = z.infer<typeof studentQuerySchema>;
