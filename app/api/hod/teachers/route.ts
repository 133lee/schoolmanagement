import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodService } from "@/features/hod/hod.service";
import { logger } from "@/lib/logger/logger";
import { StaffStatus, Gender, QualificationLevel } from "@prisma/client";

/**
 * GET /api/hod/teachers
 * - Default: paginated teachers (management tables)
 * - mode=all: all teachers (dropdowns, selectors, configs)
 *
 * Get teachers in HOD's department
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/teachers", user.userId);

    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("mode"); // 👈 "all" or null

    // Parse filters
    const filters: {
      status?: StaffStatus;
      gender?: Gender;
      qualification?: QualificationLevel;
      search?: string;
    } = {};
    if (searchParams.get("status")) {
      filters.status = searchParams.get("status") as StaffStatus;
    }
    if (searchParams.get("gender")) {
      filters.gender = searchParams.get("gender") as Gender;
    }
    if (searchParams.get("qualification")) {
      filters.qualification = searchParams.get("qualification") as QualificationLevel;
    }
    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const teachers = await hodService.getAllTeachers(
        user.userId,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      return ApiResponse.success(teachers);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await hodService.getTeachers(user.userId, filters, {
      page,
      pageSize,
    });

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/teachers",
    });
  }
});
