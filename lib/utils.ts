import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a class label for display.
 * Self-describing names (start with a letter+digit like "F1 A", or start with
 * a digit like "8A") are returned as-is. Plain section names like "A" or "B"
 * are prefixed with the grade name.
 */
export function formatClassLabel(gradeName: string, className: string): string {
  return /^[A-Za-z]\d|^\d/.test(className) ? className : `${gradeName} ${className}`;
}
