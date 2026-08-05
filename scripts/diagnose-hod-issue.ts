import prisma from "../lib/db/prisma";

async function diagnoseHODIssue() {
  console.log("=== Diagnosing HOD Assignment Issue ===\n");

  // 1. Check all departments with hodTeacherId
  console.log("1. Departments with HOD assigned:");
  const departments = await prisma.department.findMany({
    where: {
      hodTeacherId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      hodTeacherId: true,
    },
  });
  console.log(`Found ${departments.length} departments with HOD assigned`);
  console.log(departments);

  // 2. Check if those TeacherProfile IDs exist
  console.log("\n2. Checking if TeacherProfile records exist for those hodTeacherIds:");
  for (const dept of departments) {
    if (dept.hodTeacherId) {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: dept.hodTeacherId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });
      console.log(`  - Department: ${dept.name}, HOD Teacher: ${teacher ? `${teacher.firstName} ${teacher.lastName} (${teacher.user?.email})` : "NOT FOUND"}`);
    }
  }

  // 3. Try the actual query with hodTeacher relation
  console.log("\n3. Testing the actual Prisma query with hodTeacher relation:");
  const departmentsWithHOD = await prisma.department.findMany({
    where: {
      hodTeacherId: {
        not: null,
      },
    },
    include: {
      hodTeacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  console.log("\nQuery Results:");
  departmentsWithHOD.forEach((dept) => {
    console.log(`  - ${dept.name}:`);
    console.log(`    HOD Teacher: ${dept.hodTeacher ? `${dept.hodTeacher.firstName} ${dept.hodTeacher.lastName}` : "null"}`);
    console.log(`    HOD Email: ${dept.hodTeacher?.user?.email || "null"}`);
  });

  await prisma.$disconnect();
}

diagnoseHODIssue().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
