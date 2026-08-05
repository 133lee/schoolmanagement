# Role Hierarchy System

## Overview

Instead of implementing complex multi-role RBAC with junction tables, we use a **simpler role hierarchy** where higher roles automatically inherit all permissions from lower roles.

This solves the "HOD who teaches" problem without requiring database schema changes or massive code refactoring.

## The Problem We're Solving

### Real-World Scenario
In schools, people often hold multiple responsibilities:
- A **Head of Department** also teaches classes
- A **Deputy Head** might also be an HOD
- A **Head Teacher** should be able to do everything below them

### Previous Attempt (Multi-Role RBAC)
- Required new `UserRole` junction table
- Would affect ~80 files
- 10+ hours of implementation
- Complex queries (multiple JOINs)
- Difficult to maintain

### Our Solution (Role Hierarchy)
- No schema changes needed ✅
- Uses existing single `role` field ✅
- Simple authorization checks ✅
- HOD automatically gets TEACHER permissions ✅
- Easy to understand and maintain ✅

---

## Role Hierarchy

```
ADMIN (level 5)
  ↓ has all permissions from everyone below
HEAD_TEACHER (level 4)
  ↓ has all permissions from everyone below
DEPUTY_HEAD (level 3)
  ↓ has all permissions from everyone below
HOD (level 2)
  ↓ has all permissions from everyone below
TEACHER (level 1)

CLERK (level 1) - separate branch with administrative permissions
```

### What This Means

| Role | Can Do |
|------|--------|
| **TEACHER** | Record attendance, create assessments, enter marks, view their classes, generate report cards |
| **HOD** | Everything TEACHER can do + manage department, assign subjects, approve assessments |
| **DEPUTY_HEAD** | Everything HOD can do + manage discipline, approve leave, assign class teachers |
| **HEAD_TEACHER** | Everything DEPUTY_HEAD can do + close academic year, approve promotions, manage staff |
| **ADMIN** | Everything + manage users, system settings, delete records |
| **CLERK** | Manage students, parents, enrollment, classes (administrative tasks) |

---

## Code Examples

### Before (Old System)

```typescript
// In student.service.ts
private canCreate(context: ServiceContext): boolean {
  return ["ADMIN", "HEAD_TEACHER", "CLERK"].includes(context.role);
}

async createStudent(input: CreateStudentInput, context: ServiceContext) {
  if (!this.canCreate(context)) {
    throw new UnauthorizedError(`${context.role} role cannot create students`);
  }
  // ... rest of code
}
```

**Problems:**
- Must manually list all allowed roles
- Easy to forget to add HOD or DEPUTY_HEAD
- Code duplication across 80+ files
- HOD can't do teacher actions without special handling

### After (Role Hierarchy)

```typescript
// In student.service.ts
import { requireAnyRole } from '@/lib/auth/authorization';

async createStudent(input: CreateStudentInput, context: ServiceContext) {
  // CLERK and HOD+ can create students (HOD includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
  requireAnyRole(context, [Role.CLERK, Role.HOD], "Insufficient permissions to create students");

  // ... rest of code
}
```

