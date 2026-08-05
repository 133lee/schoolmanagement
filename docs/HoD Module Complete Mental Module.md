HOD (Head of Department) Module - Complete Mental Model
Executive Summary
The HOD module is a position-based authorization system (not role-based) that manages departmental operations for secondary grades (8-12). The critical architectural principle: HOD is a POSITION derived from Department.hodTeacherId, NEVER a role.

1. Module Structure
   File Organization:

API Routes: 15 endpoints in app/api/hod/
Frontend Pages: 9 pages in app/(dashboard)/hod/
Services: features/hod/hod.service.ts
Auth Helpers: lib/auth/position-helpers.ts
Hooks: 4 custom hooks in hooks/
Components: components/dashboard/hod-sidebar.tsx 2. Database Architecture
Core HOD Relationship

model Department {
hodTeacherId String? @unique // SINGLE SOURCE OF TRUTH
hodTeacher TeacherProfile? @relation("DepartmentHOD")
subjects Subject[]
teachers TeacherDepartment[]
}

model TeacherProfile {
departmentAsHOD Department? @relation("DepartmentHOD") // One-to-one
departments TeacherDepartment[] // Many-to-many
}
Critical Constraints:

hodTeacherId is UNIQUE (one teacher = one department HOD position max)
Position is OPTIONAL (departments may not have an HOD)
Position is SEPARATE from role (TEACHER role can have HOD position) 3. API Endpoints (15 Total)
Endpoint Method Purpose Scoping
/api/hod/dashboard GET Dashboard metrics & analytics Department subjects/teachers
/api/hod/profile GET HOD profile & department info Own department
/api/hod/teachers GET List department teachers Department teachers only
/api/hod/subjects GET List department subjects Department subjects only
/api/hod/assignments GET/POST Manage assignments Dept subjects, grades 8-12
/api/hod/assignments/[id] GET/PATCH/DELETE Single assignment CRUD Ownership check
/api/hod/assignments/bulk POST Bulk create assignments Dept validation
/api/hod/assignments/by-teacher/[id] GET Filter by teacher Dept scope
/api/hod/assignments/by-subject/[id] GET Filter by subject Dept scope
/api/hod/assignments/by-class/[id] GET Filter by class Dept scope
/api/hod/reports/\* GET Various reporting endpoints Dept/grade scoped
All endpoints use withHODAccess() middleware for position-based auth.

4. Frontend Pages (9 Total)
   Dashboard (/hod) - Performance metrics, stats, department overview
   Profile (/hod/profile) - Account & department info
   Teachers (/hod/teachers) - View-only teacher list
   Subjects (/hod/subjects) - Department subjects
   Classes (/hod/classes) - All classes with assignment management
   Class Assignments (/hod/classes/[id]/assignments) - Manage subject-teacher assignments
   Students (/hod/students) - Student view
   Reports (/hod/reports) - Performance analytics & reporting
5. Authorization Architecture (CRITICAL)
   Position vs Role
   Aspect Role Position
   Definition System-wide authority Departmental assignment
   Persistence Permanent Mutable/reassignable
   Scope Global Department-specific
   Check Method user.role === "ADMIN" await getHODDepartment(userId)
   Stored In User.role enum Department.hodTeacherId FK
   Position Helpers (Single Source of Truth)

// Get department where user is HOD (null if not HOD)
getHODDepartment(userId: string): Promise<Department | null>

// Check if user is HOD of specific department
isHODOfDepartment(userId: string, departmentId: string): Promise<boolean>

// Check if user is HOD of any department
isHOD(userId: string): Promise<boolean>

// Throw if not HOD of department
requireHODOfDepartment(userId: string, departmentId: string): Promise<void>
Middleware Pattern

export const GET = withHODAccess(async (request: NextRequest, user) => {
// Position already verified by middleware
const dept = await getHODDepartment(user.userId);
// dept is guaranteed to exist
});
CRITICAL: No long-term caching of HOD status. Position can change independently of login sessions.

6. What HOD Owns vs Depends On
   Ownership Matrix
   Resource Create Read Update Delete Scope
   Department ❌ ✅ ❌ ❌ Own only
   Teachers ❌ ✅ ❌ ❌ Dept members
   Subjects ❌ ✅ ❌ ❌ Dept subjects
   Classes ❌ ✅ ❌ ❌ All classes
   SubjectTeacherAssignment ✅ ✅ ✅ ✅ Dept subjects, grades 8-12
   Assessments ❌ ✅ ❌ ❌ Dept subjects
   Performance Analytics ❌ ✅ ❌ ❌ Classes with dept subjects
   Dependencies
   HOD Module Depends On:

