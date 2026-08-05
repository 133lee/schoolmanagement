Complete Mental Model: Admin Module
Executive Summary
The Admin module is the authoritative source for all organizational structure, configuration, and core entity management in the school management system. It owns the creation, mutation, and lifecycle of foundational entities that other modules consume as read-only or constrained-write data.

1️⃣ Admin's Authority Matrix
What Admin Can Do
Action Entity Authoritative Reversible Cascading Effects
CREATE Academic Year ✅ Yes ❌ No (can close) All time-scoped entities reference it
CREATE Term ✅ Yes ❌ No (can deactivate) Timetables, assessments, attendance
CREATE Grade Level ✅ Yes ❌ No (archived state) Classes, enrollments, curricula
CREATE Class ✅ Yes ⚠️ Partial (can archive) Enrollments, assignments, timetables
CREATE Subject ✅ Yes ❌ No (can deactivate) Assignments, assessments, timetables
CREATE Teacher Profile ✅ Yes ⚠️ Partial (can set INACTIVE) All assignments, assessments, timetables
CREATE Student Profile ✅ Yes ⚠️ Partial (can withdraw) Enrollments, attendance, grades
CREATE Department ✅ Yes ❌ No (can deactivate) Subject grouping, HOD assignment
UPDATE Class capacity ✅ Yes ✅ Yes Enrollment validation
UPDATE Teacher status ✅ Yes ✅ Yes Assignment visibility, permissions
UPDATE Student status ✅ Yes ✅ Yes Enrollment, attendance, grading
ASSIGN Class Teacher ✅ Yes ✅ Yes PRIMARY grades: auto-assigns all subjects
ASSIGN Subject Teacher ✅ Yes ✅ Yes Timetable, assessments, gradebook access
ASSIGN HOD to Department ✅ Yes ✅ Yes HOD permissions, department scope
ASSIGN Student to Class ✅ Yes ✅ Yes Attendance, grading, report cards
REMOVE Class Teacher ✅ Yes ✅ Yes PRIMARY grades: removes all subject assignments
REMOVE Subject Teacher ✅ Yes ⚠️ Check references May block if used in timetable/assessments
REMOVE Student Enrollment ✅ Yes ✅ Yes Historical data preserved
CLOSE Academic Year ✅ Yes ❌ No Prevents new assignments, modifications
CLOSE Term ✅ Yes ✅ Yes Freezes term-specific data entry
DEACTIVATE Subject ✅ Yes ✅ Yes Hides from assignment creation
Authority Notes
Authoritative: Admin has final say on creation/mutation
Reversible: Action can be undone without data loss
Cascading: Action triggers automatic changes in related entities
2️⃣ Admin-Owned Entities
Full Ownership (CRUD)
Entity Admin Teacher HOD Parent Student
Academic Year CREATE, UPDATE, CLOSE READ READ READ -
Term CREATE, UPDATE, ACTIVATE READ READ READ -
Grade Level CREATE, UPDATE, ARCHIVE READ READ READ -
Class CREATE, UPDATE, ARCHIVE READ READ READ -
Subject CREATE, UPDATE, DEACTIVATE READ READ READ -
Department CREATE, UPDATE, DEACTIVATE READ READ - -
Teacher Profile CREATE, UPDATE, STATUS READ (own) READ (dept) - -
Student Profile CREATE, UPDATE, STATUS READ (assigned) READ (dept) READ (own child) READ (own)
Grade Subject CREATE, DELETE READ READ - -
Class Teacher Assignment CREATE, DELETE READ READ - -
Subject Teacher Assignment CREATE, UPDATE, DELETE READ (own) CREATE, UPDATE, DELETE (dept, secondary) - -
Student Enrollment CREATE, UPDATE, DELETE READ (assigned) READ (dept) READ -
User Accounts CREATE, UPDATE, RESET_PASSWORD READ (own) READ (own) READ (own) READ (own)
Derived/Computed Data (Admin doesn't own)
Entity Owner Admin Role
Attendance Records Teacher READ, REPORT
Assessment Results Teacher READ, REPORT
Report Cards Teacher (draft) → Admin (approve) APPROVE, PUBLISH
Timetable Slots Admin/Teacher CREATE (framework), Teacher (populate)
Class.currentEnrolled System (computed) -
Teacher Workload System (computed from assignments) READ
3️⃣ Admin Data Flow Maps
Flow 1: Class Creation & Setup
User Action: Admin creates "Form 3A" class

Data Flow (Bottom → Top):

1. Prisma Models Involved:

   - Class (created)
   - Grade (referenced via gradeId)
   - AcademicYear (referenced via academicYearId)

2. Repository Layer:
   classRepository.create({
   name: "Form 3A",
   gradeId: "grade-10-id",
   academicYearId: "2024-id",
   capacity: 40,
   currentEnrolled: 0, // ⚠️ NEVER UPDATED BY ADMIN (system-computed)
   status: ClassStatus.ACTIVE
   })

3. Service Layer Invariants:

   - Grade must exist
   - Academic year must exist and be active
   - Class name must be unique within grade+year
   - Capacity > 0

4. API Contract:
   POST /api/classes
   Request: { name, gradeId, academicYearId, capacity }
   Response: { success: true, data: { id, name, grade{}, ... } }

5. UI Expectations:
   - Classes table shows new row
   - "Manage Assignments" button visible if grade is secondary
   - currentEnrolled shows "0/40" until students enrolled
     Authoritative Data: Class record

Derived Data: currentEnrolled (computed from StudentClassEnrollment.count())

Flow 2: Class Teacher Assignment (PRIMARY GRADE)
User Action: Admin assigns John Smith as class teacher to "Grade 3 Blue"

Data Flow:

1. Prisma Models:

   - ClassTeacherAssignment (created)
   - SubjectTeacherAssignment[] (created automatically)
   - TeacherProfile (referenced)
   - Class (referenced)
   - GradeSubject[] (queried for all subjects)

2. Repository:
   classRepository.assignClassTeacher(classId, teacherId, yearId)
   ├─ Delete existing ClassTeacherAssignment (if any)
   ├─ Create new ClassTeacherAssignment
   └─ IF isPrimaryGrade(class.grade.level):
   └─ classRepository.assignTeacherToAllSubjects()
   ├─ Fetch all GradeSubject for this grade
   └─ Create SubjectTeacherAssignment for each subject

3. Service Invariants:

   - Teacher cannot be assigned to multiple classes in same year (HARD)
   - Class cannot be archived
   - Academic year cannot be closed
   - PRIMARY RULE: Grade 1-7 → auto-assign all subjects
   - SECONDARY RULE: Grade 8-12 → no auto-assignment

4. API Contract:
   POST /api/classes/[id]/class-teacher
   Request: { teacherId }
   Response: { success: true, message: "..." }

5. UI Expectations:
   - Class teacher name updates in class table
   - IF PRIMARY: Subject assignments auto-populate (Teacher module sees them)
   - IF SECONDARY: Subject assignments remain empty (HOD/Admin must assign)
     Cascading Effect: PRIMARY grades get 5-8 SubjectTeacherAssignment records created automatically

Flow 3: Subject Teacher Assignment (SECONDARY GRADE)
User Action: Admin assigns Sarah Johnson to teach Mathematics to Form 4A

Data Flow:

1. Prisma Models:

   - SubjectTeacherAssignment (created)
   - TeacherProfile (referenced)
   - Subject (referenced)
   - Class (referenced)
   - TeacherSubject (queried for qualification check)
   - GradeSubject (queried for curriculum check)

2. Repository:
   subjectTeacherAssignmentRepository.create({
   teacherId,
   subjectId,
   classId,
   academicYearId
   })

3. Service Validations:

   - Teacher qualified? (TeacherSubject exists)
   - Subject in curriculum? (GradeSubject exists)
   - No duplicate? (unique constraint)
   - Academic year not closed? (academicYear.isClosed === false)
   - Class is secondary? (ADMIN: all grades, HOD: only 8-12)

4. API Contract:
   POST /api/assignments (Admin)
   POST /api/hod/assignments (HOD - dept scoped)
   Request: { teacherId, subjectId, classId, academicYearId }
   Response: { success: true, data: Assignment }

5. UI Expectations:
   - Assignment appears in assignments table
   - Teacher sees class in their dashboard
   - HOD sees assignment in dept assignments (if dept subject)
     Cross-Module Impact:

Teacher Module: New class appears in teacher's class list, timetable, assessment tools
HOD Module: Assignment visible if subject in department
Flow 4: Student Enrollment
User Action: Admin enrolls 35 students into "Form 1A"

Data Flow:

1. Prisma Models:

   - StudentClassEnrollment[] (created)
   - Student (referenced)
   - Class (referenced)
   - AcademicYear (referenced)

2. Repository:
   enrollmentRepository.bulkEnroll(studentIds, classId, yearId)

3. Service Invariants:

   - Students exist and are ACTIVE
   - Class not at capacity (currentEnrolled + newCount <= capacity)
   - No duplicate enrollments (unique: studentId + classId + yearId)
   - Academic year must be active

4. API Contract:
   POST /api/enrollments/bulk
   Request: { classId, academicYearId, studentIds: [] }
   Response: { success: true, data: { successful: 35, failed: [] } }

5. Computed Update:
   - Class.currentEnrolled NOT updated by Admin
   - System computes: StudentClassEnrollment.count({ classId, yearId })
   - Teacher/HOD queries fetch real-time count
     Derived Data Impact: Class.currentEnrolled field exists but never updated by Admin. Always computed on read.

Flow 5: Academic Year Closure
User Action: Admin closes "2024" academic year

Data Flow:

1. Prisma Models:

   - AcademicYear (updated: isClosed = true)

2. Repository:
   academicYearRepository.close(yearId)

3. Service Effects:

   - All assignments in this year become read-only
   - Cannot create new:
     - ClassTeacherAssignment
     - SubjectTeacherAssignment
     - StudentEnrollment
     - Timetable changes
   - Existing data remains accessible

4. API Contract:
   PATCH /api/academic-years/[id]/close
   Response: { success: true }

5. UI Expectations:
   - Year shows as "Closed" in admin dashboard
   - Assignment creation dialogs should hide closed years
   - Teacher/HOD cannot modify assignments in closed year
     Cross-Module Impact:

Teacher: Read-only access to closed year data
HOD: Cannot manage assignments in closed year
Reports: Historical data frozen, safe for archival
Flow 6: Admin Dashboard Counts
User Action: Admin views dashboard

Data Flow:

1. Queries (ALL computed, NOT stored):

   - Total Classes: Class.count({ academicYearId: active })
   - Total Teachers: TeacherProfile.count({ status: ACTIVE })
   - Total Students: Student.count({ status: ACTIVE })
   - Active Enrollments: StudentClassEnrollment.count({ yearId: active })

2. API Contract:
   GET /api/admin/dashboard
   Response: {
   success: true,
   data: {
   totalClasses: 45,
   totalTeachers: 120,
   totalStudents: 1800,
   activeEnrollments: 1750,
   // ... more stats
   }
   }

3. UI Rendering:
   - Cards with large numbers
   - "Quick Stats" section
   - Links to detail pages
     All dashboard stats are COMPUTED - no stored aggregates

4️⃣ Admin Invariants
HARD Invariants (Must Never Violate)

# Invariant Enforced By Impact if Violated

1 A Class MUST belong to exactly one Grade and one Academic Year Prisma schema (required FK) Database constraint error
2 A Class can have AT MOST one Class Teacher per Academic Year Unique constraint: (classId + academicYearId) 409 Conflict error
3 A Subject Teacher Assignment is unique per (teacher + subject + class + year) Unique constraint 409 Conflict error
4 A Student can be enrolled in AT MOST one class per Academic Year (per school level) Business logic check 400 Validation error
5 Teacher MUST be qualified (TeacherSubject exists) to be assigned Service validation 422 Unprocessable Entity
6 Subject MUST be in Grade curriculum (GradeSubject exists) to be assigned Service validation 422 Unprocessable Entity
7 Cannot modify assignments in CLOSED Academic Year Service validation 422 Unprocessable Entity
8 Cannot delete assignment if referenced by Timetable or Assessment Prisma FK constraint 500 Foreign key error
SOFT Invariants (Business Rules, Changeable)

# Invariant Current Rule Alternative Options

1 Class capacity must be > 0 Enforced Could allow unlimited (capacity = null)
2 PRIMARY grades (1-7) auto-assign all subjects when class teacher assigned Enforced Could make manual for all grades
3 SECONDARY grades (8-12) require manual subject assignments Enforced Could auto-assign based on teacher's subjects
4 HOD can only manage secondary grades (8-12) Enforced Could extend to all grades
5 HOD can only assign teachers from own department Enforced Could allow cross-department with approval
6 Only one active Academic Year at a time Not enforced Could support overlapping years
7 Student enrollment requires manual selection Enforced Could auto-enroll based on rules
5️⃣ Valid Empty States
Legitimate Empty States (NOT Bugs)
Entity Empty Condition Why Valid User Expectation
Class Assignments New academic year, no assignments yet Admin hasn't assigned teachers "No assignments" message
Class Students Class exists but currentEnrolled = 0 Students not enrolled yet "0/40 students" display
Teacher Classes Teacher profile exists but no assignments Not assigned to any class yet Empty state card
HOD Assignments HOD dashboard shows no assignments Department subjects not assigned OR no secondary classes Filtered empty state
Subject Teachers Subject exists but no teacher assigned Coverage gap, waiting for assignment "Not Assigned" badge
Grade Subjects New grade created, no curriculum defined Admin hasn't added subjects to curriculum Empty curriculum message
Department Teachers Department exists, no teachers New department OR teachers not linked "No teachers in department"
Class Teacher Secondary class with no class teacher Optional for secondary grades "Not assigned" text
Empty State vs. Bug Decision Tree

Is data missing?
├─ YES
│ ├─ Is user expecting to see data here?
│ │ ├─ YES
│ │ │ ├─ Did Admin/Teacher perform action that should populate it?
│ │ │ │ ├─ YES → BUG (action didn't work)
│ │ │ │ └─ NO → VALID EMPTY STATE (action not done yet)
│ │ │ └─ NO → VALID EMPTY STATE (initial setup)
│ │ └─ NO → VALID EMPTY STATE
│ └─ NO → Not applicable
└─ NO → Working correctly
6️⃣ Cross-Module Impact Map
Admin Action → Teacher Module Impact
Admin Action Teacher Module Effect Refetch Required? UI Update
Assign Subject Teacher Class appears in teacher dashboard ✅ Yes (on teacher login) Shows in "My Classes"
Remove Subject Teacher Class disappears from teacher view ✅ Yes Removed from list
Assign Class Teacher (PRIMARY) All subjects assigned automatically ✅ Yes Multiple classes appear
Close Academic Year Year becomes read-only ✅ Yes Assignments grayed out
Create Term New term available for timetable/attendance ✅ Yes Term selector updates
Deactivate Subject Subject hidden from creation but existing visible ❌ No Existing data unaffected
Enroll Students Student count updates in class view ✅ Yes (or computed on load) "25/40 students" updates
Withdraw Student Student disappears from class roster ✅ Yes Removed from attendance lists
Admin Action → HOD Module Impact
Admin Action HOD Module Effect Refetch Required? Scope Filter
Assign Subject (Dept Subject) Assignment appears in HOD view ✅ Yes Only if subject in HOD dept
Assign Subject (Other Dept) No effect on HOD ❌ No Filtered out by departmentId
Assign Teacher (Dept Teacher) Assignment appears if secondary class ✅ Yes Subject must be in dept
Change HOD Access rights change immediately ✅ Yes (logout/login) New HOD gets dept scope
Deactivate Department HOD loses access ✅ Yes Dashboard shows empty/error
Create Secondary Class Class available for assignment ✅ Yes Appears in class list
Create Primary Class Class NOT available for assignment ❌ No Filtered out (grade restriction)
Admin Action → Parent Module Impact
Admin Action Parent Effect Refetch Required?
Enroll Child Child's class, teachers visible ✅ Yes
Publish Report Card Report card appears in parent view ✅ Yes
Change Class Teacher Updated teacher name ✅ Yes (or on next login)
Withdraw Child Child removed from class ✅ Yes
7️⃣ Failure Classification Rules
Rule 1: "Missing Data" Classification

IF: User sees empty table/list
THEN: Check

1. Did Admin perform CREATE action?
   → NO: VALID EMPTY STATE
   → YES: Check step 2

2. Did API return success=true?
   → NO: BUG (API failed)
   → YES: Check step 3

3. Does database contain records?
   → NO: BUG (data not saved)
   → YES: Check step 4

4. Is query filtering correctly?
   → NO: BUG (wrong filter/scope)
   → YES: Check step 5

5. Is UI rendering response?
   → NO: BUG (UI not reading data)
   → YES: CONTRACT MISMATCH (data structure changed)
   Rule 2: "Count Mismatch" Classification

IF: Admin sees "0/40 students" but students are enrolled
THEN: Check

1. Is count computed or stored?
   → COMPUTED: Check query
   → STORED: Check update trigger

2. Is query scoped correctly?
   → Check academicYearId filter
   → Check status filter (ACTIVE vs ALL)

3. Is database consistent?
   → Run manual count query
   → Compare with displayed value
   Rule 3: "Assignment Not Showing" Classification

IF: Teacher says "I don't see my class" after Admin assigns
THEN: Check

1. Did Admin use correct Academic Year?
   → Teacher dashboard might filter to different year

2. Is assignment for correct teacher?
   → Check teacherId matches

3. Is class archived?
   → Archived classes may be hidden

4. Did teacher refresh/re-login?
   → Teacher dashboard caches on mount

5. Is grade level correct?
   → HOD: Only sees secondary (8-12)
   → Teacher: Sees all assigned
   Rule 4: "Action Rejected" Classification

IF: Admin action returns 422 Unprocessable Entity
THEN: VALID REJECTION (invariant violation)

- Check error message for specific invariant
- Not a bug, user needs different action

IF: Admin action returns 409 Conflict
THEN: VALID REJECTION (duplicate)

- Check unique constraints
- Not a bug, record already exists

IF: Admin action returns 403 Forbidden
THEN: VALID REJECTION (authorization)

- Check user role and permissions
- Not a bug, user lacks authority

IF: Admin action returns 500 Internal Error
THEN: BUG

- Check server logs for exception
- Database constraint or code error
  What This Module Guarantees
  Core Guarantees
  Data Integrity: All foreign key relationships are valid. No orphaned records.

Unique Constraints: No duplicate class teachers per year, no duplicate subject assignments.

Cascading Behavior: PRIMARY grade class teacher assignment automatically creates subject assignments.

Computed Accuracy: currentEnrolled is always computed fresh from StudentClassEnrollment table, never stale.

Authorization Enforcement: Role-based access enforced at service layer, not just UI.

Audit Trail: All Admin actions logged (via createdAt/updatedAt timestamps minimum).

Referential Integrity: Cannot delete entities that are referenced (enforced by Prisma).

Academic Year Isolation: Closed academic years are immutable.

Non-Guarantees (Out of Scope)
Real-time Updates: Admin changes don't push to other users' browsers automatically (requires refresh).

Optimistic UI: Admin UI doesn't update before API confirmation (blocking operations).

Undo History: No built-in undo for destructive actions (delete is permanent).

Data Migration: Moving students between classes requires manual re-enrollment.

Conflict Resolution: Last-write-wins for concurrent edits (no locking).

Ambiguities & Assumptions
Flagged Ambiguities
Class.currentEnrolled Field:

Schema has field but it's NEVER updated
Services always compute from StudentClassEnrollment.count()
ASSUMPTION: This field is vestigial, should be removed or deprecated
RISK: If any code writes to it, will create sync issues
Academic Year Overlaps:

No constraint preventing multiple isActive=true years
ASSUMPTION: Only one active year enforced by business logic
RISK: UI might break if multiple active years exist
HOD Assignment:

Recent refactor removed HOD from Role enum
HOD now linked via Department.hodTeacherId
ASSUMPTION: One HOD per department
RISK: If teacher is HOD of multiple departments, unclear behavior
Assignment Deletion Safety:

Service has TODO comment: "Check if used in timetable or assessments"
Currently relies on Prisma FK constraint
ASSUMPTION: Prisma will prevent bad deletes
RISK: Error message to user might be unclear
Student Enrollment Uniqueness:

Unique constraint is (studentId + classId + academicYearId)
ASSUMPTION: Student can't be in multiple classes same year
QUESTION: What about students taking multiple streams/tracks?
Teacher Qualification Check:

Service checks TeacherSubject exists before assignment
ASSUMPTION: All teachers have TeacherSubject records created
RISK: If admin forgets to add qualification, can't assign
Summary Table: Admin Module Contract
Aspect Contract
Authoritative For Academic structure, user profiles, organizational config
Computed Data Class enrollment counts, teacher workload, dashboard stats
Cascading Actions PRIMARY class teacher → auto-assign subjects
Immutable After Academic year closure, record deletion (no undo)
Cross-Module Protocol Other modules refetch on login or explicit refresh
Empty State Legitimacy New entities, unassigned resources, filtered views
Error Boundaries 422 = invariant violation (valid), 500 = bug (invalid)
Non-Real-Time Changes don't push to other users, requires refetch
