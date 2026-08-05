/**
 * Seed script to add teacher-department relationships
 *
 * This script migrates existing teachers to the new many-to-many structure
 * by creating TeacherDepartment records based on their subjects.
 */

import prisma from "../lib/db/prisma";

async function seedTeacherDepartments() {
  console.log("Starting teacher-department seeding...");

  try {
    // Get all teachers with their subjects
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        subjects: {
          include: {
            subject: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${teachers.length} teachers`);

    for (const teacher of teachers) {
      // Get unique departments from teacher's subjects
      const departmentIds = new Set<string>();

      for (const ts of teacher.subjects) {
        if (ts.subject.departmentId) {
          departmentIds.add(ts.subject.departmentId);
        }
      }

      // Create TeacherDepartment records
      let isPrimary = true;
      for (const departmentId of departmentIds) {
        const existing = await prisma.teacherDepartment.findUnique({
          where: {
            teacherId_departmentId: {
              teacherId: teacher.id,
              departmentId: departmentId,
            },
          },
        });

        if (!existing) {
          await prisma.teacherDepartment.create({
            data: {
              teacherId: teacher.id,
              departmentId: departmentId,
              isPrimary: isPrimary,
            },
          });

          console.log(
            `✓ Linked teacher ${teacher.staffNumber} to department ${departmentId} ${isPrimary ? "(primary)" : ""}`
          );

          isPrimary = false; // Only first department is primary
        }
      }
    }

    console.log("✓ Teacher-department seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding teacher-departments:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTeacherDepartments()
  .catch((error) => {
    console.error("Failed to seed teacher-departments:", error);
    process.exit(1);
  });
