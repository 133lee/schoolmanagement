# Multi-Role RBAC Implementation Plan

**Version:** 1.0
**Date:** 2026-01-09
**Status:** Planning
**Estimated Effort:** 6-8 hours
**Risk Level:** Medium

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Solution](#proposed-solution)
4. [Impact Analysis](#impact-analysis)
5. [Migration Strategy](#migration-strategy)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Post-Implementation](#post-implementation)

---

## Executive Summary

### Problem Statement
The current system uses a single-role model where each user can have only ONE role (e.g., ADMIN, HOD, TEACHER). This doesn't reflect real-world scenarios where:
- A HOD is also a TEACHER
- A DEPUTY_HEAD also teaches classes
- An ADMIN may need to manage classes

### Current Workaround
Users can have:
- ONE primary role via `User.role`
- Multiple teaching assignments via `TeacherSubject`, `SubjectTeacherAssignment`
- Permission overrides via `UserPermission` table

**Limitation:** Cannot formally assign multiple system roles (e.g., both HOD and TEACHER)

### Proposed Solution
Implement true multi-role RBAC where:
- Users can have MULTIPLE roles simultaneously
- One role designated as "primary" for UI display
- Permissions calculated from ALL assigned roles + individual overrides
- Maintains existing permission system structure

### Benefits
✅ Reflects real organizational structure
✅ Simplified permission management
✅ More flexible role assignments
✅ Better audit trail of responsibilities
✅ Reduces need for permission overrides

### Risks
⚠️ Breaking changes to auth system
⚠️ ~80 files need updating
⚠️ Client tokens must be refreshed
⚠️ Database migration required

---

## Current State Analysis

### Current Schema

```prisma
model User {
  id                 String           @id @default(cuid())
  email              String           @unique
  passwordHash       String
  role               Role             @default(TEACHER)  // ← Single role
  isActive           Boolean          @default(true)
  hasDefaultPassword Boolean          @default(false)
  lastLogin          DateTime?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  profile            TeacherProfile?
  userPermissions    UserPermission[] @relation("UserPermissions")
  departmentAsHOD    Department?      @relation("DepartmentHOD")
}

enum Role {
  ADMIN
  HEAD_TEACHER
  DEPUTY_HEAD
  HOD
  TEACHER
  CLERK
}
```

### Current RBAC Structure

**1. Role-Based Permissions**
```prisma
model RolePermission {
  role       Role
  permission Permission
}
```

**2. User Permission Overrides**
```prisma
model UserPermission {
  userId     String
  permission Permission
  expiresAt  DateTime?
}
```

**3. Permission Enum** (28 permissions)
```prisma
enum Permission {
  CREATE_STUDENT, READ_STUDENT, UPDATE_STUDENT, DELETE_STUDENT,
  CREATE_CLASS, READ_CLASS, UPDATE_CLASS, DELETE_CLASS,
  CREATE_ASSESSMENT, READ_ASSESSMENT, UPDATE_ASSESSMENT, DELETE_ASSESSMENT,
  ENTER_RESULTS, CREATE_TEACHER, READ_TEACHER, UPDATE_TEACHER, DELETE_TEACHER,
  VIEW_REPORTS, GENERATE_REPORTS, MANAGE_ROLES, MANAGE_PERMISSIONS,
  MANAGE_ACADEMIC_YEAR, MANAGE_TERMS, MANAGE_TIMETABLE,
  APPROVE_PROMOTION, MARK_ATTENDANCE, VIEW_ATTENDANCE
}
```

### Current Authorization Flow

```typescript
// 1. User logs in
const token = jwt.sign({
  userId: user.id,
  role: user.role,      // ← Single role
  email: user.email
});

// 2. Authorization check in services
if (context.role === "ADMIN") {
  // Allow operation
}

// 3. Permission check
const rolePermissions = getRolePermissions(context.role);
const userOverrides = getUserPermissions(context.userId);
const allPermissions = [...rolePermissions, ...userOverrides];

if (allPermissions.includes("CREATE_STUDENT")) {
  // Allow operation
}
```

### Files Using Role Checks

**Core Authentication:**
- `lib/auth/jwt.ts`
- `lib/auth/role-routes.ts`

**Features (Services):**
- `features/academic-years/academicYear.service.ts`
- `features/assessments/assessment.service.ts`
- `features/classes/class.service.ts`
- `features/students/student.service.ts`
- `features/teachers/teacher.service.ts`
- `features/enrollments/enrollment.service.ts`
- `features/report-cards/reportCard.service.ts`
- `features/attendance/attendance.service.ts`
- `features/permissions/permission.service.ts`

**API Routes (50+ files):**
- `app/api/permissions/users/[id]/role/route.ts`
- `app/api/academic-years/*/route.ts`
- `app/api/students/*/route.ts`
- All other API routes with authorization

**UI Components:**
- `components/permissions/role-assignment.tsx`
- `components/permissions/users-list-table.tsx`
- `app/(dashboard)/admin/permissions/page.tsx`
- `app/(dashboard)/layout.tsx`

**Hooks:**
- `hooks/usePermissions.ts`

---

## Proposed Solution

### New Schema Design

```prisma
model User {
  id                 String           @id @default(cuid())
  email              String           @unique
  passwordHash       String
  // REMOVED: role   Role             @default(TEACHER)

  isActive           Boolean          @default(true)
  hasDefaultPassword Boolean          @default(false)
  lastLogin          DateTime?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  // NEW: Multiple roles
  roles              UserRole[]

  profile            TeacherProfile?
  userPermissions    UserPermission[] @relation("UserPermissions")
  departmentAsHOD    Department?      @relation("DepartmentHOD")

  @@index([email])
  @@map("users")
}

// NEW: Junction table for many-to-many User-Role relationship
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  role      Role
  isPrimary Boolean  @default(false)
  assignedAt DateTime @default(now())
  assignedBy String?  // Who assigned this role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@index([userId])
  @@index([role])
  @@map("user_roles")
}

// Role enum remains unchanged
enum Role {
  ADMIN
  HEAD_TEACHER
  DEPUTY_HEAD
  HOD
  TEACHER
  CLERK
}
```

### New Authorization Flow

```typescript
// 1. User logs in
const userRoles = await prisma.userRole.findMany({
  where: { userId: user.id }
});

const primaryRole = userRoles.find(r => r.isPrimary)?.role || userRoles[0]?.role;

const token = jwt.sign({
  userId: user.id,
  roles: userRoles.map(r => r.role),  // ← Array of roles
  primaryRole: primaryRole,           // ← For UI display
  email: user.email
});

// 2. Authorization check in services (NEW)
function hasRole(context: ServiceContext, ...requiredRoles: Role[]): boolean {
  return context.roles.some(role => requiredRoles.includes(role));
}

// Usage
if (hasRole(context, "ADMIN", "HEAD_TEACHER")) {
  // Allow operation
}

// 3. Permission check (ENHANCED)
const allRolePermissions = context.roles.flatMap(role =>
  getRolePermissions(role)
);
const userOverrides = getUserPermissions(context.userId);
const allPermissions = [...new Set([...allRolePermissions, ...userOverrides])];

if (allPermissions.includes("CREATE_STUDENT")) {
  // Allow operation
}
```

### API Changes

**Request Headers (No Change)**
```
Authorization: Bearer <JWT_TOKEN>
```

**JWT Token Structure (CHANGED)**
```typescript
// OLD
{
  userId: "cm123...",
  role: "ADMIN",
  email: "john@school.com",
  iat: 1234567890,
  exp: 1234567890
}

// NEW
{
  userId: "cm123...",
  roles: ["ADMIN", "TEACHER"],      // Array of all roles
  primaryRole: "ADMIN",             // Main role for UI
  email: "john@school.com",
  iat: 1234567890,
  exp: 1234567890
}
```

**API Response Changes**
```typescript
// GET /api/permissions/users
// OLD
{
  users: [
    {
      id: "...",
      email: "...",
      role: "ADMIN",  // Single string
      profile: {...}
    }
  ]
}

// NEW
{
  users: [
    {
      id: "...",
      email: "...",
      roles: [                    // Array of role objects
        { role: "ADMIN", isPrimary: true },
        { role: "TEACHER", isPrimary: false }
      ],
      primaryRole: "ADMIN",       // Convenience field
      profile: {...}
    }
  ]
}
```

---

## Impact Analysis

### Database Impact

**Changes Required:**
1. Add `user_roles` table
2. Migrate existing `User.role` data to `UserRole` records
3. Remove `User.role` column (after successful migration)

**Data Migration:**
```sql
-- Step 1: Create UserRole records from existing User.role
INSERT INTO user_roles (id, user_id, role, is_primary, assigned_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  id,
  role,
  true,  -- All existing roles become primary
  created_at,
  NOW(),
  NOW()
FROM users;

-- Step 2: Verify migration
SELECT
  u.email,
  u.role AS old_role,
  ur.role AS new_role,
  ur.is_primary
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;

-- Step 3: Drop old column (after verification)
-- ALTER TABLE users DROP COLUMN role;
```

**Rollback Safety:**
```sql
-- If rollback needed, restore from backup
-- Or recreate role column from user_roles
ALTER TABLE users ADD COLUMN role TEXT;

UPDATE users u
SET role = ur.role
FROM user_roles ur
WHERE u.id = ur.user_id AND ur.is_primary = true;
```

### Code Impact

#### 1. Type Definitions (Auto-Generated)

**File:** `types/prisma-enums.ts`
**Impact:** Regenerated by Prisma
**Action:** Run `npx prisma generate` after migration

#### 2. Authentication Layer

**File:** `lib/auth/jwt.ts`

**Current:**
```typescript
interface JWTPayload {
  userId: string;
  role: Role;
  email: string;
}

function signToken(user: User): string {
  return jwt.sign({
    userId: user.id,
    role: user.role,  // ← Single role
    email: user.email
  }, SECRET);
}
```

**New:**
```typescript
interface JWTPayload {
  userId: string;
  roles: Role[];           // ← Array
  primaryRole: Role;       // ← For display
  email: string;
}

async function signToken(user: User): Promise<string> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true, isPrimary: true }
  });

  const primaryRole = userRoles.find(r => r.isPrimary)?.role
    || userRoles[0]?.role
    || 'TEACHER';

  return jwt.sign({
    userId: user.id,
    roles: userRoles.map(r => r.role),
    primaryRole,
    email: user.email
  }, SECRET);
}
```

**File:** `lib/auth/role-routes.ts`

**Current:**
```typescript
export function isAdminRole(role: Role): boolean {
  return ['ADMIN', 'HEAD_TEACHER', 'CLERK'].includes(role);
}

export function canAccessRoute(userRole: Role, route: string): boolean {
  // Check single role
}
```

**New:**
```typescript
export function hasAnyRole(userRoles: Role[], ...allowedRoles: Role[]): boolean {
  return userRoles.some(role => allowedRoles.includes(role));
}

export function hasAllRoles(userRoles: Role[], ...requiredRoles: Role[]): boolean {
  return requiredRoles.every(required => userRoles.includes(required));
}

export function canAccessRoute(userRoles: Role[], route: string): boolean {
  // Check if user has ANY of the allowed roles for route
}
```

#### 3. Service Context Interface

**All Service Files**

**Current:**
```typescript
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "HOD" | "TEACHER" | "CLERK";
}
```

**New:**
```typescript
export interface ServiceContext {
  userId: string;
  roles: Role[];           // Array of all roles
  primaryRole: Role;       // Main role for display
}

// Helper functions for service layer
export function hasRole(context: ServiceContext, ...roles: Role[]): boolean {
  return context.roles.some(r => roles.includes(r));
}

export function hasAllRoles(context: ServiceContext, ...roles: Role[]): boolean {
  return roles.every(r => context.roles.includes(r));
}
```

#### 4. Service Layer Updates

**Pattern to Find and Replace:**

```typescript
// PATTERN 1: Single role check
// OLD
if (context.role === "ADMIN") { ... }

// NEW
if (hasRole(context, "ADMIN")) { ... }
// OR
if (context.roles.includes("ADMIN")) { ... }

// PATTERN 2: Multiple role check
// OLD
if (["ADMIN", "HEAD_TEACHER"].includes(context.role)) { ... }

// NEW
if (hasRole(context, "ADMIN", "HEAD_TEACHER")) { ... }
// OR
if (context.roles.some(r => ["ADMIN", "HEAD_TEACHER"].includes(r))) { ... }

// PATTERN 3: Role-based logic
// OLD
private canManage(context: ServiceContext): boolean {
  return context.role === "ADMIN";
}

// NEW
private canManage(context: ServiceContext): boolean {
  return hasRole(context, "ADMIN");
}
```

**Files to Update (~20 service files):**
- `features/academic-years/academicYear.service.ts`
- `features/assessments/assessment.service.ts`
- `features/attendance/attendance.service.ts`
- `features/classes/class.service.ts`
- `features/departments/department.service.ts`
- `features/enrollments/enrollment.service.ts`
- `features/parents/parent.service.ts`
- `features/permissions/permission.service.ts`
- `features/report-cards/reportCard.service.ts`
- `features/students/student.service.ts`
- `features/subjects/subject.service.ts`
- `features/teachers/teacher.service.ts`
- `features/terms/term.service.ts`

#### 5. API Route Updates

**Pattern:**

```typescript
// OLD
const decoded = verifyToken(token);
if (decoded.role !== "ADMIN") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// NEW
const decoded = verifyToken(token);
if (!decoded.roles.includes("ADMIN")) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

**Files to Update (~50 API route files):**
- All files in `app/api/**/route.ts`

#### 6. UI Component Updates

**File:** `components/permissions/role-assignment.tsx`

**Current:** Single role dropdown
```tsx
<Select value={selectedRole} onValueChange={setSelectedRole}>
  <SelectItem value="ADMIN">Administrator</SelectItem>
  <SelectItem value="TEACHER">Teacher</SelectItem>
  ...
</Select>
```

**New:** Multi-select with checkboxes
```tsx
<div className="space-y-2">
  {ROLES.map(role => (
    <div key={role.value} className="flex items-center space-x-2">
      <Checkbox
        checked={selectedRoles.includes(role.value)}
        onCheckedChange={() => toggleRole(role.value)}
      />
      <Label>{role.label}</Label>
      {selectedRoles.includes(role.value) && (
        <RadioButton
          checked={role.value === primaryRole}
          onChange={() => setPrimaryRole(role.value)}
          label="Primary"
        />
      )}
    </div>
  ))}
</div>
```

**File:** `components/permissions/users-list-table.tsx`

**Current:** Display single role badge
```tsx
<Badge>{user.role}</Badge>
```

**New:** Display multiple role badges
```tsx
<div className="flex gap-1 flex-wrap">
  {user.roles.map(userRole => (
    <Badge
      key={userRole.role}
      variant={userRole.isPrimary ? "default" : "secondary"}
    >
      {userRole.role}
      {userRole.isPrimary && " (Primary)"}
    </Badge>
  ))}
</div>
```

#### 7. Hook Updates

**File:** `hooks/usePermissions.ts`

**Current:**
```typescript
export interface UserWithPermissions {
  id: string;
  email: string;
  role: Role;
  profile?: {...};
  permissions: UserPermission[];
}

async function updateUserRole(userId: string, newRole: Role) {
  await fetch(`/api/permissions/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: newRole })
  });
}
```

**New:**
```typescript
export interface UserWithPermissions {
  id: string;
  email: string;
  roles: { role: Role; isPrimary: boolean }[];
  primaryRole: Role;
  profile?: {...};
  permissions: UserPermission[];
}

async function updateUserRoles(
  userId: string,
  roles: Role[],
  primaryRole: Role
) {
  await fetch(`/api/permissions/users/${userId}/roles`, {
    method: 'PATCH',
    body: JSON.stringify({ roles, primaryRole })
  });
}

async function addUserRole(userId: string, role: Role, isPrimary = false) {
  await fetch(`/api/permissions/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ role, isPrimary })
  });
}

