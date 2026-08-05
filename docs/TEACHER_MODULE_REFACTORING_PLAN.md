# Teacher Module Refactoring Plan

**Date:** 2026-01-05
**Status:** In Progress - Phase 1
**Priority:** CRITICAL (Production Blocker)

---

## Overview

This document outlines the complete refactoring of the teacher-facing module to align with the established clean architecture patterns used in the rest of the application.

## Current State Analysis

### Critical Issues Identified

1. **Architecture Bypass** - Teacher routes (`/api/teacher/*`) directly use Prisma, skipping service and repository layers
2. **No Authorization** - Only JWT verification, no permission checks or resource-level authorization
3. **Business Logic in Routes** - 218-line route handlers with complex logic that should be in services
4. **Code Duplication** - Manual data transformation repeated across routes
5. **Inconsistent Error Handling** - Generic 500 errors instead of proper error types
6. **No Logging** - Only `console.error()`, no structured logging

### Files Requiring Refactoring

| File | Lines | Issue |
|------|-------|-------|
| `app/api/teacher/students/route.ts` | 218 | Direct Prisma, complex business logic |
| `app/api/teacher/classes/route.ts` | 153 | Direct Prisma, no service layer |
| `app/api/teacher/profile/route.ts` | 120+ | Direct Prisma, no service layer |
| `app/api/teacher/subjects/route.ts` | 100+ | Direct Prisma, no service layer |
| `app/api/teacher/timetable/route.ts` | 100+ | Direct Prisma, no service layer |
| `app/api/teacher/reports/route.ts` | 80+ | Direct Prisma, no service layer |

---

## Implementation Progress

### ✅ Phase 1.1: Core Infrastructure (COMPLETED)

**Files Created:**

1. ✅ `lib/http/api-response.ts` (3.5 KB)
   - Standardized API response wrapper
   - Methods: `success()`, `created()`, `noContent()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `conflict()`, `internalError()`, `error()`

2. ✅ `lib/http/errors.ts` (2.6 KB)
   - Custom error classes
   - Classes: `ApiError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `InternalServerError`, `ServiceUnavailableError`

3. ✅ `lib/logger/logger.ts` (5.5 KB)
   - Structured logging infrastructure
   - Log levels: DEBUG, INFO, WARN, ERROR
   - Methods: `debug()`, `info()`, `warn()`, `error()`, `logRequest()`, `logResponse()`, `logQuery()`, `logAuth()`, `logPermission()`

4. ✅ `lib/http/with-auth.ts` (4.7 KB)
   - Auth middleware wrapper
   - Functions: `withAuth()`, `withPermission()`, `withRole()`

5. ✅ `lib/http/error-handler.ts` (5.1 KB)
   - Centralized error handling
   - Functions: `handleApiError()`, `handlePrismaError()`, `asyncHandler()`

**Impact:** All future code can now use standardized responses, errors, and logging

---

### 🚧 Phase 1.2: Teacher Service Layer (IN PROGRESS)

**Goal:** Extract all business logic from API routes into reusable service classes

#### Service Classes to Create

1. **TeacherStudentService** (`features/teachers/teacher-student.service.ts`)
   - Handles teacher viewing their students
   - Methods:
     - `getStudentsForTeacher(userId, view, classId)` - Main entry point
     - `getClassTeacherStudents(teacherId, academicYearId)` - Class teacher view
     - `getSubjectTeacherStudents(teacherId, academicYearId, classId)` - Subject teacher view
     - `canAccessClass(userId, classId)` - Authorization check
   - Replaces logic from: `/api/teacher/students/route.ts` (218 lines → ~30 lines)

