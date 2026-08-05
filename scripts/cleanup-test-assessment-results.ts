import prisma from "@/lib/db/prisma";

async function cleanup() {
  const result = await prisma.studentAssessmentResult.deleteMany({
    where: {
      remarks: {
        contains: "API test",
      },
    },
  });

  console.log(`Deleted ${result.count} test grades`);
  await prisma.$disconnect();
}

cleanup();
