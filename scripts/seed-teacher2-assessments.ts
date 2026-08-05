/**
 * Seed Assessments for Teacher2's Classes
 *
 * Creates CAT, MID_TERM, and END_OF_TERM assessments for:
 * - English (Grade 1A, Grade 1B)
 * - Science (Grade 2A, Grade 2B)
 *
 * Professional standards:
 * - All assessments total 100 marks (ECZ standard)
 * - Pass mark set at 40% (ECZ standard)
 * - Proper weight distribution: CAT (1.0), MID (1.5), EOT (2.0)
 * - Status set to PUBLISHED so they appear in gradebook
 */

import prisma from "@/lib/db/prisma";
import { GradeLevel } from "@prisma/client";

async function seedTeacher2Assessments() {
  console.log("=".repeat(60));
  console.log("SEEDING ASSESSMENTS FOR TEACHER2");
  console.log("=".repeat(60));
  console.log();

  try {
    // 1. Get active academic year and term
    console.log("🔍 Finding active academic year and term...");
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new Error("No active academic year found");
    }

    const term = await prisma.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        isActive: true,
      },
    });

    if (!term) {
      throw new Error("No active term found");
    }

    console.log(`✅ Academic Year: ${academicYear.year}, Term: ${term.termType}`);
    console.log();

    // 2. Get subjects
    console.log("🔍 Finding subjects...");
    const englishSubject = await prisma.subject.findUnique({
      where: { code: "ENG" },
    });
    const scienceSubject = await prisma.subject.findUnique({
      where: { code: "SCI" },
    });

    if (!englishSubject || !scienceSubject) {
      throw new Error("Required subjects not found");
    }

    console.log("✅ Subjects found: English, Science");
    console.log();

    // 3. Get grades
    const grade1 = await prisma.grade.findUnique({
      where: { level: GradeLevel.GRADE_1 },
    });
    const grade2 = await prisma.grade.findUnique({
      where: { level: GradeLevel.GRADE_2 },
    });

    if (!grade1 || !grade2) {
      throw new Error("Grades not found");
    }

    // 4. Get classes
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
      throw new Error("Classes not found");
    }

    console.log("✅ Classes found: Grade 1A, 1B, 2A, 2B");
    console.log();

    // 5. Create assessments
    let assessmentsCreated = 0;

    // Helper function to create assessment types for a class/subject
    const createAssessmentsForClass = async (
      subjectId: string,
      subjectName: string,
      classId: string,
      className: string
    ) => {
      console.log(`📝 Creating assessments for ${subjectName} - ${className}...`);

      // CAT
      const existingCAT = await prisma.assessment.findFirst({
        where: {
          title: `CAT 1 - ${subjectName} - ${className}`,
          classId,
          termId: term.id,
        },
      });

      if (!existingCAT) {
        await prisma.assessment.create({
          data: {
            title: `CAT 1 - ${subjectName} - ${className}`,
            description: `Continuous Assessment Test 1 for ${subjectName}`,
            subjectId,
            classId,
            termId: term.id,
            examType: "CAT",
            totalMarks: 100,
            passMark: 40,
            weight: 1.0,
            assessmentDate: new Date("2025-02-15"),
            status: "PUBLISHED",
          },
        });
        assessmentsCreated++;
      }

      // MID
      const existingMID = await prisma.assessment.findFirst({
        where: {
          title: `Mid-Term - ${subjectName} - ${className}`,
          classId,
          termId: term.id,
        },
      });

      if (!existingMID) {
        await prisma.assessment.create({
          data: {
            title: `Mid-Term - ${subjectName} - ${className}`,
            description: `Mid-Term Examination for ${subjectName}`,
            subjectId,
            classId,
            termId: term.id,
            examType: "MID",
            totalMarks: 100,
            passMark: 40,
            weight: 1.5,
            assessmentDate: new Date("2025-03-01"),
            status: "PUBLISHED",
          },
        });
        assessmentsCreated++;
      }

      // EOT
      const existingEOT = await prisma.assessment.findFirst({
        where: {
          title: `End of Term - ${subjectName} - ${className}`,
          classId,
          termId: term.id,
        },
      });

      if (!existingEOT) {
        await prisma.assessment.create({
          data: {
            title: `End of Term - ${subjectName} - ${className}`,
            description: `End of Term Examination for ${subjectName}`,
            subjectId,
            classId,
            termId: term.id,
            examType: "EOT",
            totalMarks: 100,
            passMark: 40,
            weight: 2.0,
            assessmentDate: new Date("2025-04-10"),
            status: "PUBLISHED",
          },
        });
        assessmentsCreated++;
      }

      console.log(`   ✅ CAT, MID, EOT created`);
    };

    // English - Grade 1A
    await createAssessmentsForClass(
      englishSubject.id,
      "English",
      grade1A.id,
      "Grade 1A"
    );

    // English - Grade 1B
    await createAssessmentsForClass(
      englishSubject.id,
      "English",
      grade1B.id,
      "Grade 1B"
    );

    // Science - Grade 2A
    await createAssessmentsForClass(
      scienceSubject.id,
      "Science",
      grade2A.id,
      "Grade 2A"
    );

    // Science - Grade 2B
    await createAssessmentsForClass(
      scienceSubject.id,
      "Science",
      grade2B.id,
      "Grade 2B"
    );

    console.log();
    console.log("=".repeat(60));
    console.log("✨ ASSESSMENTS CREATED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`✅ Total assessments created: ${assessmentsCreated}`);
    console.log();
    console.log("Assessment breakdown:");
    console.log("  📚 English (Grade 1A): CAT, MID, EOT");
    console.log("  📚 English (Grade 1B): CAT, MID, EOT");
    console.log("  🔬 Science (Grade 2A): CAT, MID, EOT");
    console.log("  🔬 Science (Grade 2B): CAT, MID, EOT");
    console.log();
    console.log("All assessments:");
    console.log("  - Total Marks: 100");
    console.log("  - Pass Mark: 40 (40%)");
    console.log("  - Status: PUBLISHED");
    console.log();
    console.log("Next steps:");
    console.log("  1. Login as teacher2@school.zm");
    console.log("  2. Navigate to Gradebook");
    console.log("  3. Select a subject (English or Science)");
    console.log("  4. Select a class to start grading");
    console.log();

  } catch (error) {
    console.error("❌ Error seeding assessments:", error);
    throw error;
  }
}

seedTeacher2Assessments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
