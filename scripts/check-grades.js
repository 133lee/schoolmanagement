import "dotenv/config";
import prisma from "../lib/db/prisma.js";

async function checkGrades() {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { sequence: "asc" },
    });

    console.log(`Found ${grades.length} grades in database:\n`);
    grades.forEach((grade) => {
      console.log(`ID: ${grade.id} | Level: ${grade.level} | Name: ${grade.name} | Sequence: ${grade.sequence}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGrades();
