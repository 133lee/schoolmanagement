-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('TERM_1', 'TERM_2', 'TERM_3');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'GRADUATED', 'WITHDRAWN', 'DECEASED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "ParentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('NOT_VULNERABLE', 'ORPHAN', 'VULNERABLE_CHILD', 'SPECIAL_NEEDS', 'UNDER_FIVE_INITIATIVE');

-- CreateEnum
CREATE TYPE "OrphanType" AS ENUM ('SINGLE_ORPHAN', 'DOUBLE_ORPHAN');

-- CreateEnum
CREATE TYPE "DeceasedParent" AS ENUM ('FATHER', 'MOTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PROMOTED', 'REPEATED', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD', 'TEACHER', 'CLERK');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "QualificationLevel" AS ENUM ('CERTIFICATE', 'DIPLOMA', 'DEGREE', 'MASTERS', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('CAT', 'MID', 'EOT');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ECZGrade" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CREATE_STUDENT', 'READ_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'CREATE_CLASS', 'READ_CLASS', 'UPDATE_CLASS', 'DELETE_CLASS', 'CREATE_ASSESSMENT', 'READ_ASSESSMENT', 'UPDATE_ASSESSMENT', 'DELETE_ASSESSMENT', 'ENTER_RESULTS', 'CREATE_TEACHER', 'READ_TEACHER', 'UPDATE_TEACHER', 'DELETE_TEACHER', 'VIEW_REPORTS', 'GENERATE_REPORTS', 'MANAGE_ROLES', 'MANAGE_PERMISSIONS', 'MANAGE_ACADEMIC_YEAR', 'MANAGE_TERMS', 'MANAGE_TIMETABLE', 'APPROVE_PROMOTION', 'MARK_ATTENDANCE', 'VIEW_ATTENDANCE', 'SEND_SMS', 'VIEW_SMS_LOGS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'ASSESSMENT_REMINDER', 'DEADLINE_EXTENSION', 'APPROVAL_REQUEST', 'SYSTEM_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SMSStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "SMSProvider" AS ENUM ('AFRICAS_TALKING', 'TWILIO', 'CLICKSEND', 'HTTPSMS');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termType" "TermType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "level" "GradeLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "schoolLevel" "SchoolLevel" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "nextGradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "currentEnrolled" INTEGER,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_subjects" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grade_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hodTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "medicalInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "vulnerability" "VulnerabilityStatus" NOT NULL DEFAULT 'NOT_VULNERABLE',
    "orphanType" "OrphanType",
    "deceasedParent" "DeceasedParent",
    "statusChangeReason" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "status" "ParentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_class_enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "previousClassId" TEXT,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_promotions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromGradeLevel" "GradeLevel" NOT NULL,
    "toGradeLevel" "GradeLevel",
    "academicYear" INTEGER NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "remarks" TEXT,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TEACHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasDefaultPassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "qualification" "QualificationLevel" NOT NULL,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_departments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_teacher_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_teacher_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classSubjectId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_configurations" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,
    "schoolStartTime" TEXT NOT NULL,
    "periodDuration" INTEGER NOT NULL,
    "breakStartPeriod" INTEGER NOT NULL,
    "breakDuration" INTEGER NOT NULL,
    "periodsBeforeBreak" INTEGER NOT NULL,
    "periodsAfterBreak" INTEGER NOT NULL,
    "totalPeriods" INTEGER NOT NULL,
    "allowSubjectPreferences" BOOLEAN NOT NULL DEFAULT false,
    "allowTeacherPreferences" BOOLEAN NOT NULL DEFAULT false,
    "autoAssignRooms" BOOLEAN NOT NULL DEFAULT true,
    "doublePeriodConfigs" JSONB,
    "lastGeneratedAt" TIMESTAMP(3),
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "roomNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_timetables" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondary_timetables" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secondary_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_period_requirements" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_period_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "passMark" INTEGER NOT NULL DEFAULT 50,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "assessmentDate" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_windows" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assessment_results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "grade" "ECZGrade",
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classTeacherId" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION,
    "averageMark" DOUBLE PRECISION,
    "position" INTEGER,
    "outOf" INTEGER,
    "attendance" INTEGER NOT NULL DEFAULT 0,
    "daysPresent" INTEGER NOT NULL DEFAULT 0,
    "daysAbsent" INTEGER NOT NULL DEFAULT 0,
    "classTeacherRemarks" TEXT,
    "headTeacherRemarks" TEXT,
    "promotionStatus" "PromotionStatus",
    "nextGrade" "GradeLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_subjects" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "catMark" DOUBLE PRECISION,
    "midMark" DOUBLE PRECISION,
    "eotMark" DOUBLE PRECISION,
    "totalMark" DOUBLE PRECISION,
    "grade" "ECZGrade",
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "timetableSlotId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecz_grading_schemes" (
    "id" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "gradeLevel" "GradeLevel" NOT NULL,
    "minMark" DOUBLE PRECISION NOT NULL,
    "maxMark" DOUBLE PRECISION NOT NULL,
    "grade" "ECZGrade" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecz_grading_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SMSStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "SMSProvider" NOT NULL DEFAULT 'AFRICAS_TALKING',
    "messageId" TEXT,
    "cost" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "sentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_year_key" ON "academic_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "terms_academicYearId_termType_key" ON "terms"("academicYearId", "termType");

-- CreateIndex
CREATE UNIQUE INDEX "grades_level_key" ON "grades"("level");

-- CreateIndex
CREATE UNIQUE INDEX "grades_sequence_key" ON "grades"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "grades_nextGradeId_key" ON "grades"("nextGradeId");

-- CreateIndex
CREATE INDEX "classes_gradeId_status_idx" ON "classes"("gradeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "classes_gradeId_name_key" ON "classes"("gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "subjects_departmentId_idx" ON "subjects"("departmentId");

-- CreateIndex
CREATE INDEX "grade_subjects_gradeId_idx" ON "grade_subjects"("gradeId");

-- CreateIndex
CREATE INDEX "grade_subjects_subjectId_idx" ON "grade_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_subjects_gradeId_subjectId_key" ON "grade_subjects"("gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hodTeacherId_key" ON "departments"("hodTeacherId");

-- CreateIndex
CREATE INDEX "departments_status_idx" ON "departments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentNumber_key" ON "students"("studentNumber");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_studentNumber_idx" ON "students"("studentNumber");

-- CreateIndex
CREATE INDEX "students_admissionDate_idx" ON "students"("admissionDate");

-- CreateIndex
CREATE INDEX "students_vulnerability_idx" ON "students"("vulnerability");

-- CreateIndex
CREATE INDEX "guardians_phone_idx" ON "guardians"("phone");

-- CreateIndex
CREATE INDEX "guardians_email_idx" ON "guardians"("email");

-- CreateIndex
CREATE INDEX "student_guardians_studentId_idx" ON "student_guardians"("studentId");

-- CreateIndex
CREATE INDEX "student_guardians_guardianId_idx" ON "student_guardians"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "student_guardians_studentId_guardianId_key" ON "student_guardians"("studentId", "guardianId");

-- CreateIndex
CREATE INDEX "student_class_enrollments_classId_academicYearId_idx" ON "student_class_enrollments"("classId", "academicYearId");

-- CreateIndex
CREATE INDEX "student_class_enrollments_studentId_status_idx" ON "student_class_enrollments"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_class_enrollments_studentId_academicYearId_key" ON "student_class_enrollments"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "student_promotions_studentId_academicYear_idx" ON "student_promotions"("studentId", "academicYear");

-- CreateIndex
CREATE INDEX "student_promotions_academicYear_status_idx" ON "student_promotions"("academicYear", "status");

-- CreateIndex
CREATE INDEX "student_promotions_approvedById_idx" ON "student_promotions"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_userId_key" ON "teacher_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_staffNumber_key" ON "teacher_profiles"("staffNumber");

-- CreateIndex
CREATE INDEX "teacher_profiles_staffNumber_idx" ON "teacher_profiles"("staffNumber");

-- CreateIndex
CREATE INDEX "teacher_profiles_status_idx" ON "teacher_profiles"("status");

-- CreateIndex
CREATE INDEX "teacher_subjects_teacherId_idx" ON "teacher_subjects"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacherId_subjectId_key" ON "teacher_subjects"("teacherId", "subjectId");

-- CreateIndex
CREATE INDEX "teacher_departments_teacherId_idx" ON "teacher_departments"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_departments_departmentId_idx" ON "teacher_departments"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_departments_teacherId_departmentId_key" ON "teacher_departments"("teacherId", "departmentId");

-- CreateIndex
CREATE INDEX "class_teacher_assignments_teacherId_academicYearId_idx" ON "class_teacher_assignments"("teacherId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "class_teacher_assignments_classId_academicYearId_key" ON "class_teacher_assignments"("classId", "academicYearId");

-- CreateIndex
CREATE INDEX "subject_teacher_assignments_teacherId_academicYearId_idx" ON "subject_teacher_assignments"("teacherId", "academicYearId");

-- CreateIndex
CREATE INDEX "subject_teacher_assignments_classId_academicYearId_idx" ON "subject_teacher_assignments"("classId", "academicYearId");

-- CreateIndex
CREATE INDEX "subject_teacher_assignments_subjectId_academicYearId_idx" ON "subject_teacher_assignments"("subjectId", "academicYearId");

-- CreateIndex
CREATE INDEX "subject_teacher_assignments_classSubjectId_idx" ON "subject_teacher_assignments"("classSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_teacher_assignments_teacherId_subjectId_classId_aca_key" ON "subject_teacher_assignments"("teacherId", "subjectId", "classId", "academicYearId");

-- CreateIndex
CREATE INDEX "class_subjects_classId_idx" ON "class_subjects"("classId");

-- CreateIndex
CREATE INDEX "class_subjects_subjectId_idx" ON "class_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_classId_subjectId_key" ON "class_subjects"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_configurations_academicYearId_key" ON "timetable_configurations"("academicYearId");

-- CreateIndex
CREATE INDEX "timetable_configurations_academicYearId_idx" ON "timetable_configurations"("academicYearId");

-- CreateIndex
CREATE INDEX "timetable_slots_classId_academicYearId_idx" ON "timetable_slots"("classId", "academicYearId");

-- CreateIndex
CREATE INDEX "timetable_slots_teacherId_academicYearId_idx" ON "timetable_slots"("teacherId", "academicYearId");

-- CreateIndex
CREATE INDEX "timetable_slots_academicYearId_idx" ON "timetable_slots"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_classId_academicYearId_dayOfWeek_periodNumb_key" ON "timetable_slots"("classId", "academicYearId", "dayOfWeek", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_startTime_endTime_key" ON "time_slots"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "class_timetables_classId_termId_idx" ON "class_timetables"("classId", "termId");

-- CreateIndex
CREATE INDEX "class_timetables_teacherId_idx" ON "class_timetables"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "class_timetables_classId_termId_dayOfWeek_timeSlotId_key" ON "class_timetables"("classId", "termId", "dayOfWeek", "timeSlotId");

-- CreateIndex
CREATE INDEX "secondary_timetables_classId_termId_idx" ON "secondary_timetables"("classId", "termId");

-- CreateIndex
CREATE INDEX "secondary_timetables_teacherId_termId_idx" ON "secondary_timetables"("teacherId", "termId");

-- CreateIndex
CREATE INDEX "secondary_timetables_subjectId_idx" ON "secondary_timetables"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "secondary_timetables_classId_termId_dayOfWeek_timeSlotId_key" ON "secondary_timetables"("classId", "termId", "dayOfWeek", "timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "secondary_timetables_teacherId_termId_dayOfWeek_timeSlotId_key" ON "secondary_timetables"("teacherId", "termId", "dayOfWeek", "timeSlotId");

-- CreateIndex
CREATE INDEX "subject_period_requirements_gradeId_idx" ON "subject_period_requirements"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_period_requirements_gradeId_subjectId_key" ON "subject_period_requirements"("gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "assessments_termId_classId_idx" ON "assessments"("termId", "classId");

-- CreateIndex
CREATE INDEX "assessments_subjectId_termId_idx" ON "assessments"("subjectId", "termId");

-- CreateIndex
CREATE INDEX "assessments_assessmentDate_idx" ON "assessments"("assessmentDate");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE INDEX "assessment_windows_termId_idx" ON "assessment_windows"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_windows_termId_examType_key" ON "assessment_windows"("termId", "examType");

-- CreateIndex
CREATE INDEX "student_assessment_results_studentId_assessmentId_idx" ON "student_assessment_results"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "student_assessment_results_assessmentId_idx" ON "student_assessment_results"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_assessment_results_studentId_assessmentId_key" ON "student_assessment_results"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "report_cards_classId_termId_idx" ON "report_cards"("classId", "termId");

-- CreateIndex
CREATE INDEX "report_cards_academicYearId_idx" ON "report_cards"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_studentId_termId_key" ON "report_cards"("studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "report_card_subjects_reportCardId_subjectId_key" ON "report_card_subjects"("reportCardId", "subjectId");

-- CreateIndex
CREATE INDEX "attendance_records_termId_classId_idx" ON "attendance_records"("termId", "classId");

-- CreateIndex
CREATE INDEX "attendance_records_studentId_termId_idx" ON "attendance_records"("studentId", "termId");

-- CreateIndex
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");

-- CreateIndex
CREATE INDEX "attendance_records_markedById_idx" ON "attendance_records"("markedById");

-- CreateIndex
CREATE INDEX "attendance_records_timetableSlotId_idx" ON "attendance_records"("timetableSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_studentId_classId_date_timetableSlotId_key" ON "attendance_records"("studentId", "classId", "date", "timetableSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_key" ON "role_permissions"("role", "permission");

-- CreateIndex
CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");

-- CreateIndex
CREATE INDEX "user_permissions_grantedById_idx" ON "user_permissions"("grantedById");

-- CreateIndex
CREATE INDEX "user_permissions_expiresAt_idx" ON "user_permissions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permission_key" ON "user_permissions"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE INDEX "ecz_grading_schemes_academicYear_gradeLevel_idx" ON "ecz_grading_schemes"("academicYear", "gradeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ecz_grading_schemes_academicYear_gradeLevel_minMark_maxMark_key" ON "ecz_grading_schemes"("academicYear", "gradeLevel", "minMark", "maxMark");

-- CreateIndex
CREATE INDEX "sms_logs_guardianId_idx" ON "sms_logs"("guardianId");

-- CreateIndex
CREATE INDEX "sms_logs_studentId_idx" ON "sms_logs"("studentId");

-- CreateIndex
CREATE INDEX "sms_logs_status_idx" ON "sms_logs"("status");

-- CreateIndex
CREATE INDEX "sms_logs_createdAt_idx" ON "sms_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sms_logs_sentBy_idx" ON "sms_logs"("sentBy");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_name_key" ON "sms_templates"("name");

-- CreateIndex
CREATE INDEX "sms_templates_category_idx" ON "sms_templates"("category");

-- CreateIndex
CREATE INDEX "sms_templates_isActive_idx" ON "sms_templates"("isActive");

-- CreateIndex
CREATE INDEX "notifications_recipientId_status_idx" ON "notifications"("recipientId", "status");

-- CreateIndex
CREATE INDEX "notifications_senderId_idx" ON "notifications"("senderId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_nextGradeId_fkey" FOREIGN KEY ("nextGradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hodTeacherId_fkey" FOREIGN KEY ("hodTeacherId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_departments" ADD CONSTRAINT "teacher_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_departments" ADD CONSTRAINT "teacher_departments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "class_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "subject_teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_configurations" ADD CONSTRAINT "timetable_configurations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_configurations" ADD CONSTRAINT "timetable_configurations_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_configurations" ADD CONSTRAINT "timetable_configurations_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_timetables" ADD CONSTRAINT "secondary_timetables_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_period_requirements" ADD CONSTRAINT "subject_period_requirements_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_period_requirements" ADD CONSTRAINT "subject_period_requirements_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_windows" ADD CONSTRAINT "assessment_windows_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessment_results" ADD CONSTRAINT "student_assessment_results_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessment_results" ADD CONSTRAINT "student_assessment_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_subjects" ADD CONSTRAINT "report_card_subjects_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "report_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_subjects" ADD CONSTRAINT "report_card_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "timetable_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
