import { z } from "zod";

/**
 * Enrollment status enum validation
 */
export const enrollmentStatusSchema = z.enum([
  "ACTIVE",
  "COMPLETED",
  "TRANSFERRED",
  "WITHDRAWN",
], {
  message: "Invalid enrollment status",
});

/**
 * Create enrollment validation schema
 */
export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  enrollmentDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid enrollment date")
    .refine((date) => date <= new Date(), "Enrollment date cannot be in the future")
    .optional()
    .default(new Date()),
  status: enrollmentStatusSchema.default("ACTIVE"),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

/**
 * Update enrollment validation schema (all fields optional except id)
 */
export const updateEnrollmentSchema = z.object({
  id: z.string().min(1, "Enrollment ID is required"),
  classId: z.string().min(1, "Class ID cannot be empty").optional(),
  status: enrollmentStatusSchema.optional(),
  enrollmentDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid enrollment date")
    .refine((date) => date <= new Date(), "Enrollment date cannot be in the future")
    .optional(),
});

export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;

/**
 * Bulk enrollment validation schema
 */
export const bulkEnrollmentSchema = z.object({
  studentIds: z
    .array(z.string().min(1, "Student ID cannot be empty"))
    .min(1, "At least one student ID is required")
    .max(100, "Cannot enroll more than 100 students at once"),
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  enrollmentDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid enrollment date")
    .refine((date) => date <= new Date(), "Enrollment date cannot be in the future")
    .optional()
    .default(new Date()),
});

export type BulkEnrollmentInput = z.infer<typeof bulkEnrollmentSchema>;

/**
 * Transfer enrollment validation schema
 * Backs PATCH /api/enrollments/[id] — the enrollment ID comes from the URL,
 * so it isn't part of the body.
 */
export const transferEnrollmentSchema = z.object({
  classId: z.string().min(1, "New class ID is required"),
  // Genuinely optional, matching the transfer dialog's "(Optional)" label —
  // no minimum length, just a sanity cap against abuse.
  changeReason: z
    .string()
    .max(500, "Transfer reason must not exceed 500 characters")
    .optional(),
});

export type TransferEnrollmentInput = z.infer<typeof transferEnrollmentSchema>;

/**
 * Enrollment query/filter validation schema
 */
export const enrollmentQuerySchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  status: enrollmentStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type EnrollmentQueryInput = z.infer<typeof enrollmentQuerySchema>;
