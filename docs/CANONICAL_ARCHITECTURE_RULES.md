# Canonical Architecture Rules

## Purpose

This document defines non-negotiable architectural rules for the school management system. These rules exist to prevent entire classes of bugs and security vulnerabilities.

**Status**: Enforced as of 2026-01-11

---

## Rule 1: HOD is a Position, Never a Role

### The Rule

**HOD (Head of Department) MUST be derived from `Department.hodTeacherId` and NEVER assigned as a role.**

### Rationale

HOD is a **temporary management position** (like "Team Lead" or "Project Manager"), not a permanent **system role** (like "Admin" or "User"). Treating it as a role creates:

1. **Authorization bugs** - Position changes don't update access
2. **Data integrity issues** - User role conflicts with department assignment
3. **Scalability problems** - Can't model multiple positions per person
4. **Security vulnerabilities** - Stale permissions after department changes

### Enforcement

#### Database Level
- `Role` enum: `ADMIN | HEAD_TEACHER | DEPUTY_HEAD | TEACHER | CLERK`
- HOD excluded from enum (migration: `20260111151453_remove_hod_from_role_enum`)
- Attempting to insert `role = 'HOD'` causes Prisma validation error

#### TypeScript Level
```typescript
// ❌ This will NOT compile:
const role: Role = "HOD"; // Error: Type '"HOD"' is not assignable to type 'Role'

// ✅ This is correct:
const dept = await getHODDepartment(userId);
if (dept !== null) { /* user is HOD */ }
```

#### Runtime Level
- `getHODDepartment()` is single source of truth
- All HOD checks must use position helpers from `lib/auth/position-helpers.ts`
- No role-based HOD checks allowed

### How to Check HOD Status

```typescript
import { getHODDepartment } from "@/lib/auth/position-helpers";

// Check if user is HOD
const hodDept = await getHODDepartment(userId);
if (hodDept !== null) {
  // User is HOD of hodDept
}

// Check if user is HOD of specific department
if (hodDept !== null && hodDept.id === targetDepartmentId) {
  // User is HOD of target department
}

// Combine with role hierarchy
const isAuthorized =
  (hodDept !== null && hodDept.id === deptId) ||
  hasRoleAuthority(role, Role.DEPUTY_HEAD);
```

### How NOT to Check HOD Status

```typescript
// ❌ NEVER do this (will cause TypeScript error):
if (user.role === "HOD") { }
if (hasRoleAuthority(role, Role.HOD)) { }

// ❌ NEVER infer from permissions:
if (user.permissions.includes("MANAGE_DEPARTMENT")) { }

// ❌ NEVER long-cache:
const cached = cache.get(`hod:${userId}`); // Stale after changes
```

### Migration Responsibility

Any code that needs to authorize HOD actions must:
1. Import position helpers
2. Call `getHODDepartment(userId)`
3. Check `hodDept !== null` before property access
4. Scope authorization to the department

See: [HOD_POSITION_MIGRATION_GUIDE.md](./HOD_POSITION_MIGRATION_GUIDE.md)

---

## Rule 2: Roles vs Positions

### Distinction

#### Role (`User.role`)
- **What it is**: System-wide authority level
- **Lifecycle**: Permanent until admin changes it
- **Scope**: Global (all routes/features)
- **Examples**: ADMIN, TEACHER, DEPUTY_HEAD
- **Determines**: What you can access

#### Position (`Department.hodTeacherId`, future: other positions)
- **What it is**: Temporary domain-specific assignment
- **Lifecycle**: Mutable, reassigned by leadership
- **Scope**: Domain-specific (e.g., one department)
- **Examples**: HOD of Math Department
- **Determines**: Extra permissions in specific domain

### Composition

Positions grant **extra permissions** via `UserPermission` table, not via role escalation.

```typescript
// A teacher (role) can be HOD (position)
User: { role: "TEACHER" }
  ↓
TeacherProfile
  ↓
Department.hodTeacherId (position assignment)
  ↓
UserPermission[] (position-specific grants)
```

---

## Rule 3: Single Source of Truth

### The Rule

Every authorization decision must have exactly **one source of truth**.

### Examples

| Concern | Source of Truth | Never Check |
|---------|----------------|-------------|
| Is user HOD? | `Department.hodTeacherId` | `User.role` |
| User's base permissions | `Role` + `RolePermission` | Magic strings |
| Extra permissions | `UserPermission` table | Inferred from other data |
| Role hierarchy | `ROLE_HIERARCHY` constant | Ad-hoc comparisons |