async function removeUserRole(userId: string, role: Role) {
  await fetch(`/api/permissions/users/${userId}/roles/${role}`, {
    method: 'DELETE'
  });
}
```

### Breaking Changes Summary

| Component | Breaking Change | Migration Required |
|-----------|----------------|-------------------|
| Database Schema | `User.role` → `UserRole` table | ✅ Yes - Data migration |
| JWT Token | `role: string` → `roles: string[]` | ✅ Yes - All clients must re-login |
| API Responses | Role field structure changed | ✅ Yes - Client code updates |
| Service Context | `role` → `roles` array | ✅ Yes - Service layer updates |
| UI Components | Role display logic changed | ✅ Yes - Component updates |
| Authorization | Role check syntax changed | ✅ Yes - Update all checks |

---

## Migration Strategy

### Phase 0: Preparation (1 hour)

**Goals:**
- Backup database
- Document current state
- Create rollback plan
- Set up test environment

**Tasks:**
1. ✅ Create full database backup
   ```bash
   pg_dump -U postgres -d school_db > backup_before_multi_role_$(date +%Y%m%d).sql
   ```

2. ✅ Document all users and their current roles
   ```sql
   SELECT id, email, role, is_active, created_at
   FROM users
   ORDER BY role, email;
   ```

3. ✅ Export to CSV for verification
   ```bash
   psql -U postgres -d school_db -c "COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' CSV HEADER"
   ```

4. ✅ Set up local test database
   ```bash
   createdb school_db_test
   pg_restore -U postgres -d school_db_test backup_before_multi_role.sql
   ```

5. ✅ Create feature branch
   ```bash
   git checkout -b feature/multi-role-rbac
   git push -u origin feature/multi-role-rbac
   ```

### Phase 1: Schema Changes (30 minutes)

**Goals:**
- Add new `UserRole` model
- Keep `User.role` temporarily (dual system)
- Create and run migration

**Tasks:**

1. ✅ Update `schema.prisma`
   ```prisma
   model User {
     // Keep old field temporarily
     role               Role             @default(TEACHER)

     // Add new field
     roles              UserRole[]

     // ... rest unchanged
   }

   // New model
   model UserRole {
     id        String   @id @default(cuid())
     userId    String
     role      Role
     isPrimary Boolean  @default(false)
     assignedAt DateTime @default(now())
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@unique([userId, role])
     @@index([userId])
     @@index([role])
     @@map("user_roles")
   }
   ```

2. ✅ Create migration
   ```bash
   npx prisma migrate dev --name add_user_roles_table
   ```

3. ✅ Generate Prisma client
   ```bash
   npx prisma generate
   ```

4. ✅ Run data migration script
   ```typescript
   // scripts/migrate-roles-to-user-roles.ts
   import { PrismaClient } from '@/generated/prisma';

   const prisma = new PrismaClient();

   async function migrateRoles() {
     console.log('Starting role migration...');

     const users = await prisma.user.findMany({
       select: { id: true, role: true, createdAt: true }
     });

     console.log(`Found ${users.length} users to migrate`);

     for (const user of users) {
       await prisma.userRole.create({
         data: {
           userId: user.id,
           role: user.role,
           isPrimary: true,
           assignedAt: user.createdAt,
         }
       });
     }

     console.log('Migration complete!');

     // Verify
     const migrated = await prisma.userRole.count();
     console.log(`Migrated ${migrated} roles`);

     // Check for discrepancies
     const usersCount = await prisma.user.count();
     if (migrated !== usersCount) {
       console.error(`ERROR: User count (${usersCount}) != UserRole count (${migrated})`);
     }
   }

   migrateRoles()
     .catch(console.error)
     .finally(() => prisma.$disconnect());
   ```

   Run migration:
   ```bash
   npx ts-node scripts/migrate-roles-to-user-roles.ts
   ```

5. ✅ Verify migration
   ```sql
   -- Check all users have at least one role
   SELECT
     u.id,
     u.email,
     u.role AS old_role,
     COUNT(ur.id) AS role_count
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   GROUP BY u.id, u.email, u.role
   HAVING COUNT(ur.id) = 0;  -- Should return 0 rows
   ```

### Phase 2: Authentication Layer (1 hour)

**Goals:**
- Update JWT token structure
- Update token verification
- Maintain backward compatibility during transition

**Tasks:**

1. ✅ Create helper utilities
   ```typescript
   // lib/auth/role-utils.ts
   import { Role } from '@/types/prisma-enums';

   export interface ServiceContext {
     userId: string;
     roles: Role[];
     primaryRole: Role;
     email: string;
   }

   export function hasRole(context: ServiceContext, ...requiredRoles: Role[]): boolean {
     return context.roles.some(role => requiredRoles.includes(role));
   }

   export function hasAllRoles(context: ServiceContext, ...requiredRoles: Role[]): boolean {
     return requiredRoles.every(role => context.roles.includes(role));
   }

   export function getPrimaryRole(userRoles: { role: Role; isPrimary: boolean }[]): Role {
     return userRoles.find(r => r.isPrimary)?.role
       || userRoles[0]?.role
       || 'TEACHER';
   }
   ```

2. ✅ Update `lib/auth/jwt.ts`
   ```typescript
   import prisma from '@/lib/db/prisma';
   import { Role } from '@/types/prisma-enums';

   interface JWTPayload {
     userId: string;
     roles: Role[];
     primaryRole: Role;
     email: string;
     iat?: number;
     exp?: number;
   }

   export async function signToken(userId: string, email: string): Promise<string> {
     const userRoles = await prisma.userRole.findMany({
       where: { userId },
       select: { role: true, isPrimary: true }
     });

     const primaryRole = userRoles.find(r => r.isPrimary)?.role
       || userRoles[0]?.role
       || 'TEACHER';

     return jwt.sign(
       {
         userId,
         roles: userRoles.map(r => r.role),
         primaryRole,
         email,
       },
       process.env.JWT_SECRET!,
       { expiresIn: '7d' }
     );
   }

   export function verifyToken(token: string): JWTPayload | null {
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

       // Backward compatibility: convert old tokens
       if ('role' in decoded && !('roles' in decoded)) {
         return {
           ...decoded,
           roles: [decoded.role as Role],
           primaryRole: decoded.role as Role,
         };
       }

       return decoded;
     } catch {
       return null;
     }
   }
   ```

3. ✅ Update login endpoint
   ```typescript
   // app/api/auth/login/route.ts
   export async function POST(request: NextRequest) {
     // ... existing validation ...

     const user = await prisma.user.findUnique({
       where: { email },
       include: {
         roles: { select: { role: true, isPrimary: true } },
         profile: true
       }
     });

     // ... password verification ...

     const token = await signToken(user.id, user.email);

     return NextResponse.json({
       success: true,
       token,
       user: {
         id: user.id,
         email: user.email,
         roles: user.roles,
         primaryRole: getPrimaryRole(user.roles),
         profile: user.profile
       }
     });
   }
   ```

### Phase 3: Service Layer Updates (2 hours)

**Goals:**
- Update all service context interfaces
- Update role checks in services
- Maintain functionality

**Strategy:**
1. Create shared `ServiceContext` type
2. Update each service file systematically
3. Test after each service update

**Tasks:**

1. ✅ Create shared context type
   ```typescript
   // lib/services/service-context.ts
   import { Role } from '@/types/prisma-enums';

   export interface ServiceContext {
     userId: string;
     roles: Role[];
     primaryRole: Role;
   }

   export function hasRole(context: ServiceContext, ...roles: Role[]): boolean {
     return context.roles.some(r => roles.includes(r));
   }

   export function hasAllRoles(context: ServiceContext, ...roles: Role[]): boolean {
     return roles.every(r => context.roles.includes(r));
   }

   export function isAdmin(context: ServiceContext): boolean {
     return hasRole(context, 'ADMIN');
   }

   export function isAdminOrHead(context: ServiceContext): boolean {
     return hasRole(context, 'ADMIN', 'HEAD_TEACHER');
   }
   ```

2. ✅ Update service files (systematically)

   **Template for updates:**
   ```typescript
   // Before
   import { Role } from '@/types/prisma-enums';

   interface ServiceContext {
     userId: string;
     role: Role;
   }

   private canManage(context: ServiceContext): boolean {
     return ['ADMIN', 'HEAD_TEACHER'].includes(context.role);
   }

   // After
   import { ServiceContext, hasRole } from '@/lib/services/service-context';

   private canManage(context: ServiceContext): boolean {
     return hasRole(context, 'ADMIN', 'HEAD_TEACHER');
   }
   ```

   **Files to update:**
   - [ ] `features/academic-years/academicYear.service.ts`
   - [ ] `features/assessments/assessment.service.ts`
   - [ ] `features/attendance/attendance.service.ts`
   - [ ] `features/classes/class.service.ts`
   - [ ] `features/departments/department.service.ts`
   - [ ] `features/enrollments/enrollment.service.ts`
   - [ ] `features/grade-levels/gradeLevel.service.ts`
   - [ ] `features/parents/parent.service.ts`
   - [ ] `features/permissions/permission.service.ts`
   - [ ] `features/promotions/promotion.service.ts`
   - [ ] `features/report-cards/reportCard.service.ts`
   - [ ] `features/students/student.service.ts`
   - [ ] `features/subjects/subject.service.ts`
   - [ ] `features/teachers/teacher.service.ts`
   - [ ] `features/terms/term.service.ts`
   - [ ] `features/timetables/timetable.service.ts`

3. ✅ Update service tests
   - Update mock contexts to include `roles` array
   - Update test assertions

### Phase 4: API Routes Updates (2 hours)

**Goals:**
- Update all API routes to use new auth structure
- Ensure consistent error messages
- Test each endpoint

**Tasks:**

1. ✅ Create API auth helper
   ```typescript
   // lib/api/auth-helpers.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { verifyToken } from '@/lib/auth/jwt';
   import { Role } from '@/types/prisma-enums';

   export function getAuthContext(request: NextRequest) {
     const authHeader = request.headers.get('authorization');
     if (!authHeader?.startsWith('Bearer ')) {
       return { error: 'Unauthorized', status: 401 };
     }

     const token = authHeader.substring(7);
     const decoded = verifyToken(token);
     if (!decoded) {
       return { error: 'Invalid or expired token', status: 401 };
     }

     return {
       context: {
         userId: decoded.userId,
         roles: decoded.roles,
         primaryRole: decoded.primaryRole,
         email: decoded.email
       }
     };
   }

   export function requireRole(
     context: { roles: Role[] },
     ...allowedRoles: Role[]
   ): NextResponse | null {
     if (!context.roles.some(r => allowedRoles.includes(r))) {
       return NextResponse.json(
         { error: 'Insufficient permissions' },
         { status: 403 }
       );
     }
     return null;
   }
   ```

2. ✅ Update API routes (template)
   ```typescript
   // Before
   const decoded = verifyToken(token);
   if (decoded.role !== 'ADMIN') {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
   }

   // After
   const authResult = getAuthContext(request);
   if ('error' in authResult) {
     return NextResponse.json(
       { error: authResult.error },
       { status: authResult.status }
     );
   }

   const { context } = authResult;
   const forbidden = requireRole(context, 'ADMIN');
   if (forbidden) return forbidden;
   ```

3. ✅ Update API routes systematically
   - [ ] `app/api/permissions/**/route.ts` (Priority: High)
   - [ ] `app/api/academic-years/**/route.ts`
   - [ ] `app/api/students/**/route.ts`
   - [ ] `app/api/teachers/**/route.ts`
   - [ ] `app/api/classes/**/route.ts`
   - [ ] `app/api/subjects/**/route.ts`
   - [ ] `app/api/assessments/**/route.ts`
   - [ ] `app/api/attendance/**/route.ts`
   - [ ] `app/api/report-cards/**/route.ts`
   - [ ] All other API routes

### Phase 5: UI Components (1 hour)

**Goals:**
- Update permissions management UI
- Update role display throughout app
- Ensure smooth UX

**Tasks:**

1. ✅ Update role assignment component
   ```tsx
   // components/permissions/role-assignment.tsx

   interface RoleWithStatus {
     role: Role;
     isPrimary: boolean;
   }

   export function RoleAssignment({ user, onUpdate }: RoleAssignmentProps) {
     const [selectedRoles, setSelectedRoles] = useState<Role[]>(
       user.roles.map(r => r.role)
     );
     const [primaryRole, setPrimaryRole] = useState<Role>(user.primaryRole);

     const toggleRole = (role: Role) => {
       if (selectedRoles.includes(role)) {
         if (selectedRoles.length === 1) {
           toast({ title: "Error", description: "User must have at least one role" });
           return;
         }
         setSelectedRoles(prev => prev.filter(r => r !== role));
         if (primaryRole === role) {
           setPrimaryRole(selectedRoles.find(r => r !== role)!);
         }
       } else {
         setSelectedRoles(prev => [...prev, role]);
       }
     };

     const handleSave = async () => {
       await updateUserRoles(user.id, selectedRoles, primaryRole);
       onUpdate();
     };

     return (
       <div className="space-y-4">
         <div className="space-y-2">
           {ROLES.map(role => (
             <div key={role.value} className="flex items-center justify-between p-3 border rounded">
               <div className="flex items-center gap-3">
                 <Checkbox
                   checked={selectedRoles.includes(role.value)}
                   onCheckedChange={() => toggleRole(role.value)}
                 />
                 <div>
                   <Label className="font-medium">{role.label}</Label>
                   <p className="text-xs text-muted-foreground">
                     {role.description}
                   </p>
                 </div>
               </div>
               {selectedRoles.includes(role.value) && (
                 <RadioGroup value={primaryRole} onValueChange={setPrimaryRole}>
                   <div className="flex items-center gap-2">
                     <RadioGroupItem value={role.value} id={`primary-${role.value}`} />
                     <Label htmlFor={`primary-${role.value}`} className="text-xs">
                       Primary
                     </Label>
                   </div>
                 </RadioGroup>
               )}
             </div>
           ))}
         </div>
         <Button onClick={handleSave} disabled={selectedRoles.length === 0}>
           Save Role Changes
         </Button>
       </div>
     );
   }
   ```

2. ✅ Update user list table
   ```tsx
   // components/permissions/users-list-table.tsx

   export function UsersListTable({ users }: UsersListTableProps) {
     return (
       <Table>
         <TableBody>
           {users.map(user => (
             <TableRow key={user.id}>
               <TableCell>{user.email}</TableCell>
               <TableCell>
                 <div className="flex gap-1 flex-wrap">
                   {user.roles.map(userRole => (
                     <Badge
                       key={userRole.role}
                       variant={userRole.isPrimary ? "default" : "secondary"}
                       className="text-xs"
                     >
                       {formatRole(userRole.role)}
                       {userRole.isPrimary && (
                         <Star className="ml-1 h-3 w-3 fill-current" />
                       )}
                     </Badge>
                   ))}
                 </div>
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     );
   }
   ```

3. ✅ Update hooks
   ```typescript
   // hooks/usePermissions.ts

   export interface UserWithPermissions {
     id: string;
     email: string;
     roles: { role: Role; isPrimary: boolean }[];
     primaryRole: Role;
     profile?: TeacherProfile;
     permissions: UserPermission[];
   }

   export function usePermissions() {
     async function updateUserRoles(
       userId: string,
       roles: Role[],
       primaryRole: Role
     ) {
       const response = await fetch(`/api/permissions/users/${userId}/roles`, {
         method: 'PATCH',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ roles, primaryRole })
       });

       if (!response.ok) throw new Error('Failed to update roles');
       return response.json();
     }

     return { updateUserRoles, ... };
   }
   ```

4. ✅ Create new API endpoint for role management
   ```typescript
   // app/api/permissions/users/[id]/roles/route.ts

   export async function PATCH(
     request: NextRequest,
     { params }: { params: { id: string } }
   ) {
     const authResult = getAuthContext(request);
     if ('error' in authResult) {
       return NextResponse.json({ error: authResult.error }, { status: authResult.status });
     }

     const { context } = authResult;
     const forbidden = requireRole(context, 'ADMIN');
     if (forbidden) return forbidden;

     const { id } = await params;
     const { roles, primaryRole } = await request.json();

     // Validate
     if (!Array.isArray(roles) || roles.length === 0) {
       return NextResponse.json(
         { error: 'User must have at least one role' },
         { status: 400 }
       );
     }

     if (!roles.includes(primaryRole)) {
       return NextResponse.json(
         { error: 'Primary role must be one of the assigned roles' },
         { status: 400 }
       );
     }

     // Prevent self-role change
     if (id === context.userId) {
       return NextResponse.json(
         { error: 'Cannot change your own roles' },
         { status: 400 }
       );
     }

     // Update roles in transaction
     await prisma.$transaction(async (tx) => {
       // Delete existing roles
       await tx.userRole.deleteMany({ where: { userId: id } });

       // Create new roles
       await tx.userRole.createMany({
         data: roles.map(role => ({
           userId: id,
           role,
           isPrimary: role === primaryRole
         }))
       });
     });

     return NextResponse.json({ success: true });
   }
   ```

### Phase 6: Testing (2 hours)

**Goals:**
- Comprehensive testing of all changes
- Verify no regressions
- Test multi-role scenarios

**Test Cases:**

1. ✅ **Authentication Tests**
   - [ ] Login generates correct JWT with roles array
   - [ ] Token verification handles old and new format
   - [ ] Refresh token works with new structure

2. ✅ **Authorization Tests**
   - [ ] Single role user can access appropriate routes
   - [ ] Multi-role user can access all appropriate routes
   - [ ] User without required role is denied access
   - [ ] Admin + Teacher can access both admin and teacher routes

3. ✅ **Service Layer Tests**
   - [ ] Service context correctly passed with roles array
   - [ ] Role checks work correctly
   - [ ] Permission aggregation from multiple roles works

4. ✅ **API Tests**
   - [ ] All API endpoints accept new token format
   - [ ] Role-based endpoints authorize correctly
   - [ ] Error messages are appropriate

5. ✅ **UI Tests**
   - [ ] Role assignment shows all user roles
   - [ ] Can add/remove roles
   - [ ] Primary role selection works
   - [ ] Role badges display correctly

6. ✅ **Multi-Role Scenarios**
   ```typescript
   // Test Scenario 1: HOD who teaches
   {
     userId: "user1",
     roles: [
       { role: "HOD", isPrimary: true },
       { role: "TEACHER", isPrimary: false }
     ]
   }
   // Should be able to:
   // - Manage department (HOD)
   // - View department reports (HOD)
   // - Mark attendance (TEACHER)
   // - Enter results (TEACHER)

   // Test Scenario 2: Deputy Head who teaches
   {
     userId: "user2",
     roles: [
       { role: "DEPUTY_HEAD", isPrimary: true },
       { role: "TEACHER", isPrimary: false }
     ]
   }
   // Should be able to:
   // - Manage classes (DEPUTY_HEAD)
   // - View all reports (DEPUTY_HEAD)
   // - Teach classes (TEACHER)
   // - Mark attendance (TEACHER)

   // Test Scenario 3: Admin only
   {
     userId: "user3",
     roles: [
       { role: "ADMIN", isPrimary: true }
     ]
   }
   // Should have full system access
   ```

7. ✅ **Data Integrity Tests**
   - [ ] All users have at least one role
   - [ ] Each user has exactly one primary role
   - [ ] No duplicate roles per user
   - [ ] Role enum values are valid

8. ✅ **Migration Verification**
   ```sql
   -- All users migrated
   SELECT COUNT(*) FROM users
   WHERE id NOT IN (SELECT user_id FROM user_roles);
   -- Should return 0

   -- All users have primary role
   SELECT u.email
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
   WHERE ur.id IS NULL;
   -- Should return 0 rows

   -- No duplicate roles per user
   SELECT user_id, role, COUNT(*)
   FROM user_roles
   GROUP BY user_id, role
   HAVING COUNT(*) > 1;
   -- Should return 0 rows
   ```

### Phase 7: Cleanup (30 minutes)

**Goals:**
- Remove old role column from User table
- Remove backward compatibility code
- Update documentation

**Tasks:**

1. ✅ Remove old field from schema
   ```prisma
   model User {
     // REMOVE:
     // role Role @default(TEACHER)

     // Keep only:
     roles UserRole[]
   }
   ```

2. ✅ Create final migration
   ```bash
   npx prisma migrate dev --name remove_old_role_column
   ```

3. ✅ Remove backward compatibility from JWT
   ```typescript
   // Remove this block from verifyToken:
   // if ('role' in decoded && !('roles' in decoded)) { ... }
   ```

4. ✅ Update documentation
   - [ ] Update SCHEMA_DOCUMENTATION.md
   - [ ] Update API documentation
   - [ ] Add migration notes to CHANGELOG

5. ✅ Final verification
   ```bash
   npm run build
   npm run test
   npx prisma validate
   ```

---

## Testing Strategy

### Unit Tests

**Auth Layer**
```typescript
// tests/lib/auth/jwt.test.ts
describe('JWT Multi-Role', () => {
  it('should generate token with multiple roles', async () => {
    const token = await signToken('user1', 'test@example.com');
    const decoded = verifyToken(token);

    expect(decoded.roles).toBeInstanceOf(Array);
    expect(decoded.roles.length).toBeGreaterThan(0);
    expect(decoded.primaryRole).toBeDefined();
  });

  it('should handle single role user', async () => {
    // User with only TEACHER role
    const token = await signToken('user2', 'teacher@example.com');
    const decoded = verifyToken(token);

    expect(decoded.roles).toEqual(['TEACHER']);
    expect(decoded.primaryRole).toBe('TEACHER');
  });

  it('should handle multi-role user', async () => {
    // User with HOD + TEACHER
    const token = await signToken('user3', 'hod@example.com');
    const decoded = verifyToken(token);

    expect(decoded.roles).toContain('HOD');
    expect(decoded.roles).toContain('TEACHER');
    expect(decoded.primaryRole).toBe('HOD');
  });
});
```

**Service Layer**
```typescript
// tests/features/academic-years/academicYear.service.test.ts
describe('AcademicYearService Multi-Role', () => {
  it('should allow ADMIN to create academic year', async () => {
    const context = {
      userId: 'user1',
      roles: ['ADMIN'],
      primaryRole: 'ADMIN'
    };

    await expect(
      academicYearService.createAcademicYear(data, context)
    ).resolves.toBeDefined();
  });

  it('should allow HEAD_TEACHER to create academic year', async () => {
    const context = {
      userId: 'user2',
      roles: ['HEAD_TEACHER'],
      primaryRole: 'HEAD_TEACHER'
    };

    await expect(
      academicYearService.createAcademicYear(data, context)
    ).resolves.toBeDefined();
  });

  it('should allow multi-role user with appropriate role', async () => {
    const context = {
      userId: 'user3',
      roles: ['HOD', 'TEACHER'],
      primaryRole: 'HOD'
    };

    // HOD shouldn't be able to create academic year
    await expect(
      academicYearService.createAcademicYear(data, context)
    ).rejects.toThrow('Unauthorized');
  });
});
```

### Integration Tests

**API Endpoints**
```typescript
// tests/api/permissions/users/roles.test.ts
describe('POST /api/permissions/users/[id]/roles', () => {
  it('should add role to user', async () => {
    const response = await fetch('/api/permissions/users/user1/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'TEACHER', isPrimary: false })
    });

    expect(response.status).toBe(200);

    const user = await prisma.user.findUnique({
      where: { id: 'user1' },
      include: { roles: true }
    });

    expect(user.roles.map(r => r.role)).toContain('TEACHER');
  });

  it('should update primary role', async () => {
    const response = await fetch('/api/permissions/users/user1/roles', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roles: ['ADMIN', 'TEACHER'],
        primaryRole: 'TEACHER'
      })
    });

    expect(response.status).toBe(200);

    const userRoles = await prisma.userRole.findMany({
      where: { userId: 'user1' }
    });

    const primaryRole = userRoles.find(r => r.isPrimary);
    expect(primaryRole?.role).toBe('TEACHER');
  });

  it('should prevent removing last role', async () => {
    const response = await fetch('/api/permissions/users/user1/roles', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roles: [], primaryRole: null })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('at least one role')
    });
  });
});
```

### E2E Tests

**User Scenarios**
```typescript
// tests/e2e/multi-role-scenarios.test.ts
describe('Multi-Role User Scenarios', () => {
  it('HOD who teaches should access both dashboards', async () => {
    // Login as HOD+TEACHER
    const { token } = await login('hod@school.com', 'password');

    // Should access HOD dashboard
    const hodResponse = await fetch('/api/hod/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(hodResponse.status).toBe(200);

    // Should access teacher dashboard
    const teacherResponse = await fetch('/api/teacher/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(teacherResponse.status).toBe(200);
  });

  it('DEPUTY_HEAD+TEACHER can manage classes and teach', async () => {
    const { token } = await login('deputy@school.com', 'password');

    // Can create class (DEPUTY_HEAD permission)
    const createClass = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Grade 10A', gradeId: 'grade10' })
    });
    expect(createClass.status).toBe(201);

    // Can mark attendance (TEACHER permission)
    const markAttendance = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ studentId: 'student1', status: 'PRESENT' })
    });
    expect(markAttendance.status).toBe(201);
  });
});
```

### Manual Testing Checklist

**Authentication Flow**
- [ ] Login with single-role user
- [ ] Login with multi-role user
- [ ] Token contains roles array
- [ ] Token contains primaryRole
- [ ] Old tokens are rejected or converted

**Role Management**
- [ ] View user's current roles
- [ ] Add new role to user
- [ ] Remove role from user
- [ ] Change primary role
- [ ] Cannot remove last role
- [ ] Cannot have duplicate roles
- [ ] Primary role must be in assigned roles

**Authorization**
- [ ] Single-role user can access appropriate routes
- [ ] Multi-role user can access all appropriate routes
- [ ] User without role is denied
- [ ] Error messages are clear

**UI Components**
- [ ] Role badges display correctly
- [ ] Primary role is highlighted
- [ ] Role assignment interface works
- [ ] Multi-select checkboxes function
- [ ] Primary role radio buttons work

**Edge Cases**
- [ ] User with no roles (shouldn't be possible)
- [ ] User with ADMIN role only
- [ ] User with all roles
- [ ] Changing roles while logged in
- [ ] Multiple users same role

---

## Rollback Plan

### If Issues Detected in Phase 1-2 (Schema/Auth)

**Steps:**
1. Stop deployment
2. Keep `User.role` column (don't drop it)
3. Revert code changes via git
   ```bash
   git checkout main
   ```
4. No data loss - `UserRole` table is additive

### If Issues Detected in Phase 3-5 (Service/API/UI)

**Steps:**
1. Revert to previous git commit
   ```bash
   git revert <commit-hash>
   git push
   ```
2. Database remains in dual-state (both fields exist)
3. Can retry implementation with fixes

### If Critical Issues in Production

**Emergency Rollback:**
```bash
# 1. Restore database backup
psql -U postgres -d school_db < backup_before_multi_role.sql

