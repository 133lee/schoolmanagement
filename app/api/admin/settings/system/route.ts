import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { settingsService } from "@/features/settings/settings.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/settings/system
 * Get system preferences
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const settings = await settingsService.getSettingsByCategory("preferences", context);

    const settingsObject: Record<string, unknown> = {};
    settings.forEach((setting) => {
      settingsObject[setting.key] = setting.value;
    });

    if (Object.keys(settingsObject).length === 0) {
      const defaults = settingsService.getDefaultSettings("preferences");
      return NextResponse.json({ settings: defaults });
    }

    return NextResponse.json({ settings: settingsObject });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/settings/system" });
  }
});

/**
 * POST /api/admin/settings/system
 * Update system preferences
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();

    await settingsService.setSettingsBatch({ category: "preferences", settings: body }, context);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/settings/system" });
  }
});