### Anti-Pattern: Multiple Sources

```typescript
// ❌ This creates dual sources of truth:
if (user.role === "HOD" || user.permissions.includes("MANAGE_DEPARTMENT")) {
  // Which is the real check?
}

// ✅ This has single source of truth:
const hodDept = await getHODDepartment(userId);
if (hodDept !== null) {
  // Unambiguous
}
```

---

## Rule 4: Explicit Null Handling

### The Rule

All position checks MUST use explicit null comparisons.

### Rationale

TypeScript's truthiness can hide bugs:
- `0`, `""`, `false` are falsy but valid values
- Explicit `!== null` makes intent clear
- Prevents accidental type coercion

### Examples

```typescript
// ❌ Implicit truthiness:
if (hodDept) { /* Could be confused with boolean check */ }

// ✅ Explicit null check:
if (hodDept !== null) { /* Clear: checking if position exists */ }

// ✅ Explicit with property access:
if (hodDept !== null && hodDept.id === targetDeptId) { /* Safe */ }
```

---

## Rule 5: No Position Caching

### The Rule

HOD position checks MUST NOT be long-cached.

### Rationale

Position assignments can change independently of login sessions. Cached results become stale when:
- Department reassigns HOD
- HOD teacher is deactivated
- Department is deleted

### Correct Pattern

```typescript
// ✅ Always fetch fresh:
const hodDept = await getHODDepartment(userId);

// ❌ Never cache:
const cached = longCache.get(`hod:${userId}`); // Stale!

// ⚠️ Short-lived cache OK (request-scoped):
const requestCache = new Map();
if (!requestCache.has(userId)) {
  requestCache.set(userId, await getHODDepartment(userId));
}
```

---

## Rule 6: Department-Scoped Authorization

### The Rule

HOD authorization MUST be scoped to the assigned department.

### Pattern

```typescript
// ✅ Check department ownership:
const hodDept = await getHODDepartment(userId);
if (hodDept === null || hodDept.id !== resource.departmentId) {
  throw new UnauthorizedError("Not HOD of this department");
}

// ❌ Global HOD check (too broad):
if (await isHOD(userId)) {
  // Allows access to ALL departments!
}
```

---

## Enforcement Mechanisms

### 1. Database Constraints
- Foreign key: `Department.hodTeacherId → TeacherProfile.id`
- Enum exclusion: `Role` does not contain `HOD`

### 2. TypeScript Compilation
- `Role.HOD` does not exist → compile error
- Position helpers return typed results

### 3. Runtime Validation
- Prisma validates role enum values
- Position helpers throw on invalid IDs

### 4. Testing Requirements
- [ ] Test: HOD role assignment fails
- [ ] Test: Position assignment succeeds
- [ ] Test: Department change updates access
- [ ] Test: Deactivated HOD loses access

### 5. Documentation
- Migration guide: [HOD_POSITION_MIGRATION_GUIDE.md](./HOD_POSITION_MIGRATION_GUIDE.md)
- Implementation summary: [HOD_REMOVAL_SUMMARY.md](./HOD_REMOVAL_SUMMARY.md)
- Verification report: [IMPLEMENTATION_VERIFICATION.md](./IMPLEMENTATION_VERIFICATION.md)

---

## Breaking These Rules

### What Happens

If you bypass these rules:

1. **TypeScript won't compile** (Role.HOD doesn't exist)
2. **Prisma will throw** (HOD not a valid enum value)
3. **Tests will fail** (position checks required)
4. **Security review will reject** (authorization bypass)

### Exceptions

**None.** These rules have no exceptions.

If you believe an exception is needed, the architecture must be redesigned, not the rules bypassed.

---

## For New Team Members

If you joined this team today, here's what you need to know:

1. **Never use `Role.HOD`** - It doesn't exist
2. **Check positions, not roles** - Use `getHODDepartment()`
3. **Scope to departments** - HOD only has authority in their department
4. **Don't cache positions** - Always fetch fresh
5. **Read the migration guide** - [HOD_POSITION_MIGRATION_GUIDE.md](./HOD_POSITION_MIGRATION_GUIDE.md)

If you're ever unsure about authorization, ask: "Is this a role or a position?"

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-11 | 1.0 | Initial canonical rules after HOD removal |

---

**Remember**: These rules exist because they prevent real bugs. Follow them strictly.
