import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking Report Cards Data...\n');

  // Get active academic year and term
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  const term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear?.id,
      termType: 'TERM_1'
    },
  });

  console.log(`📅 Academic Year: ${academicYear?.year}`);
  console.log(`📚 Term: ${term?.termType}\n`);

  // Get teacher2
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher2@school.zm' },
    include: { profile: true },
  });

  console.log(`👨‍🏫 Teacher: ${teacher?.profile?.firstName} ${teacher?.profile?.lastName}\n`);

  // Get assignments
  const assignments = await prisma.subjectTeacherAssignment.findMany({
    where: {
      teacherId: teacher?.profile?.id,
      academicYearId: academicYear?.id,
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

  console.log(`📋 Subject Assignments: ${assignments.length}`);
  assignments.forEach((a) => {
    console.log(`  - ${a.subject.name} - ${a.class.grade.name} ${a.class.name}`);
  });

  // Get students count
  if (assignments.length > 0) {
    const classIds = [...new Set(assignments.map((a) => a.classId))];

    for (const classId of classIds) {
      const assignment = assignments.find((a) => a.classId === classId);
      const enrollments = await prisma.studentClassEnrollment.count({
        where: {
          classId: classId,
          academicYearId: academicYear?.id,
          status: 'ACTIVE',
        },
      });

      console.log(`\n📊 ${assignment?.class.grade.name} ${assignment?.class.name}:`);
      console.log(`  Students: ${enrollments}`);

      // Get assessments
      const assessments = await prisma.assessment.count({
        where: {
          classId: classId,
          termId: term?.id,
        },
      });
      console.log(`  Assessments: ${assessments}`);

      // Get report cards
      const reportCards = await prisma.reportCard.count({
        where: {
          classId: classId,
          termId: term?.id,
        },
      });
      console.log(`  Report Cards: ${reportCards}`);

      // Get sample report card
      const sampleReport = await prisma.reportCard.findFirst({
        where: {
          classId: classId,
          termId: term?.id,
        },
        include: {
          student: true,
          subjects: {
            include: {
              subject: true,
            },
          },
        },
      });

      if (sampleReport) {
        console.log(`\n  📄 Sample Report Card:`);
        console.log(`    Student: ${sampleReport.student.firstName} ${sampleReport.student.lastName}`);
        console.log(`    Average: ${sampleReport.averageMark?.toFixed(2)}%`);
        console.log(`    Position: ${sampleReport.position}/${sampleReport.outOf}`);
        console.log(`    Subjects: ${sampleReport.subjects.length}`);

        if (sampleReport.subjects.length > 0) {
          console.log(`\n    Sample Subject (${sampleReport.subjects[0].subject.name}):`);
          console.log(`      CAT: ${sampleReport.subjects[0].catMark}`);
          console.log(`      MID: ${sampleReport.subjects[0].midMark}`);
          console.log(`      EOT: ${sampleReport.subjects[0].eotMark}`);
          console.log(`      Total: ${sampleReport.subjects[0].totalMark?.toFixed(2)}`);
          console.log(`      Grade: ${sampleReport.subjects[0].grade}`);
        }
      }
    }
  }

  console.log('\n✅ Report cards check complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
