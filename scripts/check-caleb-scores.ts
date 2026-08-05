/**
 * Check Caleb Nyirenda's Assessment Scores
 * Specifically checking the MID assessment grade
 */

import prisma from "../lib/db/prisma";

async function checkCalebScores() {
  console.log("Checking Caleb Nyirenda's scores...\n");

  // Find Caleb
  const caleb = await prisma.student.findFirst({
    where: {
      OR: [
        { studentNumber: "STU-2026-2455" },
        { firstName: "Caleb", lastName: "Nyirenda" },
      ],
    },
  });

  if (!caleb) {
    console.log("❌ Caleb Nyirenda not found");
    return;
  }

  console.log("✅ Found Caleb:");
  console.log(`   ID: ${caleb.id}`);
  console.log(`   Name: ${caleb.firstName} ${caleb.lastName}`);
  console.log(`   Student Number: ${caleb.studentNumber}\n`);

  // Get all his assessment results for Mathematics
  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId: caleb.id,
    },
    include: {
      assessment: {
        include: {
          subject: true,
          class: {
            include: {
              grade: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${results.length} assessment results:\n`);

  results.forEach((result, index) => {
    const assessment = result.assessment;
    console.log(`${index + 1}. ${assessment.subject.name} - ${assessment.examType}`);
    console.log(`   Class: ${assessment.class.grade.name} ${assessment.class.name}`);
    console.log(`   Grade Level: ${assessment.class.grade.level}`);
    console.log(`   Marks: ${result.marksObtained}/${assessment.totalMarks} (${((result.marksObtained! / assessment.totalMarks) * 100).toFixed(1)}%)`);
    console.log(`   Grade Stored: ${result.grade || "NULL"}`);
    console.log(`   Assessment ID: ${assessment.id}`);
    console.log(`   Result ID: ${result.id}`);
    console.log("");
  });

  // Focus on MID results
  const midResults = results.filter((r) => r.assessment.examType === "MID");

  if (midResults.length === 0) {
    console.log("⚠️  No MID assessment results found");
  } else {
    console.log("\n=== MID Assessment Analysis ===");
    midResults.forEach((result) => {
      const percentage = (result.marksObtained! / result.assessment.totalMarks) * 100;
      console.log(`Subject: ${result.assessment.subject.name}`);
      console.log(`Score: ${result.marksObtained}/${result.assessment.totalMarks} (${percentage.toFixed(1)}%)`);
      console.log(`Stored Grade: ${result.grade || "NULL"}`);
      console.log(`Expected Grade (JUNIOR 40-49%): GRADE_4`);

      if (result.grade !== "GRADE_4") {
        console.log(`❌ MISMATCH! Should be GRADE_4, but is ${result.grade || "NULL"}`);
      } else {
        console.log(`✅ Correct!`);
      }
    });
  }

  await prisma.$disconnect();
}

checkCalebScores().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
