/**
 * Custom API Error Classes
 *
 * Provides typed error classes for consistent error handling
 * across the application. These errors map directly to HTTP
 * status codes and standardized error responses.
 */

/**
 * Base API Error class
 * All custom API errors extend this class
 */
export class ApiError extends Error {
  constructor(
    public override message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 * Used for invalid client input or malformed requests
 */
export class BadRequestError extends ApiError {
  constructor(message: string = "Bad request", details?: any) {
    super(message, 400, details);
  }
}

/**
 * 401 Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 * Used when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

/**
 * 409 Conflict
 * Used when request conflicts with current state (duplicate entries, etc.)
 */
export class ConflictError extends ApiError {
  constructor(message: string = "Resource conflict") {
    super(message, 409);
  }
}

/**
 * 422 Unprocessable Entity
 * Used for validation errors (semantic errors in well-formed requests)
 */
export class ValidationError extends ApiError {
  constructor(message: string = "Validation error", details?: any) {
    super(message, 422, details);
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = "Internal server error", details?: any) {
    super(message, 500, details);
  }
}

/**
 * 503 Service Unavailable
 * Used when service is temporarily unavailable
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = "Service unavailable") {
    super(message, 503);
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
