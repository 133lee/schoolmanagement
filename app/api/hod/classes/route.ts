import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodService } from "@/features/hod/hod.service";
import { logger } from "@/lib/logger/logger";
import { ClassStatus } from "@prisma/client";

/**
 * GET /api/hod/classes
 *
 * Get classes filtered to secondary grades (8-12) only.
 * This endpoint is specifically for HODs who manage secondary school subjects.
 *
 * Golden Rule: HOD manages secondary grades (8-12) only.
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/classes", user.userId);

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: {
      status?: ClassStatus;
      gradeId?: string;
      search?: string;
    } = {};

    if (searchParams.get("status")) {
      filters.status = searchParams.get("status") as ClassStatus;
    }
    if (searchParams.get("gradeId")) {
      filters.gradeId = searchParams.get("gradeId") ?? undefined;
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search") ?? undefined;
    }

    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await hodService.getClasses(user.userId, filters, {
      page,
      pageSize,
    });

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/classes",
    });
  }
});
