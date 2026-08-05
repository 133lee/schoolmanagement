import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { hodCurriculumService } from "@/features/hod/hodCurriculum.service";

/**
 * GET /api/hod/curriculum/[classId]
 *
 * Fetches ClassSubjects (curriculum items) for a specific class,
 * filtered to the HOD's department subjects only.
 *
 * This returns what subjects the class offers that belong to the HOD's department,
 * along with current teacher assignments for each.
 *
 * Query Parameters:
 * - academicYearId: Filter by academic year (optional, uses active year if not provided)
 */
export const GET = withHODAccess(
  async (request: NextRequest, user, { params }: { params: Promise<{ classId: string }> }) => {
    const { classId } = await params;
    try {
      logger.logRequest("GET", `/api/hod/curriculum/${classId}`, user.userId);

      const { searchParams } = new URL(request.url);
      const academicYearId = searchParams.get("academicYearId") || undefined;

      const result = await hodCurriculumService.getClassCurriculum(user.userId, classId, academicYearId);

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/curriculum/${classId}`,
      });
    }
  }
);