Department - Core HOD position
TeacherProfile - HOD must have teacher profile
User - Authentication
Subject - Department subjects
Class - Assignment targets
TeacherDepartment - Department membership
SubjectTeacherAssignment - Primary management target
Assessment - Performance analytics
StudentAssessmentResult - Performance calculations
No Reverse Dependencies - HOD is a consumer, not a provider

7. Business Logic & Validation
   Assignment Creation Validation Flow
   Subject Department Check: Subject must belong to HOD's department
   Teacher Department Check: Teacher must be member of HOD's department
   Secondary Grade Check: Class must be grades 8-12 (GRADE_8 through GRADE_12)
   Teacher Qualification: Teacher must have TeacherSubject for the subject
   Grade-Subject Check: GradeSubject must exist for class's grade
   Academic Year: Must be active (not closed)
   No Duplicates: No existing assignment for same teacher/subject/class/year
   Secondary Grades Enforcement

const SECONDARY_GRADES = ['GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'];
Why: HOD only manages secondary grades. Primary grades (1-7) use different management model.

8. Data Flow Patterns
   Dashboard Data Aggregation

JWT Auth → Position Check → getHODDepartment(userId)
↓
Parallel Queries:
├─ Department details (subjects, teachers)
├─ Active academic year & term
├─ Subject-teacher assignments
├─ Student enrollments
├─ Assessments & results
└─ Performance calculations
↓
Aggregate & Return:
├─ Performance metrics (avg, pass rate, best/worst subjects)
├─ Department stats (subjects, teachers, students, classes)
└─ Lists (subjects, teachers)
Assignment Creation Flow

POST /api/hod/assignments
↓
withHODAccess → getHODDepartment(userId)
↓
Validations (any fail → throw error):
├─ validateSubjectDepartment
├─ validateTeacherDepartment
├─ validateSecondaryGrade
├─ validateTeacherQualification
├─ validateGradeSubject
├─ Academic year active?
└─ No duplicate?
↓
Create SubjectTeacherAssignment
↓
Return with relations 9. Key Constraints & Limitations
HOD CANNOT:
Create/edit/delete teachers (Admin/Head Teacher only)
Create/edit/delete subjects (Admin/leadership only)
Create/edit/delete classes (Admin/leadership only)
Create/edit/delete departments (Admin only)
Assign teachers to departments (Admin/Head Teacher only)
Create/edit assessments (Teacher who owns assignment)
Enter grades/results (Teacher who owns assignment)
View data outside their department (except classes for assignment purposes)
Manage primary grades 1-7 (secondary grades 8-12 only)
HOD CAN:
View all teachers/subjects in their department
Create/edit/delete subject-teacher assignments (secondary grades, dept subjects)
View performance analytics for classes with department subjects
View all classes (for assignment management)
Generate reports for department subjects 10. Critical Implementation Details
No Caching Strategy

// ❌ BAD - Don't cache HOD status
const cachedStatus = cache.get(`hod:${userId}`);

// ✅ GOOD - Always fetch fresh
const dept = await getHODDepartment(userId);
Reason: Admin can reassign HOD position anytime. Change must be immediately reflected.

Department Scoping Strategy
All HOD operations use triple scoping:

Subject Department: Subject belongs to HOD's department
Teacher Department: Teacher is member of HOD's department
Grade Level: Class is secondary grade (8-12)
Error Handling Patterns
Position Not Found: 403 Forbidden - "User is not assigned as HOD"
Department Mismatch: ValidationError - "Subject does not belong to your department"
Grade Violation: ValidationError - "HOD can only manage assignments for grades 8-12"
Teacher Qualification: ValidationError - "Teacher not qualified to teach subject"
Summary
Architectural Principles:

HOD is a POSITION, not a ROLE (non-negotiable)
Position-based authorization (always use getHODDepartment())
Department scoping (all operations scoped to HOD's department)
Secondary grades only (grades 8-12)
Read-mostly permissions (view much, modify little)
No caching (fetch position fresh every request)
Explicit validation (subject, teacher, class all validated)
Module Capabilities:

View department data (teachers, subjects, stats)
Manage subject-teacher assignments (CRUD for secondary grades)
View performance analytics
Generate reports
Key Files:

Position logic: lib/auth/position-helpers.ts
HOD service: features/hod/hod.service.ts
Middleware: lib/http/with-auth.ts
Schema: prisma/schema.prisma
The mental model is now complete. The HOD module is well-architected with clear position-based authorization, strong department scoping, and explicit validation patterns.
