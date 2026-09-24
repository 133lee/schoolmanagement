import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authRepository, UserWithProfile } from "./auth.repository";
import { Role } from "@/types/prisma-enums";
import { ValidationError, NotFoundError, UnauthorizedError as InvalidCredentialsError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) {
  throw new Error("JWT_SECRET environment variable is not set");
}
const JWT_SECRET: string = rawJwtSecret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: Role;
    hasDefaultPassword?: boolean;
    profile?: {
      firstName: string;
      lastName: string;
      staffNumber: string;
    } | null;
  };
  message?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  permissions: string[];
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await authRepository.findUserByEmail(email.toLowerCase());

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        message: "Your account has been deactivated. Contact administrator.",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Check teacher profile status if user is a teacher
    if (user.profile && user.profile.status !== "ACTIVE") {
      return {
        success: false,
        message: `Your account status is ${user.profile.status}. Contact administrator.`,
      };
    }

    // Get user permissions
    const permissions = await authRepository.getUserPermissions(user.id, user.role);

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });

    // Update last login
    await authRepository.updateLastLogin(user.id);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasDefaultPassword: user.hasDefaultPassword,
        profile: user.profile
          ? {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              staffNumber: user.profile.staffNumber,
            }
          : null,
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
      issuer: "school-management-system",
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): TokenValidationResult {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "school-management-system",
      }) as JWTPayload;

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Token expired", { reason: error.message });
        return {
          valid: false,
          error: "Token has expired",
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid token", { reason: error.message });
        return {
          valid: false,
          error: "Invalid token",
        };
      }

      logger.error(
        "Token verification error",
        error instanceof Error ? error : undefined,
        error instanceof Error ? undefined : { detail: String(error) }
      );
      return {
        valid: false,
        error: "Token verification failed",
      };
    }
  }

  /**
   * Get current user data from token
   */
  async getCurrentUser(userId: string): Promise<UserWithProfile | null> {
    const user = await authRepository.findUserById(userId);

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Change a user's own password (requires knowing the current password)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new ValidationError("New password must be at least 8 characters long");
    }
    if (currentPassword === newPassword) {
      throw new ValidationError("New password must be different from current password");
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await authRepository.updatePassword(userId, newPasswordHash);
  }

  /**
   * Hash password for new users
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }

    return { valid: true };
  }
}

export const authService = new AuthService();
