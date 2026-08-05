import { authService } from "@/features/auth/auth.service";

/**
 * Mints a real, signed JWT by calling the actual login service (password
 * hash comparison included) — not a forged token. Valid against
 * lib/auth/jwt.ts's verifyToken (what withAuth calls) since both go
 * through authService with the same JWT_SECRET.
 */
export async function loginAs(email: string, password: string): Promise<string> {
  const result = await authService.login({ email, password });

  if (!result.success || !result.token) {
    throw new Error(`loginAs(${email}) failed: ${result.message}`);
  }

  return result.token;
}
