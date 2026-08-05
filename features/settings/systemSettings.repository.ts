import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SystemSettings } from "@/types/prisma-enums";

/**
 * SystemSettings Repository - Data Access Layer
 *
 * Manages system-wide settings storage with key-value JSON structure.
 * Supports categories: school_info, preferences, security
 */
export class SystemSettingsRepository {
  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<SystemSettings | null> {
    return prisma.systemSettings.findUnique({
      where: { key },
    });
  }

  /**
   * Find all settings in a category
   */
  async findByCategory(category: string): Promise<SystemSettings[]> {
    return prisma.systemSettings.findMany({
      where: { category },
      orderBy: { key: "asc" },
    });
  }

  /**
   * Find all settings
   */
  async findAll(): Promise<SystemSettings[]> {
    return prisma.systemSettings.findMany({
      orderBy: { category: "asc" },
    });
  }

  /**
   * Create or update a setting (upsert)
   */
  async upsert(
    key: string,
    value: any,
    category: string
  ): Promise<SystemSettings> {
    return prisma.systemSettings.upsert({
      where: { key },
      create: {
        key,
        value,
        category,
      },
      update: {
        value,
        category,
      },
    });
  }

  /**
   * Batch upsert multiple settings
   */
  async upsertMany(
    settings: Array<{ key: string; value: any; category: string }>
  ): Promise<void> {
    await prisma.$transaction(
      settings.map((setting) =>
        prisma.systemSettings.upsert({
          where: { key: setting.key },
          create: {
            key: setting.key,
            value: setting.value,
            category: setting.category,
          },
          update: {
            value: setting.value,
            category: setting.category,
          },
        })
      )
    );
  }

  /**
   * Update a setting by key
   */
  async update(
    key: string,
    data: Prisma.SystemSettingsUpdateInput
  ): Promise<SystemSettings> {
    try {
      return await prisma.systemSettings.update({
        where: { key },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error(`Setting with key '${key}' not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a setting by key
   */
  async delete(key: string): Promise<SystemSettings> {
    try {
      return await prisma.systemSettings.delete({
        where: { key },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error(`Setting with key '${key}' not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete all settings in a category
   */
  async deleteByCategory(category: string): Promise<number> {
    const result = await prisma.systemSettings.deleteMany({
      where: { category },
    });
    return result.count;
  }

  /**
   * Count settings
   */
  async count(where?: Prisma.SystemSettingsWhereInput): Promise<number> {
    return prisma.systemSettings.count({ where });
  }
}

// Singleton instance
export const systemSettingsRepository = new SystemSettingsRepository();
