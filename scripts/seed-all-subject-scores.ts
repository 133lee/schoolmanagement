/**
 * Seed Sample Scores for ALL Teacher2's Subjects
 *
 * Creates sample scores for ALL students in ALL teacher2's classes:
 * - English (Grade 1A, Grade 1B)
 * - Science (Grade 2A, Grade 2B)
 */

import prisma from "@/lib/db/prisma";

async function seedAllSubjectScores() {
  console.log("=".repeat(60));
  console.log("SEEDING SCORES FOR ALL SUBJECTS");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get subjects
    const englishSubject = await prisma.subject.findUnique({
      where: { code: "ENG" },
    });
    const scienceSubject = await prisma.subject.findUnique({
      where: { code: "SCI" },
    });

    if (!englishSubject || !scienceSubject) {
      throw new Error("Required subjects not found");
    }

    // Get grades
    const grade1 = await prisma.grade.findUnique({
      where: { level: "GRADE_1" },
    });
    const grade2 = await prisma.grade.findUnique({
      where: { level: "GRADE_2" },
    });

    if (!grade1 || !grade2) {
      throw new Error("Grades not found");
    }

    // Get classes
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
      throw new Error("Classes not found");
    }

    console.log("✅ Found all required subjects and classes");
    console.log();

    let totalScoresCreated = 0;

    // Helper function to create scores for a subject/class combination
    const createScoresForClass = async (
      subjectId: string,
      subjectName: string,
      classId: string,
      className: string
    ) => {
      console.log(`📝 Creating scores for ${subjectName} - ${className}...`);

      // Get assessments for this subject/class
      const assessments = await prisma.assessment.findMany({
        where: {
          subjectId,
          classId,
          status: "PUBLISHED",
        },
        orderBy: {
          examType: "asc",
        },
      });

      if (assessments.length === 0) {
        console.log(`   ⚠️  No assessments found - run seed:teacher2:assessments first`);
        console.log();
        return;
      }

      console.log(`   Found ${assessments.length} assessments (${assessments.map(a => a.examType).join(", ")})`);

      // Get all students in this class
      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: {
          classId,
          status: "ACTIVE",
        },
        include: {
          student: true,
        },
      });

      if (enrollments.length === 0) {
        console.log(`   ⚠️  No students found - run seed:unique:students first`);
        console.log();
        return;
      }

      console.log(`   Found ${enrollments.length} students`);

      let classScoresCreated = 0;

      // Create scores for each student for each assessment
      for (const enrollment of enrollments) {
        const student = enrollment.student;

        for (const assessment of assessments) {
          // Generate realistic scores with some variation
          // CAT: 40-90, MID: 45-92, EOT: 50-95
          let minScore = 40;
          let maxScore = 90;

          if (assessment.examType === "MID") {
            minScore = 45;
            maxScore = 92;
          } else if (assessment.examType === "EOT") {
            minScore = 50;
            maxScore = 95;
          }

          const score = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;

          // Calculate grade based on Zambian ECZ grading system
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
                subjectId,
              },
            },
            update: {
              marksObtained: score,
              grade: grade as any,
            },
            create: {
              studentId: student.id,
              assessmentId: assessment.id,
              subjectId,
              marksObtained: score,
              grade: grade as any,
            },
          });

          classScoresCreated++;
        }
      }

      console.log(`   ✅ Created ${classScoresCreated} scores (${enrollments.length} students × ${assessments.length} assessments)`);
      console.log();
      totalScoresCreated += classScoresCreated;
    };

    // Create scores for all subject/class combinations
    await createScoresForClass(englishSubject.id, "English", grade1A.id, "Grade 1A");
    await createScoresForClass(englishSubject.id, "English", grade1B.id, "Grade 1B");
    await createScoresForClass(scienceSubject.id, "Science", grade2A.id, "Grade 2A");
    await createScoresForClass(scienceSubject.id, "Science", grade2B.id, "Grade 2B");

    console.log("=".repeat(60));
    console.log("✨ ALL SCORES CREATED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log();
    console.log(`✅ Total scores created: ${totalScoresCreated}`);
    console.log();
    console.log("Score distribution:");
    console.log("  📚 English (Grade 1A): CAT, MID, EOT for all students");
    console.log("  📚 English (Grade 1B): CAT, MID, EOT for all students");
    console.log("  🔬 Science (Grade 2A): CAT, MID, EOT for all students");
    console.log("  🔬 Science (Grade 2B): CAT, MID, EOT for all students");
    console.log();
    console.log("Next steps:");
    console.log("  1. Login as teacher2@school.zm");
    console.log("  2. Navigate to Student Performance page");
    console.log("  3. Try both 'As Class Teacher' and 'As Subject Teacher' views");
    console.log("  4. Select different subjects (English/Science) to see performance data");
    console.log();

  } catch (error) {
    console.error("❌ Error seeding scores:", error);
    throw error;
  }
}

seedAllSubjectScores()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
