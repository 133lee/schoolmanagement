import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectService } from "@/features/subjects/subject.service";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/subjects/[id]/usage
 *
 * Check if a subject is actively being used in the system.
 * Returns usage statistics including teachers, classes, assessments, and grades.
 *
 * Used to warn admins before changing critical subject properties like department.
 *
 * Note: intentionally returns the usage object at the top level (not the
 * standard envelope) — edit-subject-dialog.tsx reads `usage.isInUse` directly.
 */
export const GET = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    const usage = await subjectService.getUsage(id, { userId: user.userId, role: user.role as Role });

    return NextResponse.json(usage);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/subjects/[id]/usage" });
  }
});