# 2. Revert code
git reset --hard <commit-before-multi-role>
git push --force

# 3. Restart application
pm2 restart school-app

# 4. Notify users to re-login
```

### Validation After Rollback

```sql
-- Verify User.role column exists and is populated
SELECT COUNT(*) FROM users WHERE role IS NOT NULL;

-- Verify system is functional
SELECT id, email, role, is_active FROM users LIMIT 10;
```

---

## Post-Implementation

### Monitoring (First 48 Hours)

**Metrics to Watch:**
- Login success rate
- 401/403 error rate on API endpoints
- Token refresh rate
- User complaints/support tickets

**Queries:**
```sql
-- Users without roles (shouldn't exist)
SELECT u.* FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL;

-- Users without primary role
SELECT u.email, COUNT(ur.id) as role_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
HAVING SUM(CASE WHEN ur.is_primary THEN 1 ELSE 0 END) = 0;

-- Role distribution
SELECT role, COUNT(*) as user_count
FROM user_roles
GROUP BY role
ORDER BY user_count DESC;

-- Multi-role users
SELECT u.email, COUNT(ur.id) as role_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
HAVING COUNT(ur.id) > 1;
```

### Documentation Updates

**Files to Update:**
- [x] `docs/SCHEMA_DOCUMENTATION.md` - Update User model
- [x] `docs/MULTI_ROLE_IMPLEMENTATION_PLAN.md` - This document
- [ ] `docs/API_DOCUMENTATION.md` - Update auth endpoints
- [ ] `README.md` - Update authentication section
- [ ] `CHANGELOG.md` - Add multi-role release notes

### Training Materials

**For Administrators:**
- How to assign multiple roles
- Understanding primary vs secondary roles
- Best practices for role assignment
- Common scenarios (HOD+TEACHER, DEPUTY+TEACHER)

**For Developers:**
- Using new ServiceContext
- Role check helper functions
- Testing multi-role scenarios
- Migration guide for custom features

### Performance Optimization

**After Stabilization:**
1. Add database indexes if needed
   ```sql
   CREATE INDEX IF NOT EXISTS idx_user_roles_lookup
   ON user_roles(user_id, role);
   ```

2. Cache role lookups in JWT (already done)

3. Monitor query performance
   ```sql
   EXPLAIN ANALYZE
   SELECT u.*, array_agg(ur.role) as roles
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   WHERE u.email = 'test@example.com'
   GROUP BY u.id;
   ```

---

## Success Criteria

### Phase Completion Checklist

**Phase 1: Schema** ✅
- [x] UserRole table created
- [x] Migration script runs successfully
- [x] Data migrated (all users have ≥1 role)
- [x] No data loss verified

**Phase 2: Authentication** ✅
- [ ] JWT includes roles array
- [ ] Token verification works
- [ ] Login generates correct tokens
- [ ] Tests pass

**Phase 3: Service Layer** ✅
- [ ] All service files updated
- [ ] Role checks use new format
- [ ] ServiceContext updated
- [ ] Tests pass

**Phase 4: API Routes** ✅
- [ ] All API routes updated
- [ ] Authorization works correctly
- [ ] Error messages appropriate
- [ ] Tests pass

**Phase 5: UI Components** ✅
- [ ] Role assignment UI works
- [ ] Role display updated
- [ ] User experience smooth
- [ ] No console errors

**Phase 6: Testing** ✅
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing complete

**Phase 7: Cleanup** ✅
- [ ] Old column removed
- [ ] Backward compatibility removed
- [ ] Documentation updated
- [ ] Build succeeds

### Production Readiness

- [ ] All tests pass (100% success rate)
- [ ] No critical bugs
- [ ] Performance acceptable (login <500ms)
- [ ] Rollback plan tested
- [ ] Team trained
- [ ] Documentation complete

---

## Timeline

| Phase | Duration | Dependencies | Risk |
|-------|----------|--------------|------|
| **0. Preparation** | 1 hour | None | Low |
| **1. Schema Changes** | 30 min | Phase 0 | Low |
| **2. Authentication** | 1 hour | Phase 1 | Medium |
| **3. Service Layer** | 2 hours | Phase 2 | Medium |
| **4. API Routes** | 2 hours | Phase 3 | Medium |
| **5. UI Components** | 1 hour | Phase 4 | Low |
| **6. Testing** | 2 hours | Phase 5 | High |
| **7. Cleanup** | 30 min | Phase 6 | Low |
| **TOTAL** | **10 hours** | Sequential | **Medium** |

**Recommended Schedule:**
- **Day 1 (4 hours):** Phases 0-2 (Preparation, Schema, Auth)
- **Day 2 (4 hours):** Phases 3-4 (Services, API)
- **Day 3 (2 hours):** Phases 5-7 (UI, Testing, Cleanup)

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | Critical | Low | Full backup + test migration first |
| Users locked out after deployment | High | Medium | Keep dual system temporarily |
| Performance degradation | Medium | Low | Add indexes, cache roles in JWT |
| Breaking existing integrations | High | Medium | Backward compatible JWT verification |
| Incomplete role check updates | Medium | Medium | Systematic file-by-file approach |
| UI bugs in role management | Low | Medium | Thorough manual testing |

---

## Approval & Sign-off

**Implementation Plan Approved By:**
- [ ] Lead Developer: _____________________ Date: _______
- [ ] System Architect: ___________________ Date: _______
- [ ] QA Lead: ____________________________ Date: _______

**Production Deployment Approved By:**
- [ ] Technical Lead: _____________________ Date: _______
- [ ] Product Owner: ______________________ Date: _______

---

## Appendix

### A. Code Snippets

#### Prisma Migration Script
```prisma
-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

#### Data Migration Script
```typescript
// scripts/migrate-user-roles.ts
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        role: user.role,
        isPrimary: true,
        assignedAt: user.createdAt,
      },
    });
  }

  console.log(`Migrated ${users.length} users to UserRole table`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### B. Reference Links

- [Prisma Multi-field Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [RBAC Design Patterns](https://auth0.com/blog/role-based-access-control-rbac-and-react-apps/)

### C. Contact & Support

**Implementation Team:**
- Lead Developer: [Your Name]
- Database Admin: [DBA Name]
- QA Lead: [QA Name]

**For Questions:**
- Slack: #multi-role-implementation
- Email: dev-team@school.com

---

**END OF DOCUMENT**
