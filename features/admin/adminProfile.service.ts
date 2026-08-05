import bcrypt from "bcryptjs";
import {
  adminProfileRepository,
  AdminProfileData,
  UpdateProfileInput,
} from "./adminProfile.repository";
import { UnauthorizedError, ValidationError, NotFoundError, ConflictError } from "@/lib/errors";

export interface ServiceContext {
  userId: string;
  role: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateEmailInput {
  newEmail: string;
  password: string;
}

export const adminProfileService = {
  /**
   * Get current user's profile
   */
  async getProfile(context: ServiceContext): Promise<AdminProfileData> {
    const profile = await adminProfileRepository.getByUserId(context.userId);

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    return profile;
  },

  /**
   * Update current user's profile information
   */
  async updateProfile(
    context: ServiceContext,
    data: UpdateProfileInput
  ): Promise<AdminProfileData> {
    // Validate input
    if (data.firstName !== undefined && data.firstName.trim().length < 2) {
      throw new ValidationError("First name must be at least 2 characters");
    }

    if (data.lastName !== undefined && data.lastName.trim().length < 2) {
      throw new ValidationError("Last name must be at least 2 characters");
    }

    if (data.phone !== undefined && data.phone.trim().length < 9) {
      throw new ValidationError("Phone number must be at least 9 characters");
    }

    const updatedProfile = await adminProfileRepository.updateProfile(
      context.userId,
      data
    );

    if (!updatedProfile) {
      throw new NotFoundError("Profile not found");
    }

    return updatedProfile;
  },

  /**
   * Change user password
   */
  async changePassword(
    context: ServiceContext,
    data: ChangePasswordInput
  ): Promise<void> {
    // Validate passwords match
    if (data.newPassword !== data.confirmPassword) {
      throw new ValidationError("New passwords do not match");
    }

    // Validate password strength
    if (data.newPassword.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    // Check for at least one uppercase, one lowercase, and one number
    const hasUppercase = /[A-Z]/.test(data.newPassword);
    const hasLowercase = /[a-z]/.test(data.newPassword);
    const hasNumber = /[0-9]/.test(data.newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
    }

    // Verify current password
    const currentHash = await adminProfileRepository.getPasswordHash(context.userId);

    if (!currentHash) {
      throw new NotFoundError("User not found");
    }

    const isValidPassword = await bcrypt.compare(data.currentPassword, currentHash);

    if (!isValidPassword) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    // Hash new password and update
    const saltRounds = 12;
    const newHash = await bcrypt.hash(data.newPassword, saltRounds);

    await adminProfileRepository.updatePassword(context.userId, newHash);
  },

  /**
   * Update user email
   */
  async updateEmail(
    context: ServiceContext,
    data: UpdateEmailInput
  ): Promise<AdminProfileData> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.newEmail)) {
      throw new ValidationError("Invalid email format");
    }

    // Verify password
    const currentHash = await adminProfileRepository.getPasswordHash(context.userId);

    if (!currentHash) {
      throw new NotFoundError("User not found");
    }

    const isValidPassword = await bcrypt.compare(data.password, currentHash);

    if (!isValidPassword) {
      throw new UnauthorizedError("Password is incorrect");
    }

    // Check if email is already taken
    const emailTaken = await adminProfileRepository.isEmailTaken(
      data.newEmail,
      context.userId
    );

    if (emailTaken) {
      throw new ConflictError("Email is already in use");
    }

    // Update email
    await adminProfileRepository.updateEmail(context.userId, data.newEmail);

    // Return updated profile
    const updatedProfile = await adminProfileRepository.getByUserId(context.userId);

    if (!updatedProfile) {
      throw new NotFoundError("Profile not found");
    }

    return updatedProfile;
  },
};
