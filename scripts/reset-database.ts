import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Complete Database Reset Script
 *
 * This script deletes ALL data from the database in the correct order
 * to respect foreign key constraints and Prisma cascade relationships.
 *
 * ⚠️ WARNING: This will delete ALL data! Use with caution!
 */

async function main() {
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the database!\n');

  try {
    console.log('🧹 Starting database cleanup...\n');

    // Delete in correct order to respect foreign key constraints
    // Start with child tables and work up to parent tables

    console.log('📝 Deleting User Permissions...');
    const deletedUserPermissions = await prisma.userPermission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUserPermissions.count} user permissions`);

    console.log('🔐 Deleting Role Permissions...');
    const deletedRolePermissions = await prisma.rolePermission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedRolePermissions.count} role permissions`);

    console.log('📊 Deleting Student Assessment Results...');
    const deletedResults = await prisma.studentAssessmentResult.deleteMany({});
    console.log(`   ✅ Deleted ${deletedResults.count} assessment results`);

    console.log('📋 Deleting Report Card Subjects...');
    const deletedReportCardSubjects = await prisma.reportCardSubject.deleteMany({});
    console.log(`   ✅ Deleted ${deletedReportCardSubjects.count} report card subjects`);

    console.log('📄 Deleting Report Cards...');
    const deletedReportCards = await prisma.reportCard.deleteMany({});
    console.log(`   ✅ Deleted ${deletedReportCards.count} report cards`);

    console.log('📝 Deleting Assessments...');
    const deletedAssessments = await prisma.assessment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAssessments.count} assessments`);

    console.log('📅 Deleting Attendance Records...');
    const deletedAttendance = await prisma.attendanceRecord.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAttendance.count} attendance records`);

    console.log('📚 Deleting Timetables...');
    const deletedPrimaryTimetables = await prisma.classTimetable.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPrimaryTimetables.count} primary timetables`);

    const deletedSecondaryTimetables = await prisma.secondaryTimetable.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSecondaryTimetables.count} secondary timetables`);

    console.log('⏰ Deleting Time Slots...');
    const deletedTimeSlots = await prisma.timeSlot.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTimeSlots.count} time slots`);

    console.log('📊 Deleting Subject Period Requirements...');
    const deletedPeriodReqs = await prisma.subjectPeriodRequirement.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPeriodReqs.count} period requirements`);

    console.log('👥 Deleting Student Promotions...');
    const deletedPromotions = await prisma.studentPromotion.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPromotions.count} promotions`);

    console.log('🎓 Deleting Student Guardians...');
    const deletedStudentGuardians = await prisma.studentGuardian.deleteMany({});
    console.log(`   ✅ Deleted ${deletedStudentGuardians.count} student-guardian relationships`);

    console.log('👪 Deleting Guardians...');
    const deletedGuardians = await prisma.guardian.deleteMany({});
    console.log(`   ✅ Deleted ${deletedGuardians.count} guardians`);

    console.log('📚 Deleting Student Class Enrollments...');
    const deletedEnrollments = await prisma.studentClassEnrollment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEnrollments.count} enrollments`);

    console.log('👨‍🎓 Deleting Students...');
    const deletedStudents = await prisma.student.deleteMany({});
    console.log(`   ✅ Deleted ${deletedStudents.count} students`);

    console.log('👨‍🏫 Deleting Teacher Assignments...');
    const deletedClassTeacherAssignments = await prisma.classTeacherAssignment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedClassTeacherAssignments.count} class teacher assignments`);

    const deletedSubjectTeacherAssignments = await prisma.subjectTeacherAssignment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSubjectTeacherAssignments.count} subject teacher assignments`);

    console.log('📖 Deleting Teacher Subjects...');
    const deletedTeacherSubjects = await prisma.teacherSubject.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTeacherSubjects.count} teacher subjects`);

    console.log('👤 Deleting Teacher Profiles...');
    const deletedTeachers = await prisma.teacherProfile.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTeachers.count} teacher profiles`);

    console.log('🔐 Deleting Users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUsers.count} users`);

    console.log('🏫 Deleting Classes...');
    const deletedClasses = await prisma.class.deleteMany({});
    console.log(`   ✅ Deleted ${deletedClasses.count} classes`);

    console.log('📚 Deleting Grade Subjects...');
    const deletedGradeSubjects = await prisma.gradeSubject.deleteMany({});
    console.log(`   ✅ Deleted ${deletedGradeSubjects.count} grade subjects`);

    console.log('📖 Deleting Subjects...');
    const deletedSubjects = await prisma.subject.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSubjects.count} subjects`);

    console.log('🎓 Deleting Grades...');
    const deletedGrades = await prisma.grade.deleteMany({});
    console.log(`   ✅ Deleted ${deletedGrades.count} grades`);

    console.log('🏢 Deleting Departments...');
    const deletedDepartments = await prisma.department.deleteMany({});
    console.log(`   ✅ Deleted ${deletedDepartments.count} departments`);

    console.log('📅 Deleting Terms...');
    const deletedTerms = await prisma.term.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTerms.count} terms`);

    console.log('📆 Deleting Academic Years...');
    const deletedAcademicYears = await prisma.academicYear.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAcademicYears.count} academic years`);

    console.log('\n✨ Database cleanup complete!\n');
    console.log('Summary:');
    console.log(`  • ${deletedStudents.count} students`);
    console.log(`  • ${deletedTeachers.count} teachers`);
    console.log(`  • ${deletedUsers.count} users`);
    console.log(`  • ${deletedClasses.count} classes`);
    console.log(`  • ${deletedAssessments.count} assessments`);
    console.log(`  • ${deletedResults.count} assessment results`);
    console.log(`  • ${deletedReportCards.count} report cards`);
    console.log(`  • ${deletedEnrollments.count} enrollments`);
    console.log('\n💡 You can now run: npm run db:seed\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
