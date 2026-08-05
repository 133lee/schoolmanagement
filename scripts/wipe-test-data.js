// Wipe all test data from database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeTestData() {
  console.log('Starting to wipe all test data from database...');

  try {
    // Delete in correct order to respect foreign key constraints

    console.log('Deleting report card subjects...');
    await prisma.reportCardSubject.deleteMany({});

    console.log('Deleting report cards...');
    await prisma.reportCard.deleteMany({});

    console.log('Deleting student assessment results...');
    await prisma.studentAssessmentResult.deleteMany({});

    console.log('Deleting assessments...');
    await prisma.assessment.deleteMany({});

    console.log('Deleting attendance records...');
    await prisma.attendanceRecord.deleteMany({});

    console.log('Deleting class timetables...');
    await prisma.classTimetable.deleteMany({});

    console.log('Deleting secondary timetables...');
    await prisma.secondaryTimetable.deleteMany({});

    console.log('Deleting time slots...');
    await prisma.timeSlot.deleteMany({});

    console.log('Deleting subject period requirements...');
    await prisma.subjectPeriodRequirement.deleteMany({});

    console.log('Deleting subject teacher assignments...');
    await prisma.subjectTeacherAssignment.deleteMany({});

    console.log('Deleting class teacher assignments...');
    await prisma.classTeacherAssignment.deleteMany({});

    console.log('Deleting teacher subjects...');
    await prisma.teacherSubject.deleteMany({});

    console.log('Deleting teacher profiles...');
    await prisma.teacherProfile.deleteMany({});

    console.log('Deleting student promotions...');
    await prisma.studentPromotion.deleteMany({});

    console.log('Deleting student class enrollments...');
    await prisma.studentClassEnrollment.deleteMany({});

    console.log('Deleting student guardians...');
    await prisma.studentGuardian.deleteMany({});

    console.log('Deleting guardians...');
    await prisma.guardian.deleteMany({});

    console.log('Deleting students...');
    await prisma.student.deleteMany({});

    console.log('Deleting classes...');
    await prisma.class.deleteMany({});

    console.log('Deleting grade subjects...');
    await prisma.gradeSubject.deleteMany({});

    console.log('Deleting subjects...');
    await prisma.subject.deleteMany({});

    console.log('Deleting departments...');
    await prisma.department.deleteMany({});

    console.log('Deleting grades...');
    await prisma.grade.deleteMany({});

    console.log('Deleting terms...');
    await prisma.term.deleteMany({});

    console.log('Deleting academic years...');
    await prisma.academicYear.deleteMany({});

    console.log('Deleting user permissions...');
    await prisma.userPermission.deleteMany({});

    console.log('Deleting role permissions...');
    await prisma.rolePermission.deleteMany({});

    console.log('Deleting users (except ADMIN)...');
    await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });

    console.log('✅ All test data wiped successfully!');
  } catch (error) {
    console.error('❌ Error wiping test data:', error);
    throw error;
  }
}

wipeTestData()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
