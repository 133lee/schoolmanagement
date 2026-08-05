/**
 * Subject Validation Configuration
 *
 * Controls how department changes are validated for subjects.
 *
 * APPROACH_B_WARNING:
 * - Shows a confirmation dialog with usage details
 * - Allows admin to proceed after acknowledging the impact
 * - Recommended for most schools (flexible but safe)
 *
 * APPROACH_C_STRICT:
 * - Blocks department changes if subject is in use
 * - Forces admin to clean up relationships first
 * - Recommended for large schools with strict audit requirements
 */

export type SubjectValidationMode = "APPROACH_B_WARNING" | "APPROACH_C_STRICT";

export const SUBJECT_VALIDATION_MODE: SubjectValidationMode = "APPROACH_B_WARNING";

/**
 * Toggle this to switch validation modes:
 *
 * - "APPROACH_B_WARNING": Show warning dialog, allow changes
 * - "APPROACH_C_STRICT": Block changes if subject is in use
 *
 * Default: APPROACH_C_STRICT (most secure)
 */
