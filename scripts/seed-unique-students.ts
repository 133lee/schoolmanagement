/**
 * Seed Unique Students for All Classes
 *
 * This script:
 * 1. Clears existing students and enrollments
 * 2. Creates 5 unique students per class with distinct names
 * 3. Makes it easy to differentiate students across classes
 */

import prisma from "@/lib/db/prisma";

// Unique student name sets for different classes
const studentNameSets = [
  // Set 1 - African names
  [
    { firstName: "Chilufya", middleName: "Mwape", lastName: "Mwanza", gender: "MALE" as const },
    { firstName: "Thandiwe", middleName: "Grace", lastName: "Banda", gender: "FEMALE" as const },
    { firstName: "Mwila", middleName: "Joseph", lastName: "Phiri", gender: "MALE" as const },
    { firstName: "Natasha", middleName: "Joy", lastName: "Lungu", gender: "FEMALE" as const },
    { firstName: "Chanda", middleName: "Moses", lastName: "Mulenga", gender: "MALE" as const },
  ],
  // Set 2 - Traditional names
  [
    { firstName: "Mumba", middleName: "Faith", lastName: "Zulu", gender: "FEMALE" as const },
    { firstName: "Kabwe", middleName: "Patrick", lastName: "Tembo", gender: "MALE" as const },
    { firstName: "Mutale", middleName: "Ruth", lastName: "Kunda", gender: "FEMALE" as const },
    { firstName: "Lwazi", middleName: "David", lastName: "Nyirenda", gender: "MALE" as const },
    { firstName: "Chipo", middleName: "Mary", lastName: "Sikota", gender: "FEMALE" as const },
  ],
  // Set 3 - Modern names
  [
    { firstName: "Kunda", middleName: "John", lastName: "Moyo", gender: "MALE" as const },
    { firstName: "Taonga", middleName: "Sarah", lastName: "Chanda", gender: "FEMALE" as const },
    { firstName: "Musonda", middleName: "James", lastName: "Kabwe", gender: "MALE" as const },
    { firstName: "Prisca", middleName: "Hope", lastName: "Mutale", gender: "FEMALE" as const },
    { firstName: "Bwalya", middleName: "Peter", lastName: "Sakala", gender: "MALE" as const },
  ],
  // Set 4 - Biblical names
  [
    { firstName: "Monde", middleName: "Esther", lastName: "Simwanza", gender: "FEMALE" as const },
    { firstName: "Lubasi", middleName: "Samuel", lastName: "Mumba", gender: "MALE" as const },
    { firstName: "Tapiwa", middleName: "Mercy", lastName: "Chola", gender: "FEMALE" as const },
    { firstName: "Kasonde", middleName: "Emmanuel", lastName: "Ng'andu", gender: "MALE" as const },
    { firstName: "Naomi", middleName: "Grace", lastName: "Mwape", gender: "FEMALE" as const },
  ],
  // Set 5 - Contemporary names
  [
    { firstName: "Tendai", middleName: "Daniel", lastName: "Phiri", gender: "MALE" as const },
    { firstName: "Chikondi", middleName: "Elizabeth", lastName: "Banda", gender: "FEMALE" as const },
    { firstName: "Lusungu", middleName: "Andrew", lastName: "Mwanza", gender: "MALE" as const },
    { firstName: "Kondwani", middleName: "Rebecca", lastName: "Zulu", gender: "FEMALE" as const },
    { firstName: "Tawonga", middleName: "Benjamin", lastName: "Tembo", gender: "MALE" as const },
  ],
  // Set 6 - Royal names
  [
    { firstName: "Lweendo", middleName: "Queen", lastName: "Kunda", gender: "FEMALE" as const },
    { firstName: "Mulenga", middleName: "Prince", lastName: "Lungu", gender: "MALE" as const },
    { firstName: "Namasiku", middleName: "Princess", lastName: "Nyirenda", gender: "FEMALE" as const },
    { firstName: "Chipasha", middleName: "King", lastName: "Sikota", gender: "MALE" as const },
    { firstName: "Natasha", middleName: "Royal", lastName: "Moyo", gender: "FEMALE" as const },
  ],
  // Set 7 - Nature names
  [
    { firstName: "Mwamba", middleName: "River", lastName: "Chanda", gender: "MALE" as const },
    { firstName: "Nthawi", middleName: "Season", lastName: "Kabwe", gender: "FEMALE" as const },
    { firstName: "Mulilo", middleName: "Fire", lastName: "Mutale", gender: "MALE" as const },
    { firstName: "Mwelwa", middleName: "Star", lastName: "Sakala", gender: "FEMALE" as const },
    { firstName: "Mwape", middleName: "Gift", lastName: "Simwanza", gender: "MALE" as const },
  ],
  // Set 8 - Virtue names
  [
    { firstName: "Luyando", middleName: "Love", lastName: "Mumba", gender: "FEMALE" as const },
    { firstName: "Chisomo", middleName: "Blessing", lastName: "Chola", gender: "MALE" as const },
    { firstName: "Mphatso", middleName: "Gift", lastName: "Ng'andu", gender: "FEMALE" as const },
    { firstName: "Dalitso", middleName: "Bless", lastName: "Mwape", gender: "MALE" as const },
    { firstName: "Pemphero", middleName: "Prayer", lastName: "Phiri", gender: "FEMALE" as const },
  ],
  // Set 9 - Day names
  [
    { firstName: "Masiku", middleName: "Monday", lastName: "Banda", gender: "MALE" as const },
    { firstName: "Chipego", middleName: "Tuesday", lastName: "Mwanza", gender: "FEMALE" as const },
    { firstName: "Chisanga", middleName: "Wednesday", lastName: "Zulu", gender: "MALE" as const },
    { firstName: "Kondwani", middleName: "Thursday", lastName: "Tembo", gender: "FEMALE" as const },
    { firstName: "Mponda", middleName: "Friday", lastName: "Kunda", gender: "MALE" as const },
  ],
  // Set 10 - Historical names
  [
    { firstName: "Kaunda", middleName: "Kenneth", lastName: "Lungu", gender: "MALE" as const },
    { firstName: "Chiluba", middleName: "Frederick", lastName: "Nyirenda", gender: "MALE" as const },
    { firstName: "Lenshina", middleName: "Alice", lastName: "Sikota", gender: "FEMALE" as const },
    { firstName: "Nkumbula", middleName: "Harry", lastName: "Moyo", gender: "MALE" as const },
    { firstName: "Kapwepwe", middleName: "Simon", lastName: "Chanda", gender: "MALE" as const },
  ],
];

