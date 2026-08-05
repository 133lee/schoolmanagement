import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Direct database connection
const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin123',
  database: 'rebuild_school_db',
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function investigateCalebMidScore() {
  console.log('=== INVESTIGATING CALEB NYIRENDA MID SCORE ISSUE ===\n');

  // 1. Find Caleb Nyirenda's student record
  console.log('1. FINDING CALEB NYIRENDA STUDENT RECORD');
  console.log('----------------------------------------');
  const caleb = await prisma.student.findFirst({
    where: {
      studentNumber: 'STU-2026-2455'
    },
    include: {
      enrollments: {
        include: {
          class: {
            include: {
              grade: true
            }
          },
          academicYear: true
        }
      }
    }
  });

  if (!caleb) {
    console.log('ERROR: Caleb Nyirenda not found with student number STU-2026-2455');
    return;
  }

  console.log(`Found: ${caleb.firstName} ${caleb.lastName}`);
  console.log(`Student ID: ${caleb.id}`);
  console.log(`Student Number: ${caleb.studentNumber}`);
  console.log(`Enrollments:`, caleb.enrollments.map(e => ({
    class: e.class.name,
    grade: e.class.grade.name,
    academicYear: e.academicYear.year,
    status: e.status
  })));
  console.log('\n');

  // 2. Get all assessments for Grade 8 Mathematics
  console.log('2. FINDING GRADE 8 MATHEMATICS ASSESSMENTS');
  console.log('------------------------------------------');

  const activeEnrollment = caleb.enrollments.find(e => e.status === 'ACTIVE');
  if (!activeEnrollment) {
    console.log('ERROR: No active enrollment found for Caleb');
    return;
  }

  const mathSubject = await prisma.subject.findFirst({
    where: {
      name: 'Mathematics'
    }
  });

  if (!mathSubject) {
    console.log('ERROR: Mathematics subject not found');
    return;
  }

  console.log(`Mathematics Subject ID: ${mathSubject.id}`);
  console.log(`Mathematics Subject Code: ${mathSubject.code}`);
  console.log('\n');

  const assessments = await prisma.assessment.findMany({
    where: {
      classId: activeEnrollment.classId,
      subjectId: mathSubject.id
    },
    include: {
      term: true,
      class: true
    },
    orderBy: {
      examType: 'asc'
    }
  });

  console.log(`Found ${assessments.length} assessments for Grade 8 Mathematics:`);
  assessments.forEach(a => {
    console.log(`  - ${a.examType}: ${a.title} (ID: ${a.id})`);
    console.log(`    Total Marks: ${a.totalMarks}, Pass Mark: ${a.passMark}`);
    console.log(`    Status: ${a.status}, Term: ${a.term.termType}`);
  });
  console.log('\n');

  // 3. Get ALL of Caleb's assessment results for Mathematics
  console.log('3. CALEB\'S ASSESSMENT RESULTS FOR MATHEMATICS');
  console.log('----------------------------------------------');

  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId: caleb.id,
      subjectId: mathSubject.id
    },
    include: {
      assessment: {
        include: {
          term: true
        }
      }
    },
    orderBy: {
      assessment: {
        examType: 'asc'
      }
    }
  });

  console.log(`Found ${results.length} results for Caleb in Mathematics:`);
  results.forEach(r => {
    console.log(`\n  ${r.assessment.examType} Assessment:`);
    console.log(`    Result ID: ${r.id}`);
    console.log(`    Assessment ID: ${r.assessmentId}`);
    console.log(`    Marks Obtained: ${r.marksObtained}`);
    console.log(`    Total Marks: ${r.assessment.totalMarks}`);
    console.log(`    Percentage: ${(r.marksObtained / r.assessment.totalMarks * 100).toFixed(2)}%`);
    console.log(`    Grade: ${r.grade || 'NULL'}`);
    console.log(`    Remarks: ${r.remarks || 'None'}`);
    console.log(`    Created: ${r.createdAt}`);
    console.log(`    Updated: ${r.updatedAt}`);
  });
  console.log('\n');

  // 4. Check specifically the MID assessment
  console.log('4. DETAILED MID ASSESSMENT ANALYSIS');
  console.log('-----------------------------------');

  const midAssessment = assessments.find(a => a.examType === 'MID');
  if (!midAssessment) {
    console.log('ERROR: No MID assessment found for Grade 8 Mathematics');
    return;
  }

  console.log(`MID Assessment Details:`);
  console.log(`  ID: ${midAssessment.id}`);
  console.log(`  Title: ${midAssessment.title}`);
  console.log(`  Total Marks: ${midAssessment.totalMarks}`);
  console.log(`  Pass Mark: ${midAssessment.passMark}`);
  console.log(`  Status: ${midAssessment.status}`);
  console.log('\n');

  // 5. Get ALL MID results for this assessment (not just Caleb)
  console.log('5. ALL MID RESULTS FOR GRADE 8 MATHEMATICS');
  console.log('------------------------------------------');

  const allMidResults = await prisma.studentAssessmentResult.findMany({
    where: {
      assessmentId: midAssessment.id
    },
    include: {
      student: true,
      assessment: true
    },
    orderBy: {
      marksObtained: 'desc'
    }
  });

  console.log(`Found ${allMidResults.length} total MID results:`);
  allMidResults.forEach((r, index) => {
    const percentage = (r.marksObtained / r.assessment.totalMarks * 100).toFixed(2);
    console.log(`\n  ${index + 1}. ${r.student.firstName} ${r.student.lastName} (${r.student.studentNumber})`);
    console.log(`     Marks: ${r.marksObtained}/${r.assessment.totalMarks} (${percentage}%)`);
    console.log(`     Grade: ${r.grade || 'NULL'}`);
    console.log(`     Remarks: ${r.remarks || 'None'}`);
  });
  console.log('\n');

  // 6. Calculate expected grade based on percentage
  console.log('6. GRADE CALCULATION ANALYSIS');
  console.log('-----------------------------');

  const calebMidResult = results.find(r => r.assessment.examType === 'MID');
  if (calebMidResult) {
    const percentage = (calebMidResult.marksObtained / calebMidResult.assessment.totalMarks * 100);
    console.log(`Caleb's MID Score: ${calebMidResult.marksObtained}/${calebMidResult.assessment.totalMarks} = ${percentage.toFixed(2)}%`);
    console.log(`Stored Grade: ${calebMidResult.grade || 'NULL'}`);

    console.log('\nExpected Grade Based on JUNIOR Scale (Grades 1-7):');
    console.log('  Distinction 1: 90-100%');
    console.log('  Distinction 2: 80-89%');
    console.log('  Credit 3: 70-79%');
    console.log('  Pass 4: 60-69%');
    console.log('  Pass 5: 50-59%');
    console.log('  Pass 6: 40-49%');
    console.log('  Fail 7: 0-39%');

    let expectedGrade = '';
    if (percentage >= 90) expectedGrade = 'GRADE_1';
    else if (percentage >= 80) expectedGrade = 'GRADE_2';
    else if (percentage >= 70) expectedGrade = 'GRADE_3';
    else if (percentage >= 60) expectedGrade = 'GRADE_4';
    else if (percentage >= 50) expectedGrade = 'GRADE_5';
    else if (percentage >= 40) expectedGrade = 'GRADE_6';
    else expectedGrade = 'GRADE_7';

    console.log(`\nExpected Grade for ${percentage.toFixed(2)}%: ${expectedGrade} (Pass 6)`);

    if (calebMidResult.grade !== expectedGrade) {
      console.log(`\n⚠️  MISMATCH DETECTED!`);
      console.log(`   Stored: ${calebMidResult.grade || 'NULL'}`);
      console.log(`   Expected: ${expectedGrade}`);
    }
  } else {
    console.log('ERROR: No MID result found for Caleb');
  }
  console.log('\n');

  // 7. Check for patterns - are other students' grades correct?
  console.log('7. CHECKING ALL MID GRADES FOR CORRECTNESS');
  console.log('------------------------------------------');

  let correctGrades = 0;
  let incorrectGrades = 0;
  let nullGrades = 0;

  allMidResults.forEach(r => {
    const percentage = (r.marksObtained / r.assessment.totalMarks * 100);
    let expectedGrade = '';
    if (percentage >= 90) expectedGrade = 'GRADE_1';
    else if (percentage >= 80) expectedGrade = 'GRADE_2';
    else if (percentage >= 70) expectedGrade = 'GRADE_3';
    else if (percentage >= 60) expectedGrade = 'GRADE_4';
    else if (percentage >= 50) expectedGrade = 'GRADE_5';
    else if (percentage >= 40) expectedGrade = 'GRADE_6';
    else expectedGrade = 'GRADE_7';

    if (r.grade === null) {
      nullGrades++;
      console.log(`  ❌ ${r.student.firstName} ${r.student.lastName}: Grade is NULL (${percentage.toFixed(2)}%, expected ${expectedGrade})`);
    } else if (r.grade !== expectedGrade) {
      incorrectGrades++;
      console.log(`  ⚠️  ${r.student.firstName} ${r.student.lastName}: Grade ${r.grade} doesn't match expected ${expectedGrade} (${percentage.toFixed(2)}%)`);
    } else {
      correctGrades++;
      console.log(`  ✅ ${r.student.firstName} ${r.student.lastName}: Grade ${r.grade} is correct (${percentage.toFixed(2)}%)`);
    }
  });

  console.log(`\nSummary:`);
  console.log(`  Correct: ${correctGrades}`);
  console.log(`  Incorrect: ${incorrectGrades}`);
  console.log(`  NULL: ${nullGrades}`);
  console.log(`  Total: ${allMidResults.length}`);
  console.log('\n');

  // 8. Compare with CAT and EOT to see if they have the same issue
  console.log('8. COMPARING WITH CAT AND EOT RESULTS');
  console.log('-------------------------------------');

  const catResult = results.find(r => r.assessment.examType === 'CAT');
  const eotResult = results.find(r => r.assessment.examType === 'EOT');

  if (catResult) {
    const percentage = (catResult.marksObtained / catResult.assessment.totalMarks * 100);
    console.log(`CAT: ${catResult.marksObtained}/${catResult.assessment.totalMarks} (${percentage.toFixed(2)}%)`);
    console.log(`  Grade: ${catResult.grade || 'NULL'}`);
  }

  if (eotResult) {
    const percentage = (eotResult.marksObtained / eotResult.assessment.totalMarks * 100);
    console.log(`EOT: ${eotResult.marksObtained}/${eotResult.assessment.totalMarks} (${percentage.toFixed(2)}%)`);
    console.log(`  Grade: ${eotResult.grade || 'NULL'}`);
  }

  if (calebMidResult) {
    const percentage = (calebMidResult.marksObtained / calebMidResult.assessment.totalMarks * 100);
    console.log(`MID: ${calebMidResult.marksObtained}/${calebMidResult.assessment.totalMarks} (${percentage.toFixed(2)}%)`);
    console.log(`  Grade: ${calebMidResult.grade || 'NULL'}`);
  }
  console.log('\n');

  console.log('=== INVESTIGATION COMPLETE ===');
}

investigateCalebMidScore()
  .catch((error) => {
    console.error('Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
