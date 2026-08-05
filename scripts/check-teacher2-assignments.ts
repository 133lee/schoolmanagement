/**
 * Check Teacher2 Assignments
 *
 * This script checks if teacher2@school.zm has:
 * - Teacher profile
 * - Class teacher assignments
 * - Subject teacher assignments
 */

import prisma from "@/lib/db/prisma";

async function checkTeacher2Assignments() {
  console.log("=".repeat(60));
  console.log("Checking Teacher2 Assignments");
  console.log("=".repeat(60));
  console.log();

  try {
    // Find teacher2 user
    console.log("🔍 Looking for teacher2@school.zm user...");
    const teacher2User = await prisma.user.findUnique({
      where: { email: "teacher2@school.zm" },
      include: {
        profile: true,
      },
    });

    if (!teacher2User) {
      console.log("❌ Teacher2 user not found!");
      return;
    }

    console.log("✅ Teacher2 user found:");
    console.log(`   Email: ${teacher2User.email}`);
    console.log(`   Role: ${teacher2User.role}`);
    console.log(`   Active: ${teacher2User.isActive}`);
    console.log();

    // Check for teacher profile
    console.log("🔍 Checking for TeacherProfile...");
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: teacher2User.id },
    });

    if (!teacherProfile) {
      console.log("❌ No TeacherProfile found for teacher2");
    } else {
      console.log("✅ TeacherProfile exists:");
      console.log(`   Profile ID: ${teacherProfile.id}`);
      console.log(`   Staff: ${teacherProfile.firstName} ${teacherProfile.lastName}`);
      console.log(`   Staff Number: ${teacherProfile.staffNumber}`);
    }
    console.log();

    if (!teacherProfile) {
      console.log("⚠️  Cannot check assignments without TeacherProfile");
      return;
    }

    // Check class teacher assignments
    console.log("🔍 Checking ClassTeacherAssignments...");
    const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
      where: { teacherId: teacherProfile.id },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        academicYear: true,
      },
    });

    if (classTeacherAssignments.length === 0) {
      console.log("❌ No ClassTeacherAssignments found");
    } else {
      console.log(`✅ Found ${classTeacherAssignments.length} ClassTeacherAssignment(s):`);
      classTeacherAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.class.grade.name} ${assignment.class.name}`);
        console.log(`      Academic Year: ${assignment.academicYear.year}`);
      });
    }
    console.log();

    // Check subject teacher assignments
    console.log("🔍 Checking SubjectTeacherAssignments...");
    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: { teacherId: teacherProfile.id },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        academicYear: true,
      },
    });

    if (subjectTeacherAssignments.length === 0) {
      console.log("❌ No SubjectTeacherAssignments found");
    } else {
      console.log(`✅ Found ${subjectTeacherAssignments.length} SubjectTeacherAssignment(s):`);
      subjectTeacherAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.subject.name} (${assignment.subject.code})`);
        console.log(`      Class: ${assignment.class.grade.name} ${assignment.class.name}`);
        console.log(`      Academic Year: ${assignment.academicYear.year}`);
      });
    }
    console.log();

    // Summary
    console.log("=".repeat(60));
    console.log("Summary for teacher2@school.zm:");
    console.log("=".repeat(60));
    console.log(`✓ User exists: ${teacher2User ? "Yes" : "No"}`);
    console.log(`✓ TeacherProfile exists: ${teacherProfile ? "Yes" : "No"}`);
    console.log(`✓ Class Teacher assignments: ${classTeacherAssignments.length}`);
    console.log(`✓ Subject Teacher assignments: ${subjectTeacherAssignments.length}`);
    console.log();

    if (!teacherProfile || (classTeacherAssignments.length === 0 && subjectTeacherAssignments.length === 0)) {
      console.log("⚠️  Teacher2 needs to be properly seeded!");
      console.log("   Run: npm run seed-teacher2");
    } else {
      console.log("✅ Teacher2 is properly configured!");
    }
    console.log();

  } catch (error) {
    console.error("❌ Error checking teacher2 assignments:", error);
    throw error;
  }
}

checkTeacher2Assignments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
