Great question — you’re thinking about this the right way 👍
Short answer: yes, you do want a repo + service + API for this, but not a complicated one. Also: do not send a default password by email. Instead, send a secure invite link that lets the teacher set their own password.

Below is a clean, production-grade approach that fits perfectly with your schema and avoids security and audit issues.

1️⃣ Correct Mental Model (Very Important)

There are three separate concerns that must stay decoupled:

Concern Model
Staff data TeacherProfile
Authentication User
Account activation Invitation / Token flow

👉 Creating a teacher profile ≠ giving system access

Access is only granted when:

A User record exists and

The teacher sets their password via an invite link

2️⃣ UX Flow (What Admin Sees)
Option A – Bulk Invite (Toolbar Button)

✔ Sends invites to all teachers without active accounts

Option B – Single Invite (Row Action)

✔ “Send Invite” button on teacher actions menu

Both call the same backend logic, just with different inputs.

3️⃣ Backend Architecture (Clean & DRY)

Yes — you should use:

controller (API route)
→ service (business logic)
→ repository (Prisma access)

This keeps:

Email logic out of controllers

Prisma out of controllers

Business rules in one place

4️⃣ Required Data Model (Minimal Addition)
✅ Add an Invite model (recommended)
model UserInvite {
id String @id @default(cuid())
email String
token String @unique
userId String? @unique
expiresAt DateTime
acceptedAt DateTime?

user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())

@@index([email])
@@index([expiresAt])
@@map("user_invites")
}

✔ This gives you:

Expiry

One-time use

Audit trail

Resend capability

5️⃣ What Happens When You “Add a Teacher”
Step 1: Create Teacher Profile (No Login Yet)
TeacherProfile
User ❌ (not yet)

At this point:

Teacher exists

Cannot log in

No credentials

✔ This is correct

6️⃣ “Send Invite” — What Actually Happens
Service Logic (High Level)
sendTeacherInvite(teacherId)

1️⃣ Validate

Teacher exists

Has an email

No active User account

2️⃣ Create User (inactive)
User {
email: teacher.email
role: TEACHER
isActive: false
}

3️⃣ Generate Secure Token

32–64 random bytes

Hash before saving (like passwords)

4️⃣ Store Invite
UserInvite {
email
tokenHash
userId
expiresAt: now + 48 hours
}

5️⃣ Send Email

Email contains:

https://school.gov.zm/activate-account?token=XYZ

✔ No password sent
✔ No password stored
✔ Fully auditable

7️⃣ Activation Flow (Teacher Side)
Teacher clicks link
API: POST /auth/activate
{
"token": "...",
"password": "StrongPassword123!"
}

Backend:

Validate token

Check expiry

Hash password

Update User.passwordHash

Set User.isActive = true

Mark invite as acceptedAt

🎉 Account activated

8️⃣ Why NOT Send a Default Password

❌ Email is insecure
❌ Violates best practices
❌ No audit trail
❌ Password reuse risk

If this ever goes government / ECZ audited — it will fail.

Invite link = correct approach.

9️⃣ API Endpoints You Actually Need
Admin
POST /api/teachers/:id/invite
POST /api/teachers/invite/bulk

Auth
POST /auth/activate
POST /auth/resend-invite

🔟 Repo / Service Breakdown (Concrete)
Repository

UserRepository

TeacherRepository

InviteRepository

Service

UserInviteService

sendInvite(teacherId)

sendBulkInvites()

activateAccount(token, password)

Controller

Very thin

No Prisma

No email logic

1️⃣1️⃣ Permission Control (Already Supported by Your Schema)

Only users with:

CREATE_TEACHER
MANAGE_ROLES

can send invites.

You’re already covered 💯

1️⃣2️⃣ Final Verdict (Straight Talk)

✔ Yes, you need repo + service + API
✔ Do not send default passwords
✔ Invite token flow is the right solution
✔ Your schema is already 90% ready
✔ This design scales to 1 teacher or 10,000

// Zambian Government School Management System
// Complete schema with all oversights resolved

