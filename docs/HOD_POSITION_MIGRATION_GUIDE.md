# HOD Position Migration Guide

## Overview

This guide explains how to migrate HOD-related routes and services from role-based to position-based authorization.

**Critical Rule**: HOD is a POSITION (derived from `Department.hodTeacherId`), NOT a role.

**Architectural Assumption**: A teacher may be HOD of **at most one department** at a time. If this changes in the future, replace `getHODDepartment()` with `getHODDepartments()` and update authorization logic accordingly.

---

## Roles vs Positions Glossary

Understanding the distinction between roles and positions is critical to this architecture:

### Role (`User.role`)
- **Definition**: System-wide authority level that determines base permissions
- **Characteristics**:
  - Hierarchical (ADMIN > HEAD_TEACHER > DEPUTY_HEAD > TEACHER > CLERK)
  - Permanent until explicitly changed by administrator
  - Determines what routes/features user can access
  - Example: TEACHER, ADMIN, DEPUTY_HEAD

### Position (`Department.hodTeacherId`)
- **Definition**: Temporary assignment granting specific authority over a domain (department)
- **Characteristics**:
  - Mutable - can be reassigned by leadership
  - Department-scoped - authority limited to assigned domain
  - Grants extra permissions via `UserPermission` table
  - Example: HOD of Mathematics Department

### Example
A teacher (role: **TEACHER**) can be assigned as HOD (position: **Mathematics Department**), gaining extra permissions for that specific domain without changing their underlying role.

---

## Migration Pattern for API Routes

### Before (Role-Based)

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const decoded = verifyToken(token);

  // ❌ BAD: Checking role
  if (decoded.role !== "HOD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ❌ BAD: Querying via user.departmentAsHOD relation
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { departmentAsHOD: true },
  });

  if (!user || !user.departmentAsHOD) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const department = user.departmentAsHOD;
  // ... rest of logic
}
```

### After (Position-Based)

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { getHODDepartment } from "@/lib/auth/position-helpers";

export async function GET(request: NextRequest) {
  const decoded = verifyToken(token);

  // ✅ GOOD: Position-based check
  const hodDepartment = await getHODDepartment(decoded.userId);

  if (!hodDepartment) {
    return NextResponse.json(
      { error: "Access denied: User is not assigned as HOD of any department" },
      { status: 403 }
    );
  }

  // ✅ GOOD: Query department directly
  const department = await prisma.department.findUnique({
    where: { id: hodDepartment.id },
    include: {
      /* your includes */
    },
  });

  // ... rest of logic
}
```

**⚠️ IMPORTANT - Caching Warning:**
Do not long-cache HOD position checks. HOD status can change independently of login sessions and must be revalidated after department updates. Always fetch fresh position data, especially after department management operations.

---

## Migration Pattern for Services

### Before (Role-Based)

```typescript
import { requireMinimumRole } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

export async function updateSubject(context: AuthContext, data: UpdateData) {
  // ❌ BAD: Role-based check
  requireMinimumRole(context, Role.HOD, "Only HODs can update subjects");

  // ... logic
}
```

### After (Position-Based) - Strengthened

```typescript
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { Role } from "@/types/prisma-enums";
import { UnauthorizedError } from "@/lib/errors";

export async function updateSubject(
  context: AuthContext,
  subjectId: string,
  data: UpdateData
) {
  // First check if subject belongs to a department
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { departmentId: true },
  });

  if (!subject?.departmentId) {
    throw new Error("Subject not found");
  }

  // ✅ GOOD: Position-based check for HOD with explicit null handling
  const hodDept = await getHODDepartment(context.userId);

  // Allow if: (1) HOD of subject's department, OR (2) Deputy Head or higher
  const isHODOfDept = hodDept !== null && hodDept.id === subject.departmentId;
  const isLeadership = hasRoleAuthority(context.role, Role.DEPUTY_HEAD);

  if (!isHODOfDept && !isLeadership) {
    throw new UnauthorizedError(
      "Only HOD of this department or leadership can update this subject"
    );
  }

  // ... logic
}
```

**Key Improvements**:
- Explicit `hodDept !== null` check before property access
- Centralized `hasRoleAuthority()` for role hierarchy logic
- No magic string comparisons

---

## Files Requiring Migration

### High Priority (HOD Routes)

1. ✅ `app/api/hod/dashboard/route.ts` - **COMPLETED**
2. `app/api/hod/profile/route.ts` - Update to use position check
3. `app/api/hod/reports/terms/route.ts` - Update to use position check
4. `app/api/hod/reports/classes/route.ts` - Update to use position check
5. `app/api/hod/reports/grades/route.ts` - Update to use position check
6. `app/api/hod/reports/performance/route.ts` - Update to use position check
7. `app/api/hod/reports/subjects/route.ts` - Update to use position check
8. `app/api/hod/subjects/route.ts` - Update to use position check + department scoping
9. `app/api/hod/teachers/route.ts` - Update to use position check + department scoping

### Medium Priority (Service Layer)

All files using `Role.HOD` in authorization checks:

- `features/departments/department.service.ts`
- `features/teachers/teacher.service.ts`
- `features/subjects/subject.service.ts`
- `features/classes/class.service.ts`
- `features/academic-years/academicYear.service.ts`
- `features/terms/term.service.ts`
- `features/timetables/*.service.ts`
- `features/hod/hod.service.ts`
- `features/students/student.service.ts`
- `features/parents/parent.service.ts`
- `features/enrollments/enrollment.service.ts`
- `features/subject-teacher-assignments/subjectTeacherAssignment.service.ts`

---

