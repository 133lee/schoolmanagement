import prisma from "../lib/db/prisma";

async function checkMaryBanda() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "mary.banda@school.zm" },
      include: {
        profile: {
          include: {
            department: true,
            subjects: {
              include: {
                subject: true,
              },
            },
            classTeacherAssignments: {
              include: {
                class: {
                  include: {
                    grade: true,
                  },
                },
                academicYear: true,
              },
            },
            subjectTeacherAssignments: {
              include: {
                subject: true,
                class: {
                  include: {
                    grade: true,
                  },
                },
                academicYear: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log("❌ Mary Banda not found in database");
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📋 MARY BANDA - TEACHER PROFILE");
    console.log("=".repeat(60) + "\n");

    console.log("🔐 LOGIN CREDENTIALS:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: password123 (default for all seeded users)`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.isActive ? "Active" : "Inactive"}\n`);

    const profile = user.profile;
    if (!profile) {
      console.log("❌ No teacher profile found");
      return;
    }

    console.log("👤 PERSONAL INFORMATION:");
    console.log(`   Staff Number: ${profile.staffNumber}`);
    console.log(`   Full Name: ${profile.firstName} ${profile.lastName}`);
    console.log(`   Date of Birth: ${profile.dateOfBirth.toLocaleDateString()}`);
    console.log(`   Gender: ${profile.gender}`);
    console.log(`   Phone: ${profile.phone}\n`);

    console.log("🎓 QUALIFICATIONS:");
    console.log(`   Qualification Level: ${profile.qualification}`);
    console.log(`   Years of Experience: ${profile.yearsExperience} years`);
    console.log(`   Hire Date: ${profile.hireDate.toLocaleDateString()}`);
    console.log(`   Employment Status: ${profile.status}\n`);

    console.log("🏢 DEPARTMENT:");
    console.log(
      `   ${profile.department ? profile.department.name : "No department assigned"}\n`
    );

    console.log("📚 QUALIFIED SUBJECTS:");
    if (profile.subjects.length === 0) {
      console.log("   No subjects assigned");
    } else {
      profile.subjects.forEach((ts) => {
        console.log(`   • ${ts.subject.name}`);
      });
    }
    console.log("");

    console.log("👨‍🏫 CLASS TEACHER ASSIGNMENTS:");
    if (profile.classTeacherAssignments.length === 0) {
      console.log("   Not assigned as a class teacher");
    } else {
      profile.classTeacherAssignments.forEach((assignment) => {
        console.log(
          `   • ${assignment.class.name} (${assignment.class.grade.name}) - ${assignment.academicYear.year}`
        );
      });
    }
    console.log("");

    console.log("📖 SUBJECT TEACHING ASSIGNMENTS:");
    if (profile.subjectTeacherAssignments.length === 0) {
      console.log("   No subject teaching assignments");
    } else {
      const groupedByClass: Record<
        string,
        { className: string; gradeName: string; subjects: string[] }
      > = {};

      profile.subjectTeacherAssignments.forEach((assignment) => {
        const classKey = assignment.class.id;
        if (!groupedByClass[classKey]) {
          groupedByClass[classKey] = {
            className: assignment.class.name,
            gradeName: assignment.class.grade.name,
            subjects: [],
          };
        }
        groupedByClass[classKey].subjects.push(assignment.subject.name);
      });

      Object.values(groupedByClass).forEach((classInfo) => {
        console.log(
          `   • ${classInfo.className} (${classInfo.gradeName}): ${classInfo.subjects.join(", ")}`
        );
      });

      console.log(
        `\n   Total: Teaching ${profile.subjectTeacherAssignments.length} subject assignments across ${Object.keys(groupedByClass).length} classes`
      );
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error checking Mary Banda:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaryBanda();
