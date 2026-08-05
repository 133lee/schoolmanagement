export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/features/auth/auth.service";
import { loginSchema } from "@/features/auth/auth.validation";
import { ZodError } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/http/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // Volumetric guard: caps raw attempt volume from a single source,
    // regardless of which account(s) it's trying.
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`login:ip:${ip}`, 20, WINDOW_MS);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Targeted guard: caps attempts against one account regardless of source IP.
    const emailLimit = checkRateLimit(
      `login:email:${validatedData.email.toLowerCase()}`,
      5,
      WINDOW_MS
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts for this account. Please try again later." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } }
      );
    }

    const result = await authService.login(validatedData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          token: result.token,
          user: result.user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues.map((err: any) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
