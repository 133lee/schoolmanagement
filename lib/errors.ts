/**
 * Centralized Error Classes
 * Used across all service layers for consistent error handling
 */

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string = "Validation error") {
    super(message);
    this.name = "ValidationError";
  }
}

export class DuplicateError extends Error {
  constructor(message: string = "Duplicate record") {
    super(message);
    this.name = "DuplicateError";
  }
}

export class ConflictError extends Error {
  constructor(message: string = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}
