/**
 * Timetable Diagnostic Script
 * Analyzes why slots might be empty
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseTimetable() {
  console.log('=== TIMETABLE DIAGNOSTIC ===\n');

  // Get active academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    console.log('❌ No active academic year found');
    return;
  }

  console.log(`📅 Academic Year: ${academicYear.year}\n`);

  // Get timetable configuration
  const config = await prisma.timetableConfiguration.findFirst({
    where: { academicYearId: academicYear.id },
  });

  if (!config) {
    console.log('❌ No timetable configuration found');
    return;
  }

  console.log('⚙️  Configuration:');
  console.log(`   Total periods per day: ${config.totalPeriods}`);
  console.log(`   School days: Monday-Friday (5 days)`);
  console.log(`   Total slots per week: ${config.totalPeriods * 5}`);
  console.log('');

  // Get all classes
  const classes = await prisma.class.findMany({
    include: {
      grade: true,
      _count: {
        select: {
          subjects: true, // ClassSubject count
        },
      },
    },
  });

  console.log(`📚 Total Classes: ${classes.length}\n`);

  // Analyze each class
  for (const cls of classes) {
    console.log(`\n─── ${cls.grade.name} ${cls.name} ───`);

    // Get class subjects (curriculum)
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: cls.id },
      include: {
        subject: true,
      },
    });

    const totalPeriodsRequired = classSubjects.reduce(
      (sum, cs) => sum + cs.periodsPerWeek,
      0
    );
    const totalSlotsAvailable = config.totalPeriods * 5;

    console.log(`   Subjects configured: ${classSubjects.length}`);
    console.log(`   Total periods required: ${totalPeriodsRequired}`);
    console.log(`   Total slots available: ${totalSlotsAvailable}`);
    console.log(
      `   Utilization: ${((totalPeriodsRequired / totalSlotsAvailable) * 100).toFixed(1)}%`
    );

    if (totalPeriodsRequired < totalSlotsAvailable) {
      const emptySlots = totalSlotsAvailable - totalPeriodsRequired;
      console.log(
        `   ⚠️  ${emptySlots} empty slots expected (this is normal)`
      );
    }

    // Get subject teacher assignments
    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        classId: cls.id,
        academicYearId: academicYear.id,
      },
      include: {
        subject: true,
        teacher: true,
      },
    });

    console.log(`   Teacher assignments: ${assignments.length}`);

    // Check for subjects without teachers
    const subjectsWithoutTeachers = classSubjects.filter(
      (cs) => !assignments.find((a) => a.subjectId === cs.subjectId)
    );

    if (subjectsWithoutTeachers.length > 0) {
      console.log(`   ❌ Subjects missing teachers:`);
      for (const cs of subjectsWithoutTeachers) {
        console.log(`      - ${cs.subject.name} (${cs.periodsPerWeek} periods)`);
      }
    }

    // Get actual timetable slots
    const timetableSlots = await prisma.timetableSlot.findMany({
      where: {
        classId: cls.id,
        academicYearId: academicYear.id,
      },
    });

    console.log(`   Timetable slots generated: ${timetableSlots.length}`);

    if (timetableSlots.length < totalPeriodsRequired) {
      const missing = totalPeriodsRequired - timetableSlots.length;
      console.log(
        `   ❌ PROBLEM: ${missing} lessons couldn't be placed!`
      );
    }

    // Show breakdown by subject
    if (classSubjects.length > 0 && classSubjects.length <= 15) {
      console.log(`\n   Subject Breakdown:`);
      for (const cs of classSubjects) {
        const subjectSlots = timetableSlots.filter(
          (ts) => ts.subjectId === cs.subjectId
        );
        const required = cs.periodsPerWeek;
        const placed = subjectSlots.length;
        const status = placed === required ? '✓' : '❌';
        console.log(
          `      ${status} ${cs.subject.name}: ${placed}/${required} periods`
        );
      }
    }
  }

  console.log('\n\n=== OVERALL SUMMARY ===');

  // Count total unplaced lessons across all classes
  let totalRequired = 0;
  let totalPlaced = 0;

  for (const cls of classes) {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: cls.id },
    });
    const periodsRequired = classSubjects.reduce(
      (sum, cs) => sum + cs.periodsPerWeek,
      0
    );
    totalRequired += periodsRequired;

    const timetableSlots = await prisma.timetableSlot.findMany({
      where: {
        classId: cls.id,
        academicYearId: academicYear.id,
      },
    });
    totalPlaced += timetableSlots.length;
  }

  console.log(`Total lessons required: ${totalRequired}`);
  console.log(`Total lessons placed: ${totalPlaced}`);
  console.log(`Success rate: ${((totalPlaced / totalRequired) * 100).toFixed(1)}%`);

  if (totalPlaced < totalRequired) {
    const missing = totalRequired - totalPlaced;
    console.log(
      `\n❌ ${missing} lessons couldn't be placed! Check for conflicts.`
    );
    console.log('\nPossible causes:');
    console.log('  1. Teachers not assigned to all subjects');
    console.log('  2. Teacher conflicts (same teacher, multiple classes at same time)');
    console.log('  3. Double period constraints too restrictive');
    console.log('  4. Not enough periods per day configured');
  } else {
    console.log('\n✅ All lessons successfully placed!');
    if (totalPlaced < config.totalPeriods * 5 * classes.length) {
      console.log('(Some empty slots are normal - not all periods need to be filled)');
    }
  }
}

diagnoseTimetable()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