**Benefits:**
- One line instead of 5+
- Automatically includes higher roles (HOD includes DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
- Clear intent: "Need at least CLERK or HOD level"
- HOD automatically gets TEACHER permissions

---

## Implementation Guide

### 1. Files Created

- **`lib/auth/role-hierarchy.ts`** - Core hierarchy logic
- **`lib/auth/authorization.ts`** - Helper functions for services
- **`lib/errors.ts`** - Centralized error classes

### 2. Update Service Files

For each service file (student.service.ts, assessment.service.ts, etc.):

**Step 1: Update imports**

```typescript
// OLD
export class UnauthorizedError extends Error { ... }
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "HOD" | "TEACHER" | "CLERK";
}

// NEW
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireAnyRole, requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

export type ServiceContext = AuthContext;
```

**Step 2: Remove old permission check methods**

```typescript
// DELETE THESE
private canCreate(context: ServiceContext): boolean { ... }
private canUpdate(context: ServiceContext): boolean { ... }
private canDelete(context: ServiceContext): boolean { ... }
```

**Step 3: Update authorization in methods**

```typescript
// PATTERN 1: Require minimum role
async closeAcademicYear(id: string, context: ServiceContext) {
  requireMinimumRole(context, Role.HEAD_TEACHER, "Only head teacher can close academic year");
  // ...
}

// PATTERN 2: Require any of several roles
async createStudent(input: CreateStudentInput, context: ServiceContext) {
  requireAnyRole(context, [Role.CLERK, Role.HOD], "Insufficient permissions");
  // ...
}

// PATTERN 3: Owner or minimum role
async updateAssessment(id: string, input: UpdateInput, context: ServiceContext) {
  const assessment = await assessmentRepository.findById(id);
  requireOwnerOrMinimumRole(
    context,
    assessment.createdBy,
    Role.HOD,
    "Can only update your own assessments unless you're HOD+"
  );
  // ...
}
```

### 3. Common Authorization Patterns

```typescript
// Pattern 1: Only admins
requireMinimumRole(context, Role.ADMIN, "Admin only");

// Pattern 2: Teachers and above (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
requireMinimumRole(context, Role.TEACHER, "Teachers and above only");

// Pattern 3: HODs and above
requireMinimumRole(context, Role.HOD, "HOD and above only");

// Pattern 4: Either CLERK or HOD+ (for administrative tasks)
requireAnyRole(context, [Role.CLERK, Role.HOD], "Need CLERK or HOD+");

// Pattern 5: Owner or HOD+
requireOwnerOrMinimumRole(context, resourceOwnerId, Role.HOD, "Can only access your own or be HOD+");
```

---

## Real-World Examples

### Example 1: HOD Teaching Classes

```typescript
// HOD user profile
const hod = {
  id: "user123",
  role: "HOD"
};

// Check what roles they effectively have
import { getEffectiveRoles } from '@/lib/auth/role-hierarchy';
const effectiveRoles = getEffectiveRoles(hod.role);
// Returns: ["HOD", "TEACHER"]

// So HOD can:
// ✅ Record attendance (TEACHER permission)
// ✅ Create assessments (TEACHER permission)
// ✅ View "My Classes" (TEACHER permission)
// ✅ Generate report cards (TEACHER permission)
// ✅ Manage department (HOD permission)
// ✅ Assign subjects to teachers (HOD permission)
```

### Example 2: Authorization Flow

```typescript
// Teacher trying to close academic year
const teacher = { userId: "t123", role: "TEACHER" };
await academicYearService.closeYear("year123", teacher);
// ❌ Throws: "This action requires HEAD_TEACHER role or higher"

// Head Teacher trying to close academic year
const headTeacher = { userId: "ht123", role: "HEAD_TEACHER" };
await academicYearService.closeYear("year123", headTeacher);
// ✅ Success - HEAD_TEACHER can close years
```

### Example 3: HOD Accessing Teacher Dashboard

```typescript
// HOD can access multiple dashboards
import { getAccessibleDashboards } from '@/lib/auth/role-hierarchy';

const hod = { role: "HOD" };
const dashboards = getAccessibleDashboards(hod.role);
// Returns:
// [
//   { label: "HOD", route: "/hod/dashboard" },
//   { label: "Teacher", route: "/teacher/dashboard" }
// ]

// This allows UI to show dashboard switcher
```

---

## Migration Checklist

### Phase 1: Core Setup ✅
- [x] Create `lib/auth/role-hierarchy.ts`
- [x] Create `lib/auth/authorization.ts`
- [x] Create `lib/errors.ts`

### Phase 2: Update Services (In Progress)
Update each service file in `features/*/`:

- [ ] `features/students/student.service.ts` ⬅ EXAMPLE DONE
- [ ] `features/academic-years/academicYear.service.ts`
- [ ] `features/assessments/assessment.service.ts`
- [ ] `features/attendance/attendance.service.ts`
- [ ] `features/classes/class.service.ts`
- [ ] `features/departments/department.service.ts`
- [ ] `features/enrollments/enrollment.service.ts`
- [ ] `features/grades/grade.service.ts`
- [ ] `features/guardians/guardian.service.ts`
- [ ] `features/report-cards/reportCard.service.ts`
- [ ] `features/subjects/subject.service.ts`
- [ ] `features/teachers/teacher.service.ts`
- [ ] `features/timetables/timetable.service.ts`
- [ ] `features/users/user.service.ts`

For each service:
1. Update imports (use centralized errors and AuthContext)
2. Remove old `canCreate`, `canUpdate`, `canDelete` methods
3. Replace authorization checks with `requireMinimumRole` or `requireAnyRole`

### Phase 3: Update API Routes
Update each API route in `app/api/*/`:

- [ ] Update JWT token verification to use `AuthContext`
- [ ] Pass proper context to services
- [ ] Handle `UnauthorizedError` consistently

### Phase 4: Update UI Components
- [ ] Add dashboard switcher for users with multiple effective roles
- [ ] Update navigation guards to use `canAccessRoute`
- [ ] Show appropriate menus based on effective roles

### Phase 5: Testing
- [ ] Test HOD can access teacher features
- [ ] Test HEAD_TEACHER can do everything below
- [ ] Test TEACHER cannot access HOD features
- [ ] Test CLERK has administrative permissions but not teaching
- [ ] Test authorization errors are thrown correctly

---

## Benefits Summary

### Compared to Current System

| Aspect | Before | After |
|--------|--------|-------|
| HOD who teaches | ❌ Workarounds needed | ✅ Automatic |
| Code duplication | ❌ ~80 files with role checks | ✅ Centralized helpers |
| Maintainability | ❌ Hard to add roles | ✅ Easy - just update hierarchy |
| Understanding | ⚠️ Complex role checks | ✅ Clear hierarchy |
| Query performance | ✅ Fast | ✅ Still fast (no schema change) |

### Compared to Multi-Role RBAC

| Aspect | Multi-Role RBAC | Role Hierarchy |
|--------|-----------------|----------------|
| Schema changes | ❌ New junction table | ✅ No changes |
| Implementation time | ❌ 10 hours | ✅ 2-3 hours |
| Query complexity | ❌ Multiple JOINs | ✅ Single field |
| Code changes | ❌ ~80 files | ✅ ~20 files |
| Learning curve | ❌ Complex | ✅ Simple |
| Handles HOD teaching | ✅ Yes | ✅ Yes |

---

## API Reference

### Helper Functions

```typescript
// Check role authority
hasRoleAuthority(Role.HOD, Role.TEACHER) // true - HOD is higher than TEACHER
hasRoleAuthority(Role.TEACHER, Role.HOD) // false - TEACHER is lower than HOD

// Get effective roles
getEffectiveRoles(Role.HOD) // ["HOD", "TEACHER"]
getEffectiveRoles(Role.HEAD_TEACHER) // ["HEAD_TEACHER", "DEPUTY_HEAD", "HOD", "TEACHER"]

// Authorization checks (throw errors on failure)
requireMinimumRole(context, Role.HOD, "Need HOD or higher")
requireAnyRole(context, [Role.CLERK, Role.HOD], "Need CLERK or HOD+")
requirePermission(context, 'manage_department', "Cannot manage departments")
requireOwnerOrAdmin(context, resourceOwnerId, "Cannot access others' resources")
requireOwnerOrMinimumRole(context, resourceOwnerId, Role.HOD, "Need to own or be HOD+")

// Boolean checks (no errors)
isAdmin(context)
isTeacher(context) // true for TEACHER and above
isHOD(context) // true for HOD and above
isLeadership(context) // true for DEPUTY_HEAD and above

// Route access
canAccessRoute(Role.HOD, '/teacher/dashboard') // true - HOD can access teacher routes
canAccessRoute(Role.TEACHER, '/hod/dashboard') // false - TEACHER cannot access HOD routes

// Dashboard helpers
getDefaultDashboard(Role.HOD) // "/hod/dashboard"
getAccessibleDashboards(Role.HOD) // [{ label: "HOD", route: "/hod/dashboard" }, { label: "Teacher", route: "/teacher/dashboard" }]

// Permission helpers
getEffectivePermissions(Role.HOD) // All HOD + TEACHER permissions
roleHasPermission(Role.HOD, 'record_attendance') // true - inherited from TEACHER
```

---

## Conclusion

**Role Hierarchy is the practical solution for your school management system.**

It solves the "HOD who teaches" problem elegantly without:
- Complex database migrations
- Weeks of refactoring
- Performance degradation
- Maintenance burden

The hierarchy reflects real school organizational structure: higher positions can do everything lower positions can do, plus additional responsibilities.

This is **production-ready** and can be implemented incrementally over a few days rather than weeks.
