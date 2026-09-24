import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { smsService } from "@/features/sms/sms.service";
import { logger } from "@/lib/logger/logger";
import { Role, SMSStatus, SMSProvider } from "@/types/prisma-enums";

/**
 * GET /api/sms/logs
 *
 * Get SMS logs with filters and pagination
 *
 * Query params:
 * - page?: number (default: 1)
 * - pageSize?: number (default: 20)
 * - status?: SMSStatus
 * - guardianId?: string
 * - studentId?: string
 * - provider?: SMSProvider
 * - dateFrom?: ISO date string
 * - dateTo?: ISO date string
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;

      const filters = {
        status: (searchParams.get("status") as SMSStatus | null) ?? undefined,
        guardianId: searchParams.get("guardianId") || undefined,
        studentId: searchParams.get("studentId") || undefined,
        provider: (searchParams.get("provider") as SMSProvider | null) ?? undefined,
        dateFrom: searchParams.get("dateFrom")
          ? new Date(searchParams.get("dateFrom")!)
          : undefined,
        dateTo: searchParams.get("dateTo")
          ? new Date(searchParams.get("dateTo")!)
          : undefined,
      };

      const pagination = {
        page: parseInt(searchParams.get("page") || "1"),
        pageSize: parseInt(searchParams.get("pageSize") || "20"),
      };

      logger.logRequest("GET", "/api/sms/logs", user.userId, {
        filters,
        pagination,
      });

      const result = await smsService.getSMSLogs(
        filters,
        pagination,
        {
          userId: user.userId,
          role: user.role as Role,
        }
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: "/api/sms/logs",
      });
    }
  })(request);
}
