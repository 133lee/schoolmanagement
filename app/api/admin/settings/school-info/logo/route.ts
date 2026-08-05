import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { ForbiddenError, BadRequestError } from "@/lib/http/errors";
import { settingsService } from "@/features/settings/settings.service";
import { clearSchoolInfoCache } from "@/lib/settings/school-info-helper";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/settings/school-info/logo
 * Upload school logo (admin only)
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    if (user.role !== "ADMIN") {
      throw new ForbiddenError("Only admins can upload school logo");
    }
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      throw new BadRequestError("No file provided");
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      throw new BadRequestError("Invalid file type. Only PNG, JPG, and SVG are allowed.");
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestError("File too large. Maximum size is 5MB.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `school-logo.${extension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicPath = join(process.cwd(), "public", filename);

    const oldExtensions = ["png", "jpg", "jpeg", "svg"];
    for (const ext of oldExtensions) {
      try {
        const oldPath = join(process.cwd(), "public", `school-logo.${ext}`);
        await unlink(oldPath);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    await writeFile(publicPath, buffer);

    await settingsService.setSetting(
      { key: "logoFilename", value: filename, category: "school_info" },
      context
    );

    clearSchoolInfoCache();

    return NextResponse.json({ success: true, filename, url: `/${filename}` });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "POST /api/admin/settings/school-info/logo",
    });
  }
});

/**
 * DELETE /api/admin/settings/school-info/logo
 * Delete school logo and revert to default
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    if (user.role !== "ADMIN") {
      throw new ForbiddenError("Only admins can delete school logo");
    }
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const setting = await settingsService.getSetting("logoFilename", context);
    const currentFilename = (setting?.value as string) || "school-logo.png";

    try {
      const logoPath = join(process.cwd(), "public", currentFilename);
      await unlink(logoPath);
    } catch {
      // Ignore if file doesn't exist
    }

    await settingsService.setSetting(
      { key: "logoFilename", value: "school-logo.png", category: "school_info" },
      context
    );

    clearSchoolInfoCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "DELETE /api/admin/settings/school-info/logo",
    });
  }
});
