import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { termService } from "@/features/terms/term.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/terms/active
 * Get the currently active term
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const activeTerm = await termService.getActiveTerm(context);

    if (!activeTerm) {
      // Valid empty state: no active term (between terms or during setup)
      return ApiResponse.success(null, { message: "No active term configured" });
    }

    return ApiResponse.success({
      id: activeTerm.id,
      termType: activeTerm.termType,
      startDate: activeTerm.startDate,
      endDate: activeTerm.endDate,
      academicYear: activeTerm.academicYear.year,
    });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/terms/active" });
  }
});
