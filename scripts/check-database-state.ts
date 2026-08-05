import prisma from "../lib/db/prisma";

async function checkDatabaseState() {
  console.log("Checking database state...\n");

  try {
    // Academic Structure
    const academicYears = await prisma.academicYear.count();
    const terms = await prisma.term.count();
    const grades = await prisma.grade.count();
    const classes = await prisma.class.count();
    const subjects = await prisma.subject.count();

    // People
    const students = await prisma.student.count();
    const teachers = await prisma.teacherProfile.count();
    const guardians = await prisma.guardian.count();
    const users = await prisma.user.count();

    // Enrollments & Assignments
    const enrollments = await prisma.studentClassEnrollment.count();
    const classTeacherAssignments = await prisma.classTeacherAssignment.count();
    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.count();
    const teacherSubjects = await prisma.teacherSubject.count();

    // Assessments
    const assessments = await prisma.assessment.count();
    const assessmentResults = await prisma.studentAssessmentResult.count();
    const reportCards = await prisma.reportCard.count();

    // Attendance
    const attendanceRecords = await prisma.attendanceRecord.count();

    // Departments
    const departments = await prisma.department.count();

    // Timetables
    const timeSlots = await prisma.timeSlot.count();
    const classTimetables = await prisma.classTimetable.count();
    const secondaryTimetables = await prisma.secondaryTimetable.count();
    const periodRequirements = await prisma.subjectPeriodRequirement.count();

    // Promotions
    const promotions = await prisma.studentPromotion.count();

    console.log("=".repeat(60));
    console.log("ACADEMIC STRUCTURE");
    console.log("=".repeat(60));
    console.log(`Academic Years:              ${academicYears}`);
    console.log(`Terms:                       ${terms}`);
    console.log(`Grades:                      ${grades}`);
    console.log(`Classes:                     ${classes}`);
    console.log(`Subjects:                    ${subjects}`);

    console.log("\n" + "=".repeat(60));
    console.log("PEOPLE");
    console.log("=".repeat(60));
    console.log(`Students:                    ${students}`);
    console.log(`Teachers:                    ${teachers}`);
    console.log(`Guardians:                   ${guardians}`);
    console.log(`Users:                       ${users}`);

    console.log("\n" + "=".repeat(60));
    console.log("ENROLLMENTS & ASSIGNMENTS");
    console.log("=".repeat(60));
    console.log(`Student Enrollments:         ${enrollments}`);
    console.log(`Class Teacher Assignments:   ${classTeacherAssignments}`);
    console.log(`Subject Teacher Assignments: ${subjectTeacherAssignments}`);
    console.log(`Teacher Subjects:            ${teacherSubjects}`);

    console.log("\n" + "=".repeat(60));
    console.log("ASSESSMENTS & GRADES");
    console.log("=".repeat(60));
    console.log(`Assessments:                 ${assessments}`);
    console.log(`Assessment Results:          ${assessmentResults}`);
    console.log(`Report Cards:                ${reportCards}`);

    console.log("\n" + "=".repeat(60));
    console.log("ATTENDANCE");
    console.log("=".repeat(60));
    console.log(`Attendance Records:          ${attendanceRecords}`);

    console.log("\n" + "=".repeat(60));
    console.log("DEPARTMENTS");
    console.log("=".repeat(60));
    console.log(`Departments:                 ${departments}`);

    console.log("\n" + "=".repeat(60));
    console.log("TIMETABLES");
    console.log("=".repeat(60));
    console.log(`Time Slots:                  ${timeSlots}`);
    console.log(`Class Timetables (Primary):  ${classTimetables}`);
    console.log(`Secondary Timetables:        ${secondaryTimetables}`);
    console.log(`Period Requirements:         ${periodRequirements}`);

    console.log("\n" + "=".repeat(60));
    console.log("PROMOTIONS");
    console.log("=".repeat(60));
    console.log(`Promotions:                  ${promotions}`);

    const totalRecords =
      academicYears +
      terms +
      grades +
      classes +
      subjects +
      students +
      teachers +
      guardians +
      users +
      enrollments +
      classTeacherAssignments +
      subjectTeacherAssignments +
      teacherSubjects +
      assessments +
      assessmentResults +
      reportCards +
      attendanceRecords +
      departments +
      timeSlots +
      classTimetables +
      secondaryTimetables +
      periodRequirements +
      promotions;

    console.log("\n" + "=".repeat(60));
    if (totalRecords === 0) {
      console.log("✓ DATABASE IS COMPLETELY EMPTY - READY FOR TESTING");
    } else {
      console.log(`⚠ DATABASE HAS ${totalRecords} TOTAL RECORDS`);
      console.log("\nTo clean database:");
      console.log("  npx prisma migrate reset  (full reset)");
      console.log("  npx prisma db push         (sync schema only)");
    }
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("Error checking database:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();