generator client {
provider = "prisma-client"
output = "../generated/prisma"
}

datasource db {
provider = "postgresql"
}

// ============================================
// 1. ACADEMIC STRUCTURE
// ============================================

model AcademicYear {
id String @id @default(cuid())
year Int @unique // 2024, 2025
startDate DateTime
endDate DateTime
isActive Boolean @default(false)
isClosed Boolean @default(false) // Prevents modifications after closure

terms Term[]
enrollments StudentClassEnrollment[]
classTeacherAssignments ClassTeacherAssignment[]
subjectTeacherAssignments SubjectTeacherAssignment[]
reportCards ReportCard[] @relation("ReportCardAcademicYear")
classTimetables ClassTimetable[]
secondaryTimetables SecondaryTimetable[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("academic_years")
}

enum TermType {
TERM_1
TERM_2
TERM_3
}

model Term {
id String @id @default(cuid())
academicYearId String
termType TermType
startDate DateTime
endDate DateTime
isActive Boolean @default(false)

academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

assessments Assessment[]
attendanceRecords AttendanceRecord[]
reportCards ReportCard[]
classTimetables ClassTimetable[]
secondaryTimetables SecondaryTimetable[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([academicYearId, termType])
@@map("terms")
}

// ============================================
// 2. GRADES & CLASSES
// ============================================

enum GradeLevel {
GRADE_1
GRADE_2
GRADE_3
GRADE_4
GRADE_5
GRADE_6
GRADE_7
GRADE_8
GRADE_9
GRADE_10
GRADE_11
GRADE_12
}

enum SchoolLevel {
PRIMARY // Grades 1-7
SECONDARY // Grades 8-12
}

model Grade {
id String @id @default(cuid())
level GradeLevel @unique
name String // "Grade 1", "Grade 7", "Form 1", "Form 4"
schoolLevel SchoolLevel // PRIMARY or SECONDARY
sequence Int @unique // 1-12 for proper ordering

classes Class[]
subjects GradeSubject[]
subjectPeriodRequirements SubjectPeriodRequirement[]
nextGrade Grade? @relation("GradeProgression", fields: [nextGradeId], references: [id])
nextGradeId String? @unique
previousGrades Grade[] @relation("GradeProgression")

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("grades")
}

enum ClassStatus {
ACTIVE
INACTIVE
ARCHIVED
}

model Class {
id String @id @default(cuid())
name String // "A", "B", "Red", "Blue"
gradeId String
capacity Int @default(40)
status ClassStatus @default(ACTIVE)

deletedAt DateTime? // Soft delete for audit trail

grade Grade @relation(fields: [gradeId], references: [id], onDelete: Cascade)

enrollments StudentClassEnrollment[]
classTeacherAssignments ClassTeacherAssignment[]
subjectTeacherAssignments SubjectTeacherAssignment[]
assessments Assessment[]
reportCards ReportCard[]
attendanceRecords AttendanceRecord[] @relation("ClassAttendance")
classTimetables ClassTimetable[]
secondaryTimetables SecondaryTimetable[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([gradeId, name])
@@index([gradeId, status])
@@map("classes")
}

// ============================================
// 3. SUBJECTS
// ============================================

model Subject {
id String @id @default(cuid())
code String @unique // "MATH", "ENG", "ICT"
name String // "Mathematics", "English", "Computer Studies"
description String?
departmentId String?

deletedAt DateTime? // Soft delete for audit trail

department Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)

gradeSubjects GradeSubject[]
teacherSubjects TeacherSubject[]
subjectTeacherAssignments SubjectTeacherAssignment[]
assessments Assessment[]
reportCardSubjects ReportCardSubject[]
classTimetables ClassTimetable[]
secondaryTimetables SecondaryTimetable[]
subjectPeriodRequirements SubjectPeriodRequirement[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([departmentId])
@@map("subjects")
}

// Links subjects to grades with school level context
model GradeSubject {
id String @id @default(cuid())
gradeId String
subjectId String
isCore Boolean @default(true) // Core vs Optional subject

grade Grade @relation(fields: [gradeId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

@@unique([gradeId, subjectId])
@@index([gradeId])
@@index([subjectId]) // Performance: reverse lookup (which grades teach this subject)
@@map("grade_subjects")
}

// ============================================
// 3B. DEPARTMENTS
// ============================================

enum DepartmentStatus {
ACTIVE
INACTIVE
ARCHIVED
}

model Department {
id String @id @default(cuid())
name String // "Mathematics Department", "Science Department"
code String @unique // "MATH", "SCI", "LANG"
description String?
status DepartmentStatus @default(ACTIVE)

subjects Subject[]
teacherProfiles TeacherProfile[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([status])
@@map("departments")
}

// ============================================
// 4. STUDENTS & GUARDIANS
// ============================================

enum Gender {
MALE
FEMALE
}

enum StudentStatus {
ACTIVE
TRANSFERRED
GRADUATED
WITHDRAWN
DECEASED
SUSPENDED
}

model Student {
id String @id @default(cuid())
studentNumber String @unique
firstName String
middleName String?
lastName String
dateOfBirth DateTime
gender Gender
admissionDate DateTime
status StudentStatus @default(ACTIVE)

address String?
medicalInfo String?
vulnerability VulnerabilityStatus @default(NOT_VULNERABLE)

deletedAt DateTime? // Soft delete for audit trail

studentGuardians StudentGuardian[]
enrollments StudentClassEnrollment[]
assessmentResults StudentAssessmentResult[]
attendanceRecords AttendanceRecord[]
promotions StudentPromotion[]
reportCards ReportCard[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([status])
@@index([studentNumber])
@@index([admissionDate]) // Performance: cohort and reporting queries
@@index([vulnerability]) // Performance: vulnerability reporting queries
@@map("students")
}

enum ParentRelationship {
MOTHER
FATHER
GUARDIAN
GRANDPARENT
SIBLING
OTHER
}

enum ParentStatus {
ACTIVE
INACTIVE
DECEASED
}

enum VulnerabilityStatus {
NOT_VULNERABLE
ORPHAN
VULNERABLE_CHILD
SPECIAL_NEEDS
UNDER_FIVE_INITIATIVE
}

model Guardian {
id String @id @default(cuid())
firstName String
lastName String
phone String
email String?
address String?
occupation String?

status ParentStatus @default(ACTIVE)

studentGuardians StudentGuardian[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([phone])
@@index([email]) // Performance: email-based lookups
@@map("guardians")
}

// Junction table for many-to-many relationship
model StudentGuardian {
id String @id @default(cuid())
studentId String
guardianId String
relationship ParentRelationship
isPrimary Boolean @default(false) // Primary contact for this student

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
guardian Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([studentId, guardianId])
@@index([studentId])
@@index([guardianId])
@@map("student_guardians")
}

// ============================================
// 5. ENROLLMENT & PROMOTION
// ============================================

enum EnrollmentStatus {
ACTIVE
COMPLETED
TRANSFERRED
WITHDRAWN
}

model StudentClassEnrollment {
id String @id @default(cuid())
studentId String
classId String
academicYearId String
enrollmentDate DateTime @default(now())
status EnrollmentStatus @default(ACTIVE)

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([studentId, academicYearId])
@@index([classId, academicYearId])
@@index([studentId, status])
@@map("student_class_enrollments")
}

enum PromotionStatus {
PROMOTED
REPEATED
GRADUATED
TRANSFERRED
WITHDRAWN
}

model StudentPromotion {
id String @id @default(cuid())
studentId String
fromGradeLevel GradeLevel
toGradeLevel GradeLevel? // null if graduated/withdrawn
academicYear Int
status PromotionStatus
remarks String?
approvedById String // FK to TeacherProfile
approvedAt DateTime @default(now())

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
approver TeacherProfile @relation("PromotionApprovals", fields: [approvedById], references: [id], onDelete: Restrict)

createdAt DateTime @default(now())

@@index([studentId, academicYear])
@@index([academicYear, status])
@@index([approvedById])
@@map("student_promotions")
}

// ============================================
// 6. STAFF & TEACHERS
// ============================================

enum Role {
ADMIN
HEAD_TEACHER
DEPUTY_HEAD
HOD
TEACHER
CLERK
}

enum StaffStatus {
ACTIVE
ON_LEAVE
SUSPENDED
TERMINATED
RETIRED
}

enum QualificationLevel {
CERTIFICATE // Teaching Certificate
DIPLOMA // Diploma in Education
DEGREE // Bachelor's Degree (BA, BSc, etc.)
MASTERS // Master's Degree (MA, MSc, MEd, etc.)
DOCTORATE // PhD, EdD
}

model User {
id String @id @default(cuid())
email String @unique
passwordHash String // Hashed password (bcrypt/argon2)
role Role @default(TEACHER)
isActive Boolean @default(true)
lastLogin DateTime?

profile TeacherProfile?
userPermissions UserPermission[] @relation("UserPermissions")

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([email])
@@index([role]) // Performance: frequent filtering by role for RBAC
@@map("users")
}

model TeacherProfile {
id String @id @default(cuid())
userId String @unique
staffNumber String @unique
firstName String
middleName String?
lastName String
dateOfBirth DateTime
gender Gender
phone String
address String?
qualification QualificationLevel // Standardized qualification levels
yearsExperience Int @default(0)
status StaffStatus @default(ACTIVE)
hireDate DateTime
departmentId String?

deletedAt DateTime? // Soft delete for audit trail

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
department Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)

subjects TeacherSubject[]
classTeacherAssignments ClassTeacherAssignment[]
subjectTeacherAssignments SubjectTeacherAssignment[]
reportCardRemarks ReportCard[]
promotionApprovals StudentPromotion[] @relation("PromotionApprovals")
attendanceMarked AttendanceRecord[] @relation("AttendanceMarker")
permissionGrants UserPermission[] @relation("PermissionGrants")
primaryTimetables ClassTimetable[] @relation("PrimaryTimetable")
secondaryTimetables SecondaryTimetable[] @relation("SecondaryTimetable")

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([staffNumber])
@@index([status])
@@index([departmentId])
@@map("teacher_profiles")
}

// Teacher's subject qualifications
model TeacherSubject {
id String @id @default(cuid())
teacherId String
subjectId String

teacher TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())

@@unique([teacherId, subjectId])
@@index([teacherId])
@@map("teacher_subjects")
}

// Class Teacher Assignment (for both primary and secondary)
model ClassTeacherAssignment {
id String @id @default(cuid())
teacherId String
classId String
academicYearId String

teacher TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([classId, academicYearId])
@@index([teacherId, academicYearId])
@@map("class_teacher_assignments")
}

// Subject Teacher Assignment (SECONDARY ONLY - teacher teaches subject to specific classes)
model SubjectTeacherAssignment {
id String @id @default(cuid())
teacherId String
subjectId String
classId String
academicYearId String

teacher TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([teacherId, subjectId, classId, academicYearId])
@@index([teacherId, academicYearId])
@@index([classId, academicYearId])
@@index([subjectId, academicYearId]) // Performance: subject-based queries
@@map("subject_teacher_assignments")
}

// ============================================
// 7. TIMETABLE / SCHEDULE
// ============================================

enum DayOfWeek {
MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
}

// Reusable time slots for both primary and secondary
model TimeSlot {
id String @id @default(cuid())
startTime String // "08:00" format
endTime String // "08:40" format
label String // "Period 1", "Break", "Lunch"

classTimetables ClassTimetable[]
secondaryTimetables SecondaryTimetable[]

createdAt DateTime @default(now())

@@unique([startTime, endTime])
@@map("time_slots")
}

// PRIMARY SCHOOL (Grades 1-7) - Simple timetable
// One class, one teacher (mostly), subjects in time blocks
model ClassTimetable {
id String @id @default(cuid())
classId String
academicYearId String
termId String
dayOfWeek DayOfWeek
timeSlotId String
subjectId String
teacherId String? // Optional: class teacher handles most subjects

class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
term Term @relation(fields: [termId], references: [id], onDelete: Cascade)
timeSlot TimeSlot @relation(fields: [timeSlotId], references: [id], onDelete: Restrict)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Restrict)
teacher TeacherProfile? @relation("PrimaryTimetable", fields: [teacherId], references: [id], onDelete: SetNull)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// A class cannot have two subjects at the same time
@@unique([classId, termId, dayOfWeek, timeSlotId])
@@index([classId, termId])
@@index([teacherId])
@@map("class_timetables")
}

// SECONDARY SCHOOL (Grades 8-12) - Complex timetable
// Multiple teachers, subject specialization, clash prevention
model SecondaryTimetable {
id String @id @default(cuid())
classId String
subjectId String
teacherId String // Mandatory: subject teachers required
academicYearId String
termId String
dayOfWeek DayOfWeek
timeSlotId String

class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Restrict)
teacher TeacherProfile @relation("SecondaryTimetable", fields: [teacherId], references: [id], onDelete: Restrict)
academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
term Term @relation(fields: [termId], references: [id], onDelete: Cascade)
timeSlot TimeSlot @relation(fields: [timeSlotId], references: [id], onDelete: Restrict)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// 1️⃣ A class cannot have two subjects at the same time
@@unique([classId, termId, dayOfWeek, timeSlotId], name: "class_period_unique")
// 2️⃣ A teacher cannot teach two classes at the same time (clash prevention)
@@unique([teacherId, termId, dayOfWeek, timeSlotId], name: "teacher_period_unique")
// 3️⃣ Fast lookups
@@index([classId, termId])
@@index([teacherId, termId])
@@index([subjectId])
@@map("secondary_timetables")
}

// Curriculum enforcement: how many periods per week each subject needs
model SubjectPeriodRequirement {
id String @id @default(cuid())
gradeId String
subjectId String
periodsPerWeek Int // e.g., Math = 5, Science = 4

grade Grade @relation(fields: [gradeId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([gradeId, subjectId])
@@index([gradeId])
@@map("subject_period_requirements")
}

// ============================================
// 8. ASSESSMENTS & RESULTS
// ============================================

enum ExamType {
CAT // Continuous Assessment Test
MID // Mid-Term Exam
EOT // End of Term Exam
}

enum AssessmentStatus {
DRAFT
PUBLISHED
COMPLETED
ARCHIVED
}

model Assessment {
id String @id @default(cuid())
title String
description String?
subjectId String
classId String
termId String
examType ExamType
totalMarks Int @default(100)
passMark Int @default(50)
weight Float @default(1.0) // For weighted averages
assessmentDate DateTime?
status AssessmentStatus @default(DRAFT)

subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
term Term @relation(fields: [termId], references: [id], onDelete: Cascade)

results StudentAssessmentResult[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([termId, classId])
@@index([subjectId, termId])
@@index([assessmentDate]) // Performance: scheduling and date-based queries
@@index([status]) // Performance: filter DRAFT/PUBLISHED/COMPLETED assessments
@@map("assessments")
}

enum ECZGrade {
GRADE_1 // Distinction
GRADE_2 // Very Good
GRADE_3 // Credit
GRADE_4 // Good
GRADE_5 // Satisfactory
GRADE_6 // Moderate
GRADE_7 // Fair
GRADE_8 // Elementary
GRADE_9 // Not Classified
}

model StudentAssessmentResult {
id String @id @default(cuid())
studentId String
assessmentId String
marksObtained Float
grade ECZGrade?
remarks String?

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
assessment Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([studentId, assessmentId])
@@index([studentId, assessmentId])
@@index([assessmentId]) // Performance: teacher grading queries
@@map("student_assessment_results")
}

// ============================================
// 9. REPORT CARDS
// ============================================

model ReportCard {
id String @id @default(cuid())
studentId String
classId String
termId String
academicYearId String // FK to AcademicYear (standardized from Int)

classTeacherId String
totalMarks Float?
averageMark Float?
position Int? // Position in class
outOf Int? // Total students in class

attendance Int @default(0)
daysPresent Int @default(0)
daysAbsent Int @default(0)

classTeacherRemarks String?
headTeacherRemarks String?

promotionStatus PromotionStatus?
nextGrade GradeLevel?

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
class Class @relation(fields: [classId], references: [id], onDelete: Cascade)
term Term @relation(fields: [termId], references: [id], onDelete: Cascade)
academicYear AcademicYear @relation("ReportCardAcademicYear", fields: [academicYearId], references: [id], onDelete: Restrict)
classTeacher TeacherProfile @relation(fields: [classTeacherId], references: [id], onDelete: Restrict)

subjects ReportCardSubject[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([studentId, termId])
@@index([classId, termId])
@@index([academicYearId]) // Performance: year-based reporting
@@map("report_cards")
}

model ReportCardSubject {
id String @id @default(cuid())
reportCardId String
subjectId String

catMark Float?
midMark Float?
eotMark Float?
totalMark Float?
grade ECZGrade?
remarks String?

reportCard ReportCard @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([reportCardId, subjectId])
@@map("report_card_subjects")
}

// ============================================
// 10. ATTENDANCE
// ============================================

enum AttendanceStatus {
PRESENT
ABSENT
LATE
EXCUSED
}

model AttendanceRecord {
id String @id @default(cuid())
studentId String
classId String
termId String
date DateTime
status AttendanceStatus
remarks String?
markedById String? // FK to TeacherProfile who marked attendance

student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
class Class @relation("ClassAttendance", fields: [classId], references: [id], onDelete: Cascade)
term Term @relation(fields: [termId], references: [id], onDelete: Cascade)
markedBy TeacherProfile? @relation("AttendanceMarker", fields: [markedById], references: [id], onDelete: SetNull)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([studentId, classId, date]) // Fixed: allows transfers/multi-class on same day
@@index([termId, classId])
@@index([studentId, termId])
@@index([date]) // Performance: date range queries for attendance reports
@@index([markedById])
@@map("attendance_records")
}

// ============================================
// 11. PERMISSIONS (RBAC)
// ============================================

enum Permission {
// Student Management
CREATE_STUDENT
READ_STUDENT
UPDATE_STUDENT
DELETE_STUDENT

// Class Management
CREATE_CLASS
READ_CLASS
UPDATE_CLASS
DELETE_CLASS

// Assessment Management
CREATE_ASSESSMENT
READ_ASSESSMENT
UPDATE_ASSESSMENT
DELETE_ASSESSMENT
ENTER_RESULTS

// Teacher Management
CREATE_TEACHER
READ_TEACHER
UPDATE_TEACHER
DELETE_TEACHER

// Reports
VIEW_REPORTS
GENERATE_REPORTS

// System Admin
MANAGE_ROLES
MANAGE_PERMISSIONS
MANAGE_ACADEMIC_YEAR
MANAGE_TERMS
MANAGE_TIMETABLE

// Promotions
APPROVE_PROMOTION

// Attendance
MARK_ATTENDANCE
VIEW_ATTENDANCE
}

model RolePermission {
id String @id @default(cuid())
role Role
permission Permission

createdAt DateTime @default(now())

@@unique([role, permission])
@@map("role_permissions")
}

// User-level permission overrides for temporary access & emergency roles
model UserPermission {
id String @id @default(cuid())
userId String
permission Permission
grantedById String? // Who granted this permission
expiresAt DateTime? // Temporary permissions expire
reason String? // Justification for override (audit trail)

user User @relation("UserPermissions", fields: [userId], references: [id], onDelete: Cascade)
grantedBy TeacherProfile? @relation("PermissionGrants", fields: [grantedById], references: [id], onDelete: SetNull)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([userId, permission])
@@index([userId])
@@index([grantedById])
@@index([expiresAt]) // Query active permissions
@@map("user_permissions")
}
