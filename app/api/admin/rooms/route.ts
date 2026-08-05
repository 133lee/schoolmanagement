import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { timetableService } from "@/features/timetables/timetable.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/rooms
 * List all rooms
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const type = searchParams.get("type");

    const filters: { isActive?: boolean; type?: string } = {};
    if (isActive !== null) {
      filters.isActive = isActive === "true";
    }
    if (type) {
      filters.type = type;
    }

    const rooms = await timetableService.getRooms(context, filters);

    return ApiResponse.success(rooms);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/rooms" });
  }
});

/**
 * POST /api/admin/rooms
 * Create a new room
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();

    const room = await timetableService.createRoom(body, context);

    return ApiResponse.created(room);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/rooms" });
  }
});
