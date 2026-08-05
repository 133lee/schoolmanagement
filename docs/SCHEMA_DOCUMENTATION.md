# Zambian Government School Management System - Database Schema Documentation

## Overview
This document provides comprehensive documentation of the Prisma database schema for the Zambian Government School Management System, supporting both primary (Grades 1-7) and secondary (Grades 8-12) education.

**Database:** PostgreSQL
**ORM:** Prisma Client
**Schema Version:** 2.0
**Last Updated:** December 2024

---

## Table of Contents
1. [Academic Structure](#1-academic-structure)
2. [Grades & Classes](#2-grades--classes)
3. [Subjects](#3-subjects)
4. [Students & Guardians](#4-students--guardians)
5. [Enrollment & Promotion](#5-enrollment--promotion)
6. [Staff & Teachers](#6-staff--teachers)
7. [Timetable / Schedule](#7-timetable--schedule)
8. [Assessments & Results](#8-assessments--results)
9. [Report Cards](#9-report-cards)
10. [Attendance](#10-attendance)
11. [Permissions (RBAC)](#11-permissions-rbac)
12. [Database Constraints & Integrity](#database-constraints--integrity)
13. [Indexing Strategy](#indexing-strategy)
14. [Best Practices](#best-practices)

---

## 1. ACADEMIC STRUCTURE

### AcademicYear
Represents a complete academic year cycle (e.g., 2024, 2025).

**Fields:**
- `id` (String, PK) - CUID identifier
- `year` (Int, Unique) - Calendar year (2024, 2025)
- `startDate` (DateTime) - Academic year start
- `endDate` (DateTime) - Academic year end
- `isActive` (Boolean) - Current active year flag
- `isClosed` (Boolean) - Prevents modifications after year closure
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- One-to-Many → Term
- One-to-Many → StudentClassEnrollment
- One-to-Many → ClassTeacherAssignment
- One-to-Many → SubjectTeacherAssignment
- One-to-Many → TimetableSlot

**Business Rules:**
- Only ONE academic year should have `isActive = true` at a time
- Once `isClosed = true`, all related data becomes read-only
- `endDate` must be after `startDate`

**Indexes:**
- `@unique([year])`

---

### Term
Represents one of three terms per academic year in Zambian education system.

**Fields:**
- `id` (String, PK) - CUID identifier
- `academicYearId` (String, FK) - References AcademicYear
- `termType` (TermType) - TERM_1, TERM_2, or TERM_3
- `startDate` (DateTime) - Term start
- `endDate` (DateTime) - Term end
- `isActive` (Boolean) - Current active term flag
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: TermType**
```
TERM_1, TERM_2, TERM_3
```

**Relations:**
- Many-to-One → AcademicYear (CASCADE delete)
- One-to-Many → Assessment
- One-to-Many → AttendanceRecord
- One-to-Many → ReportCard

**Business Rules:**
- Each academic year must have exactly 3 terms
- Only ONE term should have `isActive = true` at a time
- Terms cannot overlap within same academic year

**Constraints:**
- `@@unique([academicYearId, termType])` - Prevents duplicate terms

---

## 2. GRADES & CLASSES

### Grade
Defines the 12 grade levels in Zambian education (Grades 1-12).

**Fields:**
- `id` (String, PK) - CUID identifier
- `level` (GradeLevel, Unique) - Enum value (GRADE_1...GRADE_12)
- `name` (String) - Display name ("Grade 1", "Form 1")
- `schoolLevel` (SchoolLevel) - PRIMARY (1-7) or SECONDARY (8-12)
- `sequence` (Int, Unique) - Numeric order (1-12) for sorting
- `nextGradeId` (String?, FK) - Self-referencing progression
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: GradeLevel**
```
GRADE_1, GRADE_2, ..., GRADE_12
```

**Enum: SchoolLevel**
```
PRIMARY (Grades 1-7)
SECONDARY (Grades 8-12)
```

**Relations:**
- One-to-Many → Class
- One-to-Many → GradeSubject
- Self-Referencing → Grade (progression chain)

**Business Rules:**
- Exactly 12 grades in system (static reference data)
- Grade progression: 1→2→3...→11→12
- Grade 12 has no next grade (graduation)

**Indexes:**
- `@unique([level])`
- `@unique([sequence])`

---

### Class
Represents a specific class section within a grade (e.g., "Grade 5A", "Form 2 Blue").

**Fields:**
- `id` (String, PK) - CUID identifier
- `name` (String) - Section name ("A", "B", "Red", "Blue")
- `gradeId` (String, FK) - References Grade
- `capacity` (Int) - Maximum students (default: 40)
- `status` (ClassStatus) - ACTIVE, INACTIVE, ARCHIVED
- `currentEnrolled` (Int) - Current student count (maintained by app logic)
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: ClassStatus**
```
ACTIVE, INACTIVE, ARCHIVED
```

**Relations:**
- Many-to-One → Grade (CASCADE delete)
- One-to-Many → StudentClassEnrollment
- One-to-Many → ClassTeacherAssignment
- One-to-Many → SubjectTeacherAssignment
- One-to-Many → Assessment
- One-to-Many → TimetableSlot
- One-to-Many → ReportCard

**Business Rules:**
- Class name unique within grade level
- `currentEnrolled` should never exceed `capacity`
- Archived classes cannot accept new enrollments

**Constraints:**
- `@@unique([gradeId, name])` - Unique class names per grade

**Indexes:**
- `@@index([gradeId, status])` - Efficient filtering by grade and status

---

## 3. SUBJECTS

### Subject
Academic subjects taught in the school (e.g., Mathematics, English).

**Fields:**
- `id` (String, PK) - CUID identifier
- `code` (String, Unique) - Short code ("MATH", "ENG", "ICT")
- `name` (String) - Full name ("Mathematics", "English")
- `description` (String?) - Optional subject description
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- One-to-Many → GradeSubject
- One-to-Many → TeacherSubject
- One-to-Many → SubjectTeacherAssignment
- One-to-Many → Assessment
- One-to-Many → StudentAssessmentResult
- One-to-Many → TimetableSlot
- One-to-Many → ReportCardSubject

**Business Rules:**
- Subject codes should follow ECZ standards
- Subjects are shared across all grades but assigned via GradeSubject

**Indexes:**
- `@unique([code])`

---

### GradeSubject
Junction table linking subjects to specific grade levels.

**Fields:**
- `id` (String, PK) - CUID identifier
- `gradeId` (String, FK) - References Grade
- `subjectId` (String, FK) - References Subject
- `isCore` (Boolean) - Core vs Optional subject (default: true)

**Relations:**
- Many-to-One → Grade (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)

**Business Rules:**
- Defines curriculum per grade level
- Core subjects are mandatory for all students
- Optional subjects may vary by student

**Constraints:**
- `@@unique([gradeId, subjectId])` - Subject assigned once per grade

**Indexes:**
- `@@index([gradeId])` - Efficient grade-based queries

---

## 4. STUDENTS & GUARDIANS

### Student
Core student information and academic records.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentNumber` (String, Unique) - Official student ID
- `firstName`, `middleName?`, `lastName` (String) - Student names
- `dateOfBirth` (DateTime) - Birth date
- `gender` (Gender) - MALE or FEMALE
- `admissionDate` (DateTime) - Date of school admission
- `status` (StudentStatus) - Current status
- `address` (String?) - Home address
- `medicalInfo` (String?) - Medical conditions/notes
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: Gender**
```
MALE, FEMALE
```

**Enum: StudentStatus**
```
ACTIVE, TRANSFERRED, GRADUATED, WITHDRAWN, DECEASED, SUSPENDED
```

**Relations:**
- One-to-Many → StudentGuardian
- One-to-Many → StudentClassEnrollment
- One-to-Many → StudentAssessmentResult
- One-to-Many → AttendanceRecord
- One-to-Many → StudentPromotion
- One-to-Many → ReportCard

**Business Rules:**
- Student numbers must be unique and immutable
- Only ACTIVE students can be enrolled in classes
- Medical information should be treated as sensitive data

**Indexes:**
- `@@index([status])` - Filter by student status
- `@@index([studentNumber])` - Quick lookup by student number

---

### Guardian
Parent or guardian information for students.

**Fields:**
- `id` (String, PK) - CUID identifier
- `firstName`, `lastName` (String) - Guardian names
- `phone` (String) - Contact phone number
- `email` (String?) - Optional email
- `address` (String?) - Home address
- `occupation` (String?) - Employment/occupation
- `status` (ParentStatus) - ACTIVE, INACTIVE, DECEASED
- `vulnerability` (VulnerabilityStatus) - Vulnerability classification
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: ParentStatus**
```
ACTIVE, INACTIVE, DECEASED
```

**Enum: VulnerabilityStatus**
```
NOT_VULNERABLE, ORPHAN, VULNERABLE_CHILD, SPECIAL_NEEDS, UNDER_FIVE_INITIATIVE
```

**Relations:**
- One-to-Many → StudentGuardian

**Business Rules:**
- One guardian can be linked to multiple students
- Phone number is mandatory for emergency contact
- Vulnerability status affects eligibility for government support programs

**Indexes:**
- `@@index([phone])` - Quick lookup by phone

---

### StudentGuardian
Junction table for many-to-many relationship between students and guardians.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `guardianId` (String, FK) - References Guardian
- `relationship` (ParentRelationship) - Type of relationship
- `isPrimary` (Boolean) - Primary contact flag
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: ParentRelationship**
```
MOTHER, FATHER, GUARDIAN, GRANDPARENT, SIBLING, OTHER
```

**Relations:**
- Many-to-One → Student (CASCADE delete)
- Many-to-One → Guardian (CASCADE delete)

**Business Rules:**
- Each student should have at least one guardian
- Only ONE guardian should be marked as `isPrimary = true` per student
- Primary guardian receives all official communications

**Constraints:**
- `@@unique([studentId, guardianId])` - Prevent duplicate links

**Indexes:**
- `@@index([studentId])` - Student's guardians lookup
- `@@index([guardianId])` - Guardian's children lookup

---

## 5. ENROLLMENT & PROMOTION

### StudentClassEnrollment
Tracks which class a student is enrolled in for each academic year.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `classId` (String, FK) - References Class
- `academicYearId` (String, FK) - References AcademicYear
- `enrollmentDate` (DateTime) - Date of enrollment
- `status` (EnrollmentStatus) - Current enrollment status
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: EnrollmentStatus**
```
ACTIVE, COMPLETED, TRANSFERRED, WITHDRAWN
```

**Relations:**
- Many-to-One → Student (CASCADE delete)
- Many-to-One → Class (CASCADE delete)
- Many-to-One → AcademicYear (CASCADE delete)

**Business Rules:**
- One student can only be enrolled in ONE class per academic year
- Enrollment creates when student is assigned to class
- Status changes to COMPLETED at year end for promotion

**Constraints:**
- `@@unique([studentId, academicYearId])` - One enrollment per year

**Indexes:**
- `@@index([classId, academicYearId])` - Class roster queries
- `@@index([studentId, status])` - Student enrollment history

---

### StudentPromotion
Records student progression between grade levels.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `fromGradeLevel` (GradeLevel) - Starting grade
- `toGradeLevel` (GradeLevel?) - Target grade (null if graduated/withdrawn)
- `academicYear` (Int) - Year of promotion
- `status` (PromotionStatus) - Outcome
- `remarks` (String?) - Notes about promotion decision
- `approvedBy` (String) - Staff ID who approved
- `approvedAt` (DateTime) - Approval timestamp
- `createdAt` (DateTime) - Record creation

**Enum: PromotionStatus**
```
PROMOTED, REPEATED, GRADUATED, TRANSFERRED, WITHDRAWN
```

**Relations:**
- Many-to-One → Student (CASCADE delete)

**Business Rules:**
- Generated at end of academic year based on performance
- GRADUATED status when completing Grade 12
- REPEATED status when student must retake same grade
- Requires head teacher or admin approval

**Indexes:**
- `@@index([studentId, academicYear])` - Student promotion history
- `@@index([academicYear, status])` - Year-end reporting

---

## 6. STAFF & TEACHERS

### User
System authentication and access control for all users.

**Fields:**
- `id` (String, PK) - CUID identifier
- `email` (String, Unique) - Login email
- `passwordHash` (String) - Hashed password (bcrypt/argon2)
- `role` (Role) - System role
- `isActive` (Boolean) - Account status
- `lastLogin` (DateTime?) - Last login timestamp
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: Role**
```
ADMIN, HEAD_TEACHER, DEPUTY_HEAD, HOD, TEACHER, CLERK
```

**Relations:**
- One-to-One → TeacherProfile

**Business Rules:**
- Email must be unique across system
- Passwords must be hashed (never store plaintext)
- Inactive users cannot log in
- Role determines RBAC permissions

**Indexes:**
- `@@index([email])` - Login lookup

---

### TeacherProfile
Extended profile information for teaching staff.

**Fields:**
- `id` (String, PK) - CUID identifier
- `userId` (String, FK, Unique) - References User
- `staffNumber` (String, Unique) - Official staff ID
- `firstName`, `middleName?`, `lastName` (String) - Teacher names
- `dateOfBirth` (DateTime) - Birth date
- `gender` (Gender) - MALE or FEMALE
- `phone` (String) - Contact number
- `address` (String?) - Home address
- `qualification` (String) - Education level (Diploma, Degree, Masters)
- `yearsExperience` (Int) - Years of teaching experience
- `status` (StaffStatus) - Employment status
- `hireDate` (DateTime) - Employment start date
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: StaffStatus**
```
ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RETIRED
```

**Relations:**
- One-to-One → User (CASCADE delete)
- One-to-Many → TeacherSubject
- One-to-Many → ClassTeacherAssignment
- One-to-Many → SubjectTeacherAssignment
- One-to-Many → ReportCard (as class teacher)

**Business Rules:**
- Staff numbers must be unique and immutable
- Only ACTIVE teachers can be assigned to classes
- Teachers can teach multiple subjects they're qualified for

**Indexes:**
- `@@index([staffNumber])` - Quick staff lookup
- `@@index([status])` - Filter by employment status

---

### TeacherSubject
Tracks which subjects each teacher is qualified to teach.

**Fields:**
- `id` (String, PK) - CUID identifier
- `teacherId` (String, FK) - References TeacherProfile
- `subjectId` (String, FK) - References Subject
- `createdAt` (DateTime) - Record creation

**Relations:**
- Many-to-One → TeacherProfile (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)

**Business Rules:**
- Teachers can only be assigned to teach subjects they're qualified for
- Qualifications should match ECZ teacher certification standards

**Constraints:**
- `@@unique([teacherId, subjectId])` - No duplicate qualifications

**Indexes:**
- `@@index([teacherId])` - Teacher's qualified subjects

---

### ClassTeacherAssignment
Assigns a class teacher (homeroom teacher) to a class for an academic year.

**Fields:**
- `id` (String, PK) - CUID identifier
- `teacherId` (String, FK) - References TeacherProfile
- `classId` (String, FK) - References Class
- `academicYearId` (String, FK) - References AcademicYear
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- Many-to-One → TeacherProfile (CASCADE delete)
- Many-to-One → Class (CASCADE delete)
- Many-to-One → AcademicYear (CASCADE delete)

**Business Rules:**
- One class can have only ONE class teacher per academic year
- Class teacher is responsible for pastoral care and report cards
- Applies to both PRIMARY and SECONDARY levels

**Constraints:**
- `@@unique([classId, academicYearId])` - One class teacher per class/year

**Indexes:**
- `@@index([teacherId, academicYearId])` - Teacher's assigned classes

---

### SubjectTeacherAssignment
Assigns subject teachers to teach specific subjects to specific classes (SECONDARY ONLY).

**Fields:**
- `id` (String, PK) - CUID identifier
- `teacherId` (String, FK) - References TeacherProfile
- `subjectId` (String, FK) - References Subject
- `classId` (String, FK) - References Class
- `academicYearId` (String, FK) - References AcademicYear
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- Many-to-One → TeacherProfile (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)
- Many-to-One → Class (CASCADE delete)
- Many-to-One → AcademicYear (CASCADE delete)

**Business Rules:**
- SECONDARY ONLY: In primary school, class teacher teaches all subjects
- One teacher per subject per class per year
- Teacher must be qualified in the subject (via TeacherSubject)

**Constraints:**
- `@@unique([teacherId, subjectId, classId, academicYearId])` - No duplicate assignments

**Indexes:**
- `@@index([teacherId, academicYearId])` - Teacher's teaching load
- `@@index([classId, academicYearId])` - Class subject assignments

---

## 7. TIMETABLE / SCHEDULE

### TimetableSlot
Defines scheduled class periods for subjects across the school week.

**Fields:**
- `id` (String, PK) - CUID identifier
- `classId` (String, FK) - References Class
- `subjectId` (String, FK) - References Subject
- `teacherId` (String, FK) - References TeacherProfile
- `academicYearId` (String, FK) - References AcademicYear
- `dayOfWeek` (DayOfWeek) - Day of the week
- `periodNumber` (Int) - Period slot (1, 2, 3, etc.)
- `startTime` (String) - Start time ("08:00")
- `endTime` (String) - End time ("09:00")
- `room` (String?) - Optional classroom/room number
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: DayOfWeek**
```
MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY
```

**Relations:**
- Many-to-One → Class (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)
- Many-to-One → TeacherProfile (CASCADE delete)
- Many-to-One → AcademicYear (CASCADE delete)

**Business Rules:**
- Prevents scheduling conflicts for classes
- Prevents teacher double-booking
- School operates Monday-Friday only
- Each period has fixed duration

**Constraints:**
- `@@unique([classId, dayOfWeek, periodNumber, academicYearId])` - No class conflicts
- `@@unique([teacherId, dayOfWeek, periodNumber, academicYearId])` - No teacher conflicts

**Indexes:**
- `@@index([classId, academicYearId])` - Class timetable lookup
- `@@index([teacherId, academicYearId])` - Teacher schedule lookup

---

## 8. ASSESSMENTS & RESULTS

### Assessment
Defines exams and assessments administered to classes.

**Fields:**
- `id` (String, PK) - CUID identifier
- `title` (String) - Assessment title
- `description` (String?) - Optional description
- `subjectId` (String, FK) - References Subject
- `classId` (String, FK) - References Class
- `termId` (String, FK) - References Term
- `examType` (ExamType) - CAT, MID, or EOT
- `totalMarks` (Int) - Maximum marks (default: 100)
- `passMark` (Int) - Passing threshold (default: 50)
- `weight` (Float) - Weighting for final grade (default: 1.0)
- `assessmentDate` (DateTime?) - Scheduled date
- `status` (AssessmentStatus) - Current status
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: ExamType**
```
CAT (Continuous Assessment Test)
MID (Mid-Term Exam)
EOT (End of Term Exam)
```

**Enum: AssessmentStatus**
```
DRAFT, PUBLISHED, COMPLETED, ARCHIVED
```

**Relations:**
- Many-to-One → Subject (CASCADE delete)
- Many-to-One → Class (CASCADE delete)
- Many-to-One → Term (CASCADE delete)
- One-to-Many → StudentAssessmentResult

**Business Rules:**
- Each term typically has: 1+ CAT, 1 MID, 1 EOT per subject
- `passMark` must not exceed `totalMarks`
- PUBLISHED assessments are visible to teachers for grading
- COMPLETED assessments have all results entered

**Indexes:**
- `@@index([termId, classId])` - Term assessments by class
- `@@index([subjectId, termId])` - Subject assessments by term

---

### StudentAssessmentResult
Individual student scores for each assessment.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `assessmentId` (String, FK) - References Assessment
- `subjectId` (String, FK) - References Subject
- `marksObtained` (Float) - Student's score
- `grade` (ECZGrade?) - ECZ grading (1-9)
- `remarks` (String?) - Teacher comments
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: ECZGrade**
```
GRADE_1 (Distinction - 80-100%)
GRADE_2 (Very Good - 70-79%)
GRADE_3 (Credit - 65-69%)
GRADE_4 (Good - 60-64%)
GRADE_5 (Satisfactory - 50-59%)
GRADE_6 (Moderate - 45-49%)
GRADE_7 (Fair - 40-44%)
GRADE_8 (Elementary - 35-39%)
GRADE_9 (Not Classified - 0-34%)
```

**Relations:**
- Many-to-One → Student (CASCADE delete)
- Many-to-One → Assessment (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)

**Business Rules:**
- `marksObtained` cannot exceed assessment `totalMarks`
- ECZ grade calculated based on percentage
- Grades 1-5 are passing (≥50%), 6-9 are failing

**Constraints:**
- `@@unique([studentId, assessmentId, subjectId])` - One result per student/assessment

**Indexes:**
- `@@index([studentId, assessmentId])` - Student's assessment results

---

## 9. REPORT CARDS

### ReportCard
Comprehensive end-of-term report card for each student.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `classId` (String, FK) - References Class
- `termId` (String, FK) - References Term
- `academicYear` (Int) - Calendar year
- `classTeacherId` (String, FK) - References TeacherProfile
- `totalMarks` (Float?) - Aggregate marks across all subjects
- `averageMark` (Float?) - Average percentage
- `position` (Int?) - Rank in class (1st, 2nd, 3rd...)
- `outOf` (Int?) - Total students ranked
- `attendance` (Int) - Total school days in term
- `daysPresent` (Int) - Days student attended
- `daysAbsent` (Int) - Days student was absent
- `classTeacherRemarks` (String?) - Class teacher comments
- `headTeacherRemarks` (String?) - Head teacher comments
- `promotionStatus` (PromotionStatus?) - Promotion decision
- `nextGrade` (GradeLevel?) - Next grade level if promoted
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- Many-to-One → Student (CASCADE delete)
- Many-to-One → Class (CASCADE delete)
- Many-to-One → Term (CASCADE delete)
- Many-to-One → TeacherProfile (class teacher, NO CASCADE)
- One-to-Many → ReportCardSubject

**Business Rules:**
- Generated at end of each term
- Position calculated by ranking students by `averageMark`
- Promotion decisions made on Term 3 report cards only
- Attendance calculated from AttendanceRecord

**Constraints:**
- `@@unique([studentId, termId])` - One report card per student/term

**Indexes:**
- `@@index([classId, termId])` - Class report cards by term

---

### ReportCardSubject
Subject-level breakdown within a report card.

**Fields:**
- `id` (String, PK) - CUID identifier
- `reportCardId` (String, FK) - References ReportCard
- `subjectId` (String, FK) - References Subject
- `catMark` (Float?) - CAT average mark
- `midMark` (Float?) - Mid-term exam mark
- `eotMark` (Float?) - End-of-term exam mark
- `totalMark` (Float?) - Weighted total for subject
- `grade` (ECZGrade?) - ECZ grade for subject
- `remarks` (String?) - Subject teacher comments
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Relations:**
- Many-to-One → ReportCard (CASCADE delete)
- Many-to-One → Subject (CASCADE delete)

**Business Rules:**
- Aggregates all assessments for the subject in that term
- `totalMark` calculated based on assessment weights
- Grade derived from `totalMark` percentage

**Constraints:**
- `@@unique([reportCardId, subjectId])` - One entry per subject/report

---

## 10. ATTENDANCE

### AttendanceRecord
Daily attendance tracking for students.

**Fields:**
- `id` (String, PK) - CUID identifier
- `studentId` (String, FK) - References Student
- `classId` (String) - Class identifier (no relation)
- `termId` (String, FK) - References Term
- `date` (DateTime) - Attendance date
- `status` (AttendanceStatus) - Attendance status
- `remarks` (String?) - Reason for absence or lateness
- `markedBy` (String?) - Teacher ID who marked attendance
- `createdAt`, `updatedAt` (DateTime) - Audit timestamps

**Enum: AttendanceStatus**
```
PRESENT, ABSENT, LATE, EXCUSED
```

**Relations:**
- Many-to-One → Student (CASCADE delete)
- Many-to-One → Term (CASCADE delete)

**Business Rules:**
- Attendance marked daily by class teacher
- EXCUSED absences require documentation
- Used to calculate report card attendance stats
- Patterns of absence may trigger interventions

**Constraints:**
- `@@unique([studentId, date])` - One record per student/day

**Indexes:**
- `@@index([termId, classId])` - Class attendance by term
- `@@index([studentId, termId])` - Student attendance history

**⚠️ NOTE:** `classId` field exists but has no relation defined. Consider adding relation to Class model.

---

## 11. PERMISSIONS (RBAC)

### RolePermission
Maps permissions to user roles for access control.

**Fields:**
- `id` (String, PK) - CUID identifier
- `role` (Role) - User role
- `permission` (Permission) - Specific permission
- `createdAt` (DateTime) - Record creation

**Enum: Permission**
```
// Student Management
CREATE_STUDENT, READ_STUDENT, UPDATE_STUDENT, DELETE_STUDENT

// Class Management
CREATE_CLASS, READ_CLASS, UPDATE_CLASS, DELETE_CLASS

// Assessment Management
CREATE_ASSESSMENT, READ_ASSESSMENT, UPDATE_ASSESSMENT, DELETE_ASSESSMENT, ENTER_RESULTS

// Teacher Management
CREATE_TEACHER, READ_TEACHER, UPDATE_TEACHER, DELETE_TEACHER

// Reports
VIEW_REPORTS, GENERATE_REPORTS

// System Admin
MANAGE_ROLES, MANAGE_PERMISSIONS, MANAGE_ACADEMIC_YEAR, MANAGE_TERMS, MANAGE_TIMETABLE

// Promotions
APPROVE_PROMOTION

// Attendance
MARK_ATTENDANCE, VIEW_ATTENDANCE
```

**Relations:** None (reference table)

**Business Rules:**
- Defines what each role can do in the system
- ADMIN has all permissions
- TEACHER has limited permissions for own classes
- Application layer enforces permission checks

**Constraints:**
- `@@unique([role, permission])` - No duplicate permissions per role

---

## DATABASE CONSTRAINTS & INTEGRITY

### Referential Integrity
All foreign key relationships enforce referential integrity:

**CASCADE Deletes:**
- Deleting an AcademicYear cascades to all Terms, Enrollments, Assignments
- Deleting a Student cascades to all Enrollments, Results, Attendance
- Deleting a Class cascades to all Enrollments, Assignments
- Deleting a Term cascades to all Assessments, Reports, Attendance

**Prevent Orphans:**
- Cannot delete Subject if referenced in active Assessments
- Cannot delete Teacher if assigned to active classes

### Data Validation Constraints

**Recommended Check Constraints** (enforce via Prisma middleware or DB triggers):

```sql
-- Assessment constraints
CHECK (passMark <= totalMarks)
CHECK (totalMarks > 0)
CHECK (passMark >= 0)

-- Student result constraints
CHECK (marksObtained >= 0)
CHECK (marksObtained <= totalMarks)

-- Class capacity constraints
CHECK (capacity > 0)
CHECK (currentEnrolled >= 0)
CHECK (currentEnrolled <= capacity)

-- Date validations
CHECK (endDate > startDate) -- AcademicYear, Term
CHECK (admissionDate <= CURRENT_DATE) -- Student
CHECK (dateOfBirth < admissionDate) -- Student

-- Attendance constraints
CHECK (daysPresent + daysAbsent = attendance) -- ReportCard
CHECK (daysPresent >= 0 AND daysAbsent >= 0)
```

### Unique Constraints Summary

| Model | Unique Constraint | Purpose |
|-------|------------------|---------|
| AcademicYear | year | One record per calendar year |
| Term | academicYearId + termType | Three terms per year |
| Grade | level, sequence | Static reference data |
| Class | gradeId + name | Unique class names per grade |
| Subject | code | Standard subject codes |
| Student | studentNumber | Unique student identifier |
| TeacherProfile | userId, staffNumber | One profile per user, unique staff ID |
| StudentGuardian | studentId + guardianId | No duplicate guardianships |
| StudentClassEnrollment | studentId + academicYearId | One class per year |
| TimetableSlot | classId + day + period, teacherId + day + period | No scheduling conflicts |
| Assessment | (no unique constraint) | Multiple assessments allowed |
| StudentAssessmentResult | studentId + assessmentId + subjectId | One result per exam |
| ReportCard | studentId + termId | One report per term |
| ReportCardSubject | reportCardId + subjectId | One entry per subject |
| AttendanceRecord | studentId + date | One record per day |
| RolePermission | role + permission | No duplicate permissions |

---

## INDEXING STRATEGY

### Primary Indexes
- All `id` fields have automatic primary key indexes
- All `@unique` constraints create unique indexes

### Foreign Key Indexes
Foreign keys automatically indexed for join performance:
- All `*Id` fields referencing other tables

### Composite Indexes
Optimized for common query patterns:

```prisma
@@index([gradeId, status])                    // Class - filter by grade and status
@@index([classId, academicYearId])            // Enrollments - class rosters
@@index([studentId, status])                  // Enrollments - student history
@@index([teacherId, academicYearId])          // Teacher assignments
@@index([termId, classId])                    // Assessments by term and class
@@index([studentId, assessmentId])            // Student results
```

### Recommended Additional Indexes

```prisma
// User.role - frequent filtering by role
@@index([role]) on User

// Student.admissionDate - cohort reporting
@@index([admissionDate]) on Student

// AttendanceRecord.date - date range queries
@@index([date]) on AttendanceRecord

// Assessment.assessmentDate - scheduling queries
@@index([assessmentDate]) on Assessment
```

### Index Maintenance
- Monitor index usage with PostgreSQL `pg_stat_user_indexes`
- Remove unused indexes to improve write performance
- Rebuild indexes periodically during maintenance windows

---

## BEST PRACTICES

### 1. Data Integrity
- ✅ All critical relationships have CASCADE deletes defined
- ✅ Unique constraints prevent duplicate records
- ✅ Enums enforce valid status values
- ⚠️ Consider adding CHECK constraints for business rules
- ⚠️ AttendanceRecord.classId should have a relation to Class

### 2. Performance Optimization
- ✅ Proper indexing on foreign keys
- ✅ Composite indexes for common query patterns
- ✅ CUID IDs are URL-safe and distributed
- ⚠️ Consider pagination for large result sets
- ⚠️ Use database views for complex reporting queries

### 3. Security
- ✅ Passwords hashed, never stored as plaintext
- ✅ RBAC permissions system in place
- ✅ Soft deletes not used (hard deletes with CASCADE)
- ⚠️ Implement row-level security for multi-tenant scenarios
- ⚠️ Audit trail for sensitive operations

### 4. Scalability
- ✅ Normalized schema reduces redundancy
- ✅ Efficient joins via proper indexing
- ✅ Academic year partitioning via `academicYearId`
- ⚠️ Consider archiving old academic year data
- ⚠️ Monitor query performance as data grows

### 5. Maintainability
- ✅ Clear naming conventions
- ✅ Comprehensive enum definitions
- ✅ Audit timestamps on all tables
- ✅ Logical grouping of related models
- ⚠️ Document business rules in code comments

### 6. Known Issues & Improvements

#### Critical
1. **TimetableSlot.teacherId** should have `onDelete: Cascade` to match other relations
2. **AttendanceRecord.classId** field exists but has no relation defined - should relate to Class model

#### Recommended
1. Add CHECK constraints for data validation (marks, capacity, dates)
2. Add index on `User.role` for permission queries
3. Add index on `Assessment.assessmentDate` for scheduling
4. Consider making `Assessment.assessmentDate` required (NOT NULL)
5. Add database-level constraints for business rules:
   - Prevent enrolling more students than class capacity
   - Ensure only one active academic year
   - Ensure only one active term per academic year

---

## MIGRATION CHECKLIST

When applying schema changes:

1. ✅ Backup database before migration
2. ✅ Run `npx prisma migrate dev` in development
3. ✅ Review generated SQL migration file
4. ✅ Test migration on staging environment
5. ✅ Run `npx prisma migrate deploy` in production
6. ✅ Run `npx prisma generate` to update Prisma Client
7. ✅ Verify data integrity after migration
8. ✅ Update application code if schema changes affect queries

---

## APPENDIX

### ECZ Grading Scale Reference

| Grade | Description | Percentage Range |
|-------|-------------|-----------------|
| 1 | Distinction | 80-100% |
| 2 | Very Good | 70-79% |
| 3 | Credit | 65-69% |
| 4 | Good | 60-64% |
| 5 | Satisfactory | 50-59% |
| 6 | Moderate | 45-49% |
| 7 | Fair | 40-44% |
| 8 | Elementary | 35-39% |
| 9 | Not Classified | 0-34% |

### Standard Academic Calendar

| Term | Start Month | End Month | Duration |
|------|-------------|-----------|----------|
| Term 1 | January | April | ~13 weeks |
| Term 2 | May | August | ~13 weeks |
| Term 3 | September | December | ~13 weeks |

### Suggested Subject Codes

**Primary (Grades 1-7):**
- ENG (English), MATH (Mathematics), SCI (Science), SS (Social Studies)
- CRE (Religious Education), ARTS (Creative Arts), PE (Physical Education)

**Secondary (Grades 8-12):**
- ENG (English), MATH (Mathematics), BIO (Biology), CHEM (Chemistry), PHY (Physics)
- HIST (History), GEO (Geography), CRE (Religious Education)
- ICT (Computer Studies), ACC (Accounting), COMM (Commerce)

---

**Document Version:** 2.0
**Last Updated:** December 2024
**Schema Version:** Prisma Schema 2.0
**Database:** PostgreSQL 14+
