import { settingsService } from "@/features/settings/settings.service";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * School Info Helper
 * Provides cached access to school information settings for use in PDFs and other documents
 */

export interface SchoolInfo {
  name: string;
  motto: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  foundedYear: string;
  studentCapacity: string;
  schoolType: string;
  registrationNumber: string;
  logoFilename: string;
}

// Simple in-memory cache
let cachedSchoolInfo: SchoolInfo | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Separate cache for the logo base64 — reading + encoding the file on every
// PDF request is wasteful; the logo rarely changes.
let cachedLogoBase64: string | null | undefined = undefined; // undefined = not yet loaded
let logoFilenameAtCache = ""; // invalidate if the logo filename changes

/**
 * Get school information from settings
 * Uses in-memory cache to avoid repeated database queries
 */
export async function getSchoolInfo(): Promise<SchoolInfo> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedSchoolInfo && now - cacheTimestamp < CACHE_TTL) {
    return cachedSchoolInfo;
  }

  // Fetch from database using admin context (settings are public info)
  const settings = await settingsService.getSettingsByCategory("school_info", {
    userId: "system",
    role: "ADMIN",
  });

  // Convert array to object
  const settingsObject: Record<string, any> = {};
  settings.forEach((setting) => {
    settingsObject[setting.key] = setting.value;
  });

  // Use defaults if settings are empty
  const defaults = settingsService.getDefaultSettings("school_info");
  const merged = { ...defaults, ...settingsObject };

  // Build school info object
  cachedSchoolInfo = {
    name: merged.name || "Kambombo Day Secondary School",
    motto: merged.motto || "",
    address: merged.address || "",
    city: merged.city || "",
    province: merged.province || "",
    postalCode: merged.postalCode || "",
    phone: merged.phone || "",
    email: merged.email || "",
    website: merged.website || "",
    principalName: merged.principalName || "",
    foundedYear: merged.foundedYear || "",
    studentCapacity: merged.studentCapacity || "",
    schoolType: merged.schoolType || "Secondary",
    registrationNumber: merged.registrationNumber || "",
    logoFilename: merged.logoFilename || "school-logo.png",
  };

  cacheTimestamp = now;
  return cachedSchoolInfo;
}

/**
 * Get the logo URL for use in PDFs and web pages
 */
export async function getSchoolLogoUrl(): Promise<string> {
  const info = await getSchoolInfo();
  return `/${info.logoFilename}`;
}

/**
 * Get the logo as a base64 data URI for use in server-side PDF generation.
 * Result is cached in memory so repeated PDF requests don't re-read the file.
 * Returns null if logo file doesn't exist.
 */
export async function getSchoolLogoBase64(): Promise<string | null> {
  try {
    const info = await getSchoolInfo();

    // Return cached value if the logo filename hasn't changed
    if (cachedLogoBase64 !== undefined && logoFilenameAtCache === info.logoFilename) {
      return cachedLogoBase64;
    }

    const logoPath = join(process.cwd(), "public", info.logoFilename);
    const logoBuffer = await readFile(logoPath);

    const ext = info.logoFilename.split(".").pop()?.toLowerCase();
    let mimeType = "image/png";
    if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
    else if (ext === "svg") mimeType = "image/svg+xml";

    const base64 = logoBuffer.toString("base64");
    cachedLogoBase64 = `data:${mimeType};base64,${base64}`;
    logoFilenameAtCache = info.logoFilename;
    return cachedLogoBase64;
  } catch (error) {
    console.error("Error loading school logo:", error);
    cachedLogoBase64 = null; // Cache the null so we don't retry on every request
    return null;
  }
}

/**
 * Clear the cache (call this after updating school settings)
 */
export function clearSchoolInfoCache(): void {
  cachedSchoolInfo = null;
  cacheTimestamp = 0;
  cachedLogoBase64 = undefined;
  logoFilenameAtCache = "";
}
