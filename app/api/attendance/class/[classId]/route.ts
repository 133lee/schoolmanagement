import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/attendance/class/[classId]
 * Get attendance for a class on a specific date
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { classId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const searchParams = request.nextUrl.searchParams;
      const dateParam = searchParams.get("date");

      if (!dateParam) {
        return ApiResponse.badRequest("Date parameter is required");
      }

      const records = await attendanceRecordService.getClassAttendance(
        classId,
        new Date(dateParam),
        context
      );

      return ApiResponse.success(records);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/attendance/class/${(await params).classId}`,
      });
    }
  }
);