2. **TeacherClassService** (`features/teachers/teacher-class.service.ts`)
   - Handles teacher viewing their assigned classes
   - Methods:
     - `getClassesForTeacher(userId)` - Get all classes teacher is assigned to
     - `getClassTeacherClasses(teacherId, academicYearId)` - Classes as class teacher
     - `getSubjectTeacherClasses(teacherId, academicYearId)` - Classes as subject teacher
   - Replaces logic from: `/api/teacher/classes/route.ts` (153 lines → ~25 lines)

3. **TeacherProfileService** (`features/teachers/teacher-profile.service.ts`)
   - Handles teacher viewing/updating their profile
   - Methods:
     - `getTeacherProfile(userId)` - Get full profile with relations
     - `updateTeacherProfile(userId, data)` - Update profile (if allowed)
   - Replaces logic from: `/api/teacher/profile/route.ts` (120+ lines → ~20 lines)

4. **Supporting Types** (`features/teachers/teacher-app.types.ts`)
   - Type definitions for all service responses
   - Types: `StudentView`, `ClassView`, `ClassWithStudents`, `TeacherStudentsResponse`, `TeacherClassView`, `TeacherClassesResponse`, `TeacherProfileView`

---

### Phase 1.3: Refactor Teacher Students Endpoint

**File:** `app/api/teacher/students/route.ts`

