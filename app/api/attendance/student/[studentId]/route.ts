import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/attendance/student/[studentId]
 * Get attendance history for a student
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { studentId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const searchParams = request.nextUrl.searchParams;
      const termId = searchParams.get("termId") || undefined;

      const records = await attendanceRecordService.getStudentAttendance(studentId, termId, context);

      return ApiResponse.success(records);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/attendance/student/${(await params).studentId}`,
      });
    }
  }
);
