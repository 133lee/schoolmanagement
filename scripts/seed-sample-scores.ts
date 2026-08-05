/**
 * Seed Sample Scores for Gradebook Testing
 *
 * Creates sample scores for a few students in teacher2's classes
 * so the gradebook displays actual data
 */

import prisma from "@/lib/db/prisma";

async function seedSampleScores() {
  console.log("=".repeat(60));
  console.log("SEEDING SAMPLE SCORES FOR GRADEBOOK");
  console.log("=".repeat(60));
  console.log();

  try {
    // 1. Get teacher2's English Grade 1B class
    console.log("🔍 Finding English Grade 1B assessments...");

    const englishSubject = await prisma.subject.findUnique({
      where: { code: "ENG" },
    });

    const grade1 = await prisma.grade.findUnique({
      where: { level: "GRADE_1" },
    });

    const grade1B = await prisma.class.findFirst({
      where: {
        gradeId: grade1!.id,
        name: "B",
      },
    });

    if (!englishSubject || !grade1B) {
      throw new Error("Subject or class not found");
    }

    // Get assessments
    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: englishSubject.id,
        classId: grade1B.id,
        status: "PUBLISHED",
      },
      orderBy: {
        examType: "asc",
      },
    });

    console.log(`✅ Found ${assessments.length} assessments for English Grade 1B`);
    assessments.forEach((a) => {
      console.log(`   - ${a.title} (${a.examType})`);
    });
    console.log();

    // 2. Get first 5 students from Grade 1B
    console.log("🔍 Finding students in Grade 1B...");

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: grade1B.id,
      },
      include: {
        student: true,
      },
      take: 5,
    });

    console.log(`✅ Found ${enrollments.length} students`);
    console.log();

    // 3. Create sample scores
    console.log("📝 Creating sample scores...");
    console.log();

    let scoresCreated = 0;

    for (const enrollment of enrollments) {
      const student = enrollment.student;
      console.log(`   ${student.firstName} ${student.lastName} (${student.studentNumber})`);

      for (const assessment of assessments) {
        // Generate a random score between 40-95
        const score = Math.floor(Math.random() * (95 - 40 + 1)) + 40;

        // Calculate grade
        const percentage = (score / assessment.totalMarks) * 100;
        let grade = "GRADE_9";
        if (percentage >= 75) grade = "GRADE_1";
        else if (percentage >= 70) grade = "GRADE_2";
        else if (percentage >= 65) grade = "GRADE_3";
        else if (percentage >= 60) grade = "GRADE_4";
        else if (percentage >= 55) grade = "GRADE_5";
        else if (percentage >= 50) grade = "GRADE_6";
        else if (percentage >= 45) grade = "GRADE_7";
        else if (percentage >= 40) grade = "GRADE_8";

        await prisma.studentAssessmentResult.upsert({
          where: {
            studentId_assessmentId_subjectId: {
              studentId: student.id,
              assessmentId: assessment.id,
              subjectId: englishSubject.id,
            },
          },
          update: {
            marksObtained: score,
            grade: grade as any,
          },
          create: {
            studentId: student.id,
            assessmentId: assessment.id,
            subjectId: englishSubject.id,
            marksObtained: score,
            grade: grade as any,
          },
        });

        console.log(`      ${assessment.examType}: ${score}/${assessment.totalMarks} (${percentage.toFixed(0)}% - ${grade})`);
        scoresCreated++;
      }
      console.log();
    }

    console.log("=".repeat(60));
    console.log("✨ SAMPLE SCORES CREATED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log();
    console.log(`✅ Total scores created: ${scoresCreated}`);
    console.log(`✅ Students with scores: ${enrollments.length}`);
    console.log(`✅ Assessments per student: ${assessments.length}`);
    console.log();
    console.log("Next steps:");
    console.log("  1. Login as teacher2@school.zm");
    console.log("  2. Navigate to Gradebook");
    console.log("  3. Select 'English' as subject");
    console.log("  4. Select 'Grade 1 B' as class");
    console.log("  5. You should now see scores and percentages!");
    console.log();

  } catch (error) {
    console.error("❌ Error seeding scores:", error);
    throw error;
  }
}

seedSampleScores()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
