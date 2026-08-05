# Timetable System Implementation Guide

## ✅ Completed

### Repositories
- ✅ `features/timetables/timeSlot.repository.ts`
- ✅ `features/timetables/classTimetable.repository.ts`
- ✅ `features/timetables/secondaryTimetable.repository.ts`
- ✅ `features/timetables/subjectPeriodRequirement.repository.ts`

### Services
- ✅ `features/timetables/timeSlot.service.ts`

### Test Scripts
- ✅ `scripts/test-timeslot-repository.ts`

---

## 📋 TODO: Create Remaining Services

### 1. ClassTimetable Service
**File**: `features/timetables/classTimetable.service.ts`

**Key Business Rules**:
- Validate class belongs to PRIMARY school level (Grades 1-7)
- Prevent double-booking (same class, term, day, timeslot)
- If teacher specified, validate against TeacherSubject
- Support bulk creation for full timetable setup
- Copy timetable from previous term
- Validate against SubjectPeriodRequirement

**Methods**:
```typescript
- createTimetableEntry(data): Promise<ClassTimetable>
- getClassTimetable(classId, termId): Promise<ClassTimetable[]>
- updateTimetableEntry(id, data): Promise<ClassTimetable>
- deleteTimetableEntry(id): Promise<void>
- bulkCreateTimetable(entries): Promise<number>
- copyTimetableFromPreviousTerm(classId, fromTermId, toTermId): Promise<number>
- validateAgainstPeriodRequirements(classId, termId): Promise<ValidationResult>
```

---

### 2. SecondaryTimetable Service
**File**: `features/timetables/secondaryTimetable.service.ts`

**Key Business Rules**:
- ✅ **CRITICAL**: Validate class belongs to SECONDARY school level (Grades 8-12)
- ✅ **CRITICAL**: Validate teacher is assigned to subject via SubjectTeacherAssignment
- ✅ **CRITICAL**: Prevent teacher clash (teacher teaching 2 classes at same time)
- ✅ **CRITICAL**: Prevent class clash (class having 2 subjects at same time)
- Support bulk creation with clash validation
- Teacher workload analysis
- Validate against SubjectPeriodRequirement

**Methods**:
```typescript
- createTimetableEntry(data, context): Promise<SecondaryTimetable>
- getClassTimetable(classId, termId): Promise<SecondaryTimetable[]>
- getTeacherTimetable(teacherId, termId): Promise<SecondaryTimetable[]>
- updateTimetableEntry(id, data, context): Promise<SecondaryTimetable>
- deleteTimetableEntry(id): Promise<void>
- checkTeacherAvailability(teacherId, termId, day, timeSlot): Promise<boolean>
- checkClassAvailability(classId, termId, day, timeSlot): Promise<boolean>
- bulkCreateWithValidation(entries, context): Promise<CreateResult>
- getTeacherWorkload(teacherId, termId): Promise<WorkloadStats>
- detectClashes(termId): Promise<Clash[]>
- validateAgainstPeriodRequirements(classId, termId): Promise<ValidationResult>
```

---

### 3. SubjectPeriodRequirement Service
**File**: `features/timetables/subjectPeriodRequirement.service.ts`

**Key Business Rules**:
- Validate periodsPerWeek is between 1 and 40 (max school week)
- Ensure total periods for grade don't exceed available time slots
- Prevent deletion if requirement is used in validation
- Support bulk setup for entire grade

**Methods**:
```typescript
- createRequirement(data, context): Promise<SubjectPeriodRequirement>
- getGradeRequirements(gradeId): Promise<SubjectPeriodRequirement[]>
- updateRequirement(id, data, context): Promise<SubjectPeriodRequirement>
- deleteRequirement(id, context): Promise<void>
- bulkCreateForGrade(gradeId, requirements, context): Promise<number>
- getTotalPeriodsForGrade(gradeId): Promise<number>
- validateTimetableCompliance(classId, termId, isPrimary): Promise<ValidationReport>
```

---

## 📋 TODO: Create Test Scripts

### Repository Tests

#### 1. ClassTimetable Repository Test
**File**: `scripts/test-classtimetable-repository.ts`

**Test Cases**:
- ✅ Create timetable entry for primary class
- ✅ Find timetable by class and term
- ✅ Find timetable for specific day
- ✅ Update timetable entry
- ✅ Delete timetable entry
- ✅ Bulk create multiple entries
- ✅ Copy timetable to another term
- ✅ Count entries
- ✅ Duplicate prevention (same class, term, day, timeslot)

#### 2. SecondaryTimetable Repository Test
**File**: `scripts/test-secondarytimetable-repository.ts`

**Test Cases**:
- ✅ Create timetable entry for secondary class
- ✅ Find timetable by class and term
- ✅ Find teacher's timetable
- ✅ Check teacher availability
- ✅ Check class availability
- ✅ Update timetable entry
- ✅ Delete timetable entry
- ✅ Get teacher workload statistics
- ✅ Bulk create entries
- ✅ Teacher clash prevention
- ✅ Class clash prevention

#### 3. SubjectPeriodRequirement Repository Test
**File**: `scripts/test-subjectperiodrequirement-repository.ts`

**Test Cases**:
- ✅ Create period requirement
- ✅ Find requirements by grade
- ✅ Find specific grade-subject requirement
- ✅ Update requirement
- ✅ Delete requirement
- ✅ Bulk create for grade
- ✅ Get total periods for grade
- ✅ Validate timetable against requirements
- ✅ Duplicate prevention (same grade, subject)

