import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/http/api-response";
import { isApiError, ValidationError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";
import { Prisma } from "@prisma/client";
import {
  UnauthorizedError as LegacyUnauthorizedError,
  NotFoundError as LegacyNotFoundError,
  ValidationError as LegacyValidationError,
  ConflictError as LegacyConflictError,
  DuplicateError as LegacyDuplicateError,
} from "@/lib/errors";

/**
 * `@/lib/errors` and `@/lib/http/errors` are two separate, unrelated class
 * hierarchies that happen to share names (neither extends the other). Most
 * of the feature/service layer (117 files) throws from `@/lib/errors`; only
 * a handful of newer files throw from `@/lib/http/errors`. The block below
 * maps the legacy classes to the exact status codes every hand-written route
 * in this codebase already uses for them (verified against ~10 routes before
 * writing this), so migrating a route to `handleApiError` doesn't silently
 * change its error responses to a generic 500.
 */
function handleLegacyError(error: unknown): NextResponse | null {
  if (error instanceof LegacyUnauthorizedError) {
    return ApiResponse.error(error.message, 403);
  }
  if (error instanceof LegacyNotFoundError) {
    return ApiResponse.error(error.message, 404);
  }
  if (error instanceof LegacyValidationError) {
    return ApiResponse.error(error.message, 400);
  }
  if (error instanceof LegacyConflictError || error instanceof LegacyDuplicateError) {
    return ApiResponse.error(error.message, 409);
  }
  return null;
}

/**
 * Centralized Error Handler
 *
 * Converts various error types into standardized API responses
 * with proper HTTP status codes and logging.
 */

/**
 * Handle API errors and convert to standardized responses
 * 
 * @param error - The error to handle
 * @param context - Optional context for logging
 * @returns NextResponse with appropriate status code and error message
 */
export function handleApiError(error: unknown, context?: Record<string, any>): NextResponse {
  // Log the error
  if (error instanceof Error) {
    logger.error("API Error occurred", error, context);
  } else {
    logger.error("Unknown error occurred", undefined, { error, ...context });
  }

  // Handle custom API errors
  if (isApiError(error)) {
    return ApiResponse.error(error.message, error.status, error.details);
  }

  // Handle legacy (@/lib/errors) typed errors — see handleLegacyError for why
  // this exists as a separate hierarchy from ApiError.
  const legacyResponse = handleLegacyError(error);
  if (legacyResponse) {
    return legacyResponse;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return ApiResponse.badRequest("Invalid data provided", {
      type: "PrismaValidationError",
    });
  }

  // Handle Prisma initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error("Database connection failed", error as Error);
    return ApiResponse.internalError("Database connection error");
  }

  // Handle Prisma runtime errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    logger.error("Database panic error", error as Error);
    return ApiResponse.internalError("Database error");
  }

  // Handle validation errors
  if (error instanceof ValidationError) {
    return ApiResponse.error(error.message, 422, error.details);
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === "development";
    const message = isDevelopment
      ? error.message
      : "An unexpected error occurred";

    return ApiResponse.internalError(message, isDevelopment ? error.stack : undefined);
  }

  // Handle unknown errors
  return ApiResponse.internalError("An unexpected error occurred");
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    // Unique constraint violation
    case "P2002": {
      const target = error.meta?.target as string[] | undefined;
      const fields = target?.join(", ") || "field";
      return ApiResponse.conflict(
        `A record with this ${fields} already exists`,
        { fields: target }
      );
    }

    // Foreign key constraint violation
    case "P2003": {
      const field = error.meta?.field_name as string | undefined;
      return ApiResponse.badRequest(
        `Invalid reference: ${field || "related record"} does not exist`,
        { field }
      );
    }

    // Record not found
    case "P2025": {
      return ApiResponse.notFound("Record not found");
    }

    // Record to delete does not exist
    case "P2018":
      return ApiResponse.notFound("Record not found for deletion");

    // Required field missing
    case "P2011": {
      const constraint = error.meta?.constraint as string | undefined;
      return ApiResponse.badRequest(
        `Missing required field: ${constraint || "unknown"}`,
        { constraint }
      );
    }

    // Value too long
    case "P2000": {
      const column = error.meta?.column_name as string | undefined;
      return ApiResponse.badRequest(
        `Value too long for field: ${column || "unknown"}`,
        { column }
      );
    }

    // Query interpretation error
    case "P2009":
      return ApiResponse.badRequest("Invalid query parameters");

    // Database timeout
    case "P1008":
      logger.error("Database timeout", error);
      return ApiResponse.internalError("Request timeout");

    // Default case for other Prisma errors
    default:
      logger.error("Unhandled Prisma error", error, { code: error.code });
      return ApiResponse.internalError("Database error", { code: error.code });
  }
}

/**
 * Async error handler wrapper for route handlers
 * 
 * Usage:
 * export const GET = asyncHandler(async (request) => {
 *   // If any error is thrown, it will be caught and handled
 *   const data = await riskyOperation();
 *   return ApiResponse.success(data);
 * });
 * 
 * @param handler - The async route handler
 * @returns Wrapped handler with error handling
 */
export function asyncHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, {
        handler: handler.name,
        args: args.length,
      });
    }
  }) as T;
}
