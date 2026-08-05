import prisma from "@/lib/db/prisma";

async function checkDepartments() {
  console.log("=".repeat(60));
  console.log("CHECKING DEPARTMENTS");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get all departments with subjects and teachers
    const departments = await prisma.department.findMany({
      include: {
        subjects: true,
        teacherProfiles: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`Found ${departments.length} departments:\n`);

    for (const dept of departments) {
      console.log(`📁 ${dept.name} (${dept.code})`);
      console.log(`   Status: ${dept.status}`);
      console.log(`   Subjects: ${dept.subjects.length}`);
      dept.subjects.forEach((subj) => {
        console.log(`     - ${subj.name} (${subj.code})`);
      });
      console.log(`   Teachers: ${dept.teacherProfiles.length}`);
      dept.teacherProfiles.forEach((teacher) => {
        console.log(
          `     - ${teacher.firstName} ${teacher.lastName} (${teacher.user.email}) - Role: ${teacher.user.role}`
        );
      });
      console.log();
    }

    // Check for HOD users
    console.log("=".repeat(60));
    console.log("CHECKING HOD USERS");
    console.log("=".repeat(60));
    console.log();

    const hods = await prisma.user.findMany({
      where: {
        role: "HOD",
      },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
      },
    });

    console.log(`Found ${hods.length} HOD users:\n`);

    for (const hod of hods) {
      console.log(`👤 ${hod.email}`);
      if (hod.profile) {
        console.log(
          `   Name: ${hod.profile.firstName} ${hod.profile.lastName}`
        );
        console.log(`   Staff Number: ${hod.profile.staffNumber}`);
        console.log(
          `   Department: ${hod.profile.department?.name || "Not Assigned"}`
        );
      }
      console.log();
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkDepartments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
