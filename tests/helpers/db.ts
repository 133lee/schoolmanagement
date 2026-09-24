import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import {
  Role,
  Gender,
  QualificationLevel,
  StaffStatus,
  SchoolLevel,
  GradeLevel,
  ExamType,
  AssessmentStatus,
  TermType,
  DayOfWeek,
  ECZGrade,
} from "@prisma/client";

/**
 * Truncates every app table (discovered dynamically, so this doesn't drift
 * as the schema grows) except Prisma's own migration-tracking table. Call
 * in `beforeEach` — repositories share the module-level `prisma` singleton
 * rather than accepting an injectable per-test client, so transaction
 * rollback isolation isn't available; this is the pragmatic alternative.
 */
export async function resetDb(): Promise<void> {
  // tablename::text cast works around Prisma's query engine failing to
  // deserialize Postgres's internal `name` column type against PG 18.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const tableList = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

const TEST_PASSWORD = "TestPassword123!";

export interface CreateTestUserOptions {
  email?: string;
  role?: Role;
  password?: string;
  isActive?: boolean;
}

/** Creates a User (+ TeacherProfile for teacher-ish roles) with a real bcrypt hash. */
export async function createTestUser(options: CreateTestUserOptions = {}) {
  const {
    email = `test-${crypto.randomUUID()}@example.com`,
    role = Role.TEACHER,
    password = TEST_PASSWORD,
    isActive = true,
  } = options;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role, isActive },
  });

  let teacherProfile = null;
  if (role !== Role.CLERK) {
    teacherProfile = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        staffNumber: `T-${crypto.randomUUID().slice(0, 8)}`,
        firstName: "Test",
        lastName: "Teacher",
        dateOfBirth: new Date("1990-01-01"),
        gender: Gender.FEMALE,
        phone: "0977000000",
        qualification: QualificationLevel.DEGREE,
        hireDate: new Date("2020-01-01"),
        status: StaffStatus.ACTIVE,
      },
    });
  }

  return { user, teacherProfile, password };
}

/**
 * Creates a TEACHER user who is a real HOD — HOD is derived live from
 * Department.hodTeacherId (see lib/auth/position-helpers.ts), not a role,
 * so every HOD-scoped route needs this rather than just a TEACHER user.
 */
export async function createHODUser(options: CreateTestUserOptions = {}) {
  const teacher = await createTestUser({ role: Role.TEACHER, ...options });
  const department = await createTestDepartment({ hodTeacherId: teacher.teacherProfile!.id });
  return { ...teacher, department };
}

