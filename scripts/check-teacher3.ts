import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking Teacher3 Data...\n');

  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher3@school.zm' },
    include: { profile: true },
  });

  if (!teacher || !teacher.profile) {
    console.error('❌ Teacher3 not found');
    return;
  }

  console.log(`👨‍🏫 Teacher: ${teacher.profile.firstName} ${teacher.profile.lastName}`);
  console.log(`📧 Email: ${teacher.email}`);
  console.log(`🔑 Password: Admin123!\n`);

  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  const term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear?.id,
      termType: 'TERM_1',
    },
  });

  console.log(`📅 Academic Year: ${academicYear?.year}`);
  console.log(`📚 Term: ${term?.termType}\n`);

  // Class Teacher Assignment
  const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
    where: {
      teacherId: teacher.profile.id,
      academicYearId: academicYear?.id,
    },
    include: {
      class: {
        include: {
          grade: true,
        },
      },
    },
  });

  if (classTeacherAssignment) {
    console.log(`📋 Class Teacher for: ${classTeacherAssignment.class.grade.name} ${classTeacherAssignment.class.name}\n`);
  }

  // Subject Assignments
  const subjectAssignments = await prisma.subjectTeacherAssignment.findMany({
    where: {
      teacherId: teacher.profile.id,
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
    orderBy: [
      { class: { grade: { sequence: 'asc' } } },
      { subject: { code: 'asc' } },
    ],
  });

  console.log(`📚 Subject Assignments (${subjectAssignments.length}):`);
  const bySubject = new Map<string, any[]>();

  for (const assignment of subjectAssignments) {
    const key = assignment.subject.name;
    if (!bySubject.has(key)) {
      bySubject.set(key, []);
    }
    bySubject.get(key)!.push(assignment);
  }

  for (const [subject, assignments] of bySubject) {
    console.log(`\n  ${subject}:`);
    for (const assignment of assignments) {
      const enrollmentCount = await prisma.studentClassEnrollment.count({
        where: {
          classId: assignment.classId,
          academicYearId: academicYear?.id,
          status: 'ACTIVE',
        },
      });

      const assessmentCount = await prisma.assessment.count({
        where: {
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          termId: term?.id,
        },
      });

      const resultCount = await prisma.studentAssessmentResult.count({
        where: {
          assessment: {
            subjectId: assignment.subjectId,
            classId: assignment.classId,
            termId: term?.id,
          },
        },
      });

      console.log(`    • ${assignment.class.grade.name} ${assignment.class.name}`);
      console.log(`      Students: ${enrollmentCount}, Assessments: ${assessmentCount}, Results: ${resultCount}`);
    }
  }

  console.log('\n✅ Teacher3 check complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
