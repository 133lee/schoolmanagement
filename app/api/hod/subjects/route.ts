import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodService } from "@/features/hod/hod.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/hod/subjects
 * - Default: paginated subjects (management tables)
 * - mode=all: all subjects (dropdowns, selectors, configs)
 *
 * Get subjects in HOD's department
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/subjects", user.userId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const mode = searchParams.get("mode"); // 👈 "all" or null

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const subjects = await hodService.getAllSubjects(user.userId, search);

      return ApiResponse.success(subjects);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await hodService.getSubjects(user.userId, search, {
      page,
      pageSize,
    });

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/subjects",
    });
  }
});
