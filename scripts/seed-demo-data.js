// Comprehensive test data seeding with all proper relations
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('🌱 Starting comprehensive data seeding...\n');

  try {
    // ============================================
    // 1. ACADEMIC STRUCTURE
    // ============================================
    console.log('📅 Creating Academic Year and Terms...');
    const academicYear = await prisma.academicYear.create({
      data: {
        year: 2024,
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-12-20'),
        isActive: true,
        isClosed: false,
      },
    });

    const term1 = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        termType: 'TERM_1',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-04-12'),
        isActive: true,
      },
    });

    const term2 = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        termType: 'TERM_2',
        startDate: new Date('2024-05-06'),
        endDate: new Date('2024-08-16'),
        isActive: false,
      },
    });

    const term3 = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        termType: 'TERM_3',
        startDate: new Date('2024-09-02'),
        endDate: new Date('2024-12-20'),
        isActive: false,
      },
    });

    console.log('✅ Academic Year and Terms created\n');

    // ============================================
    // 2. DEPARTMENTS
    // ============================================
    console.log('🏢 Creating Departments...');
    const mathDept = await prisma.department.create({
      data: {
        name: 'Mathematics Department',
        code: 'MATH',
        status: 'ACTIVE',
      },
    });

    const scienceDept = await prisma.department.create({
      data: {
        name: 'Science Department',
        code: 'SCI',
        status: 'ACTIVE',
      },
    });

    const languageDept = await prisma.department.create({
      data: {
        name: 'Languages Department',
        code: 'LANG',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Departments created\n');

    // ============================================
    // 3. GRADES
    // ============================================
    console.log('📚 Creating Grades...');
    const grades = [];

    // Primary School (Grades 1-7)
    for (let i = 1; i <= 7; i++) {
      const grade = await prisma.grade.create({
        data: {
          level: `GRADE_${i}`,
          name: `Grade ${i}`,
          schoolLevel: 'PRIMARY',
          sequence: i,
        },
      });
      grades.push(grade);
    }

    // Secondary School (Grades 8-12)
    for (let i = 8; i <= 12; i++) {
      const grade = await prisma.grade.create({
        data: {
          level: `GRADE_${i}`,
          name: `Grade ${i}`,
          schoolLevel: 'SECONDARY',
          sequence: i,
        },
      });
      grades.push(grade);
    }

    console.log('✅ Grades created\n');

    // ============================================
    // 4. SUBJECTS
    // ============================================
    console.log('📖 Creating Subjects...');

    // Math subjects
    const mathematics = await prisma.subject.create({
      data: {
        code: 'MATH',
        name: 'Mathematics',
        departmentId: mathDept.id,
      },
    });

    // Science subjects
    const science = await prisma.subject.create({
      data: {
        code: 'SCI',
        name: 'Science',
        departmentId: scienceDept.id,
      },
    });

    const biology = await prisma.subject.create({
      data: {
        code: 'BIO',
        name: 'Biology',
        departmentId: scienceDept.id,
      },
    });

    const chemistry = await prisma.subject.create({
      data: {
        code: 'CHEM',
        name: 'Chemistry',
        departmentId: scienceDept.id,
      },
    });

    const physics = await prisma.subject.create({
      data: {
        code: 'PHY',
        name: 'Physics',
        departmentId: scienceDept.id,
      },
    });

    // Language subjects
    const english = await prisma.subject.create({
      data: {
        code: 'ENG',
        name: 'English',
        departmentId: languageDept.id,
      },
    });

    // Other subjects
    const socialStudies = await prisma.subject.create({
      data: {
        code: 'SS',
        name: 'Social Studies',
      },
    });

    const ict = await prisma.subject.create({
      data: {
        code: 'ICT',
        name: 'Computer Studies',
      },
    });

    const subjects = [mathematics, science, biology, chemistry, physics, english, socialStudies, ict];
    console.log('✅ Subjects created\n');

    // ============================================
    // 5. GRADE-SUBJECT MAPPING
    // ============================================
    console.log('🔗 Linking Subjects to Grades...');

    // Primary (1-7): Math, English, Science, Social Studies
    for (let i = 0; i < 7; i++) {
      await prisma.gradeSubject.createMany({
        data: [
          { gradeId: grades[i].id, subjectId: mathematics.id, isCore: true },
          { gradeId: grades[i].id, subjectId: english.id, isCore: true },
          { gradeId: grades[i].id, subjectId: science.id, isCore: true },
          { gradeId: grades[i].id, subjectId: socialStudies.id, isCore: true },
        ],
      });
    }

    // Secondary (8-12): Math, English, Biology, Chemistry, Physics, ICT
    for (let i = 7; i < 12; i++) {
      await prisma.gradeSubject.createMany({
        data: [
          { gradeId: grades[i].id, subjectId: mathematics.id, isCore: true },
          { gradeId: grades[i].id, subjectId: english.id, isCore: true },
          { gradeId: grades[i].id, subjectId: biology.id, isCore: true },
          { gradeId: grades[i].id, subjectId: chemistry.id, isCore: true },
          { gradeId: grades[i].id, subjectId: physics.id, isCore: true },
          { gradeId: grades[i].id, subjectId: ict.id, isCore: false },
        ],
      });
    }

    console.log('✅ Grade-Subject links created\n');

    // ============================================
    // 6. CLASSES
    // ============================================
    console.log('🏫 Creating Classes...');
    const classes = [];

    // Create 2 classes per grade (A and B)
    for (const grade of grades) {
      const classA = await prisma.class.create({
        data: {
          name: 'A',
          gradeId: grade.id,
          capacity: 40,
          status: 'ACTIVE',
        },
      });
      classes.push(classA);

      const classB = await prisma.class.create({
        data: {
          name: 'B',
          gradeId: grade.id,
          capacity: 40,
          status: 'ACTIVE',
        },
      });
      classes.push(classB);
    }

    console.log(`✅ ${classes.length} classes created\n`);

    // ============================================
    // 7. USERS & TEACHERS
    // ============================================
    console.log('👨‍🏫 Creating Admin and Teachers...');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Admin user (upsert in case it already exists)
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@school.zm' },
      update: {},
      create: {
        email: 'admin@school.zm',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Head Teacher
    const headUser = await prisma.user.create({
      data: {
        email: 'head@school.zm',
        passwordHash,
        role: 'HEAD_TEACHER',
        isActive: true,
      },
    });

    const headTeacher = await prisma.teacherProfile.create({
      data: {
        userId: headUser.id,
        staffNumber: 'ST001',
        firstName: 'John',
        lastName: 'Mwansa',
        dateOfBirth: new Date('1975-03-15'),
        gender: 'MALE',
        phone: '+260971234567',
        qualification: 'MASTERS',
        yearsExperience: 20,
        hireDate: new Date('2005-01-10'),
        status: 'ACTIVE',
      },
    });

    // Create 10 teachers
    const teachers = [];
    const teacherNames = [
      { first: 'Mary', last: 'Banda', dept: mathDept.id, subjects: [mathematics.id] },
      { first: 'Peter', last: 'Phiri', dept: scienceDept.id, subjects: [science.id, biology.id] },
      { first: 'Grace', last: 'Nkonde', dept: languageDept.id, subjects: [english.id] },
      { first: 'James', last: 'Tembo', dept: mathDept.id, subjects: [mathematics.id] },
      { first: 'Ruth', last: 'Chilufya', dept: scienceDept.id, subjects: [chemistry.id, physics.id] },
      { first: 'David', last: 'Mulenga', dept: languageDept.id, subjects: [english.id] },
      { first: 'Sarah', last: 'Zulu', dept: null, subjects: [socialStudies.id] },
      { first: 'Joseph', last: 'Sakala', dept: null, subjects: [ict.id] },
      { first: 'Alice', last: 'Moyo', dept: mathDept.id, subjects: [mathematics.id] },
      { first: 'Michael', last: 'Bwalya', dept: scienceDept.id, subjects: [biology.id, chemistry.id] },
    ];

    for (let i = 0; i < teacherNames.length; i++) {
      const teacherData = teacherNames[i];
      const user = await prisma.user.create({
        data: {
          email: `${teacherData.first.toLowerCase()}.${teacherData.last.toLowerCase()}@school.zm`,
          passwordHash,
          role: 'TEACHER',
          isActive: true,
        },
      });

      const teacher = await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          staffNumber: `ST${String(i + 2).padStart(3, '0')}`,
          firstName: teacherData.first,
          lastName: teacherData.last,
          dateOfBirth: new Date(1980 + i, 5, 15),
          gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
          phone: `+26097${String(1000000 + i).substring(0, 7)}`,
          qualification: i % 3 === 0 ? 'MASTERS' : i % 2 === 0 ? 'DEGREE' : 'DIPLOMA',
          yearsExperience: 5 + i,
          hireDate: new Date(2015 + i, 1, 1),
          status: 'ACTIVE',
          departmentId: teacherData.dept,
        },
      });

      // Link teacher to subjects
      for (const subjectId of teacherData.subjects) {
        await prisma.teacherSubject.create({
          data: {
            teacherId: teacher.id,
            subjectId: subjectId,
          },
        });
      }

      teachers.push(teacher);
    }

    console.log(`✅ Admin and ${teachers.length} teachers created\n`);

    // ============================================
    // 8. CLASS & SUBJECT TEACHER ASSIGNMENTS
    // ============================================
    console.log('📝 Assigning Teachers to Classes...');

    // Assign class teachers (one per class)
    for (let i = 0; i < classes.length && i < teachers.length; i++) {
      await prisma.classTeacherAssignment.create({
        data: {
          teacherId: teachers[i % teachers.length].id,
          classId: classes[i].id,
          academicYearId: academicYear.id,
        },
      });
    }

    // For secondary classes (Grade 8-12), assign subject teachers
    const secondaryClasses = classes.filter(c => {
      const grade = grades.find(g => g.id === c.gradeId);
      return grade && grade.schoolLevel === 'SECONDARY';
    });

    for (const cls of secondaryClasses) {
      // Math teacher
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[0].id, // Mary Banda
          subjectId: mathematics.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });

      // Biology
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[1].id, // Peter Phiri
          subjectId: biology.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });

      // Chemistry
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[4].id, // Ruth Chilufya
          subjectId: chemistry.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });

      // Physics
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[4].id, // Ruth Chilufya
          subjectId: physics.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });

      // English
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[2].id, // Grace Nkonde
          subjectId: english.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });

      // ICT
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: teachers[7].id, // Joseph Sakala
          subjectId: ict.id,
          classId: cls.id,
          academicYearId: academicYear.id,
        },
      });
    }

    console.log('✅ Teacher assignments created\n');

    // ============================================
    // 9. STUDENTS & GUARDIANS
    // ============================================
    console.log('👨‍🎓 Creating Students and Guardians...');

    const students = [];
    const guardians = [];

    // Create 5 students per class
    let studentCounter = 1;
    for (const cls of classes) {
      for (let i = 0; i < 5; i++) {
        const studentNum = String(studentCounter).padStart(4, '0');

        // Create guardian
        const guardian = await prisma.guardian.create({
          data: {
            firstName: `Guardian`,
            lastName: `Family${studentNum}`,
            phone: `+26096${String(1000000 + studentCounter).substring(0, 7)}`,
            email: `guardian${studentNum}@email.zm`,
            status: 'ACTIVE',
          },
        });
        guardians.push(guardian);

        // Create student
        const student = await prisma.student.create({
          data: {
            studentNumber: `STU${studentNum}`,
            firstName: i % 2 === 0 ? 'Jane' : 'John',
            lastName: `Student${studentNum}`,
            dateOfBirth: new Date(2010 + (studentCounter % 10), i, 15),
            gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
            admissionDate: new Date('2024-01-08'),
            status: 'ACTIVE',
            vulnerability: studentCounter % 10 === 0 ? 'ORPHAN' : 'NOT_VULNERABLE',
          },
        });
        students.push(student);

        // Link student to guardian
        await prisma.studentGuardian.create({
          data: {
            studentId: student.id,
            guardianId: guardian.id,
            relationship: i % 3 === 0 ? 'FATHER' : i % 3 === 1 ? 'MOTHER' : 'GUARDIAN',
            isPrimary: true,
          },
        });

        // Enroll student in class
        await prisma.studentClassEnrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            academicYearId: academicYear.id,
            enrollmentDate: new Date('2024-01-08'),
            status: 'ACTIVE',
          },
        });

        studentCounter++;
      }
    }

    console.log(`✅ ${students.length} students and ${guardians.length} guardians created\n`);

    // ============================================
    // 10. ASSESSMENTS & RESULTS
    // ============================================
    console.log('📊 Creating Assessments and Results...');

    let assessmentCount = 0;
    let resultCount = 0;

    // Create assessments for each class and subject
    for (const cls of classes.slice(0, 4)) { // Only first 4 classes for demo
      const grade = grades.find(g => g.id === cls.gradeId);
      const gradeSubjects = await prisma.gradeSubject.findMany({
        where: { gradeId: grade.id },
        include: { subject: true },
      });

      for (const gs of gradeSubjects.slice(0, 3)) { // Only 3 subjects per class
        // CAT Assessment
        const catAssessment = await prisma.assessment.create({
          data: {
            title: 'CAT',
            description: `Continuous Assessment Test for ${gs.subject.name}`,
            subjectId: gs.subject.id,
            classId: cls.id,
            termId: term1.id,
            examType: 'CAT',
            totalMarks: 20,
            passMark: 10,
            weight: 0.2,
            assessmentDate: new Date('2024-02-15'),
            status: 'COMPLETED',
          },
        });
        assessmentCount++;

        // Mid-Term Assessment
        const midAssessment = await prisma.assessment.create({
          data: {
            title: 'Mid-Term Exam',
            description: `Mid-Term Examination for ${gs.subject.name}`,
            subjectId: gs.subject.id,
            classId: cls.id,
            termId: term1.id,
            examType: 'MID',
            totalMarks: 30,
            passMark: 15,
            weight: 0.3,
            assessmentDate: new Date('2024-03-10'),
            status: 'COMPLETED',
          },
        });
        assessmentCount++;

        // End of Term Assessment
        const eotAssessment = await prisma.assessment.create({
          data: {
            title: 'End of Term Exam',
            description: `End of Term Examination for ${gs.subject.name}`,
            subjectId: gs.subject.id,
            classId: cls.id,
            termId: term1.id,
            examType: 'EOT',
            totalMarks: 50,
            passMark: 25,
            weight: 0.5,
            assessmentDate: new Date('2024-04-05'),
            status: 'COMPLETED',
          },
        });
        assessmentCount++;

        // Create results for students in this class
        const classStudents = await prisma.studentClassEnrollment.findMany({
          where: {
            classId: cls.id,
            academicYearId: academicYear.id,
          },
          include: { student: true },
        });

        for (const enrollment of classStudents) {
          // CAT result
          await prisma.studentAssessmentResult.create({
            data: {
              studentId: enrollment.student.id,
              assessmentId: catAssessment.id,
              marksObtained: 10 + Math.floor(Math.random() * 10),
              grade: 'GRADE_3',
            },
          });
          resultCount++;

          // Mid result
          await prisma.studentAssessmentResult.create({
            data: {
              studentId: enrollment.student.id,
              assessmentId: midAssessment.id,
              marksObtained: 15 + Math.floor(Math.random() * 15),
              grade: 'GRADE_3',
            },
          });
          resultCount++;

          // EOT result
          await prisma.studentAssessmentResult.create({
            data: {
              studentId: enrollment.student.id,
              assessmentId: eotAssessment.id,
              marksObtained: 25 + Math.floor(Math.random() * 25),
              grade: 'GRADE_2',
            },
          });
          resultCount++;
        }
      }
    }

    console.log(`✅ ${assessmentCount} assessments and ${resultCount} results created\n`);

    // ============================================
    // 11. ATTENDANCE
    // ============================================
    console.log('📅 Creating Attendance Records...');

    let attendanceCount = 0;
    const attendanceDates = [
      new Date('2024-01-08'),
      new Date('2024-01-09'),
      new Date('2024-01-10'),
      new Date('2024-01-11'),
      new Date('2024-01-12'),
    ];

    for (const cls of classes.slice(0, 4)) {
      const classStudents = await prisma.studentClassEnrollment.findMany({
        where: {
          classId: cls.id,
          academicYearId: academicYear.id,
        },
        include: { student: true },
      });

      for (const date of attendanceDates) {
        for (const enrollment of classStudents) {
          const random = Math.random();
          const status = random > 0.9 ? 'ABSENT' : random > 0.85 ? 'LATE' : 'PRESENT';

          await prisma.attendanceRecord.create({
            data: {
              studentId: enrollment.student.id,
              classId: cls.id,
              termId: term1.id,
              date: date,
              status: status,
              markedById: teachers[0].id,
            },
          });
          attendanceCount++;
        }
      }
    }

    console.log(`✅ ${attendanceCount} attendance records created\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n🎉 SEEDING COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   - Academic Years: 1`);
    console.log(`   - Terms: 3`);
    console.log(`   - Departments: 3`);
    console.log(`   - Grades: ${grades.length}`);
    console.log(`   - Subjects: ${subjects.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Teachers: ${teachers.length + 1}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Guardians: ${guardians.length}`);
    console.log(`   - Assessments: ${assessmentCount}`);
    console.log(`   - Results: ${resultCount}`);
    console.log(`   - Attendance: ${attendanceCount}\n`);
    console.log('🔑 Login Credentials:');
    console.log('   Admin: admin@school.zm / password123');
    console.log('   Head Teacher: head@school.zm / password123');
    console.log('   Teacher: mary.banda@school.zm / password123\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

seedDemoData()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
