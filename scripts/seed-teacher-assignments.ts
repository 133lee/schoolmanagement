import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding teacher assignments...\n");

  // Get the active academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    console.error("❌ No active academic year found");
    return;
  }

  console.log(`📅 Active Academic Year: ${academicYear.year}`);

  // Get the teacher (Mary Banda - teacher@school.zm)
  const teacherUser = await prisma.user.findUnique({
    where: { email: "teacher@school.zm" },
    include: { profile: true },
  });

  if (!teacherUser || !teacherUser.profile) {
    console.error("❌ Teacher not found or has no profile");
    return;
  }

  console.log(`👤 Teacher: ${teacherUser.profile.firstName} ${teacherUser.profile.lastName}`);

  // Get the Science Department
  const department = await prisma.department.findFirst({
    where: { code: "SCI" },
  });

  if (!department) {
    console.error("❌ Science department not found");
    return;
  }

  // Get subjects (Science and ICT from Science Department)
  const subjects = await prisma.subject.findMany({
    where: {
      departmentId: department.id,
    },
  });

  console.log(`\n📚 Found ${subjects.length} subjects in Science Department:`);
  subjects.forEach(subject => {
    console.log(`   - ${subject.name} (${subject.code})`);
  });

  // Get or create a grade
  let grade = await prisma.grade.findFirst({
    where: { level: "GRADE_10" },
  });

  if (!grade) {
    console.log("\n📝 Creating Grade 10...");
    grade = await prisma.grade.create({
      data: {
        level: "GRADE_10",
        name: "Grade 10",
        schoolLevel: "SECONDARY",
        sequence: 10,
      },
    });
  }

  console.log(`\n🎓 Grade: ${grade.name}`);

  // Create or get classes
  const classNames = ["10A", "10B"];
  const classes = [];

  for (const className of classNames) {
    let existingClass = await prisma.class.findFirst({
      where: {
        name: className,
        gradeId: grade.id,
      },
    });

    if (!existingClass) {
      console.log(`\n📋 Creating class ${className}...`);
      existingClass = await prisma.class.create({
        data: {
          name: className,
          gradeId: grade.id,
          capacity: 40,
        },
      });
    }

    classes.push(existingClass);
    console.log(`   ✓ Class ${className} ready`);
  }

  // Assign teacher as class teacher for 10A
  const class10A = classes[0];
  const existingClassAssignment = await prisma.classTeacherAssignment.findFirst({
    where: {
      teacherId: teacherUser.profile.id,
      classId: class10A.id,
      academicYearId: academicYear.id,
    },
  });

  if (!existingClassAssignment) {
    console.log(`\n👨‍🏫 Assigning teacher as class teacher for ${class10A.name}...`);
    await prisma.classTeacherAssignment.create({
      data: {
        teacherId: teacherUser.profile.id,
        classId: class10A.id,
        academicYearId: academicYear.id,
      },
    });
    console.log("   ✓ Class teacher assignment created");
  } else {
    console.log(`\n👨‍🏫 Teacher already assigned as class teacher for ${class10A.name}`);
  }

  // Assign teacher to teach subjects in both classes
  for (const subject of subjects) {
    for (const classItem of classes) {
      const existingSubjectAssignment = await prisma.subjectTeacherAssignment.findFirst({
        where: {
          teacherId: teacherUser.profile.id,
          subjectId: subject.id,
          classId: classItem.id,
          academicYearId: academicYear.id,
        },
      });

      if (!existingSubjectAssignment) {
        console.log(`\n📖 Assigning ${subject.name} in ${classItem.name} to teacher...`);
        await prisma.subjectTeacherAssignment.create({
          data: {
            teacherId: teacherUser.profile.id,
            subjectId: subject.id,
            classId: classItem.id,
            academicYearId: academicYear.id,
          },
        });
        console.log("   ✓ Subject teacher assignment created");
      } else {
        console.log(`\n📖 Teacher already assigned to teach ${subject.name} in ${classItem.name}`);
      }
    }
  }

  // Create students and enroll them
  const studentNames = [
    { firstName: "Chanda", lastName: "Mwansa" },
    { firstName: "Mulenga", lastName: "Banda" },
    { firstName: "Nalishebo", lastName: "Phiri" },
    { firstName: "Kondwani", lastName: "Tembo" },
    { firstName: "Thandiwe", lastName: "Zulu" },
    { firstName: "Mutale", lastName: "Chirwa" },
    { firstName: "Chimuka", lastName: "Sakala" },
    { firstName: "Lubasi", lastName: "Nyoni" },
    { firstName: "Kabwe", lastName: "Moyo" },
    { firstName: "Natasha", lastName: "Mwape" },
    { firstName: "Mulonda", lastName: "Sichone" },
    { firstName: "Bupe", lastName: "Lungu" },
    { firstName: "Chipo", lastName: "Mulenga" },
    { firstName: "Kangwa", lastName: "Siame" },
    { firstName: "Musonda", lastName: "Mwila" },
  ];

  console.log(`\n\n👥 Creating and enrolling students...`);

  for (let i = 0; i < studentNames.length; i++) {
    const { firstName, lastName } = studentNames[i];
    const classIndex = i % 2; // Alternate between 10A and 10B
    const selectedClass = classes[classIndex];

    // Check if student already exists
    let student = await prisma.student.findFirst({
      where: {
        firstName,
        lastName,
      },
    });

    if (!student) {
      console.log(`\n📝 Creating student: ${firstName} ${lastName}`);
      const studentNumber = `STU2024${String(1000 + i).padStart(4, "0")}`;
      student = await prisma.student.create({
        data: {
          firstName,
          lastName,
          dateOfBirth: new Date(2008, 0, 1 + i),
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          studentNumber,
          admissionDate: new Date(2024, 0, 1),
        },
      });
    }

    // Check if enrollment exists
    const existingEnrollment = await prisma.studentClassEnrollment.findFirst({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
      },
      include: {
        class: true,
      },
    });

    if (!existingEnrollment) {
      await prisma.studentClassEnrollment.create({
        data: {
          studentId: student.id,
          classId: selectedClass.id,
          academicYearId: academicYear.id,
          enrollmentDate: new Date(2024, 0, 15),
          status: "ACTIVE",
        },
      });
      console.log(`   ✓ Enrolled in ${selectedClass.name}`);
    } else {
      console.log(`   ℹ Already enrolled in ${existingEnrollment.class.name}`);
    }
  }

  console.log("\n\n✅ Seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Teacher: ${teacherUser.profile.firstName} ${teacherUser.profile.lastName}`);
  console.log(`   - Class Teacher for: ${class10A.name}`);
  console.log(`   - Teaching subjects: ${subjects.map(s => s.name).join(", ")}`);
  console.log(`   - In classes: ${classes.map(c => c.name).join(", ")}`);
  console.log(`   - Total students created/enrolled: ${studentNames.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
