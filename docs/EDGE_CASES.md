# Edge Cases - School Management System

This document outlines critical edge cases that real schools encounter and how this system handles them. These cases have been identified through real-world school operations and are essential for data integrity.

---

## Table of Contents

1. [Mid-Year Transfers](#1-mid-year-transfers)
2. [Student Repeats a Grade](#2-student-repeats-a-grade)
3. [Subject Changes Over Years](#3-subject-changes-over-years)
4. [Teacher Leaves Mid-Term](#4-teacher-leaves-mid-term)
5. [Double Enrollment Bug](#5-double-enrollment-bug)
6. [Missing Subjects on Report Cards](#6-missing-subjects-on-report-cards)
7. [Changing Class Mid-Year (Stream Change)](#7-changing-class-mid-year-stream-change)
8. [Attendance Without Enrollment](#8-attendance-without-enrollment)
9. [Academic Year Closure](#9-academic-year-closure)
10. [ECZ Grade Mapping](#10-ecz-grade-mapping)

---

## 1. Mid-Year Transfers

### Scenario
Student transfers to another school in Term 2.

### Issue
- Enrollment is per academic year
- Assessments and attendance already exist
- Student should not appear in current school's active lists

### Solution ✅

**Schema Support:**
- `StudentClassEnrollment.status` → `TRANSFERRED`
- Historical data remains intact

**Service Layer:**
```typescript
// features/enrollments/enrollment.service.ts
async validateTransfer(enrollmentId: string): Promise<void>
```

**How It Works:**
1. Update enrollment status to `TRANSFERRED`
2. Past assessments and report cards remain valid
3. Student can be enrolled in receiving school with new enrollment record
4. Historical data preserved for audit trail

**API Usage:**
```typescript
// Transfer student
await enrollmentService.updateEnrollment(
  enrollmentId,
  { status: 'TRANSFERRED' },
  context
);

// Create new enrollment in receiving school
await enrollmentService.createEnrollment({
  studentId,
  classId: newClassId,
  academicYearId,
}, context);
```

---

## 2. Student Repeats a Grade

### Scenario
Student fails Grade 9 and must repeat the year.

### Issue
- Must track promotion decision
- Student stays in same grade but different class
- Historical data must remain intact

### Solution ✅

**Schema Support:**
```prisma
model StudentPromotion {
  status → REPEATED
  toGradeLevel → null  // Not promoted to next grade
}
```

**How It Works:**
1. Create promotion record with status `REPEATED`
2. Set `toGradeLevel` to `null` or same grade
3. Next year: new enrollment with same grade level, different class
4. No data corruption because:
   - Enrollments are per academic year
   - Grade is inferred via class relationship
   - Past report cards remain untouched

**Example:**
```typescript
// Create promotion record for repeated student
await prisma.studentPromotion.create({
  data: {
    studentId,
    fromGradeLevel: 'GRADE_9',
    toGradeLevel: null, // or 'GRADE_9'
    academicYear: 2024,
    status: 'REPEATED',
    remarks: 'Student did not meet promotion requirements',
    approvedById: teacherId,
  },
});

// Next year: enroll in Grade 9 again
await enrollmentService.createEnrollment({
  studentId,
  classId: grade9ClassId, // Different class, same grade
  academicYearId: nextYearId,
}, context);
```

---

## 3. Subject Changes Over Years

### Scenario
Ministry of Education (MoE) removes "Social Studies" from Grade 4 curriculum.

### Issue
- Subject no longer taught in current year
- Historical report cards still reference old subject
- Must maintain data integrity for past years

### Solution ✅

**Schema Support:**
```prisma
model GradeSubject {
  gradeId   String
  subjectId String
  isCore    Boolean
  // No deletedAt - use soft delete by removing from GradeSubject
}
```

**How It Works:**
1. Remove subject from `GradeSubject` table for affected grades
2. Subject entity remains in `Subject` table (soft delete with `deletedAt`)
3. Historical data untouched:
   - Past assessments still reference subject
   - Past report cards still show subject marks
4. New academic years won't have this subject in affected grades

**Example:**
```typescript
// Remove Social Studies from Grade 4 (for new academic years)
await prisma.gradeSubject.delete({
  where: {
    gradeId_subjectId: {
      gradeId: grade4Id,
      subjectId: socialStudiesId,
    },
  },
});

// Soft delete subject entirely (if removed from all grades)
await prisma.subject.update({
  where: { id: socialStudiesId },
  data: { deletedAt: new Date() },
});
```

**Historical Integrity:** ✅
- 2023 report cards still show "Social Studies" marks
- 2024 onwards: subject not available for Grade 4
- Perfect for regulatory compliance

---

## 4. Teacher Leaves Mid-Term

### Scenario
Physics teacher resigns in Term 2. Replacement teacher assigned.

### Issue
- Need to track when teacher ended assignment
- New teacher takes over same subject/class
- Historical timetables must remain accurate

### Solution ✅

**Schema Enhancement:**
```prisma
model SubjectTeacherAssignment {
  startedAt  DateTime  @default(now())
  endedAt    DateTime?
  endReason  String?
  // ... other fields
}

model ClassTeacherAssignment {
  startedAt  DateTime  @default(now())
  endedAt    DateTime?
  endReason  String?
  // ... other fields
}
```

**How It Works:**
1. Update current teacher's assignment:
   - Set `endedAt` to resignation date
   - Set `endReason` to "Resigned" or reason
2. Create new assignment for replacement teacher
3. Both assignments exist for same class/subject/year
4. Filter by `endedAt IS NULL` to get current teacher

**Example:**
```typescript
// End current teacher's assignment
await prisma.subjectTeacherAssignment.update({
  where: { id: assignmentId },
  data: {
    endedAt: new Date(),
    endReason: 'Teacher resigned',
  },
});

// Create new assignment for replacement
await prisma.subjectTeacherAssignment.create({
  data: {
    teacherId: newTeacherId,
    subjectId,
    classId,
    academicYearId,
    startedAt: new Date(),
  },
});

// Query current teacher
const currentTeacher = await prisma.subjectTeacherAssignment.findFirst({
  where: {
    classId,
    subjectId,
    academicYearId,
    endedAt: null, // Current assignment
  },
});
```

---

## 5. Double Enrollment Bug

### Scenario
Student accidentally enrolled twice in same academic year due to race condition or user error.

### Issue
- Data integrity violation
- Reporting anomalies
- Student appears in multiple classes

### Solution ✅

**Schema Protection:**
```prisma
model StudentClassEnrollment {
  @@unique([studentId, academicYearId])
}
```

**Service Layer Validation:**
```typescript
// features/enrollments/enrollment.service.ts (line 166-175)
const existingEnrollment = await enrollmentRepository.findByStudentAndYear(
  studentId,
  academicYearId
);

if (existingEnrollment) {
  throw new ConflictError(
    `Student is already enrolled in ${existingEnrollment.class.name} for this academic year`
  );
}
```

**Protection Levels:**
1. **Database:** Unique constraint prevents duplicate records
2. **Service:** Business logic validation with helpful error message
3. **API:** Additional check available via `checkDoubleEnrollment()`

**Result:** ✅ Fully protected - impossible to create double enrollment

---

## 6. Missing Subjects on Report Cards

### Scenario
Subject exists in `GradeSubject` but teacher hasn't entered assessment marks.

### Issue
- Should report card still be generated?
- How to handle `NULL` marks?

### Solution ✅

**Correct Behavior:**
- Report card generated with `NULL` marks for missing subjects
- Shows subject name with empty/dash for marks
- Does not block report card generation

**Schema Support:**
```prisma
model ReportCardSubject {
  catMark   Float?  // Nullable
  midMark   Float?  // Nullable
  eotMark   Float?  // Nullable
  totalMark Float?  // Nullable
  grade     ECZGrade? // Nullable
}
```

**Report Generation Logic:**
```typescript
// When generating report cards:
// 1. Get all subjects for student's grade
const gradeSubjects = await prisma.gradeSubject.findMany({
  where: { gradeId: student.class.gradeId },
});

// 2. For each subject, try to get assessment marks
for (const gradeSubject of gradeSubjects) {
  const marks = await getAssessmentMarks(studentId, subjectId, termId);

  // 3. Create report card subject entry (marks may be NULL)
  await prisma.reportCardSubject.create({
    data: {
      reportCardId,
      subjectId: gradeSubject.subjectId,
      catMark: marks?.cat || null,
      midMark: marks?.mid || null,
      eotMark: marks?.eot || null,
      totalMark: marks?.total || null,
      grade: marks?.grade || null,
    },
  });
}
```

**UI Display:**
```
| Subject    | CAT | MID | EOT | Total | Grade |
|------------|-----|-----|-----|-------|-------|
| Math       | 85  | 78  | 90  | 84.3  | 1     |
| English    | 72  | -   | -   | -     | -     |  ← Missing marks
| Science    | -   | -   | -   | -     | -     |  ← No marks entered
```

---

## 7. Changing Class Mid-Year (Stream Change)

### Scenario
Student moves from Grade 8A → Grade 8B mid-year (e.g., stream change for performance reasons).

### Current Limitation
- One enrollment per academic year (unique constraint)
- Cannot track mid-year class changes

### Solution ✅

**Schema Enhancement:**
```prisma
model StudentClassEnrollment {
  previousClassId String?
  changeReason    String?
  changedAt       DateTime?
  // ... existing fields
}
```

**Service Implementation:**
```typescript
// features/enrollments/enrollment.service.ts (line 395-422)
async updateEnrollment(id: string, data: UpdateEnrollmentInput) {
  // When changing class mid-year
  if (data.classId && data.classId !== existingEnrollment.classId) {
    // Track previous class and reason
    classChangeData = {
      previousClassId: existingEnrollment.classId,
      changedAt: new Date(),
      changeReason: data.notes, // Reason for change
    };
  }

  // Update enrollment with history
  return await enrollmentRepository.update(id, {
    classId: data.classId,
    ...classChangeData,
  });
}
```

**How It Works:**
1. Update `classId` to new class
2. Store previous class in `previousClassId`
3. Record `changedAt` timestamp
4. Store reason in `changeReason`
5. Student remains in same academic year enrollment

**API Usage:**
```typescript
// Move student from 8A to 8B
await enrollmentService.updateEnrollment(
  enrollmentId,
  {
    classId: grade8BClassId,
    notes: 'Moved to advanced stream based on performance',
  },
  context
);
```

**Benefits:**
- ✅ Maintains single enrollment per year
- ✅ Tracks class change history
- ✅ Preserves assessment data from previous class
- ✅ Audit trail for administrative decisions

---

## 8. Attendance Without Enrollment

### Scenario
Teacher attempts to mark attendance for student who is not enrolled in the class.

### Risk
- Data integrity violation
- Reporting errors
- Student appears in wrong class attendance

### Solution ✅

**Service Validation:**
```typescript
// features/enrollments/enrollment.service.ts (line 520-546)
async validateStudentHasActiveEnrollment(
  studentId: string,
  classId: string,
  academicYearId: string
): Promise<void> {
  const enrollment = await enrollmentRepository.findByStudentClassAndYear(
    studentId,
    classId,
    academicYearId
  );

  if (!enrollment) {
    throw new ValidationError(
      "Student is not enrolled in this class for the current academic year"
    );
  }

  if (enrollment.status !== "ACTIVE") {
    throw new ValidationError(
      `Cannot mark attendance: Student enrollment status is ${enrollment.status}`
    );
  }
}
```

**API Layer Usage:**
```typescript
// Before marking attendance
await enrollmentService.validateStudentHasActiveEnrollment(
  studentId,
  classId,
  academicYearId
);

// Only then mark attendance
await prisma.attendanceRecord.create({
  data: { studentId, classId, date, status: 'PRESENT' },
});
```

**Protection:** ✅
- Service-level validation before attendance operations
- Checks both enrollment existence and ACTIVE status
- Prevents orphaned attendance records

---

## 9. Academic Year Closure

### Scenario
School closes 2025 academic year to prevent further modifications.

### Risk
- Data can still be modified after year ends
- Grades changed retrospectively
- Audit trail compromised

### Solution ✅

**Schema Support:**
```prisma
model AcademicYear {
  isClosed Boolean @default(false)
}
```

**Service Layer Protection:**
```typescript
// features/academic-years/academicYear.service.ts

// 1. Validate year is open before operations
async validateYearIsOpen(academicYearId: string) {
  if (academicYear.isClosed) {
    throw new ValidationError(
      `Academic year ${academicYear.year} is closed. No modifications allowed.`
    );
  }
}

// 2. Validate term is open
async validateTermIsOpen(termId: string) {
  if (term.academicYear.isClosed) {
    throw new ValidationError(
      `Academic year ${term.academicYear.year} is closed. Cannot modify term data.`
    );
  }
}

// 3. Check if year can be closed
async canCloseAcademicYear(academicYearId: string) {
  // Validates:
  // - All assessments completed (not DRAFT)
  // - All students have report cards for all terms
  // - No pending operations
}
```

**Blocked Operations When Closed:**
- ❌ Creating/modifying assessments
- ❌ Marking attendance
- ❌ New enrollments
- ❌ Updating student results
- ❌ Modifying report cards
- ❌ Changing class assignments

**Integration Points:**
```typescript
// Enrollment service checks year status
if (existingEnrollment.academicYear.isClosed) {
  throw new ValidationError(
    "Cannot update enrollment in a closed academic year"
  );
}

// Before closing, validate completeness
const canClose = await academicYearService.canCloseAcademicYear(yearId);
if (!canClose.canClose) {
  throw new ValidationError(
    `Cannot close: ${canClose.reasons.join(', ')}`
  );
}
```

**Reopening:**
```typescript
// Can only reopen if no newer active year exists
async canReopenAcademicYear(academicYearId: string) {
  const newerActiveYear = await findActiveYearAfter(year);
  if (newerActiveYear) {
    throw new ValidationError('Cannot reopen: newer year is active');
  }
}
```

**Result:** ✅ Comprehensive year closure with validation and protection

---

## 10. ECZ Grade Mapping

### Subtle Issue
ECZ grade boundaries may change between academic years due to Ministry policy updates.

### Example
**2024:**
- Distinction (Grade 1): 75-100%
- Merit (Grade 2): 60-74%

**2025 (Policy Change):**
- Distinction (Grade 1): 80-100%
- Merit (Grade 2): 65-79%

### Problem
Hard-coded grade boundaries in code become incorrect for historical records.

### Solution ✅

**Schema Support:**
```prisma
model EczGradingScheme {
  academicYear Int
  gradeLevel   GradeLevel
  minMark      Float
  maxMark      Float
  grade        ECZGrade

  @@unique([academicYear, gradeLevel, minMark, maxMark])
}
```

**Service Layer:**
```typescript
// lib/grading/ecz-grading-service.ts

class EczGradingService {
  // Year-aware grade calculation
  async calculateECZGrade(
    percentage: number,
    gradeLevel: PrismaGradeLevel,
    academicYear: number
  ): Promise<ECZGrade> {
    // 1. Check for custom scheme for this year
    const customScheme = await this.getYearSpecificScheme(
      academicYear,
      gradeLevel
    );

    if (customScheme.length > 0) {
      // Use year-specific boundaries
      return this.applyScheme(percentage, customScheme);
    }

    // 2. Fallback to default static grading
    return defaultCalculateECZGrade(percentage, gradeLevel);
  }

  // Admin function to set custom grading for a year
  async upsertGradingScheme(
    academicYear: number,
    gradeLevel: PrismaGradeLevel,
    schemes: Array<{
      minMark: number,
      maxMark: number,
      grade: ECZGrade
    }>
  ) {
    // Validate scheme (no gaps, 0-100 coverage)
    const validation = this.validateScheme(schemes);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Replace existing scheme for this year/grade
    await prisma.eczGradingScheme.deleteMany({
      where: { academicYear, gradeLevel },
    });

    await prisma.eczGradingScheme.createMany({
      data: schemes.map(s => ({
        academicYear,
        gradeLevel,
        ...s,
      })),
    });
  }
}
```

**How It Works:**
1. **Default Behavior:** Uses static grading from `ecz-grading-system.ts`
2. **Custom Override:** Admin can set year-specific boundaries in database
3. **Automatic Selection:** Service checks DB first, falls back to default
4. **Historical Accuracy:** Each year's grades calculated with correct boundaries

**Example Usage:**
```typescript
// Set 2025 grading scheme (Ministry changed boundaries)
await eczGradingService.upsertGradingScheme(
  2025,
  'GRADE_10',
  [
    { minMark: 80, maxMark: 100, grade: 'GRADE_1' }, // Changed from 75
    { minMark: 65, maxMark: 79, grade: 'GRADE_2' },  // Changed from 60
    { minMark: 50, maxMark: 64, grade: 'GRADE_3' },
    // ... rest of scheme
  ]
);

// Calculate grade with year context
const grade2024 = await eczGradingService.calculateECZGrade(
  76, // 76% = Grade 1 under 2024 rules (75+)
  'GRADE_10',
  2024
); // Returns: GRADE_1

const grade2025 = await eczGradingService.calculateECZGrade(
  76, // 76% = Grade 2 under 2025 rules (80+ for Grade 1)
  'GRADE_10',
  2025
); // Returns: GRADE_2
```

**Benefits:**
- ✅ Historical grades remain accurate
- ✅ Adapts to Ministry policy changes
- ✅ No code changes needed for grade boundary updates
- ✅ Audit trail of grading schemes

---

## Summary

| # | Edge Case | Status | Protection Level |
|---|-----------|--------|------------------|
| 1 | Mid-Year Transfers | ✅ | Schema + Service |
| 2 | Student Repeats Grade | ✅ | Schema + Business Logic |
| 3 | Subject Changes Over Years | ✅ | Schema + Historical Integrity |
| 4 | Teacher Leaves Mid-Term | ✅ | Schema Enhancement |
| 5 | Double Enrollment Bug | ✅ | Schema + Service + API |
| 6 | Missing Subjects on Report Cards | ✅ | Correct Design (NULL handling) |
| 7 | Changing Class Mid-Year | ✅ | Schema + Service |
| 8 | Attendance Without Enrollment | ✅ | Service Validation |
| 9 | Academic Year Closure | ✅ | Schema + Service + Multi-layer |
| 10 | ECZ Grade Mapping | ✅ | Schema + Service + Year-aware |

---

## Implementation Checklist

- [x] Schema enhancements for mid-year class changes
- [x] Schema enhancements for teacher assignment history
- [x] Academic year validation service
- [x] Enrollment validation for double enrollment
- [x] Enrollment validation for attendance prerequisites
- [x] Mid-year class change tracking
- [x] Transfer validation
- [x] ECZ grading scheme service with year-specific support
- [x] Academic year closure validation
- [x] Comprehensive edge case documentation

---

## Database Migration Required

To apply schema changes, run:

```bash
npx prisma migrate dev --name add-edge-case-enhancements
npx prisma generate
```

---

## Testing Recommendations

1. **Mid-Year Transfer:** Test enrollment status updates and historical data preservation
2. **Double Enrollment:** Test unique constraint at DB and service levels
3. **Year Closure:** Test blocked operations and validation before closing
4. **Class Change:** Test mid-year class updates with history tracking
5. **ECZ Grading:** Test year-specific grade calculations and fallback behavior

---

## API Integration

Services are ready to use in API routes:

```typescript
import { academicYearService } from '@/features/academic-years/academicYear.service';
import { enrollmentService } from '@/features/enrollments/enrollment.service';
import { eczGradingService } from '@/lib/grading/ecz-grading-service';

// Validate year is open before operations
await academicYearService.validateYearIsOpen(academicYearId);

// Validate enrollment before attendance
await enrollmentService.validateStudentHasActiveEnrollment(
  studentId, classId, academicYearId
);

// Calculate grade with year context
const grade = await eczGradingService.calculateECZGrade(
  percentage, gradeLevel, academicYear
);
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-09
**System:** School Management System v2