**Before (218 lines):**
```typescript
export async function GET(request: NextRequest) {
  try {
    // 15 lines: Manual JWT extraction and verification
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) { ... }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // 10 lines: Get teacher profile
    const teacher = await prisma.teacherProfile.findUnique({ ... });
    if (!teacher) { ... }

    // 10 lines: Get academic year
    const academicYear = await prisma.academicYear.findFirst({ ... });
    if (!academicYear) { ... }

    // 80 lines: Class teacher view logic
    if (view === "class-teacher") {
      const assignment = await prisma.classTeacherAssignment.findFirst({ ... });
      // Complex nested includes
      // Manual data transformation
      return NextResponse.json({ ... });
    }

    // 80 lines: Subject teacher view logic
    else {
      const assignments = await prisma.subjectTeacherAssignment.findMany({ ... });
      // Complex nested includes
      // Manual data transformation
      return NextResponse.json({ ... });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

**After (~30 lines):**
```typescript
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherStudentService } from "@/features/teachers/teacher-student.service";

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") as "class-teacher" | "subject-teacher") || "class-teacher";
    const classId = searchParams.get("classId");

    const students = await teacherStudentService.getStudentsForTeacher(
      user.userId,
      view,
      classId
    );

    return ApiResponse.success(students);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, view });
  }
});
```

**Benefits:**
- ✅ 85% code reduction (218 → 30 lines)
- ✅ Business logic moved to testable service
- ✅ Standardized auth via `withAuth` middleware
- ✅ Proper error handling
- ✅ Structured logging
- ✅ No code duplication

---

### Phase 1.4: Refactor Teacher Classes Endpoint

**File:** `app/api/teacher/classes/route.ts`

**Before (153 lines):**
```typescript
export async function GET(request: NextRequest) {
  try {
    // Manual JWT extraction (15 lines)
    // Get teacher profile (10 lines)
    // Get academic year (10 lines)
    // Get class teacher assignments (20 lines)
    // Get subject teacher assignments (20 lines)
    // Format class teacher classes with async mapping (30 lines)
    // Format subject teacher classes (20 lines)
    // Combine and deduplicate (15 lines)
    return NextResponse.json({ ... });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

**After (~25 lines):**
```typescript
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherClassService } from "@/features/teachers/teacher-class.service";

export const GET = withAuth(async (request, user) => {
  try {
    const classes = await teacherClassService.getClassesForTeacher(user.userId);
    return ApiResponse.success(classes);
  } catch (error) {
    return handleApiError(error, { userId: user.userId });
  }
});
```

**Benefits:**
- ✅ 84% code reduction (153 → 25 lines)
- ✅ Async mapping logic moved to service
- ✅ Deduplication logic encapsulated
- ✅ Reusable across frontend and other endpoints

---

### Phase 1.5: Refactor Teacher Profile Endpoint

**File:** `app/api/teacher/profile/route.ts`

**Before (120+ lines):**
```typescript
export async function GET(request: NextRequest) {
  try {
    // Manual JWT extraction (15 lines)
    // Complex Prisma query with nested includes (30 lines)
    // Manual data transformation (40 lines)
    return NextResponse.json({ ... });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

**After (~20 lines):**
```typescript
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherProfileService } from "@/features/teachers/teacher-profile.service";

export const GET = withAuth(async (request, user) => {
  try {
    const profile = await teacherProfileService.getTeacherProfile(user.userId);
    return ApiResponse.success(profile);
  } catch (error) {
    return handleApiError(error, { userId: user.userId });
  }
});
```

**Benefits:**
- ✅ 83% code reduction (120 → 20 lines)
- ✅ Complex includes encapsulated in service
- ✅ Data transformation logic reusable

---

### Phase 1.6: Add Authorization Checks

**Current Problem:** Teacher routes only verify JWT exists, not if teacher has permission to access specific resources.

**Example Vulnerability:**
```typescript
// Current: Any authenticated teacher can access any class
GET /api/teacher/students?classId=xyz
// No check if this teacher actually teaches class xyz!
```

**Solution:** Add resource-level authorization in services

```typescript
// In TeacherStudentService
async getStudentsForTeacher(userId: string, view: string, classId?: string) {
  // ... existing code ...

  // If classId is specified, verify teacher has access
  if (classId) {
    const hasAccess = await this.canAccessClass(userId, classId);
    if (!hasAccess) {
      throw new ForbiddenError("You do not have access to this class");
    }
  }

  // ... continue with business logic ...
}
```

**Authorization Checks to Add:**
1. ✅ `canAccessClass(userId, classId)` - Verify teacher teaches/manages class
2. ✅ `canAccessStudent(userId, studentId)` - Verify student is in teacher's class
3. ✅ `canAccessAssessment(userId, assessmentId)` - Verify teacher owns assessment
4. ✅ `canViewReports(userId, classId)` - Verify teacher can view class reports

---

## Phase 2: Code Quality Improvements

### Phase 2.1: Remove API Request Duplication

**Problem:** The `apiRequest()` helper is duplicated in 14 custom hooks (~400 lines total)

**Files Affected:**
- `hooks/useStudents.ts`
- `hooks/useTeachers.ts`
- `hooks/useClasses.ts`
- `hooks/useDepartments.ts`
- `hooks/useParents.ts`
- `hooks/useSubjects.ts`
- `hooks/usePermissions.ts`
- `hooks/useTeacherStudents.ts`
- `hooks/useStudentPerformance.ts`
- And 5 more...

**Solution:**

1. Update all hooks to use centralized `lib/api-client.ts`
2. Remove duplicated `apiRequest()` from each hook
3. Use consistent API client

**Before:**
```typescript
// Duplicated in every hook
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = { "Authorization": `Bearer ${token}` };
  const response = await fetch(`/api${endpoint}`, { ...options, headers });
  return response.json();
}
```

**After:**
```typescript
import { api } from "@/lib/api-client";

// Use centralized client
const response = await api.get<Student[]>("/students");
```

### Phase 2.2: Implement Validation Schemas

**Problem:** All `*.validation.ts` files are empty (1 line each). No input validation at API boundaries.

**Files to Implement:**
- `features/students/student.validation.ts`
- `features/teachers/teacher.validation.ts`
- `features/assessments/assessment.validation.ts`
- `features/classes/class.validation.ts`
- And 16+ more...

**Solution:** Implement Zod schemas for all domains

**Example:**
```typescript
// features/students/student.validation.ts
import { z } from "zod";

export const CreateStudentSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(["MALE", "FEMALE"]),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "TRANSFERRED"]),
  // ... all fields
});

