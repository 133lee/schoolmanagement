import prisma from "@/lib/db/prisma";

async function checkGradeSubjects() {
  try {
    console.log("Checking grade subjects...\n");

    // Get all grades
    const grades = await prisma.grade.findMany({
      include: {
        _count: {
          select: { subjects: true },
        },
      },
    });

    console.log("Grades and their subject counts:");
    for (const grade of grades) {
      console.log(`  ${grade.name}: ${grade._count.subjects} subjects`);
    }

    const totalGradeSubjects = await prisma.gradeSubject.count();
    console.log(`\nTotal GradeSubjects: ${totalGradeSubjects}`);

    if (totalGradeSubjects === 0) {
      console.log("\n⚠️  No grade subjects found!");
      console.log("Grade subjects map subjects to grades for the curriculum.");
      console.log("This is required for report card generation.");
    }

    // Get all subjects
    const subjects = await prisma.subject.findMany();
    console.log(`\nTotal Subjects: ${subjects.length}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkGradeSubjects();
