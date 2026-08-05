import { z } from "zod";

/**
 * Gender enum validation
 */
export const genderSchema = z.enum(["MALE", "FEMALE"], {
  message: "Gender must be either MALE or FEMALE",
});

/**
 * Role enum validation
 */
export const roleSchema = z.enum([
  "ADMIN",
  "HEAD_TEACHER",
  "DEPUTY_HEAD",
  "HOD",
  "TEACHER",
  "CLERK",
], {
  message: "Invalid role",
});

/**
 * Staff status enum validation
 */
export const staffStatusSchema = z.enum([
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "TERMINATED",
  "RETIRED",
], {
  message: "Invalid staff status",
});

/**
 * Qualification level enum validation
 */
export const qualificationLevelSchema = z.enum([
  "CERTIFICATE",
  "DIPLOMA",
  "DEGREE",
  "MASTERS",
  "DOCTORATE",
], {
  message: "Invalid qualification level",
});

/**
 * Create teacher validation schema
 */
export const createTeacherSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: roleSchema.default("TEACHER"),
  staffNumber: z
    .string()
    .min(1, "Staff number is required")
    .max(50, "Staff number must not exceed 50 characters")
    .regex(/^[A-Z0-9-]+$/, "Staff number must contain only uppercase letters, numbers, and hyphens"),
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
        return age >= 18 && age <= 70;
      },
      "Teacher must be between 18 and 70 years old"
    ),
  gender: genderSchema,
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^(\+260|0)[0-9]{9}$/, "Invalid Zambian phone number format (e.g., +260977123456 or 0977123456)"),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  qualification: qualificationLevelSchema,
  yearsExperience: z
    .number()
    .int("Years of experience must be a whole number")
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience must not exceed 50")
    .default(0),
  status: staffStatusSchema.default("ACTIVE"),
  hireDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid hire date")
    .refine((date) => date <= new Date(), "Hire date cannot be in the future"),
  departmentId: z.string().optional().nullable(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

/**
 * Update teacher validation schema (all fields optional except id)
 */
export const updateTeacherSchema = z.object({
  id: z.string().min(1, "Teacher ID is required"),
  email: z
    .string()
    .min(1, "Email cannot be empty")
    .email("Invalid email address")
    .transform((val) => val.toLowerCase())
    .optional(),
  role: roleSchema.optional(),
  staffNumber: z
    .string()
    .min(1, "Staff number cannot be empty")
    .max(50, "Staff number must not exceed 50 characters")
    .regex(/^[A-Z0-9-]+$/, "Staff number must contain only uppercase letters, numbers, and hyphens")
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
        return age >= 18 && age <= 70;
      },
      "Teacher must be between 18 and 70 years old"
    )
    .optional(),
  gender: genderSchema.optional(),
  phone: z
    .string()
    .min(1, "Phone number cannot be empty")
    .regex(/^(\+260|0)[0-9]{9}$/, "Invalid Zambian phone number format (e.g., +260977123456 or 0977123456)")
    .optional(),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .nullable(),
  qualification: qualificationLevelSchema.optional(),
  yearsExperience: z
    .number()
    .int("Years of experience must be a whole number")
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience must not exceed 50")
    .optional(),
  status: staffStatusSchema.optional(),
  hireDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid hire date")
    .refine((date) => date <= new Date(), "Hire date cannot be in the future")
    .optional(),
  departmentId: z.string().optional().nullable(),
});

export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

/**
 * Assign teacher to class validation schema
 */
export const assignTeacherToClassSchema = z.object({
  teacherId: z.string().min(1, "Teacher ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
});

export type AssignTeacherToClassInput = z.infer<typeof assignTeacherToClassSchema>;

/**
 * Assign teacher to subject validation schema
 */
export const assignTeacherToSubjectSchema = z.object({
  teacherId: z.string().min(1, "Teacher ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
});

export type AssignTeacherToSubjectInput = z.infer<typeof assignTeacherToSubjectSchema>;

/**
 * Add teacher subject qualification validation schema
 */
export const addTeacherSubjectSchema = z.object({
  teacherId: z.string().min(1, "Teacher ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
});

export type AddTeacherSubjectInput = z.infer<typeof addTeacherSubjectSchema>;

/**
 * Teacher query/filter validation schema
 */
export const teacherQuerySchema = z.object({
  status: staffStatusSchema.optional(),
  role: roleSchema.optional(),
  departmentId: z.string().optional(),
  qualification: qualificationLevelSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type TeacherQueryInput = z.infer<typeof teacherQuerySchema>;
