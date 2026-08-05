import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });

import { PrismaClient } from "@prisma/client";
import {
  Role,
  Permission,
  Gender,
  QualificationLevel,
  StaffStatus,
} from "@/types/prisma-enums";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set in .env");

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱 Seeding database...");

  // ===============================
  // 1. Department
  // ===============================
  const mathDepartment = await prisma.department.upsert({
    where: { code: "MATH" },
    update: {},
    create: {
      name: "Mathematics Department",
      code: "MATH",
      description: "Handles Mathematics and related subjects",
      status: "ACTIVE",
    },
  });

  // ===============================
  // 2. Passwords
  // ===============================
  const adminPassword = await hash("Admin@123");
  const mathHodPassword = await hash("Hod@123");
  const teacherPassword = await hash("Teacher@123");

  // ===============================
  // 3. Users
  // ===============================
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@school.gov.zm" },
    update: {},
    create: {
      email: "admin@school.gov.zm",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Math HOD - Role is TEACHER (HOD is a position, not a role)
  const mathHodUser = await prisma.user.upsert({
    where: { email: "hod.math@school.gov.zm" },
    update: {},
    create: {
      email: "hod.math@school.gov.zm",
      passwordHash: mathHodPassword,
      role: Role.TEACHER, // HOD is a position, not a role
      isActive: true,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher1@school.gov.zm" },
    update: {},
    create: {
      email: "teacher1@school.gov.zm",
      passwordHash: teacherPassword,
      role: Role.TEACHER,
      isActive: true,
    },
  });

  // ===============================
  // 4. Teacher Profiles
  // ===============================
  const adminProfile = await prisma.teacherProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      staffNumber: "ADM001",
      firstName: "System",
      lastName: "Administrator",
      dateOfBirth: new Date("1980-01-01"),
      gender: Gender.MALE,
      phone: "+260970000001",
      qualification: QualificationLevel.DEGREE,
      yearsExperience: 15,
      status: StaffStatus.ACTIVE,
      hireDate: new Date(),
    },
  });

  const mathHodProfile = await prisma.teacherProfile.upsert({
    where: { userId: mathHodUser.id },
    update: {},
    create: {
      userId: mathHodUser.id,
      staffNumber: "MATH001",
      firstName: "Mary",
      lastName: "Phiri",
      dateOfBirth: new Date("1985-05-12"),
      gender: Gender.FEMALE,
      phone: "+260970000002",
      qualification: QualificationLevel.MASTERS,
      yearsExperience: 12,
      status: StaffStatus.ACTIVE,
      hireDate: new Date(),
    },
  });

  const teacher1Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      staffNumber: "TCH001",
      firstName: "John",
      lastName: "Banda",
      dateOfBirth: new Date("1992-08-20"),
      gender: Gender.MALE,
      phone: "+260970000003",
      qualification: QualificationLevel.DIPLOMA,
      yearsExperience: 4,
      status: StaffStatus.ACTIVE,
      hireDate: new Date(),
    },
  });

  // ===============================
  // 5. Assign HOD to Department
  // ===============================
  // HOD is a POSITION in the department model, not a role
  await prisma.department.update({
    where: { code: "MATH" },
    data: {
      hodTeacher: {
        connect: { id: mathHodProfile.id },
      },
    },
  });

  console.log("✅ Assigned Mary Phiri as HOD of Mathematics Department");

  // ===============================
  // 6. Role Permissions
  // ===============================

  // ADMIN → ALL permissions
  const allPermissions = Object.values(Permission);

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: Role.ADMIN,
          permission,
        },
      },
      update: {},
      create: {
        role: Role.ADMIN,
        permission,
      },
    });
  }

  // TEACHER → Basic permissions
  const teacherPermissions: Permission[] = [
    Permission.READ_STUDENT,
    Permission.READ_CLASS,
    Permission.READ_ASSESSMENT,
    Permission.ENTER_RESULTS,
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_ATTENDANCE,
  ];

  for (const permission of teacherPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: Role.TEACHER,
          permission,
        },
      },
      update: {},
      create: {
        role: Role.TEACHER,
        permission,
      },
    });
  }

  // ===============================
  // 7. Grant HOD-specific permissions via UserPermission
  // ===============================
  // HOD is a position, not a role
  // Grant additional permissions to the Math HOD via UserPermission table
  const hodExtraPermissions: Permission[] = [
    Permission.UPDATE_TEACHER,
    Permission.CREATE_ASSESSMENT,
    Permission.UPDATE_ASSESSMENT,
    Permission.VIEW_REPORTS,
  ];

  for (const permission of hodExtraPermissions) {
    await prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId: mathHodUser.id,
          permission,
        },
      },
      update: {},
      create: {
        userId: mathHodUser.id,
        permission,
        reason: "HOD position for Mathematics Department",
      },
    });
  }

  console.log("✅ Granted additional permissions to Math HOD via UserPermission");

  // ===============================
  // 8. Subject Teacher Assignments for Grade 8 Blue
  // ===============================
  console.log("\n📚 Assigning subject teachers for Grade 8 Blue...");

  // Find Grade 8
  const grade8 = await prisma.grade.findFirst({
    where: { level: "GRADE_8" },
  });

  if (!grade8) {
    console.log("⚠️  Grade 8 not found, skipping subject teacher assignments");
  } else {
    // Find Grade 8 Blue class
    const grade8Blue = await prisma.class.findFirst({
      where: {
        gradeId: grade8.id,
        name: "Blue",
      },
    });

    if (!grade8Blue) {
      console.log("⚠️  Grade 8 Blue class not found, skipping subject teacher assignments");
    } else {
      // Find active academic year
      const activeAcademicYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
      });

      if (!activeAcademicYear) {
        console.log("⚠️  No active academic year found, skipping subject teacher assignments");
      } else {
        console.log(`   Class: ${grade8Blue.name} (ID: ${grade8Blue.id})`);
        console.log(`   Academic Year: ${activeAcademicYear.year}`);

        // Get ALL ClassSubjects for Grade 8 Blue (this is the curriculum)
        const classSubjects = await prisma.classSubject.findMany({
          where: {
            classId: grade8Blue.id,
          },
          include: {
            subject: true,
          },
        });

        console.log(`   Found ${classSubjects.length} subjects in curriculum`);

        // Find teachers
        const jayDaka = await prisma.teacherProfile.findFirst({
          where: { staffNumber: "STAFF2026357" },
        });
        const mumaHanzoma = await prisma.teacherProfile.findFirst({
          where: { staffNumber: "STAFF2026304" },
        });
        const danielMccain = await prisma.teacherProfile.findFirst({
          where: { staffNumber: "STAFF2026803" },
        });
        const jamesMukosa = await prisma.teacherProfile.findFirst({
          where: { staffNumber: "STAFF2026148" },
        });

        // Assign teachers to each ClassSubject
        for (const cs of classSubjects) {
          let teacher = null;
          let teacherName = "";

          // Match subject to appropriate teacher
          if (cs.subject.code === "COMP" && jayDaka) {
            teacher = jayDaka;
            teacherName = "Jay Daka";
          } else if (cs.subject.code === "ENG" && mumaHanzoma) {
            teacher = mumaHanzoma;
            teacherName = "Muma Hanzoma";
          } else if (cs.subject.code === "LIT" && danielMccain) {
            teacher = danielMccain;
            teacherName = "Daniel Mccain";
          } else if (cs.subject.code === "MATH" && jamesMukosa) {
            teacher = jamesMukosa;
            teacherName = "James Mukosa";
          }

          if (teacher) {
            // Delete any existing assignment without classSubjectId link
            await prisma.subjectTeacherAssignment.deleteMany({
              where: {
                classId: grade8Blue.id,
                subjectId: cs.subjectId,
                academicYearId: activeAcademicYear.id,
                classSubjectId: null, // Only delete unlinked assignments
              },
            });

            // Create assignment linked to ClassSubject
            await prisma.subjectTeacherAssignment.upsert({
              where: {
                teacherId_subjectId_classId_academicYearId: {
                  teacherId: teacher.id,
                  subjectId: cs.subjectId,
                  classId: grade8Blue.id,
                  academicYearId: activeAcademicYear.id,
                },
              },
              update: {
                classSubjectId: cs.id, // Link to ClassSubject
              },
              create: {
                teacherId: teacher.id,
                subjectId: cs.subjectId,
                classId: grade8Blue.id,
                academicYearId: activeAcademicYear.id,
                classSubjectId: cs.id, // Link to ClassSubject
              },
            });

            console.log(`   ✅ Assigned ${cs.subject.name} to ${teacherName}`);
          }
        }

        console.log("\n✅ Subject teacher assignments completed for Grade 8 Blue");
      }
    }
  }

  console.log("\n✅ Seeding completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
