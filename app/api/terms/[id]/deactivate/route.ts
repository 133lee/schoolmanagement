import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { termService } from "@/features/terms/term.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/terms/[id]/deactivate
 * Deactivate a term
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const term = await termService.deactivateTerm(id, context);

      return ApiResponse.success(term);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/terms/${(await params).id}/deactivate`,
      });
    }
  }
);
