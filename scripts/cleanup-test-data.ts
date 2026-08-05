import prisma from "../lib/db/prisma";

async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...\n");

  // Delete test classes
  const deletedClasses = await prisma.class.deleteMany({
    where: {
      name: {
        startsWith: "API Test",
      },
    },
  });
  console.log(`✅ Deleted ${deletedClasses.count} test classes`);

  // Delete test students (if any)
  const deletedStudents = await prisma.student.deleteMany({
    where: {
      studentNumber: {
        startsWith: "TEST",
      },
    },
  });
  console.log(`✅ Deleted ${deletedStudents.count} test students`);

  // Delete test teachers (if any)
  const deletedTeachers = await prisma.teacherProfile.deleteMany({
    where: {
      staffNumber: {
        startsWith: "TEST",
      },
    },
  });
  console.log(`✅ Deleted ${deletedTeachers.count} test teachers`);

  console.log("\n✨ Cleanup complete!");
}

cleanupTestData()
  .catch((e) => {
    console.error("❌ Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
