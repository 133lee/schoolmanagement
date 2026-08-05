import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { getHODDepartmentWithDetails } from "@/lib/auth/position-helpers";

/**
 * GET /api/auth/hod-status
 * Check if current user is assigned as HOD of any department
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const hodDepartment = await getHODDepartmentWithDetails(user.userId);

    return ApiResponse.success({
      isHOD: hodDepartment !== null,
      department: hodDepartment,
    });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/auth/hod-status" });
  }
});
