/**
 * Check Assessments
 *
 * This script checks if there are published assessments for teacher2's subjects
 */

import prisma from "@/lib/db/prisma";

async function checkAssessments() {
  console.log("=".repeat(60));
  console.log("Checking Assessments for Teacher2's Subjects");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true }
    });

    if (!academicYear) {
      console.log("❌ No active academic year found");
      return;
    }

    console.log(`✅ Active Academic Year: ${academicYear.year}`);
    console.log();

    // Get active term
    const term = await prisma.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        isActive: true
      }
    });

    if (!term) {
      console.log("❌ No active term found");
      return;
    }

    console.log(`✅ Active Term: ${term.name}`);
    console.log();

    // Get teacher2's subjects
    const teacher2 = await prisma.teacherProfile.findFirst({
      where: {
        user: {
          email: "teacher2@school.zm"
        }
      }
    });

    if (!teacher2) {
      console.log("❌ Teacher2 not found");
      return;
    }

    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId: teacher2.id
      },
      include: {
        subject: true
      }
    });

    const uniqueSubjects = [...new Set(assignments.map(a => a.subject))];
    console.log(`Teacher2 teaches ${uniqueSubjects.length} unique subjects:`);
    uniqueSubjects.forEach(s => console.log(`  - ${s.name} (${s.code})`));
    console.log();

    // Check for assessments
    for (const subject of uniqueSubjects) {
      console.log(`📝 Assessments for ${subject.name} (${subject.code}):`);

      const assessments = await prisma.assessment.findMany({
        where: {
          subjectId: subject.id,
          termId: term.id
        },
        orderBy: {
          examType: 'asc'
        }
      });

      if (assessments.length === 0) {
        console.log("   ❌ NO ASSESSMENTS FOUND!");
      } else {
        assessments.forEach(a => {
          console.log(`   - ${a.examType} (${a.status}) - ${a.totalMarks} marks`);
        });
      }
      console.log();
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));

    const subjectIds = uniqueSubjects.map(s => s.id);
    const totalAssessments = await prisma.assessment.count({
      where: {
        subjectId: { in: subjectIds },
        termId: term.id
      }
    });

    const publishedAssessments = await prisma.assessment.count({
      where: {
        subjectId: { in: subjectIds },
        termId: term.id,
        status: 'PUBLISHED'
      }
    });

    console.log(`Total assessments: ${totalAssessments}`);
    console.log(`Published assessments: ${publishedAssessments}`);
    console.log();

  } catch (error) {
    console.error("❌ Error checking assessments:", error);
    throw error;
  }
}

checkAssessments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