## Authorization Strategy by Use Case

### Use Case 1: HOD-Only Actions (Department Management)

```typescript
// Only HOD of specific department
const hodDept = await getHODDepartment(userId);

if (!hodDept || hodDept.id !== targetDepartmentId) {
  throw new UnauthorizedError(
    "Only HOD of this department can perform this action"
  );
}
```

### Use Case 2: HOD or Leadership

```typescript
// HOD of department OR Deputy Head+
const hodDept = await getHODDepartment(userId);

const isHODOfDept = hodDept !== null && hodDept.id === targetDepartmentId;
const isLeadership = hasRoleAuthority(context.role, Role.DEPUTY_HEAD);

if (!isHODOfDept && !isLeadership) {
  throw new UnauthorizedError(
    "Requires HOD of department or leadership role"
  );
}
```

### Use Case 3: Department-Scoped Data Access

```typescript
// For routes returning department-specific data
const hodDept = await getHODDepartment(userId);

if (!hodDept) {
  throw new UnauthorizedError("Not assigned as HOD");
}

// Scope queries to HOD's department
const subjects = await prisma.subject.findMany({
  where: { departmentId: hodDept.id },
});
```

---

## Testing Checklist

After migrating each route/service:

- [ ] Remove any `role === "HOD"` checks
- [ ] Replace with `getHODDepartment(userId)` position check
- [ ] Use explicit null handling (`hodDept !== null`)
- [ ] Ensure department-scoped authorization where needed
- [ ] Update error messages to reflect position-based access
- [ ] Test with user who IS HOD (should work)
- [ ] Test with user who is NOT HOD (should fail with 403)
- [ ] Test with DEPUTY_HEAD+ role if applicable (should work if allowed)
- [ ] Test department reassignment updates HOD access correctly

---

## Common Pitfalls & Anti-Patterns

### ❌ Don't Do This

```typescript
// ❌ Don't check role
if (user.role === "HOD") {
}

// ❌ Don't use hasRoleAuthority with HOD
if (hasRoleAuthority(role, Role.HOD)) {
}

// ❌ Don't grant Role.HOD in seeds or migrations
role: Role.HOD; // This will cause TypeScript error now

// ❌ NEVER infer HOD from permissions (re-inventing HOD via permissions)
if (user.permissions.includes("MANAGE_DEPARTMENT")) {
  // This bypasses position checks!
}

// ❌ Don't long-cache HOD status
const hodStatus = cache.get(`hod:${userId}`); // Stale after department changes
```

### ✅ Do This

```typescript
// ✅ Check position explicitly
const dept = await getHODDepartment(userId);
if (dept !== null) {
  // User is HOD
}

// ✅ Combine position with role hierarchy
const hodDept = await getHODDepartment(userId);
const isAuthorized =
  (hodDept !== null && hodDept.id === deptId) ||
  hasRoleAuthority(role, Role.DEPUTY_HEAD);

// ✅ Always fetch fresh HOD status
const hodDept = await getHODDepartment(userId); // No caching
```

---

## Import Statements

All files using HOD position checks should import:

```typescript
import {
  getHODDepartment,
  isHODOfDepartment,
  isHOD,
  requireHODOfDepartment,
} from "@/lib/auth/position-helpers";

// For role hierarchy checks:
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { Role } from "@/types/prisma-enums";
```

---

## Migration Status Tracking

Track migration progress by updating this table:

| File                                         | Status      | Notes               |
| -------------------------------------------- | ----------- | ------------------- |
| `app/api/hod/dashboard/route.ts`             | ✅ Complete | Migrated in Phase 3 |
| `app/api/hod/profile/route.ts`               | ⏳ Pending  | -                   |
| `app/api/hod/reports/terms/route.ts`         | ⏳ Pending  | -                   |
| `app/api/hod/reports/classes/route.ts`       | ⏳ Pending  | -                   |
| `app/api/hod/reports/grades/route.ts`        | ⏳ Pending  | -                   |
| `app/api/hod/reports/performance/route.ts`   | ⏳ Pending  | -                   |
| `app/api/hod/reports/subjects/route.ts`      | ⏳ Pending  | -                   |
| `app/api/hod/subjects/route.ts`              | ⏳ Pending  | Needs dept scoping  |
| `app/api/hod/teachers/route.ts`              | ⏳ Pending  | Needs dept scoping  |
| `features/departments/department.service.ts` | ⏳ Pending  | -                   |
| `features/subjects/subject.service.ts`       | ⏳ Pending  | -                   |
| `features/teachers/teacher.service.ts`       | ⏳ Pending  | -                   |

---

## Enforcement Checklist

To make this architecture enforceable:

### Runtime Guards
- [ ] Add runtime guard that throws if `Role.HOD` is referenced
- [ ] Add test asserting HOD cannot be assigned as a role
- [ ] Add test asserting department reassignment updates HOD access

### Documentation Cross-Links
- [ ] Link this guide from `SECURITY_REVIEW_REPORT.md`
- [ ] Link this guide from `ROLE_HIERARCHY_SYSTEM.md`
- [ ] Add reference in main `README.md`

### Post-Migration Cleanup
- [ ] Delete unused `/hod/*` routes (if any)
- [ ] Remove deprecated HOD-related imports/constants
- [ ] Remove dead dashboards tied to HOD role assumptions

---

**Remember**: The architectural rule is non-negotiable. HOD is ALWAYS a position derived from `Department.hodTeacherId`, NEVER a role.

If a new senior engineer joined your team tomorrow and read only this document, they should be able to maintain and extend the authorization system without reintroducing the HOD-as-role anti-pattern.
