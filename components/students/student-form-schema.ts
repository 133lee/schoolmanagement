import { z } from "zod";
import { Gender, StudentStatus, VulnerabilityStatus } from "@/types/prisma-enums";

/**
 * Student Form Validation Schema
 *
 * Validates student data for create/update operations.
 * Matches backend validation in StudentService.
 */
export const studentFormSchema = z.object({
  // Step 1: Personal Information
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

  gender: z.nativeEnum(Gender, {
    message: "Please select a gender"
  }),

  dateOfBirth: z.date({
    message: "Date of birth is required"
  }).refine((date) => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 25);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 3);
    return date >= minDate && date <= maxDate;
  }, "Student must be between 3 and 25 years old"),

  // Step 2: Student Details
  studentNumber: z
    .string()
    .min(1, "Student number is required")
    .regex(/^STU-\d{4}-\d{4}$/, "Invalid student number format (STU-YYYY-NNNN)"),

  admissionDate: z.date({
    message: "Admission date is required"
  }).refine((date) => date <= new Date(), "Admission date cannot be in the future"),

  status: z.nativeEnum(StudentStatus),

  vulnerability: z.nativeEnum(VulnerabilityStatus),

  // Step 3: Contact & Medical
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
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