export async function createTestAcademicYear(overrides: Partial<{ year: number; isActive: boolean }> = {}) {
  return prisma.academicYear.create({
    data: {
      year: overrides.year ?? new Date().getFullYear(),
      startDate: new Date(`${overrides.year ?? new Date().getFullYear()}-01-01`),
      endDate: new Date(`${overrides.year ?? new Date().getFullYear()}-12-31`),
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createTestTerm(
  academicYearId: string,
  overrides: Partial<{ termType: TermType; isActive: boolean; startDate: Date; endDate: Date }> = {}
) {
  return prisma.term.create({
    data: {
      academicYearId,
      termType: overrides.termType ?? "TERM_1",
      startDate: overrides.startDate ?? new Date(`${new Date().getFullYear()}-01-01`),
      endDate: overrides.endDate ?? new Date(`${new Date().getFullYear()}-04-30`),
      isActive: overrides.isActive ?? true,
    },
  });
}

const PRIMARY_GRADE_LEVELS: GradeLevel[] = [
  GradeLevel.GRADE_1,
  GradeLevel.GRADE_2,
  GradeLevel.GRADE_3,
  GradeLevel.GRADE_4,
  GradeLevel.GRADE_5,
  GradeLevel.GRADE_6,
  GradeLevel.GRADE_7,
];

export async function createTestGrade(overrides: Partial<{ level: GradeLevel; sequence: number }> = {}) {
  const level = overrides.level ?? GradeLevel.GRADE_8;
  // Derived from level, not hardcoded — a caller passing a primary GradeLevel
  // must get a genuinely PRIMARY grade, or any test asserting
  // primary/secondary filtering would silently pass against a mislabeled fixture.
  const schoolLevel = PRIMARY_GRADE_LEVELS.includes(level) ? SchoolLevel.PRIMARY : SchoolLevel.SECONDARY;
  return prisma.grade.create({
    data: {
      level,
      name: level.replace("GRADE_", "Grade "),
      schoolLevel,
      sequence: overrides.sequence ?? 8,
    },
  });
}

export async function createTestClass(gradeId: string, overrides: Partial<{ capacity: number; name: string }> = {}) {
  return prisma.class.create({
    data: {
      name: overrides.name ?? "A",
      gradeId,
      capacity: overrides.capacity ?? 40,
      status: "ACTIVE",
    },
  });
}

export async function createTestStudent(
  overrides: Partial<{ firstName: string; lastName: string; gender: Gender }> = {}
) {
  return prisma.student.create({
    data: {
      studentNumber: `S-${crypto.randomUUID().slice(0, 8)}`,
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "Student",
      dateOfBirth: new Date("2012-01-01"),
      gender: overrides.gender ?? Gender.MALE,
      admissionDate: new Date(),
      status: "ACTIVE",
    },
  });
}

export async function createTestSubject(overrides: Partial<{ name: string; departmentId: string }> = {}) {
  const suffix = crypto.randomUUID().slice(0, 6);
  return prisma.subject.create({
    data: {
      code: `SUB-${suffix}`,
      name: overrides.name ?? `Test Subject ${suffix}`,
      departmentId: overrides.departmentId,
    },
  });
}

export async function createTestDepartment(
  overrides: Partial<{ name: string; code: string; hodTeacherId: string }> = {}
) {
  const suffix = crypto.randomUUID().slice(0, 6);
  return prisma.department.create({
    data: {
      name: overrides.name ?? `Test Department ${suffix}`,
      code: overrides.code ?? `DEPT-${suffix}`,
      hodTeacherId: overrides.hodTeacherId,
      status: "ACTIVE",
    },
  });
}

export async function enrollTestStudent(studentId: string, classId: string, academicYearId: string) {
  return prisma.studentClassEnrollment.create({
    data: { studentId, classId, academicYearId, status: "ACTIVE" },
  });
}

export async function assignTeacherToDepartment(
  teacherId: string,
  departmentId: string,
  isPrimary = false
) {
  return prisma.teacherDepartment.create({
    data: { teacherId, departmentId, isPrimary },
  });
}

export async function createTestTimetableConfiguration(
  academicYearId: string,
  overrides: Partial<{
    schoolStartTime: string;
    periodDuration: number;
    breakStartPeriod: number;
    breakDuration: number;
    periodsBeforeBreak: number;
    periodsAfterBreak: number;
    totalPeriods: number;
  }> = {}
) {
  return prisma.timetableConfiguration.create({
    data: {
      academicYearId,
      schoolStartTime: overrides.schoolStartTime ?? "07:00",
      periodDuration: overrides.periodDuration ?? 40,
      breakStartPeriod: overrides.breakStartPeriod ?? 4,
      breakDuration: overrides.breakDuration ?? 15,
      periodsBeforeBreak: overrides.periodsBeforeBreak ?? 4,
      periodsAfterBreak: overrides.periodsAfterBreak ?? 4,
      totalPeriods: overrides.totalPeriods ?? 8,
    },
  });
}

export async function createTestGradeSubject(
  gradeId: string,
  subjectId: string,
  overrides: Partial<{ isCore: boolean }> = {}
) {
  return prisma.gradeSubject.create({
    data: { gradeId, subjectId, isCore: overrides.isCore ?? true },
  });
}

export async function createTestClassSubject(
  classId: string,
  subjectId: string,
  overrides: Partial<{ isCore: boolean; periodsPerWeek: number }> = {}
) {
  return prisma.classSubject.create({
    data: {
      classId,
      subjectId,
      isCore: overrides.isCore ?? true,
      periodsPerWeek: overrides.periodsPerWeek ?? 5,
    },
  });
}

export async function assignTeacherSubject(teacherId: string, subjectId: string) {
  return prisma.teacherSubject.create({ data: { teacherId, subjectId } });
}

export async function assignClassTeacher(teacherId: string, classId: string, academicYearId: string) {
  return prisma.classTeacherAssignment.create({
    data: { teacherId, classId, academicYearId },
  });
}

export async function assignSubjectTeacher(
  teacherId: string,
  subjectId: string,
  classId: string,
  academicYearId: string
) {
  return prisma.subjectTeacherAssignment.create({
    data: { teacherId, subjectId, classId, academicYearId },
  });
}

export async function createTestAssessment(
  subjectId: string,
  classId: string,
  termId: string,
  overrides: Partial<{ examType: ExamType; totalMarks: number; status: AssessmentStatus; title: string }> = {}
) {
  return prisma.assessment.create({
    data: {
      title: overrides.title ?? "Test Assessment",
      subjectId,
      classId,
      termId,
      examType: overrides.examType ?? ExamType.CAT,
      totalMarks: overrides.totalMarks ?? 100,
      status: overrides.status ?? AssessmentStatus.COMPLETED,
    },
  });
}

export async function createTestAssessmentResult(
  studentId: string,
  assessmentId: string,
  marksObtained: number,
  overrides: Partial<{ isAbsent: boolean }> = {}
) {
  return prisma.studentAssessmentResult.create({
    data: { studentId, assessmentId, marksObtained, isAbsent: overrides.isAbsent ?? false },
  });
}

export async function createTestReportCard(
  studentId: string,
  classId: string,
  termId: string,
  academicYearId: string,
  classTeacherId: string,
  overrides: Partial<{ totalMarks: number; averageMark: number }> = {}
) {
  return prisma.reportCard.create({
    data: {
      studentId,
      classId,
      termId,
      academicYearId,
      classTeacherId,
      totalMarks: overrides.totalMarks,
      averageMark: overrides.averageMark,
    },
  });
}

/**
 * A ReportCardSubject row for a student's report card. Defaults represent
 * "nothing entered for this exam type yet" (null mark, absent flag false) —
 * pass explicit marks/grade for a real result, or `{catAbsent: true}` etc.
 * for a genuine AB, to exercise the "no data" vs "explicitly absent"
 * distinction the grade-performance-report/subject-analysis services rely on.
 */
export async function createTestReportCardSubject(
  reportCardId: string,
  subjectId: string,
  overrides: Partial<{
    catMark: number | null;
    midMark: number | null;
    eotMark: number | null;
    catAbsent: boolean;
    midAbsent: boolean;
    eotAbsent: boolean;
    totalMark: number | null;
    grade: ECZGrade | null;
  }> = {}
) {
  return prisma.reportCardSubject.create({
    data: {
      reportCardId,
      subjectId,
      catMark: overrides.catMark ?? null,
      midMark: overrides.midMark ?? null,
      eotMark: overrides.eotMark ?? null,
      catAbsent: overrides.catAbsent ?? false,
      midAbsent: overrides.midAbsent ?? false,
      eotAbsent: overrides.eotAbsent ?? false,
      totalMark: overrides.totalMark ?? null,
      grade: overrides.grade ?? null,
    },
  });
}

export async function createTestTimetableSlot(
  classId: string,
  subjectId: string,
  teacherId: string,
  academicYearId: string,
  overrides: Partial<{
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    startTime: string;
    endTime: string;
  }> = {}
) {
  return prisma.timetableSlot.create({
    data: {
      classId,
      subjectId,
      teacherId,
      academicYearId,
      dayOfWeek: overrides.dayOfWeek ?? DayOfWeek.MONDAY,
      periodNumber: overrides.periodNumber ?? 1,
      startTime: overrides.startTime ?? "08:00",
      endTime: overrides.endTime ?? "08:40",
    },
  });
}
