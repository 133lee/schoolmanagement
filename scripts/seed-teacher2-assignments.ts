/**
 * Seed Teacher2 Assignments
 *
 * This script creates class and subject teacher assignments for teacher2@school.zm
 *
 * Assignments:
 * - Class Teacher for Grade 2A
 * - Subject Teacher for:
 *   - English (Grade 1A, Grade 1B)
 *   - Science (Grade 2A, Grade 2B)
 */

import prisma from "@/lib/db/prisma";
import { GradeLevel } from "@prisma/client";

async function seedTeacher2Assignments() {
  console.log("=".repeat(60));
  console.log("Seeding Teacher2 Assignments");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get teacher2 profile
    console.log("🔍 Finding teacher2@school.zm...");
    const teacher2User = await prisma.user.findUnique({
      where: { email: "teacher2@school.zm" },
    });

    if (!teacher2User) {
      throw new Error("Teacher2 user not found. Please run the main seed first.");
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: teacher2User.id },
    });

    if (!teacherProfile) {
      throw new Error("Teacher2 profile not found. Please run the main seed first.");
    }

    console.log(`✅ Found teacher: ${teacherProfile.firstName} ${teacherProfile.lastName}`);
    console.log();

    // Get current academic year
    console.log("🔍 Finding active academic year...");
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new Error("No active academic year found. Please run the main seed first.");
    }

    console.log(`✅ Academic year: ${academicYear.year}`);
    console.log();

    // Get grades
    const grade1 = await prisma.grade.findUnique({
      where: { level: GradeLevel.GRADE_1 },
    });
    const grade2 = await prisma.grade.findUnique({
      where: { level: GradeLevel.GRADE_2 },
    });

    if (!grade1 || !grade2) {
      throw new Error("Grades not found. Please run the main seed first.");
    }

    // Get classes
    console.log("🔍 Finding classes...");
    const grade1A = await prisma.class.findFirst({
      where: { gradeId: grade1.id, name: "A" },
    });
    const grade1B = await prisma.class.findFirst({
      where: { gradeId: grade1.id, name: "B" },
    });
    const grade2A = await prisma.class.findFirst({
      where: { gradeId: grade2.id, name: "A" },
    });
    const grade2B = await prisma.class.findFirst({
      where: { gradeId: grade2.id, name: "B" },
    });

    if (!grade1A || !grade1B || !grade2A || !grade2B) {
      throw new Error("Classes not found. Please run the main seed first.");
    }

    console.log("✅ Found all required classes");
    console.log();

    // Get subjects
    console.log("🔍 Finding subjects...");
    const englishSubject = await prisma.subject.findUnique({
      where: { code: "ENG" },
    });
    const scienceSubject = await prisma.subject.findUnique({
      where: { code: "SCI" },
    });

    if (!englishSubject || !scienceSubject) {
      throw new Error("Subjects not found. Please run the main seed first.");
    }

    console.log("✅ Found all required subjects");
    console.log();

    // Create Class Teacher Assignment for Grade 2A
    console.log("📝 Creating ClassTeacherAssignment for Grade 2A...");
    const classTeacherAssignment = await prisma.classTeacherAssignment.upsert({
      where: {
        classId_academicYearId: {
          classId: grade2A.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacherProfile.id,
        classId: grade2A.id,
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

    console.log(`✅ Class Teacher: ${classTeacherAssignment.class.grade.name} ${classTeacherAssignment.class.name}`);
    console.log();

    // Create Subject Teacher Assignments
    console.log("📝 Creating SubjectTeacherAssignments...");

    // English - Grade 1A
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacherProfile.id,
          subjectId: englishSubject.id,
          classId: grade1A.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacherProfile.id,
        subjectId: englishSubject.id,
        classId: grade1A.id,
        academicYearId: academicYear.id,
      },
    });
    console.log("✅ Subject: English - Grade 1A");

    // English - Grade 1B
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacherProfile.id,
          subjectId: englishSubject.id,
          classId: grade1B.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacherProfile.id,
        subjectId: englishSubject.id,
        classId: grade1B.id,
        academicYearId: academicYear.id,
      },
    });
    console.log("✅ Subject: English - Grade 1B");

    // Science - Grade 2A
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacherProfile.id,
          subjectId: scienceSubject.id,
          classId: grade2A.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacherProfile.id,
        subjectId: scienceSubject.id,
        classId: grade2A.id,
        academicYearId: academicYear.id,
      },
    });
    console.log("✅ Subject: Science - Grade 2A");

    // Science - Grade 2B
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacherProfile.id,
          subjectId: scienceSubject.id,
          classId: grade2B.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacherProfile.id,
        subjectId: scienceSubject.id,
        classId: grade2B.id,
        academicYearId: academicYear.id,
      },
    });
    console.log("✅ Subject: Science - Grade 2B");
    console.log();

    // Summary
    console.log("=".repeat(60));
    console.log("✨ Teacher2 assignments created successfully!");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary for teacher2@school.zm:");
    console.log("  📋 Class Teacher: Grade 2A");
    console.log("  📚 Subject Assignments:");
    console.log("     - English (Grade 1A, Grade 1B)");
    console.log("     - Science (Grade 2A, Grade 2B)");
    console.log();
    console.log("🔑 Login credentials:");
    console.log("   Email: teacher2@school.zm");
    console.log("   Password: Admin123!");
    console.log();

  } catch (error) {
    console.error("❌ Error seeding teacher2 assignments:", error);
    throw error;
  }
}

seedTeacher2Assignments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
