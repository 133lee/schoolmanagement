import { authService, JWTPayload } from "@/features/auth/auth.service";

/**
 * Verify JWT token and return decoded payload
 * @param token - JWT token string
 * @returns Decoded JWT payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  const result = authService.verifyToken(token);
  return result.valid ? result.payload! : null;
}