async function clearExistingData() {
  console.log("🗑️  Clearing existing student data...");

  // Delete in order: Results → Enrollments → Students
  await prisma.studentAssessmentResult.deleteMany({});
  console.log("   ✅ Cleared assessment results");

  await prisma.studentClassEnrollment.deleteMany({});
  console.log("   ✅ Cleared enrollments");

  await prisma.student.deleteMany({});
  console.log("   ✅ Cleared students");

  console.log();
}

async function seedUniqueStudents() {
  console.log("=".repeat(60));
  console.log("Seeding Unique Students (5 per class)");
  console.log("=".repeat(60));
  console.log();

  try {
    // Clear existing data first
    await clearExistingData();

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

    // Get all classes
    const classes = await prisma.class.findMany({
      include: {
        grade: true,
      },
      orderBy: [{ gradeId: "asc" }, { name: "asc" }],
    });

    console.log(`📚 Found ${classes.length} classes`);
    console.log();

    let studentCounter = 1;
    const currentYear = new Date().getFullYear();
    let classIndex = 0;

    for (const classItem of classes) {
      // Use a different name set for each class (cycle through sets)
      const nameSet = studentNameSets[classIndex % studentNameSets.length];

      console.log(
        `📝 Creating 5 students for ${classItem.grade.name} ${classItem.name}...`
      );

      const createdStudents = [];

      for (let i = 0; i < 5; i++) {
        const studentData = nameSet[i];
        const studentNumber = `STU${currentYear}${String(studentCounter).padStart(
          4,
          "0"
        )}`;

        // Calculate date of birth based on grade level
        const gradeNumber = parseInt(
          classItem.grade.name.replace("Grade ", "")
        );
        const age = gradeNumber + 5; // Approximate age
        const birthYear = currentYear - age;
        const dateOfBirth = new Date(birthYear, Math.floor(Math.random() * 12), 1);

        const student = await prisma.student.create({
          data: {
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

      console.log(
        `   ✅ Created 5 students: ${createdStudents.map((s) => s.firstName).join(", ")}`
      );

      // Enroll students in the class
      for (const student of createdStudents) {
        await prisma.studentClassEnrollment.create({
          data: {
            studentId: student.id,
            classId: classItem.id,
            academicYearId: academicYear.id,
            enrollmentDate: new Date(),
            status: "ACTIVE",
          },
        });
      }

      // Update class currentEnrolled count
      await prisma.class.update({
        where: { id: classItem.id },
        data: { currentEnrolled: 5 },
      });

      console.log(`   ✅ Enrolled 5 students in class`);
      console.log();

      classIndex++;
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));

    const totalStudents = await prisma.student.count();
    const totalEnrollments = await prisma.studentClassEnrollment.count();

    console.log(`✅ Total students created: ${totalStudents}`);
    console.log(`✅ Total enrollments created: ${totalEnrollments}`);
    console.log(`✅ Classes seeded: ${classes.length}`);
    console.log(`✅ Students per class: 5`);
    console.log();
  } catch (error) {
    console.error("❌ Error seeding students:", error);
    throw error;
  }
}

seedUniqueStudents()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
