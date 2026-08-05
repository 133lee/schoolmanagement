import { PrismaClient, ExamType, ECZGrade } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting report cards seed...\n');

  // Get the active academic year and term
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    console.error('❌ No active academic year found. Please run the main seed first.');
    return;
  }

  const term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear.id,
      termType: 'TERM_1'
    },
  });

  if (!term) {
    console.error('❌ No Term 1 found. Please run the main seed first.');
    return;
  }

  console.log(`✅ Using Academic Year: ${academicYear.year}, Term: ${term.termType}\n`);

  // Get teacher2 (the one we'll use for testing)
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher2@school.zm' },
    include: { profile: true },
  });

  if (!teacher || !teacher.profile) {
    console.error('❌ Teacher2 not found. Please run the main seed first.');
    return;
  }

  console.log(`✅ Using Teacher: ${teacher.profile.firstName} ${teacher.profile.lastName}\n`);

  // Get all class and subject assignments for teacher2
  const subjectAssignments = await prisma.subjectTeacherAssignment.findMany({
    where: {
      teacherId: teacher.profile.id,
      academicYearId: academicYear.id,
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

  if (subjectAssignments.length === 0) {
    console.error('❌ No subject assignment found for teacher2. Please run seed-teacher2-assignments.ts first.');
    return;
  }

  console.log(`✅ Found ${subjectAssignments.length} assignments\n`);

  // Get unique classes
  const uniqueClasses = Array.from(
    new Map(subjectAssignments.map(a => [a.classId, a])).values()
  );

  // Process each unique class
  for (const assignment of uniqueClasses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📚 Processing ${assignment.class.grade.name} ${assignment.class.name}`);
    console.log('='.repeat(60));

    // Get all students enrolled in this class
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: assignment.classId,
        academicYearId: academicYear.id,
        status: 'ACTIVE',
      },
      include: {
        student: true,
      },
    });

    if (enrollments.length === 0) {
      console.log(`⏭️  No students enrolled in this class, skipping...\n`);
      continue;
    }

    console.log(`✅ Found ${enrollments.length} students in the class`);

    // Get all subjects for this grade
    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: {
        gradeId: assignment.class.gradeId,
      },
      include: {
        subject: true,
      },
    });

    console.log(`✅ Found ${gradeSubjects.length} subjects for this grade\n`);

    // Get or create class teacher assignment
    let classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        classId: assignment.classId,
        academicYearId: academicYear.id,
      },
    });

    if (!classTeacherAssignment) {
      console.log('📝 Creating class teacher assignment...');
      classTeacherAssignment = await prisma.classTeacherAssignment.create({
        data: {
          teacherId: teacher.profile.id,
          classId: assignment.classId,
          academicYearId: academicYear.id,
        },
      });
      console.log('✅ Class teacher assignment created\n');
    }

    // Create assessments for each subject
    console.log('📝 Creating assessments...');
    const assessmentTypes: ExamType[] = ['CAT', 'MID', 'EOT'];

    for (const gradeSubject of gradeSubjects) {
      for (const examType of assessmentTypes) {
        const existingAssessment = await prisma.assessment.findFirst({
          where: {
            subjectId: gradeSubject.subjectId,
            classId: assignment.classId,
            termId: term.id,
            examType: examType,
          },
        });

        if (!existingAssessment) {
          await prisma.assessment.create({
            data: {
              title: `${gradeSubject.subject.name} - ${examType}`,
              subjectId: gradeSubject.subjectId,
              classId: assignment.classId,
              termId: term.id,
              examType: examType,
              totalMarks: 100,
              passMark: 50,
              status: 'PUBLISHED',
              assessmentDate: new Date(),
            },
          });
        }
      }
    }
    console.log(`✅ Assessments created/verified\n`);

    console.log('📊 Creating student assessment results...');

    // Helper function to generate realistic scores
    const generateScore = (baseScore: number, variance: number = 15): number => {
      const score = baseScore + (Math.random() - 0.5) * variance * 2;
      return Math.max(0, Math.min(100, Math.round(score)));
    };

    // Helper function to get ECZ grade
    const getGrade = (score: number): ECZGrade => {
      if (score >= 90) return 'GRADE_1';
      if (score >= 80) return 'GRADE_2';
      if (score >= 70) return 'GRADE_3';
      if (score >= 60) return 'GRADE_4';
      if (score >= 50) return 'GRADE_5';
      if (score >= 40) return 'GRADE_6';
      if (score >= 30) return 'GRADE_7';
      if (score >= 20) return 'GRADE_8';
      return 'GRADE_9';
    };

    // Create results for each student
    for (const enrollment of enrollments) {
      // Assign a base performance level for this student (60-95)
      const studentBaseScore = 60 + Math.random() * 35;

      for (const gradeSubject of gradeSubjects) {
        const assessments = await prisma.assessment.findMany({
          where: {
            subjectId: gradeSubject.subjectId,
            classId: assignment.classId,
            termId: term.id,
          },
        });

        for (const assessment of assessments) {
          const existingResult = await prisma.studentAssessmentResult.findUnique({
            where: {
              studentId_assessmentId: {
                studentId: enrollment.studentId,
                assessmentId: assessment.id,
              },
            },
          });

          if (!existingResult) {
            const score = generateScore(studentBaseScore);
            await prisma.studentAssessmentResult.create({
              data: {
                studentId: enrollment.studentId,
                assessmentId: assessment.id,
                marksObtained: score,
                grade: getGrade(score),
                remarks: score >= 75 ? 'Excellent work' : score >= 50 ? 'Good effort' : 'Needs improvement',
              },
            });
          }
        }
      }
    }
    console.log(`✅ Created results for ${enrollments.length} students\n`);

    console.log('📋 Creating report cards...');

    for (const enrollment of enrollments) {
      // Check if report card already exists
      const existingReportCard = await prisma.reportCard.findUnique({
        where: {
          studentId_termId: {
            studentId: enrollment.studentId,
            termId: term.id,
          },
        },
      });

      if (existingReportCard) {
        continue;
      }

      // Calculate total marks and average for this student
      const results = await prisma.studentAssessmentResult.findMany({
        where: {
          studentId: enrollment.studentId,
          assessment: {
            termId: term.id,
          },
        },
        include: {
          assessment: {
            include: {
              subject: true,
            },
          },
        },
      });

      // Group results by subject
      const subjectScores = new Map<string, { cat?: number; mid?: number; eot?: number; subjectId: string }>();

      for (const result of results) {
        const subjectId = result.assessment.subjectId;
        if (!subjectScores.has(subjectId)) {
          subjectScores.set(subjectId, { subjectId });
        }

        const scores = subjectScores.get(subjectId)!;
        if (result.assessment.examType === 'CAT') scores.cat = result.marksObtained;
        if (result.assessment.examType === 'MID') scores.mid = result.marksObtained;
        if (result.assessment.examType === 'EOT') scores.eot = result.marksObtained;
      }

      // Create report card
      const reportCard = await prisma.reportCard.create({
        data: {
          studentId: enrollment.studentId,
          classId: assignment.classId,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: teacher.profile.id,
          daysPresent: 60,
          daysAbsent: 5,
          attendance: 92,
          classTeacherRemarks: 'Good progress this term',
        },
      });

      // Create report card subjects
      for (const [subjectId, scores] of subjectScores) {
        const totalMark = ((scores.cat || 0) + (scores.mid || 0) + (scores.eot || 0)) / 3;

        await prisma.reportCardSubject.create({
          data: {
            reportCardId: reportCard.id,
            subjectId: subjectId,
            catMark: scores.cat,
            midMark: scores.mid,
            eotMark: scores.eot,
            totalMark: totalMark,
            grade: getGrade(totalMark),
            remarks: totalMark >= 75 ? 'Excellent' : totalMark >= 50 ? 'Satisfactory' : 'Needs improvement',
          },
        });
      }
    }

    // Calculate positions
    console.log('🏆 Calculating class positions...');

    const reportCards = await prisma.reportCard.findMany({
      where: {
        classId: assignment.classId,
        termId: term.id,
      },
      include: {
        subjects: true,
      },
    });

    // Calculate averages
    for (const reportCard of reportCards) {
      const totalMarks = reportCard.subjects.reduce((sum, s) => sum + (s.totalMark || 0), 0);
      const averageMark = reportCard.subjects.length > 0 ? totalMarks / reportCard.subjects.length : 0;

      await prisma.reportCard.update({
        where: { id: reportCard.id },
        data: {
          totalMarks: totalMarks,
          averageMark: averageMark,
        },
      });
    }

    // Sort and assign positions
    const sortedReportCards = await prisma.reportCard.findMany({
      where: {
        classId: assignment.classId,
        termId: term.id,
      },
      orderBy: {
        averageMark: 'desc',
      },
    });

    for (let i = 0; i < sortedReportCards.length; i++) {
      await prisma.reportCard.update({
        where: { id: sortedReportCards[i].id },
        data: {
          position: i + 1,
          outOf: sortedReportCards.length,
        },
      });
    }

    console.log(`✅ Class complete: ${sortedReportCards.length} report cards created\n`);
  }

  console.log('\n✅ Report cards seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding report cards:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
