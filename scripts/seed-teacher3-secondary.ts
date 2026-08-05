import { PrismaClient, Role, Gender, QualificationLevel, StaffStatus, GradeLevel, ExamType, ECZGrade } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('============================================================');
  console.log('Seeding Secondary School Teacher (Teacher3)');
  console.log('============================================================\n');

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  // Get active academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!academicYear) {
    console.error('❌ No active academic year found');
    return;
  }

  const term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear.id,
      termType: 'TERM_1',
    },
  });

  if (!term) {
    console.error('❌ No Term 1 found');
    return;
  }

  console.log(`✅ Academic Year: ${academicYear.year}, Term: ${term.termType}\n`);

  // Create or get Commerce subject
  console.log('📚 Ensuring Commerce subject exists...');
  const commerce = await prisma.subject.upsert({
    where: { code: 'COMM' },
    update: {},
    create: {
      code: 'COMM',
      name: 'Commerce',
      description: 'Business and Commerce Studies',
    },
  });
  console.log(`✅ Commerce subject: ${commerce.code} - ${commerce.name}\n`);

  // Get Computer Studies (ICT)
  const ict = await prisma.subject.findUnique({
    where: { code: 'ICT' },
  });

  if (!ict) {
    console.error('❌ ICT subject not found');
    return;
  }
  console.log(`✅ Computer Studies: ${ict.code} - ${ict.name}\n`);

  // Add subjects to secondary grades if not already added
  console.log('📊 Adding subjects to secondary grades...');
  const secondaryGrades = [
    { level: 'GRADE_8' as GradeLevel },
    { level: 'GRADE_9' as GradeLevel },
    { level: 'GRADE_10' as GradeLevel },
    { level: 'GRADE_11' as GradeLevel },
    { level: 'GRADE_12' as GradeLevel },
  ];

  for (const gradeInfo of secondaryGrades) {
    const grade = await prisma.grade.findUnique({
      where: { level: gradeInfo.level },
    });

    if (!grade) continue;

    // Add ICT
    await prisma.gradeSubject.upsert({
      where: {
        gradeId_subjectId: {
          gradeId: grade.id,
          subjectId: ict.id,
        },
      },
      update: {},
      create: {
        gradeId: grade.id,
        subjectId: ict.id,
        isCore: true,
      },
    });

    // Add Commerce
    await prisma.gradeSubject.upsert({
      where: {
        gradeId_subjectId: {
          gradeId: grade.id,
          subjectId: commerce.id,
        },
      },
      update: {},
      create: {
        gradeId: grade.id,
        subjectId: commerce.id,
        isCore: false,
      },
    });
  }
  console.log('✅ Subjects added to all secondary grades\n');

  // Create Teacher3
  console.log('👨‍🏫 Creating Teacher3...');
  const teacher3User = await prisma.user.upsert({
    where: { email: 'teacher3@school.zm' },
    update: {},
    create: {
      email: 'teacher3@school.zm',
      passwordHash: hashedPassword,
      role: Role.TEACHER,
      isActive: true,
      profile: {
        create: {
          staffNumber: 'TCH003',
          firstName: 'Mwape',
          middleName: 'Chitalu',
          lastName: 'Sakala',
          dateOfBirth: new Date('1988-03-20'),
          gender: Gender.FEMALE,
          phone: '+260977456789',
          qualification: QualificationLevel.DEGREE,
          yearsExperience: 8,
          status: StaffStatus.ACTIVE,
          hireDate: new Date('2017-01-15'),
        },
      },
    },
    include: { profile: true },
  });
  console.log(`✅ Teacher created: ${teacher3User.profile?.firstName} ${teacher3User.profile?.lastName}\n`);

  // Get all secondary grades and classes
  console.log('🏫 Finding secondary classes (Grades 8-12)...');
  const grades = await prisma.grade.findMany({
    where: {
      level: {
        in: ['GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'],
      },
    },
    include: {
      classes: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { sequence: 'asc' },
  });

  const classAssignments: { gradeLevel: string; className: string; classId: string }[] = [];

  for (const grade of grades) {
    if (grade.classes.length > 0) {
      // Take first class from each grade
      const classToUse = grade.classes[0];
      classAssignments.push({
        gradeLevel: grade.name,
        className: classToUse.name,
        classId: classToUse.id,
      });
      console.log(`  ✅ ${grade.name} ${classToUse.name}`);
    }
  }

  if (classAssignments.length === 0) {
    console.error('❌ No secondary classes found');
    return;
  }

  console.log(`\n✅ Found ${classAssignments.length} classes\n`);

  // Assign as Class Teacher for Grade 10
  console.log('📝 Creating Class Teacher assignment for Grade 10...');
  const grade10Class = classAssignments.find((c) => c.gradeLevel.includes('10'));

  if (grade10Class && teacher3User.profile) {
    await prisma.classTeacherAssignment.upsert({
      where: {
        classId_academicYearId: {
          classId: grade10Class.classId,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher3User.profile.id,
        classId: grade10Class.classId,
        academicYearId: academicYear.id,
      },
    });
    console.log(`✅ Class Teacher: ${grade10Class.gradeLevel} ${grade10Class.className}\n`);
  }

  // Create Subject Teacher Assignments for ICT and Commerce across all classes
  console.log('📚 Creating Subject Teacher assignments...');
  for (const classInfo of classAssignments) {
    // ICT assignment
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacher3User.profile!.id,
          subjectId: ict.id,
          classId: classInfo.classId,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher3User.profile!.id,
        subjectId: ict.id,
        classId: classInfo.classId,
        academicYearId: academicYear.id,
      },
    });
    console.log(`  ✅ ${ict.name} - ${classInfo.gradeLevel} ${classInfo.className}`);

    // Commerce assignment
    await prisma.subjectTeacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId: teacher3User.profile!.id,
          subjectId: commerce.id,
          classId: classInfo.classId,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher3User.profile!.id,
        subjectId: commerce.id,
        classId: classInfo.classId,
        academicYearId: academicYear.id,
      },
    });
    console.log(`  ✅ ${commerce.name} - ${classInfo.gradeLevel} ${classInfo.className}`);
  }

  console.log('\n👥 Creating 10 students per class...');

  const zambianNames = {
    male: [
      { first: 'Chanda', last: 'Mwamba' },
      { first: 'Mubanga', last: 'Phiri' },
      { first: 'Kunda', last: 'Banda' },
      { first: 'Lubasi', last: 'Tembo' },
      { first: 'Monde', last: 'Zulu' },
    ],
    female: [
      { first: 'Natasha', last: 'Mulenga' },
      { first: 'Taonga', last: 'Nyirenda' },
      { first: 'Chilufya', last: 'Kabwe' },
      { first: 'Mutale', last: 'Sikota' },
      { first: 'Prisca', last: 'Chanda' },
    ],
  };

  for (const classInfo of classAssignments) {
    console.log(`\n  📝 Creating students for ${classInfo.gradeLevel} ${classInfo.className}...`);

    const grade = await prisma.grade.findFirst({
      where: { name: classInfo.gradeLevel },
    });

    if (!grade) continue;

    // Get existing students count for this class
    const existingCount = await prisma.studentClassEnrollment.count({
      where: {
        classId: classInfo.classId,
        academicYearId: academicYear.id,
      },
    });

    if (existingCount >= 10) {
      console.log(`    ⏭️  Already has ${existingCount} students, skipping...`);
      continue;
    }

    const studentsToCreate = 10 - existingCount;

    for (let i = 0; i < studentsToCreate; i++) {
      const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
      const nameList = gender === 'MALE' ? zambianNames.male : zambianNames.female;
      const name = nameList[i % nameList.length];

      const gradeNumber = parseInt(classInfo.gradeLevel.replace(/\D/g, ''));
      const studentNumber = `STD${gradeNumber}${classInfo.className}${String(existingCount + i + 1).padStart(3, '0')}`;

      const student = await prisma.student.upsert({
        where: { studentNumber },
        update: {},
        create: {
          studentNumber,
          firstName: name.first,
          lastName: name.last,
          dateOfBirth: new Date(`${2010 - (gradeNumber - 1)}-${(i % 12) + 1}-15`),
          gender: gender as any,
          admissionDate: new Date('2024-01-08'),
          status: 'ACTIVE',
        },
      });

      await prisma.studentClassEnrollment.upsert({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          classId: classInfo.classId,
          academicYearId: academicYear.id,
          status: 'ACTIVE',
        },
      });
    }
    console.log(`    ✅ Created ${studentsToCreate} students`);
  }

  // Create assessments and results
  console.log('\n📊 Creating assessments and results...');

  const assessmentTypes: ExamType[] = ['CAT', 'MID', 'EOT'];
  const subjects = [ict, commerce];

  const generateScore = (baseScore: number, variance: number = 15): number => {
    const score = baseScore + (Math.random() - 0.5) * variance * 2;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

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

  for (const classInfo of classAssignments) {
    console.log(`\n  📝 Processing ${classInfo.gradeLevel} ${classInfo.className}...`);

    // Create assessments for ICT and Commerce
    for (const subject of subjects) {
      for (const examType of assessmentTypes) {
        const existingAssessment = await prisma.assessment.findFirst({
          where: {
            termId: term.id,
            subjectId: subject.id,
            classId: classInfo.classId,
            examType: examType,
          },
        });

        if (!existingAssessment) {
          await prisma.assessment.create({
            data: {
              title: `${subject.name} - ${examType}`,
              subjectId: subject.id,
              classId: classInfo.classId,
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

    // Get students in this class
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: classInfo.classId,
        academicYearId: academicYear.id,
        status: 'ACTIVE',
      },
      include: { student: true },
    });

    // Create assessment results
    for (const enrollment of enrollments) {
      const studentBaseScore = 60 + Math.random() * 35;

      for (const subject of subjects) {
        const assessments = await prisma.assessment.findMany({
          where: {
            subjectId: subject.id,
            classId: classInfo.classId,
            termId: term.id,
          },
        });

        for (const assessment of assessments) {
          const score = generateScore(studentBaseScore);
          await prisma.studentAssessmentResult.upsert({
            where: {
              studentId_assessmentId: {
                studentId: enrollment.studentId,
                assessmentId: assessment.id,
              },
            },
            update: {},
            create: {
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

    console.log(`    ✅ Assessments and results created for ${enrollments.length} students`);
  }

  console.log('\n============================================================');
  console.log('✨ Teacher3 (Secondary School) setup completed!');
  console.log('============================================================\n');

  console.log('Summary:');
  console.log(`  👨‍🏫 Teacher: ${teacher3User.profile?.firstName} ${teacher3User.profile?.lastName}`);
  console.log(`  📧 Email: teacher3@school.zm`);
  console.log(`  🔑 Password: Admin123!`);
  console.log(`  📋 Class Teacher: Grade 10`);
  console.log(`  📚 Subjects: Computer Studies (ICT) & Commerce`);
  console.log(`  🏫 Classes: Grades 8-12 (${classAssignments.length} classes)`);
  console.log(`  👥 Students: 10 per class\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
