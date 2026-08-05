import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { timetableService } from "@/features/timetables/timetable.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/rooms/[roomId]
 * Get a single room
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { roomId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const room = await timetableService.getRoomById(roomId, context);

      return ApiResponse.success(room);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/admin/rooms/${(await params).roomId}`,
      });
    }
  }
);

/**
 * PUT /api/admin/rooms/[roomId]
 * Update a room
 */
export const PUT = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { roomId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };
      const body = await request.json();

      const room = await timetableService.updateRoom(roomId, body, context);

      return ApiResponse.success(room);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PUT /api/admin/rooms/${(await params).roomId}`,
      });
    }
  }
);

/**
 * DELETE /api/admin/rooms/[roomId]
 * Delete a room
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { roomId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await timetableService.deleteRoom(roomId, context);

      return ApiResponse.success({ message: "Room deleted successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/admin/rooms/${(await params).roomId}`,
      });
    }
  }
);
