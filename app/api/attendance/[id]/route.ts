import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/attendance/[id]
 * Get attendance record by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const record = await attendanceRecordService.getAttendanceWithRelations(id, context);

      return ApiResponse.success(record);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/attendance/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/attendance/[id]
 * Update attendance record
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { status, remarks } = body;

      const record = await attendanceRecordService.updateAttendance(
        id,
        { status, remarks },
        context
      );

      return ApiResponse.success(record);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/attendance/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/attendance/[id]
 * Delete attendance record
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await attendanceRecordService.deleteAttendance(id, context);

      return ApiResponse.noContent();
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/attendance/${(await params).id}`,
      });
    }
  }
);
