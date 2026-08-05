/**
 * Seed Students for Teacher2's Classes
 *
 * This script creates students and enrolls them in the classes that teacher2 teaches
 */

import prisma from "@/lib/db/prisma";

async function seedStudents() {
  console.log("=".repeat(60));
  console.log("Seeding Students for Teacher2's Classes");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      console.log("❌ No active academic year found");
      return;
    }

    console.log(`✅ Active Academic Year: ${academicYear.year}`);
    console.log();

    // Get teacher2's classes
    const teacher2 = await prisma.teacherProfile.findFirst({
      where: {
        user: {
          email: "teacher2@school.zm",
        },
      },
    });

    if (!teacher2) {
      console.log("❌ Teacher2 not found");
      return;
    }

    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId: teacher2.id,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
      },
    });

    // Get unique class IDs
    const classIds = [...new Set(assignments.map((a) => a.classId))];
    console.log(`Found ${classIds.length} unique classes for teacher2`);
    console.log();

    // Sample student data - names from Zambia
    const studentNames = [
      { firstName: "Chilufya", middleName: "Mwape", lastName: "Mwanza", gender: "MALE" as const },
      { firstName: "Thandiwe", middleName: "Grace", lastName: "Banda", gender: "FEMALE" as const },
      { firstName: "Mwila", middleName: "Joseph", lastName: "Phiri", gender: "MALE" as const },
      { firstName: "Natasha", middleName: "Joy", lastName: "Lungu", gender: "FEMALE" as const },
      { firstName: "Chanda", middleName: "Moses", lastName: "Mulenga", gender: "MALE" as const },
      { firstName: "Mumba", middleName: "Faith", lastName: "Zulu", gender: "FEMALE" as const },
      { firstName: "Kabwe", middleName: "Patrick", lastName: "Tembo", gender: "MALE" as const },
      { firstName: "Mutale", middleName: "Ruth", lastName: "Kunda", gender: "FEMALE" as const },
      { firstName: "Lwazi", middleName: "David", lastName: "Nyirenda", gender: "MALE" as const },
      { firstName: "Chipo", middleName: "Mary", lastName: "Sikota", gender: "FEMALE" as const },
      { firstName: "Kunda", middleName: "John", lastName: "Moyo", gender: "MALE" as const },
      { firstName: "Taonga", middleName: "Sarah", lastName: "Chanda", gender: "FEMALE" as const },
      { firstName: "Musonda", middleName: "James", lastName: "Kabwe", gender: "MALE" as const },
      { firstName: "Prisca", middleName: "Hope", lastName: "Mutale", gender: "FEMALE" as const },
      { firstName: "Bwalya", middleName: "Peter", lastName: "Sakala", gender: "MALE" as const },
      { firstName: "Monde", middleName: "Esther", lastName: "Simwanza", gender: "FEMALE" as const },
      { firstName: "Lubasi", middleName: "Samuel", lastName: "Mumba", gender: "MALE" as const },
      { firstName: "Tapiwa", middleName: "Mercy", lastName: "Chola", gender: "FEMALE" as const },
      { firstName: "Kasonde", middleName: "Emmanuel", lastName: "Ng'andu", gender: "MALE" as const },
      { firstName: "Naomi", middleName: "Grace", lastName: "Mwape", gender: "FEMALE" as const },
    ];

    let studentCounter = 1;
    const currentYear = new Date().getFullYear();

    for (const classId of classIds) {
      const assignment = assignments.find((a) => a.classId === classId);
      if (!assignment) continue;

      console.log(
        `📝 Creating students for ${assignment.class.grade.name} ${assignment.class.name}...`
      );

      // Create 20 students per class
      const studentsToCreate = studentNames.slice();
      const createdStudents = [];

      for (let i = 0; i < studentsToCreate.length; i++) {
        const studentData = studentsToCreate[i];
        const studentNumber = `STU${currentYear}${String(studentCounter).padStart(4, "0")}`;

        // Calculate date of birth based on grade level
        const gradeNumber = parseInt(assignment.class.grade.name.replace("Grade ", ""));
        const age = gradeNumber + 5; // Approximate age
        const birthYear = currentYear - age;
        const dateOfBirth = new Date(birthYear, 0, 1);

        const student = await prisma.student.upsert({
          where: { studentNumber },
          update: {},
          create: {
            studentNumber,
            firstName: studentData.firstName,
            middleName: studentData.middleName,
            lastName: studentData.lastName,
            gender: studentData.gender,
            dateOfBirth,
            admissionDate: new Date(),
            status: "ACTIVE",
          },
        });

        createdStudents.push(student);
        studentCounter++;
      }

      console.log(`   ✅ Created ${createdStudents.length} students`);

      // Enroll students in the class
      console.log(`   📚 Enrolling students in class...`);
      for (const student of createdStudents) {
        await prisma.studentClassEnrollment.upsert({
          where: {
            studentId_academicYearId: {
              studentId: student.id,
              academicYearId: academicYear.id,
            },
          },
          update: {
            classId: classId,
          },
          create: {
            studentId: student.id,
            classId: classId,
            academicYearId: academicYear.id,
            enrollmentDate: new Date(),
          },
        });
      }

      console.log(`   ✅ Enrolled ${createdStudents.length} students`);
      console.log();
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));

    const totalEnrollments = await prisma.studentClassEnrollment.count({
      where: {
        classId: {
          in: classIds,
        },
        academicYearId: academicYear.id,
      },
    });

    console.log(`✅ Total students enrolled in teacher2's classes: ${totalEnrollments}`);
    console.log();
  } catch (error) {
    console.error("❌ Error seeding students:", error);
    throw error;
  }
}

seedStudents()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
