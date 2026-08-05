/**
 * Check Teacher Subject Assignments
 *
 * This script helps debug what subjects a teacher is assigned to teach
 */

import prisma from "@/lib/db/prisma";

async function checkTeacherAssignments() {
  console.log("=".repeat(60));
  console.log("Checking Teacher Subject Assignments");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get teacher by email
    const teacher = await prisma.user.findUnique({
      where: { email: "teacher2@school.zm" },
      include: {
        profile: true,
      },
    });

    if (!teacher || !teacher.profile) {
      console.log("❌ Teacher not found");
      return;
    }

    console.log(`✅ Teacher: ${teacher.profile.firstName} ${teacher.profile.lastName}`);
    console.log(`   Email: ${teacher.email}`);
    console.log(`   Teacher Profile ID: ${teacher.profile.id}`);
    console.log();

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      console.log("❌ No active academic year found");
      return;
    }

    console.log(`✅ Active Academic Year: ${academicYear.year}`);
    console.log(`   ID: ${academicYear.id}`);
    console.log();

    // Get class teacher assignments
    const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
      where: {
        teacherId: teacher.profile.id,
        academicYearId: academicYear.id,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
      },
    });

    console.log("📚 Class Teacher Assignments:");
    if (classTeacherAssignments.length === 0) {
      console.log("   ❌ No class teacher assignments");
    } else {
      classTeacherAssignments.forEach((assignment) => {
        console.log(`   ✅ ${assignment.class.grade.name} ${assignment.class.name}`);
        console.log(`      Class ID: ${assignment.classId}`);
      });
    }
    console.log();

    // Get subject teacher assignments
    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId: teacher.profile.id,
        academicYearId: academicYear.id,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
      },
    });

    console.log("📖 Subject Teacher Assignments:");
    if (subjectTeacherAssignments.length === 0) {
      console.log("   ❌ No subject teacher assignments");
    } else {
      subjectTeacherAssignments.forEach((assignment) => {
        console.log(`   ✅ ${assignment.subject.name} (${assignment.subject.code})`);
        console.log(`      Class: ${assignment.class.grade.name} ${assignment.class.name}`);
        console.log(`      Subject ID: ${assignment.subjectId}`);
        console.log(`      Class ID: ${assignment.classId}`);
        console.log();
      });
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));
    console.log(`Class Teacher Assignments: ${classTeacherAssignments.length}`);
    console.log(`Subject Teacher Assignments: ${subjectTeacherAssignments.length}`);
    console.log();

    // Get unique subjects
    const uniqueSubjects = new Set(
      subjectTeacherAssignments.map((a) => a.subject.name)
    );
    console.log(`Unique Subjects Taught: ${uniqueSubjects.size}`);
    uniqueSubjects.forEach((subject) => {
      console.log(`   - ${subject}`);
    });
    console.log();

    // Get unique classes
    const uniqueClasses = new Set(
      [...classTeacherAssignments, ...subjectTeacherAssignments].map(
        (a) => `${a.class.grade.name} ${a.class.name}`
      )
    );
    console.log(`Unique Classes: ${uniqueClasses.size}`);
    uniqueClasses.forEach((cls) => {
      console.log(`   - ${cls}`);
    });
    console.log();

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

checkTeacherAssignments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
