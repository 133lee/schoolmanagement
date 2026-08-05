import prisma from "@/lib/db/prisma";

export interface AdminProfileData {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  profile: {
    id: string;
    staffNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    phone: string;
    address: string | null;
    qualification: string;
    yearsExperience: number;
  } | null;
}

export interface UpdateProfileInput {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  phone?: string;
  address?: string | null;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const adminProfileRepository = {
  /**
   * Get admin profile by user ID
   */
  async getByUserId(userId: string): Promise<AdminProfileData | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            id: true,
            staffNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            address: true,
            qualification: true,
            yearsExperience: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      profile: user.profile,
    };
  },

  /**
   * Update user profile information
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<AdminProfileData | null> {
    // First check if user has a profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) return null;

    if (user.profile) {
      // Update existing profile
      await prisma.teacherProfile.update({
        where: { id: user.profile.id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.middleName !== undefined && { middleName: data.middleName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone && { phone: data.phone }),
          ...(data.address !== undefined && { address: data.address }),
        },
      });
    }

    // Return updated profile
    return this.getByUserId(userId);
  },

  /**
   * Update user email
   */
  async updateEmail(userId: string, newEmail: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail.toLowerCase() },
    });
  },

  /**
   * Get password hash for verification
   */
  async getPasswordHash(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  },

  /**
   * Update password hash
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        hasDefaultPassword: false,
      },
    });
  },

  /**
   * Check if email is already taken by another user
   */
  async isEmailTaken(email: string, excludeUserId: string): Promise<boolean> {
    const existing = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: excludeUserId },
      },
    });
    return !!existing;
  },
};