export const UpdateStudentSchema = CreateStudentSchema.partial();
```

**Usage in API Routes:**
```typescript
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const validated = CreateStudentSchema.safeParse(body);

  if (!validated.success) {
    return ApiResponse.badRequest("Invalid input", validated.error.format());
  }

  const student = await studentService.createStudent(validated.data, { userId: user.userId, role: user.role });
  return ApiResponse.created(student);
});
```

### Phase 2.4: Move JWT to HttpOnly Cookies

**Current Problem:** JWT stored in localStorage (XSS vulnerability)

**Solution:**

1. Update `/api/auth/login` to set httpOnly cookie instead of returning token in response
2. Update `lib/http/with-auth.ts` to read from cookie instead of Authorization header
3. Update frontend to not store token in localStorage

**Implementation:**

```typescript
// In /api/auth/login
const token = generateToken(user);

// Set httpOnly cookie
const response = ApiResponse.success({ user: { id, email, role } });
response.cookies.set("auth_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: "/",
});

return response;
```

```typescript
// In lib/http/with-auth.ts
export function withAuth(handler: AuthenticatedRouteHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Read from cookie instead of header
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return ApiResponse.unauthorized("Missing authentication");
    }

    // ... rest of verification
  };
}
```

---

## Expected Outcomes

### Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Teacher API Route Lines | 850+ | ~150 | 82% reduction |
| Code Duplication | ~400 lines | 0 | 100% elimination |
| Test Coverage | 0% | 80%+ | N/A |
| Authorization Checks | 0 | 6+ | N/A |
| Logging | Console only | Structured | N/A |
| Error Handling | Generic 500s | Typed errors | N/A |

### Maintainability

- ✅ Business logic in testable service classes
- ✅ Consistent patterns across all modules
- ✅ Single source of truth for teacher operations
- ✅ Easy to add new teacher features
- ✅ Clear separation of concerns

### Security

- ✅ Resource-level authorization checks
- ✅ Input validation at API boundaries
- ✅ HttpOnly cookies (XSS protection)
- ✅ Structured audit logging
- ✅ Proper error messages (no info leakage)

### Performance

- ✅ No performance degradation (same queries)
- ✅ Potential for service-level caching
- ✅ Reusable queries across endpoints

---

## Implementation Timeline

**Total Estimated Time:** 2-3 weeks

### Week 1 (Critical - Security & Architecture)
- ✅ Day 1-2: Core infrastructure (COMPLETED)
- 🚧 Day 3-4: Teacher service layer (IN PROGRESS)
- Day 5: Refactor teacher API routes

### Week 2 (High - Code Quality)
- Day 1-2: Remove API request duplication
- Day 3-4: Implement validation schemas
- Day 5: Auth middleware and error handling

### Week 3 (Medium - Production Hardening)
- Day 1-2: Move JWT to httpOnly cookies
- Day 3-4: Add comprehensive tests
- Day 5: Documentation and deployment prep

---

## Risks & Mitigations

### Risk 1: Breaking Changes to Frontend

**Mitigation:**
- Maintain backward compatibility in API responses
- Use feature flags for gradual rollout
- Comprehensive testing before deployment

### Risk 2: Performance Regression

**Mitigation:**
- Profile queries before and after
- Use same Prisma includes (no additional queries)
- Monitor response times in development

### Risk 3: Incomplete Migration

**Mitigation:**
- Migrate one endpoint at a time
- Keep old code until new code is verified
- Comprehensive integration tests

---

## Next Steps

1. ✅ Complete Phase 1.1 (Core Infrastructure) - DONE
2. 🚧 Complete Phase 1.2 (Teacher Service Layer) - IN PROGRESS
3. Refactor teacher API routes one by one (Phase 1.3-1.5)
4. Add authorization checks (Phase 1.6)
5. Begin Phase 2 (Code Quality Improvements)

---

**Document Status:** Living document, updated as implementation progresses
