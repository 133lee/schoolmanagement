/**
 * Diagnostic Script: Trace Teacher Class Assignment Data Flow
 *
 * Purpose: Verify end-to-end data integrity for teacher class assignments
 * Run: npx tsx scripts/diagnose-teacher-classes.ts <teacherEmail>
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

import prisma from "../lib/db/prisma";

async function diagnoseTeacherClasses(teacherEmail: string) {
  console.log("=".repeat(80));
  console.log("TEACHER CLASS ASSIGNMENT DIAGNOSTIC");
  console.log("=".repeat(80));
  console.log(`Teacher Email: ${teacherEmail}`);
  console.log("");

  // Step 1: Find User
  console.log("STEP 1: LOCATE USER");
  console.log("-".repeat(80));
  const user = await prisma.user.findUnique({
    where: { email: teacherEmail },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    console.log("❌ USER NOT FOUND");
    return;
  }

  console.log("✅ User Found:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Active: ${user.isActive}`);
  console.log("");

  // Step 2: Find TeacherProfile
  console.log("STEP 2: LOCATE TEACHER PROFILE");
  console.log("-".repeat(80));
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      staffNumber: true,
      status: true,
    },
  });

  if (!teacherProfile) {
    console.log("❌ TEACHER PROFILE NOT FOUND");
    console.log(`   User ID: ${user.id} has no TeacherProfile`);
    return;
  }

  console.log("✅ TeacherProfile Found:");
  console.log(`   ID: ${teacherProfile.id}`);
  console.log(`   User ID: ${teacherProfile.userId}`);
  console.log(`   Name: ${teacherProfile.firstName} ${teacherProfile.lastName}`);
  console.log(`   Staff #: ${teacherProfile.staffNumber}`);
  console.log(`   Status: ${teacherProfile.status}`);
  console.log("");

  // Step 3: Find Active Academic Year
  console.log("STEP 3: LOCATE ACTIVE ACADEMIC YEAR");
  console.log("-".repeat(80));
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      year: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
  });

  if (!academicYear) {
    console.log("❌ NO ACTIVE ACADEMIC YEAR");
    console.log("   System has no active academic year set");
    return;
  }

  console.log("✅ Active Academic Year Found:");
  console.log(`   ID: ${academicYear.id}`);
  console.log(`   Year: ${academicYear.year}`);
  console.log(`   Period: ${academicYear.startDate.toISOString().split("T")[0]} to ${academicYear.endDate.toISOString().split("T")[0]}`);
  console.log(`   Active: ${academicYear.isActive}`);
  console.log("");

  // Step 4: Query ClassTeacherAssignments
  console.log("STEP 4: QUERY CLASS TEACHER ASSIGNMENTS");
  console.log("-".repeat(80));
  const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
    where: {
      teacherId: teacherProfile.id,
      academicYearId: academicYear.id,
    },
    include: {
      class: {
        include: {
          grade: true,
        },
      },
      academicYear: {
        select: {
          year: true,
          isActive: true,
        },
      },
    },
  });

  console.log(`Found: ${classTeacherAssignments.length} class teacher assignments`);
  if (classTeacherAssignments.length > 0) {
    console.log("");
    classTeacherAssignments.forEach((assignment, idx) => {
      console.log(`   [${idx + 1}] Class: ${assignment.class.name}`);
      console.log(`       Grade: ${assignment.class.grade.name} (${assignment.class.grade.schoolLevel})`);
      console.log(`       Academic Year: ${assignment.academicYear.year} (Active: ${assignment.academicYear.isActive})`);
      console.log(`       Assignment ID: ${assignment.id}`);
      console.log("");
    });
  } else {
    console.log("   ⚠️  No class teacher assignments found");
  }
  console.log("");

  // Step 5: Query SubjectTeacherAssignments
  console.log("STEP 5: QUERY SUBJECT TEACHER ASSIGNMENTS");
  console.log("-".repeat(80));
  const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
    where: {
      teacherId: teacherProfile.id,
      academicYearId: academicYear.id,
    },
    include: {
      class: {
        include: {
          grade: true,
        },
      },
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
      academicYear: {
        select: {
          year: true,
          isActive: true,
        },
      },
    },
  });

  console.log(`Found: ${subjectTeacherAssignments.length} subject teacher assignments`);
  if (subjectTeacherAssignments.length > 0) {
    console.log("");
    subjectTeacherAssignments.forEach((assignment, idx) => {
      console.log(`   [${idx + 1}] Class: ${assignment.class.name}`);
      console.log(`       Grade: ${assignment.class.grade.name} (${assignment.class.grade.schoolLevel})`);
      console.log(`       Subject: ${assignment.subject.name} (${assignment.subject.code})`);
      console.log(`       Academic Year: ${assignment.academicYear.year} (Active: ${assignment.academicYear.isActive})`);
      console.log(`       Assignment ID: ${assignment.id}`);
      console.log("");
    });
  } else {
    console.log("   ⚠️  No subject teacher assignments found");
  }
  console.log("");

  // Step 6: Check for assignments in OTHER academic years
  console.log("STEP 6: CHECK OTHER ACADEMIC YEARS (Historical Data)");
  console.log("-".repeat(80));

  const allClassTeacherAssignments = await prisma.classTeacherAssignment.findMany({
    where: { teacherId: teacherProfile.id },
    include: {
      academicYear: {
        select: {
          year: true,
          isActive: true,
        },
      },
    },
  });

  const allSubjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
    where: { teacherId: teacherProfile.id },
    include: {
      academicYear: {
        select: {
          year: true,
          isActive: true,
        },
      },
    },
  });

  console.log(`Total Class Teacher Assignments (All Years): ${allClassTeacherAssignments.length}`);
  console.log(`Total Subject Teacher Assignments (All Years): ${allSubjectTeacherAssignments.length}`);

  if (allClassTeacherAssignments.length > classTeacherAssignments.length) {
    console.log("");
    console.log("⚠️  Teacher has assignments in OTHER academic years:");
    allClassTeacherAssignments
      .filter((a) => a.academicYearId !== academicYear.id)
      .forEach((assignment) => {
        console.log(`   - Academic Year: ${assignment.academicYear.year} (Active: ${assignment.academicYear.isActive})`);
      });
  }

  console.log("");

  // Summary
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`User ID: ${user.id}`);
  console.log(`TeacherProfile ID: ${teacherProfile.id}`);
  console.log(`Active Academic Year ID: ${academicYear.id}`);
  console.log(`Active Academic Year: ${academicYear.year}`);
  console.log("");
  console.log(`Class Teacher Assignments (Active Year): ${classTeacherAssignments.length}`);
  console.log(`Subject Teacher Assignments (Active Year): ${subjectTeacherAssignments.length}`);
  console.log("");

  if (classTeacherAssignments.length === 0 && subjectTeacherAssignments.length === 0) {
    console.log("❌ DIAGNOSIS: Teacher has NO assignments in active academic year");
    console.log("   This is why 'My Classes' shows empty.");
    console.log("");
    console.log("   Possible Causes:");
    console.log("   1. Teacher was never assigned to any class");
    console.log("   2. Teacher was assigned but then removed");
    console.log("   3. Teacher's assignments are in a different academic year");
    console.log("   4. Admin assigned using wrong teacher ID");
  } else {
    console.log("✅ DIAGNOSIS: Teacher HAS assignments in active academic year");
    console.log("   If UI shows empty, the problem is in API or frontend layer.");
  }

  console.log("=".repeat(80));

  await prisma.$disconnect();
}

// Run diagnostic
const teacherEmail = process.argv[2];

if (!teacherEmail) {
  console.error("Usage: npx tsx scripts/diagnose-teacher-classes.ts <teacher-email>");
  process.exit(1);
}

diagnoseTeacherClasses(teacherEmail)
  .catch((error) => {
    console.error("Error running diagnostic:", error);
    process.exit(1);
  });
