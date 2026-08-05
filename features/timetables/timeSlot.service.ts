import { TimeSlot } from "@/types/prisma-enums";
import { timeSlotRepository } from "./timeSlot.repository";

/**
 * TimeSlot Service - Business Logic Layer
 *
 * Handles business rules and validation for time slot operations.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface CreateTimeSlotInput {
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  label: string;
}

export interface UpdateTimeSlotInput {
  startTime?: string;
  endTime?: string;
  label?: string;
}

export class TimeSlotService {
  /**
   * Validate time format (HH:MM)
   */
  private validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  /**
   * Validate that end time is after start time
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new ValidationError("End time must be after start time");
    }
  }

  /**
   * Validate time slot input
   */
  private validateInput(data: CreateTimeSlotInput | UpdateTimeSlotInput): void {
    if ("startTime" in data && data.startTime) {
      if (!this.validateTimeFormat(data.startTime)) {
        throw new ValidationError("Start time must be in HH:MM format (e.g., 08:00)");
      }
    }

    if ("endTime" in data && data.endTime) {
      if (!this.validateTimeFormat(data.endTime)) {
        throw new ValidationError("End time must be in HH:MM format (e.g., 08:40)");
      }
    }

    if ("label" in data && data.label) {
      if (data.label.trim().length === 0) {
        throw new ValidationError("Label cannot be empty");
      }
      if (data.label.length > 50) {
        throw new ValidationError("Label cannot exceed 50 characters");
      }
    }

    // Validate time range if both times are provided
    const startTime = "startTime" in data ? data.startTime : undefined;
    const endTime = "endTime" in data ? data.endTime : undefined;

    if (startTime && endTime) {
      this.validateTimeRange(startTime, endTime);
    }
  }

  /**
   * Create a new time slot
   */
  async createTimeSlot(data: CreateTimeSlotInput): Promise<TimeSlot> {
    this.validateInput(data);

    // Check for overlapping time slots
    const existing = await timeSlotRepository.findByTime(data.startTime, data.endTime);
    if (existing) {
      throw new ConflictError("A time slot with this start and end time already exists");
    }

    return timeSlotRepository.create({
      startTime: data.startTime,
      endTime: data.endTime,
      label: data.label.trim(),
    });
  }

  /**
   * Get all time slots (ordered by start time)
   */
  async getAllTimeSlots(): Promise<TimeSlot[]> {
    return timeSlotRepository.findAll();
  }

  /**
   * Get time slot by ID
   */
  async getTimeSlotById(id: string): Promise<TimeSlot> {
    const timeSlot = await timeSlotRepository.findById(id);
    if (!timeSlot) {
      throw new NotFoundError("Time slot not found");
    }
    return timeSlot;
  }

  /**
   * Update time slot
   */
  async updateTimeSlot(id: string, data: UpdateTimeSlotInput): Promise<TimeSlot> {
    // Verify time slot exists
    await this.getTimeSlotById(id);

    this.validateInput(data);

    // If updating times, check for conflicts
    if (data.startTime || data.endTime) {
      const current = await timeSlotRepository.findById(id);
      const newStartTime = data.startTime || current!.startTime;
      const newEndTime = data.endTime || current!.endTime;

      const existing = await timeSlotRepository.findByTime(newStartTime, newEndTime);
      if (existing && existing.id !== id) {
        throw new ConflictError("A time slot with this start and end time already exists");
      }
    }

    return timeSlotRepository.update(id, data);
  }

  /**
   * Delete time slot (only if not in use)
   */
  async deleteTimeSlot(id: string): Promise<void> {
    // Verify time slot exists
    await this.getTimeSlotById(id);

    // Check if in use
    const inUse = await timeSlotRepository.isInUse(id);
    if (inUse) {
      throw new ConflictError("Cannot delete time slot - it is being used in timetables");
    }

    await timeSlotRepository.delete(id);
  }

  /**
   * Check if time slot is in use
   */
  async isTimeSlotInUse(id: string): Promise<boolean> {
    await this.getTimeSlotById(id);
    return timeSlotRepository.isInUse(id);
  }

  /**
   * Get time slots count
   */
  async getTimeSlotCount(): Promise<number> {
    return timeSlotRepository.count();
  }
}

export const timeSlotService = new TimeSlotService();