---

### Service Tests

#### 1. TimeSlot Service Test
**File**: `scripts/test-timeslot-service.ts`

**Test Cases**:
- ✅ Create with valid time format
- ✅ Reject invalid time format
- ✅ Reject end time before start time
- ✅ Prevent duplicate time slots
- ✅ Update time slot
- ✅ Delete unused time slot
- ✅ Prevent deletion of time slot in use
- ✅ Validate label length

#### 2. ClassTimetable Service Test
**File**: `scripts/test-classtimetable-service.ts`

**Test Cases**:
- ✅ Create entry for primary class
- ✅ Reject entry for secondary class
- ✅ Prevent double booking
- ✅ Validate teacher subject qualification
- ✅ Bulk create with validation
- ✅ Copy from previous term
- ✅ Validate against period requirements
- ✅ Authorization checks (ADMIN, HEAD_TEACHER can create)

#### 3. SecondaryTimetable Service Test
**File**: `scripts/test-secondarytimetable-service.ts`

**Test Cases**:
- ✅ Create entry for secondary class
- ✅ Reject entry for primary class
- ✅ Validate teacher has SubjectTeacherAssignment
- ✅ Prevent teacher clash
- ✅ Prevent class clash
- ✅ Bulk create with full validation
- ✅ Get teacher workload
- ✅ Detect existing clashes
- ✅ Validate against period requirements
- ✅ Authorization checks

#### 4. SubjectPeriodRequirement Service Test
**File**: `scripts/test-subjectperiodrequirement-service.ts`

**Test Cases**:
- ✅ Create requirement
- ✅ Validate periodsPerWeek range
- ✅ Validate total doesn't exceed available slots
- ✅ Update requirement
- ✅ Bulk create for grade
- ✅ Validate timetable compliance
- ✅ Authorization checks

---

## 🔧 Running Tests

```bash
# Repository tests
npm run test:timeslot:repo
npm run test:classtimetable:repo
npm run test:secondarytimetable:repo
npm run test:periodrequirement:repo

# Service tests
npm run test:timeslot:service
npm run test:classtimetable:service
npm run test:secondarytimetable:service
npm run test:periodrequirement:service
```

Add these to `package.json`:
```json
{
  "scripts": {
    "test:timeslot:repo": "npx tsx scripts/test-timeslot-repository.ts",
    "test:classtimetable:repo": "npx tsx scripts/test-classtimetable-repository.ts",
    "test:secondarytimetable:repo": "npx tsx scripts/test-secondarytimetable-repository.ts",
    "test:periodrequirement:repo": "npx tsx scripts/test-subjectperiodrequirement-repository.ts",
    "test:timeslot:service": "npx tsx scripts/test-timeslot-service.ts",
    "test:classtimetable:service": "npx tsx scripts/test-classtimetable-service.ts",
    "test:secondarytimetable:service": "npx tsx scripts/test-secondarytimetable-service.ts",
    "test:periodrequirement:service": "npx tsx scripts/test-subjectperiodrequirement-service.ts"
  }
}
```

---

## 📝 Implementation Priority

1. **HIGH PRIORITY** - Complete services (needed for API endpoints):
   - SecondaryTimetable Service (most critical - clash prevention)
   - ClassTimetable Service
   - SubjectPeriodRequirement Service

2. **MEDIUM PRIORITY** - Create repository tests:
   - Test all CRUD operations
   - Verify constraints work correctly

3. **LOW PRIORITY** - Create service tests:
   - Test business logic
   - Test authorization
   - Integration testing

---

## 🎯 Critical Validation Rules

### For SecondaryTimetable (MOST IMPORTANT)

```typescript
// 1. School Level Check
const class = await classRepository.findById(classId);
if (class.grade.schoolLevel !== "SECONDARY") {
  throw new ValidationError("Only secondary classes allowed");
}

// 2. Teacher Assignment Check
const assignment = await prisma.subjectTeacherAssignment.findFirst({
  where: {
    teacherId: data.teacherId,
    subjectId: data.subjectId,
    classId: data.classId,
    academicYearId: data.academicYearId,
  }
});
if (!assignment) {
  throw new ValidationError("Teacher not assigned to teach this subject to this class");
}

// 3. Database handles clash prevention via unique constraints
// - classId_termId_dayOfWeek_timeSlotId (class clash)
// - teacherId_termId_dayOfWeek_timeSlotId (teacher clash)
```

### For ClassTimetable

```typescript
// School Level Check
const class = await classRepository.findById(classId);
if (class.grade.schoolLevel !== "PRIMARY") {
  throw new ValidationError("Only primary classes allowed");
}

// Optional Teacher Validation
if (data.teacherId) {
  const assignment = await prisma.teacherSubject.findFirst({
    where: {
      teacherId: data.teacherId,
      subjectId: data.subjectId,
    }
  });
  if (!assignment) {
    throw new ValidationError("Teacher not qualified for this subject");
  }
}
```

---

## ✅ Summary

**Completed**:
- 4 repositories
- 1 service
- 1 test script

**Remaining**:
- 3 services
- 7 test scripts

The foundation is solid. Follow the patterns in `timeSlot.service.ts` and `test-timeslot-repository.ts` for the remaining implementations.
