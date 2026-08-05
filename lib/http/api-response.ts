import { NextResponse } from "next/server";

/**
 * Standardized API Response Utility
 *
 * Provides consistent response formatting across all API endpoints.
 * Ensures uniform structure for success and error responses.
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export class ApiResponse {
  /**
   * Success response (200 OK)
   * @param data - The response data
   * @param meta - Optional metadata (pagination, etc.)
   */
  static success<T>(data: T, meta?: ApiSuccessResponse<T>["meta"]): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({ success: true, data, ...(meta && { meta }) });
  }

  /**
   * Created response (201 Created)
   * @param data - The created resource
   */
  static created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  /**
   * No content response (204 No Content)
   * Used for successful DELETE operations
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Bad request error (400 Bad Request)
   * @param message - Error message
   * @param details - Optional error details (validation errors, etc.)
   */
  static badRequest(message: string = "Bad request", details?: any): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      { success: false, error: message, ...(details && { details }) },
      { status: 400 }
    );
  }

  /**
   * Unauthorized error (401 Unauthorized)
   * @param message - Error message
   */
  static unauthorized(message: string = "Unauthorized"): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  /**
   * Forbidden error (403 Forbidden)
   * @param message - Error message
   */
  static forbidden(message: string = "Forbidden"): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }

  /**
   * Not found error (404 Not Found)
   * @param message - Error message
   */
  static notFound(message: string = "Resource not found"): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }

  /**
   * Conflict error (409 Conflict)
   * @param message - Error message
   */
  static conflict(message: string = "Resource conflict", details?: any): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      { success: false, error: message, ...(details && { details }) },
      { status: 409 }
    );
  }

  /**
   * Internal server error (500 Internal Server Error)
   * @param message - Error message
   * @param details - Optional error details (for debugging)
   */
  static internalError(
    message: string = "Internal server error",
    details?: any
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      { success: false, error: message, ...(details && { details }) },
      { status: 500 }
    );
  }

  /**
   * Generic error response with custom status code
   * @param message - Error message
   * @param status - HTTP status code
   * @param details - Optional error details
   */
  static error(message: string, status: number, details?: any): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      { success: false, error: message, ...(details && { details }) },
      { status }
    );
  }
}
