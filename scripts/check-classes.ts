import prisma from "../lib/db/prisma";

async function checkClasses() {
  try {
    // Get all classes
    const classes = await prisma.class.findMany({
      include: {
        grade: true,
      },
    });

    console.log("=== DATABASE CLASSES ===");
    console.log(`Total classes: ${classes.length}`);

    if (classes.length > 0) {
      console.log("\nClasses:");
      classes.forEach((c) => {
        console.log(`- ${c.name} (${c.grade.name}, Level: ${c.grade.level})`);
      });
    } else {
      console.log("\n⚠️ NO CLASSES FOUND IN DATABASE");
    }

    // Get all grades
    const grades = await prisma.grade.findMany({
      orderBy: { sequence: "asc" },
    });

    console.log("\n=== DATABASE GRADES ===");
    console.log(`Total grades: ${grades.length}`);

    if (grades.length > 0) {
      console.log("\nGrades:");
      grades.forEach((g) => {
        console.log(`- ${g.name} (Level: ${g.level})`);
      });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClasses();
