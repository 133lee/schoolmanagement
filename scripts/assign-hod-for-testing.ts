import prisma from "../lib/db/prisma";

async function assignHOD() {
  try {
    const teacher = await prisma.teacherProfile.findFirst({
      where: { status: "ACTIVE" },
    });

    const department = await prisma.department.findFirst();

    if (!teacher || !department) {
      console.log("Need at least one teacher and one department");
      return;
    }

    await prisma.department.update({
      where: { id: department.id },
      data: {
        hodTeacher: {
          connect: { id: teacher.id },
        },
      },
    });

    console.log(`✅ Assigned ${teacher.firstName} ${teacher.lastName} as HOD of ${department.name}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

assignHOD();
