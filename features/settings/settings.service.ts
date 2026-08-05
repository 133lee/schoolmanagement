import { SystemSettings } from "@/types/prisma-enums";
import { systemSettingsRepository } from "./systemSettings.repository";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

/**
 * Settings Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for system settings.
 * Uses SystemSettingsRepository for data access.
 */

// Service context for authorization
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Setting categories
export type SettingCategory = "school_info" | "preferences" | "security";

// Input DTOs
export interface SettingInput {
  key: string;
  value: any;
  category: SettingCategory;
}

export interface BatchSettingInput {
  category: SettingCategory;
  settings: Record<string, any>;
}

export class SettingsService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can manage settings
   * Only ADMIN can manage system settings
   */
  private canManageSettings(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  /**
   * Check if user can view settings
   * ADMIN, HEAD_TEACHER, and DEPUTY_HEAD can view all settings
   * Other roles can only view non-security settings
   */
  private canViewSettings(
    context: ServiceContext,
    category?: SettingCategory
  ): boolean {
    // Admins and leadership can view all settings
    if (["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role)) {
      return true;
    }

    // Security settings are restricted
    if (category === "security") {
      return false;
    }

    // Others can view school_info and preferences
    return true;
  }

  // ==================== VALIDATION ====================

  /**
   * Validate setting category
   */
  private validateCategory(category: string): void {
    const validCategories = ["school_info", "preferences", "security"];
    if (!validCategories.includes(category)) {
      throw new ValidationError(
        `Invalid category. Must be one of: ${validCategories.join(", ")}`
      );
    }
  }

  /**
   * Validate setting key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== "string" || key.trim().length === 0) {
      throw new ValidationError("Setting key is required");
    }

    // Key should be alphanumeric with underscores/hyphens
    const keyPattern = /^[a-zA-Z0-9_-]+$/;
    if (!keyPattern.test(key)) {
      throw new ValidationError(
        "Setting key must contain only letters, numbers, underscores, and hyphens"
      );
    }
  }

  /**
   * Validate setting input
   */
  private validateSettingInput(input: SettingInput): void {
    this.validateKey(input.key);
    this.validateCategory(input.category);

    if (input.value === undefined) {
      throw new ValidationError("Setting value is required");
    }
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Get a single setting by key
   */
  async getSetting(
    key: string,
    context: ServiceContext
  ): Promise<SystemSettings | null> {
    this.validateKey(key);

    const setting = await systemSettingsRepository.findByKey(key);

    // Check view permissions based on category
    if (setting && !this.canViewSettings(context, setting.category as SettingCategory)) {
      throw new UnauthorizedError("You do not have permission to view this setting");
    }

    return setting;
  }

  /**
   * Get all settings in a category
   */
  async getSettingsByCategory(
    category: SettingCategory,
    context: ServiceContext
  ): Promise<SystemSettings[]> {
    this.validateCategory(category);

    // Check view permissions
    if (!this.canViewSettings(context, category)) {
      throw new UnauthorizedError(
        "You do not have permission to view these settings"
      );
    }

    return systemSettingsRepository.findByCategory(category);
  }

  /**
   * Get all settings as a structured object by category
   */
  async getAllSettingsStructured(context: ServiceContext): Promise<{
    school_info: Record<string, any>;
    preferences: Record<string, any>;
    security: Record<string, any>;
  }> {
    const allSettings = await systemSettingsRepository.findAll();

    const structured = {
      school_info: {} as Record<string, any>,
      preferences: {} as Record<string, any>,
      security: {} as Record<string, any>,
    };

    for (const setting of allSettings) {
      const category = setting.category as SettingCategory;

      // Check view permissions for each category
      if (this.canViewSettings(context, category)) {
        structured[category][setting.key] = setting.value;
      }
    }

    return structured;
  }

  /**
   * Set a single setting
   */
  async setSetting(
    input: SettingInput,
    context: ServiceContext
  ): Promise<SystemSettings> {
    // Authorization
    if (!this.canManageSettings(context)) {
      throw new UnauthorizedError(
        "You do not have permission to modify settings"
      );
    }

    // Validation
    this.validateSettingInput(input);

    // Upsert the setting
    return systemSettingsRepository.upsert(
      input.key,
      input.value,
      input.category
    );
  }

  /**
   * Set multiple settings in a category at once
   */
  async setSettingsBatch(
    input: BatchSettingInput,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canManageSettings(context)) {
      throw new UnauthorizedError(
        "You do not have permission to modify settings"
      );
    }

    // Validation
    this.validateCategory(input.category);

    if (!input.settings || typeof input.settings !== "object") {
      throw new ValidationError("Settings object is required");
    }

    // Convert settings object to array of setting inputs
    const settingsArray = Object.entries(input.settings).map(([key, value]) => {
      this.validateKey(key);
      return {
        key,
        value,
        category: input.category,
      };
    });

    // Batch upsert
    await systemSettingsRepository.upsertMany(settingsArray);
  }

  /**
   * Delete a setting
   */
  async deleteSetting(
    key: string,
    context: ServiceContext
  ): Promise<SystemSettings> {
    // Authorization
    if (!this.canManageSettings(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete settings"
      );
    }

    this.validateKey(key);

    try {
      return await systemSettingsRepository.delete(key);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        throw new NotFoundError(`Setting with key '${key}' not found`);
      }
      throw error;
    }
  }

  /**
   * Delete all settings in a category
   */
  async deleteSettingsByCategory(
    category: SettingCategory,
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!this.canManageSettings(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete settings"
      );
    }

    this.validateCategory(category);

    return systemSettingsRepository.deleteByCategory(category);
  }

  /**
   * Get default settings for a category
   */
  getDefaultSettings(category: SettingCategory): Record<string, any> {
    switch (category) {
      case "school_info":
        return {
          name: "",
          motto: "",
          address: "",
          city: "",
          province: "",
          postalCode: "",
          phone: "",
          email: "",
          website: "",
          smsPhone: "",
          principalName: "",
          foundedYear: "",
          studentCapacity: "",
          schoolType: "Secondary",
          registrationNumber: "",
        };

      case "preferences":
        return {
          timezone: "Africa/Lusaka",
          dateFormat: "DD/MM/YYYY",
          timeFormat: "24h",
          weekStartsOn: "Monday",
          enableAutoSave: true,
          autoSaveInterval: 30,
          sessionTimeout: 60,
          enableOfflineMode: false,
          defaultGradingSystem: "ECZ",
          showPositionOnReportCard: true,
          showAttendanceOnReportCard: true,
          requireTeacherRemarks: true,
          requireHeadTeacherRemarks: true,
          passingGrade: 50,
          maxAbsencesPerTerm: 10,
          enablePromotionWorkflow: true,
          defaultTheme: "system",
          enableAnimations: true,
          compactMode: false,
          showHelpTooltips: true,
        };

      case "security":
        return {
          minPasswordLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          passwordExpiryDays: 90,
          preventPasswordReuse: 5,
          maxLoginAttempts: 5,
          lockoutDuration: 30,
          require2FA: false,
          require2FAForAdmins: false,
          sessionTimeout: 60,
          maxConcurrentSessions: 3,
          forceLogoutOnPasswordChange: true,
          enableIPWhitelist: false,
          enableAuditLog: true,
          enableSecurityAlerts: true,
          alertOnSuspiciousActivity: true,
          enableDataEncryption: true,
          enableAutoBackup: true,
          backupFrequency: "daily",
          dataRetentionDays: 365,
        };

      default:
        return {};
    }
  }

  /**
   * Initialize default settings for a category if not exists
   */
  async initializeDefaults(
    category: SettingCategory,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canManageSettings(context)) {
      throw new UnauthorizedError(
        "You do not have permission to initialize settings"
      );
    }

    const defaults = this.getDefaultSettings(category);
    await this.setSettingsBatch({ category, settings: defaults }, context);
  }
}

// Singleton instance
export const settingsService = new SettingsService();
