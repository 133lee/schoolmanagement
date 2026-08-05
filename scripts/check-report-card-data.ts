/**
 * Script to check report card data in the database
 * This helps debug why class teacher and scores are showing as undefined/empty
 */

import { config } from "dotenv";
config();

import prisma from "../lib/db/prisma";

async function checkReportCardData() {
  console.log("🔍 Checking report card data...\n");

  // Get first report card
  const reportCard = await prisma.reportCard.findFirst({
    include: {
      student: true,
      class: {
        include: {
          grade: true,
        },
      },
      term: {
        include: {
          academicYear: true,
        },
      },
      classTeacher: {
        include: {
          user: true,
        },
      },
      subjects: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!reportCard) {
    console.log("❌ No report cards found in database");
    return;
  }

  console.log("📊 Report Card ID:", reportCard.id);
  console.log("\n👤 Student:");
  console.log("   Name:", reportCard.student?.firstName, reportCard.student?.lastName);

  console.log("\n👔 Class Teacher:");
  console.log("   Teacher Profile ID:", reportCard.classTeacherId);
  console.log("   Teacher Profile:", reportCard.classTeacher ? "Found" : "NOT FOUND");
  console.log("   User:", reportCard.classTeacher?.user ? "Found" : "NOT FOUND");
  if (reportCard.classTeacher?.user) {
    console.log("   Name:", reportCard.classTeacher.user.firstName, reportCard.classTeacher.user.lastName);
  }

  console.log("\n📚 Subjects and Marks:");
  console.log("   Total subjects:", reportCard.subjects.length);

  if (reportCard.subjects.length > 0) {
    reportCard.subjects.forEach((subject, index) => {
      console.log(`\n   Subject ${index + 1}: ${subject.subject.name}`);
      console.log(`   - CAT Mark: ${subject.catMark ?? "NULL"}`);
      console.log(`   - MID Mark: ${subject.midMark ?? "NULL"}`);
      console.log(`   - EOT Mark: ${subject.eotMark ?? "NULL"}`);
      console.log(`   - Total Mark: ${subject.totalMark ?? "NULL"}`);
      console.log(`   - Grade: ${subject.grade ?? "NULL"}`);
    });
  } else {
    console.log("   ⚠️ No subjects found for this report card");
  }

  console.log("\n📈 Overall Stats:");
  console.log("   Average Mark:", reportCard.averageMark ?? "NULL");
  console.log("   Attendance:", reportCard.attendance);
  console.log("   Position:", reportCard.position ?? "NULL", "/", reportCard.outOf ?? "NULL");

  // Check if we have a classTeacher issue
  if (!reportCard.classTeacher) {
    console.log("\n🔍 Investigating classTeacher relation...");
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: reportCard.classTeacherId },
      include: { user: true },
    });

    if (!teacher) {
      console.log("   ❌ TeacherProfile NOT FOUND with ID:", reportCard.classTeacherId);
      console.log("   ⚠️ This is a data integrity issue - the report card references a non-existent teacher");
    } else {
      console.log("   ✅ TeacherProfile found:", teacher.id);
      console.log("   User ID:", teacher.userId);
      if (teacher.user) {
        console.log("   ✅ User found:", teacher.user.firstName, teacher.user.lastName);
      } else {
        console.log("   ❌ User NOT FOUND for teacher");
      }
    }
  }

  // Check if we have assessment data
  console.log("\n🔍 Checking for assessment data...");
  const assessments = await prisma.assessment.findMany({
    where: {
      classId: reportCard.classId,
      termId: reportCard.termId,
    },
    include: {
      results: {
        where: {
          studentId: reportCard.studentId,
        },
      },
      subject: true,
    },
  });

  console.log("   Total assessments for this class/term:", assessments.length);

  if (assessments.length > 0) {
    console.log("\n   Assessment breakdown:");
    assessments.forEach((assessment) => {
      const result = assessment.results[0];
      console.log(`   - ${assessment.examType} (${assessment.subject.name}):`,
        result ? `${result.marksObtained}/${assessment.totalMarks}` : "No result");
    });
  } else {
    console.log("   ⚠️ No assessments found - this is why marks are empty!");
  }
}

checkReportCardData()
  .catch((error) => {
    console.error("Error checking report card data:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
