import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { Prisma } from "@prisma/client";
import type { SMSTemplate } from "@prisma/client";

/**
 * SMSTemplate Repository - Data Access Layer
 *
 * Manages SMS message templates.
 * No business logic - pure data access.
 */
export class SMSTemplateRepository {
  /**
   * Create a new SMS template
   */
  async create(data: Prisma.SMSTemplateCreateInput): Promise<SMSTemplate> {
    try {
      return await prisma.sMSTemplate.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("SMS template with this name already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Find SMS template by ID
   */
  async findById(id: string): Promise<SMSTemplate | null> {
    return prisma.sMSTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Find SMS template by name
   */
  async findByName(name: string): Promise<SMSTemplate | null> {
    return prisma.sMSTemplate.findUnique({
      where: { name },
    });
  }

  /**
   * Find all SMS templates
   */
  async findAll(): Promise<SMSTemplate[]> {
    return prisma.sMSTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find active SMS templates
   */
  async findActive(): Promise<SMSTemplate[]> {
    return prisma.sMSTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS templates by category
   */
  async findByCategory(category: string): Promise<SMSTemplate[]> {
    return prisma.sMSTemplate.findMany({
      where: { category },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SMSTemplateWhereInput;
    orderBy?: Prisma.SMSTemplateOrderByWithRelationInput;
  }) {
    const { skip = 0, take = 50, where, orderBy } = params;

    return prisma.sMSTemplate.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
    });
  }

  /**
   * Count SMS templates
   */
  async count(where?: Prisma.SMSTemplateWhereInput): Promise<number> {
    return prisma.sMSTemplate.count({ where });
  }

  /**
   * Update SMS template
   */
  async update(
    id: string,
    data: Prisma.SMSTemplateUpdateInput
  ): Promise<SMSTemplate> {
    try {
      return await prisma.sMSTemplate.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("SMS template not found");
        }
        if (error.code === "P2002") {
          throw new Error("SMS template with this name already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<SMSTemplate> {
    return this.update(id, { isActive });
  }

  /**
   * Delete SMS template
   */
  async delete(id: string): Promise<SMSTemplate> {
    try {
      return await prisma.sMSTemplate.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("SMS template not found");
        }
      }
      throw error;
    }
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<void> {
    const defaults = [
      {
        name: "REPORT_CARD",
        description: "Report card notification to parents",
        category: "academic",
        template: `Dear {parentName},

Results for {studentName} are as follows:
{subjectScores}

Position: {position}/{totalStudents}
Attendance: {attendanceRate}%

- {schoolName}`,
        variables: [
          "parentName",
          "studentName",
          "subjectScores",
          "position",
          "totalStudents",
          "attendanceRate",
          "schoolName",
        ],
        isActive: true,
      },
      {
        name: "EXAM_REMINDER",
        description: "Exam reminder notification",
        category: "academic",
        template: `Dear {parentName},

Reminder: {examName} for {studentName} is on {examDate}.

Please ensure your child is prepared.

- {schoolName}`,
        variables: ["parentName", "studentName", "examName", "examDate", "schoolName"],
        isActive: true,
      },
      {
        name: "ABSENCE_ALERT",
        description: "Student absence alert",
        category: "attendance",
        template: `Dear {parentName},

{studentName} was absent from school on {date}.

If this is an emergency, please contact us immediately.

- {schoolName}`,
        variables: ["parentName", "studentName", "date", "schoolName"],
        isActive: true,
      },
      {
        name: "FEE_REMINDER",
        description: "School fee payment reminder",
        category: "finance",
        template: `Dear {parentName},

Reminder: School fees for {studentName} are due.

Amount: {amount}
Due date: {dueDate}

Please ensure timely payment.

- {schoolName}`,
        variables: ["parentName", "studentName", "amount", "dueDate", "schoolName"],
        isActive: true,
      },
    ];

    for (const template of defaults) {
      try {
        await this.create(template);
      } catch (error) {
        // Skip if template already exists
        logger.info("SMS template already exists, skipping", { templateName: template.name });
      }
    }
  }
}

// Singleton instance
export const smsTemplateRepository = new SMSTemplateRepository();
