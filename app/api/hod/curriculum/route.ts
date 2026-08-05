import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { hodCurriculumService } from "@/features/hod/hodCurriculum.service";

/**
 * GET /api/hod/curriculum
 *
 * Fetches ClassSubjects (curriculum items) for the HOD's department.
 * This is the SOURCE OF TRUTH for what subjects a class offers.
 *
 * Returns curriculum items that can be used for teacher assignments.
 * Only returns subjects in the HOD's department and secondary grades (8-12).
 *
 * Query Parameters:
 * - academicYearId: Filter by academic year (optional, uses active year if not provided)
 * - classId: Filter by specific class (optional)
 * - unassignedOnly: If "true", only return curriculum items without teacher assignments
 * - includeAssignments: If "true", include current teacher assignments
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/curriculum", user.userId);

    const { searchParams } = new URL(request.url);

    const result = await hodCurriculumService.getDepartmentCurriculum(user.userId, {
      classId: searchParams.get("classId") || undefined,
      unassignedOnly: searchParams.get("unassignedOnly") === "true",
      includeAssignments: searchParams.get("includeAssignments") === "true",
      academicYearId: searchParams.get("academicYearId") || undefined,
    });

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/curriculum",
    });
  }
});
