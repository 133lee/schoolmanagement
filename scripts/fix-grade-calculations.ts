/**
 * Fix Grade Calculations Script
 *
 * This script recalculates all assessment grades using the correct grade level
 * (JUNIOR for Grades 8-9, SENIOR for Grades 10-12).
 *
 * Run with: npx tsx scripts/fix-grade-calculations.ts
 */

import prisma from "../lib/db/prisma";
import { calculateECZGrade, mapPrismaGradeLevelToECZLevel } from "../lib/grading/ecz-grading-system";

async function fixGradeCalculations() {
  console.log("Starting grade calculation fix...\n");

  try {
    // Get all student assessment results with their related assessment and class info
    const results = await prisma.studentAssessmentResult.findMany({
      include: {
        assessment: {
          include: {
            class: {
              include: {
                grade: true,
              },
            },
          },
        },
      },
      where: {
        marksObtained: {
          not: null,
        },
      },
    });

    console.log(`Found ${results.length} assessment results to check\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    const errors: Array<{ resultId: string; error: string }> = [];

    for (const result of results) {
      try {
        const { assessment } = result;

        if (!assessment.class || !assessment.class.grade) {
          errors.push({
            resultId: result.id,
            error: "Missing class or grade information",
          });
          continue;
        }

        // Calculate percentage
        const percentage = (result.marksObtained! / assessment.totalMarks) * 100;

        // Determine correct grade level
        const gradeLevel = mapPrismaGradeLevelToECZLevel(assessment.class.grade.level);

        // Calculate correct grade
        const correctGrade = calculateECZGrade(percentage, gradeLevel);

        // Check if grade needs updating
        if (result.grade !== correctGrade) {
          console.log(
            `Updating result ${result.id}:`,
            `${assessment.class.grade.name} (${gradeLevel})`,
            `${result.marksObtained}/${assessment.totalMarks} (${percentage.toFixed(1)}%)`,
            `${result.grade} → ${correctGrade}`
          );

          await prisma.studentAssessmentResult.update({
            where: { id: result.id },
            data: { grade: correctGrade },
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error: any) {
        errors.push({
          resultId: result.id,
          error: error.message || "Unknown error",
        });
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Total results checked: ${results.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Unchanged: ${unchangedCount}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach((err) => {
        console.log(`Result ${err.resultId}: ${err.error}`);
      });
    }

    console.log("\n✅ Grade calculation fix completed!");
  } catch (error) {
    console.error("❌ Error fixing grade calculations:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixGradeCalculations();
