import "dotenv/config";
import prisma from "../lib/db/prisma";
import { GradeLevel, SchoolLevel } from "@prisma/client";

/**
 * Seed all grade levels (Grade 1-12)
 * Follows the Zambian education system:
 * - Primary: Grade 1-7
 * - Secondary: Grade 8-12
 */
async function seedGrades() {
  console.log("🌱 Seeding grade levels...");

  const grades = [
    // Primary Grades (1-7)
    {
      level: GradeLevel.GRADE_1,
      name: "Grade 1",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 1,
    },
    {
      level: GradeLevel.GRADE_2,
      name: "Grade 2",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 2,
    },
    {
      level: GradeLevel.GRADE_3,
      name: "Grade 3",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 3,
    },
    {
      level: GradeLevel.GRADE_4,
      name: "Grade 4",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 4,
    },
    {
      level: GradeLevel.GRADE_5,
      name: "Grade 5",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 5,
    },
    {
      level: GradeLevel.GRADE_6,
      name: "Grade 6",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 6,
    },
    {
      level: GradeLevel.GRADE_7,
      name: "Grade 7",
      schoolLevel: SchoolLevel.PRIMARY,
      sequence: 7,
    },
    // Secondary Grades (8-12)
    {
      level: GradeLevel.GRADE_8,
      name: "Grade 8",
      schoolLevel: SchoolLevel.SECONDARY,
      sequence: 8,
    },
    {
      level: GradeLevel.GRADE_9,
      name: "Grade 9",
      schoolLevel: SchoolLevel.SECONDARY,
      sequence: 9,
    },
    {
      level: GradeLevel.GRADE_10,
      name: "Grade 10",
      schoolLevel: SchoolLevel.SECONDARY,
      sequence: 10,
    },
    {
      level: GradeLevel.GRADE_11,
      name: "Grade 11",
      schoolLevel: SchoolLevel.SECONDARY,
      sequence: 11,
    },
    {
      level: GradeLevel.GRADE_12,
      name: "Grade 12",
      schoolLevel: SchoolLevel.SECONDARY,
      sequence: 12,
    },
  ];

  for (const grade of grades) {
    const created = await prisma.grade.upsert({
      where: { level: grade.level },
      update: {},
      create: grade,
    });
    console.log(`✅ Created/Updated: ${created.name} (Sequence: ${created.sequence})`);
  }

  console.log("\n✨ Grade levels seeded successfully!");
}

seedGrades()
  .catch((error) => {
    console.error("❌ Error seeding grades:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
