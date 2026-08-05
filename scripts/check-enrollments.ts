/**
 * Check Student Enrollments
 *
 * This script checks if students are enrolled in the classes that teacher2 teaches
 */

import prisma from "@/lib/db/prisma";

async function checkEnrollments() {
  console.log("=".repeat(60));
  console.log("Checking Student Enrollments in Teacher2's Classes");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get teacher2's classes from subject teacher assignments
    const teacher2 = await prisma.teacherProfile.findFirst({
      where: {
        user: {
          email: "teacher2@school.zm"
        }
      }
    });

    if (!teacher2) {
      console.log("❌ Teacher2 not found");
      return;
    }

    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId: teacher2.id
      },
      include: {
        class: {
          include: {
            grade: true
          }
        },
        subject: true
      }
    });

    console.log(`Teacher2 teaches ${assignments.length} subject-class combinations:`);
    assignments.forEach(a => {
      console.log(`  - ${a.subject.name} in ${a.class.grade.name} ${a.class.name}`);
    });
    console.log();

    // Get unique class IDs
    const classIds = [...new Set(assignments.map(a => a.classId))];
    console.log(`Unique classes: ${classIds.length}`);
    console.log();

    // Check enrollments for each class
    for (const classId of classIds) {
      const assignment = assignments.find(a => a.classId === classId);
      if (!assignment) continue;

      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: {
          classId: classId
        },
        include: {
          student: true,
          academicYear: true
        }
      });

      console.log(`📚 ${assignment.class.grade.name} ${assignment.class.name}:`);
      console.log(`   Enrolled students: ${enrollments.length}`);

      if (enrollments.length === 0) {
        console.log("   ❌ NO STUDENTS ENROLLED!");
      } else {
        enrollments.forEach((e, i) => {
          console.log(`   ${i + 1}. ${e.student.firstName} ${e.student.lastName} (${e.student.studentNumber}) - ${e.academicYear.year}`);
        });
      }
      console.log();
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));

    const totalEnrollments = await prisma.studentClassEnrollment.count({
      where: {
        classId: {
          in: classIds
        }
      }
    });

    console.log(`Total students enrolled in teacher2's classes: ${totalEnrollments}`);
    console.log();

  } catch (error) {
    console.error("❌ Error checking enrollments:", error);
    throw error;
  }
}

checkEnrollments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
