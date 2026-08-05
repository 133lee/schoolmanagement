import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { timetableService } from "@/features/timetables/timetable.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/timetable/swap
 *
 * Two modes:
 *   Swap:  { slotId, targetSlotId }
 *     → exchanges (dayOfWeek, periodNumber, startTime, endTime) between the two slots.
 *
 *   Move:  { slotId, targetDay, targetPeriod, targetStartTime, targetEndTime }
 *     → moves one slot to an empty cell.
 *
 * See timetableSlotRepository.swapSlots for why a same-class swap needs a
 * 3-step transaction rather than two parallel updates.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { slotId, targetSlotId, targetDay, targetPeriod, targetStartTime, targetEndTime } = body;

    if (!slotId) {
      return NextResponse.json({ success: false, error: "slotId is required" }, { status: 400 });
    }

    await timetableService.swapOrMoveSlot(
      { slotId, targetSlotId, targetDay, targetPeriod, targetStartTime, targetEndTime },
      context
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/timetable/swap" });
  }
});
