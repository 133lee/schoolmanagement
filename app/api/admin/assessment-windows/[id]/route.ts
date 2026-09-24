import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { assessmentWindowService } from "@/features/assessment-windows/assessmentWindow.service";

/** DELETE /api/admin/assessment-windows/[id] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.HEAD_TEACHER))
        throw new UnauthorizedError();

      const { id } = await params;

      await assessmentWindowService.delete(id);

      return ApiResponse.success({ deleted: true });
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "DELETE /api/admin/assessment-windows/[id]" });
    }
  })(request);
}
