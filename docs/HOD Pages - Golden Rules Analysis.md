# HOD Pages - Golden Rules Analysis

**Date**: 2026-01-12
**Scope**: All HOD frontend pages analyzed against Golden Rules for System Architecture
**Pages Analyzed**: 8 HOD pages

---

## Executive Summary

**Overall Assessment**: The HOD pages demonstrate **GOOD** adherence to most golden rules, with a few notable violations and areas for improvement.

**Violations Found**: 6
**Compliant Areas**: 8
**Recommendations**: 11

---

## Page-by-Page Analysis

### 1. Dashboard Page (`/hod/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Uses `useHodDashboard` hook which queries real API endpoint
- Displays data from actual dashboard aggregation
- No made-up fields or imaginary schema

**Rule 9: Computed vs Stored Data**
- Dashboard stats are fetched fresh on every load
- Performance metrics computed in real-time from assessments
- Uses `refetch()` to get latest data, not cached values

**Rule 7: Valid Empty States**
- Handles loading state gracefully
- Shows error UI without treating empty as broken
- Null checks for optional data (e.g., `data.term && ...`)

**Rule 5: Follow Established Patterns**
- Uses standard card layout patterns
- Consistent with other dashboard pages
- Uses established UI components (Card, Button, Tabs)

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - MINOR VIOLATION**
- **Issue**: Tabs content shows "coming soon" placeholders for Performance, Reports
- **Line 345**: `<p className="text-sm text-muted-foreground">Performance analytics coming soon...</p>`
- **Impact**: UI promises functionality that doesn't exist (misleading UX)
- **Recommendation**: Either implement the feature or remove the tab until ready

**Rule 10: Read Before Edit**
- **Not Applicable**: This is a read-only page, no edit operations

---

### 2. Teachers Page (`/hod/teachers/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Uses `useHodTeachers` hook with proper filters
- Queries actual teacher profiles from department
- Uses real Prisma enums (`StaffStatus`, `Gender`, `QualificationLevel`)

**Rule 3: No Cross-Role Side Effects**
- Read-only view (lines 262-263: empty `onEdit` and `onDelete`)
- HOD cannot modify teachers, respecting Admin boundary
- Department scoping enforced at API level

**Rule 5: Follow Established Patterns**
- Identical pagination logic to Admin teachers page
- Reuses `TeachersTable` component
- Consistent filter/search UI pattern

**Rule 7: Valid Empty States**
- Proper empty state handling (lines 233-252)
- Distinguishes between "no data" and "filtered out"
- Shows appropriate message based on filter state

#### ✅ NO VIOLATIONS

**Perfect adherence to golden rules**

---

### 3. Subjects Page (`/hod/subjects/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Uses `useHodSubjects` hook with department scoping
- Queries actual subjects from database
- No invented fields

**Rule 3: No Cross-Role Side Effects**
- Read-only view (lines 187-188: empty `onEdit` and `onDelete`)
- HOD cannot modify subjects
- Clear boundary: HOD views, Admin manages

**Rule 5: Follow Established Patterns**
- Same pagination logic as teachers page
- Reuses `SubjectsTable` component
- Consistent search/filter pattern

**Rule 7: Valid Empty States**
- Proper empty state (lines 164-179)
- Contextual empty message based on search state

#### ✅ NO VIOLATIONS

**Perfect adherence to golden rules**

---

### 4. Classes Page (`/hod/classes/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Uses `useClasses` hook (generic, not HOD-scoped)
- Reads actual class data from database
- Grade filter uses real grade IDs

**Rule 3: No Cross-Role Side Effects**
- Read-only view (lines 242-243: empty `onEdit` and `onDelete`)
- HOD cannot create/modify classes
- Assignment management scoped to secondary grades only

**Rule 6: HARD vs SOFT Invariants**
- **SOFT**: Secondary grades constraint (lines 84-92)
- Business rule: HOD manages grades 8-12 only
- Enforced at UI level via `isSecondaryGrade` check
- **Recommendation**: Also enforce at API level for defense in depth

**Rule 7: Valid Empty States**
- Proper empty state (lines 219-234)
- Contextual message based on filters

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - VIOLATION**
- **Issue**: Hardcoded secondary grade list duplicated from backend
- **Lines 84-90**:
  ```typescript
  const SECONDARY_GRADES = ["GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"];
  ```
- **Problem**: Same constant exists in backend, violating DRY principle
- **Impact**: If secondary grade definition changes, UI must be updated separately
- **Recommendation**:
  - Option A: Fetch from API endpoint `/api/constants/secondary-grades`
  - Option B: Import from shared constants file
  - Option C: Backend returns `isSecondaryGrade` boolean with class data

**Rule 5: Follow Established Patterns - MINOR VIOLATION**
- **Issue**: Uses generic `useClasses` hook instead of HOD-specific hook
- **Line 56**: `const { classes: classesData, meta, isLoading, error, refetch } = useClasses(...)`
- **Problem**: Should use `useHodClasses` for consistency with other HOD pages
- **Recommendation**: Create `useHodClasses` hook that wraps `useClasses` with HOD-specific logic

---

### 5. Profile Page (`/hod/profile/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Fetches profile from `/api/hod/profile`
- Uses actual department data structure
- No invented fields

**Rule 5: Follow Established Patterns**
- Similar to teacher profile page
- Reuses `ChangePasswordCard` component
- Consistent layout with other profile pages

**Rule 7: Valid Empty States**
- Validates response structure (lines 90-92)
- Shows error if invalid response
- Handles missing data gracefully

**Rule 8: Contract Mismatch vs Bug**
- Validates API contract (lines 89-92)
- Throws error if contract violated
- Trusts backend data structure

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - VIOLATION**
- **Issue**: Reads user data from localStorage to check default password
- **Lines 52-60**:
  ```typescript
  const userData = localStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      setHasDefaultPassword(user.hasDefaultPassword || false);
    }
  }
  ```
- **Problem**: Relies on client-side data that could be stale or manipulated
- **Impact**: If API profile says `hasDefaultPassword: true` but localStorage says `false`, inconsistent state
- **Recommendation**: Remove localStorage check, get `hasDefaultPassword` from API response

**Rule 1: Respects Domain Invariants - MINOR VIOLATION**
- **Issue**: Hardcoded role display "Head of Department" instead of using actual role
- **Line 176**: `<span className="text-sm font-medium">Head of Department</span>`
- **Problem**: Assumes all HOD profile viewers have HOD position (true, but hardcoded)
- **Recommendation**: Display `profile.role` from API or "HOD Position" to clarify it's a position

---

### 6. Students Page (`/hod/students/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Uses `useStudents` hook
- Queries actual student data
- Uses real enums (`StudentStatus`, `Gender`)

**Rule 3: No Cross-Role Side Effects**
- Read-only view (lines 253-254: empty `onEdit` and `onDelete`)
- HOD cannot modify students

**Rule 5: Follow Established Patterns**
- Same pagination as other HOD pages
- Reuses `StudentsTable` component
- Consistent filter pattern

**Rule 7: Valid Empty States**
- Proper empty state (lines 230-245)
- Contextual message

**Rule 9: Computed vs Stored Data**
- **Lines 69-80**: Transforms data to extract enrollment info
- Computes `grade`, `className`, `hasGuardian` from relations
- Does NOT store these, computes on render

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - MINOR VIOLATION**
- **Issue**: Client-side data transformation duplicates backend logic
- **Lines 69-80**: Extracts `grade`, `className` from enrollments
- **Problem**: If enrollment structure changes, UI breaks
- **Recommendation**: Backend should return denormalized data with grade/class names to avoid client-side traversal

---

### 7. Reports Page (`/hod/reports/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Fetches real data from multiple HOD report endpoints
- Uses actual grade/class/subject/term IDs
- No invented fields

**Rule 3: No Cross-Role Side Effects**
- Scoped to department subjects only (line 86)
- Fetches department subjects from `/api/hod/reports/subjects`
- No cross-department access

**Rule 5: Follow Established Patterns**
- Reuses admin report components (`SubjectAnalysisContent`, `PerformanceListsContent`)
- Same filter UI pattern
- Consistent tab layout

**Rule 6: HARD vs SOFT Invariants**
- **SOFT**: Secondary grades filter (lines 68-71)
- Filters to grades 8-12 for HOD scope
- Business rule, not database constraint

**Rule 7: Valid Empty States**
- Shows message when filters not selected (lines 201-212, 246-257)
- Graceful handling of no data

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - VIOLATION**
- **Issue**: Hardcoded secondary grades filter in frontend
- **Lines 68-71**:
  ```typescript
  const secondaryGrades = gradesData.grades.filter((g: any) =>
    ["GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"].includes(g.level)
  );
  ```
- **Problem**: Same as classes page - hardcoded business rule
- **Recommendation**: Backend endpoint `/api/hod/reports/grades` should already return only secondary grades (HOD-scoped)

**Rule 8: Contract Mismatch vs Bug - MINOR VIOLATION**
- **Issue**: Uses `any` type for fetched data (lines 68, 80)
- **Lines 68, 80**: `gradesData.grades.filter((g: any) => ...)`, `termsData.terms?.find((t: any) => ...)`
- **Problem**: Loses type safety, could mask contract changes
- **Recommendation**: Define proper TypeScript interfaces for API responses

---

### 8. Class Assignments Page (`/hod/classes/[id]/assignments/page.tsx`)

#### ✅ COMPLIANT

**Rule 1: Respects Domain Invariants**
- Fetches actual class, teachers, subjects from API
- Uses real assignment data structure
- No invented fields

**Rule 2: No UI Hacks**
- Backend validation enforced (department check, grade check, teacher qualification)
- UI submits to API which performs all checks
- Error messages from backend (lines 265-266, 309, 343)

**Rule 3: No Cross-Role Side Effects**
- HOD can only manage assignments for department subjects
- Scoped to HOD's department teachers
- Secondary grades only

**Rule 5: Follow Established Patterns**
- Standard CRUD pattern (create, edit, delete dialogs)
- Consistent error handling with toast notifications
- Reuses UI components (Dialog, Table, Select)

**Rule 6: HARD vs SOFT Invariants**
- **HARD**: Department must exist, teacher must exist, subject must exist
- **SOFT**: Secondary grades constraint (lines 157-167)
- Validates secondary grade before allowing assignment management

**Rule 10: Read Before Edit**
- Fetches full class data before allowing edits
- Loads existing assignments before CRUD operations
- Validates class grade level before showing UI

#### ⚠️ ISSUES

**Rule 2: No UI Hacks - VIOLATION**
- **Issue**: Secondary grades validation duplicated in frontend
- **Lines 157-167**:
  ```typescript
  const SECONDARY_GRADES = ["GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"];
  if (!SECONDARY_GRADES.includes(classDataResult.grade.level)) {
    setError("HOD can only manage assignments for secondary grades (8-12)");
    return;
  }
  ```
- **Problem**: Hardcoded business rule, duplicates backend validation
- **Impact**: If backend API already returns 403 for non-secondary grades, this is redundant
- **Recommendation**: Remove frontend check, trust backend validation, or fetch allowed grades from API

**Rule 8: Contract Mismatch vs Bug - MINOR VIOLATION**
- **Issue**: Assumes API response structure without type safety
- **Lines 188-189**:
  ```typescript
  const teachersData = teachersResult.success ? teachersResult.data : teachersResult;
  setTeachers(Array.isArray(teachersData) ? teachersData : []);
  ```
- **Problem**: Tries to handle both wrapped (`{success, data}`) and unwrapped responses
- **Recommendation**: Standardize API response contract, use typed API client

---

## Summary by Golden Rule

### ✅ Rule 1: Respects Domain Invariants
**Status**: **COMPLIANT** (7/8 pages)
- All pages query actual API endpoints
- Use real Prisma schema fields
- Minor violation in profile page (hardcoded "Head of Department" label)

### ⚠️ Rule 2: No UI Hacks
**Status**: **VIOLATIONS FOUND** (5/8 pages)

**Violations**:
1. **Dashboard**: Placeholder tabs showing "coming soon"
2. **Classes**: Hardcoded `SECONDARY_GRADES` constant
3. **Profile**: Reading `hasDefaultPassword` from localStorage instead of API
4. **Students**: Client-side data transformation (enrollment → grade/class)
5. **Reports**: Hardcoded secondary grades filter
6. **Assignments**: Hardcoded secondary grades validation

**Recommendations**:
- Remove or implement placeholder features
- Move constants to shared backend/frontend file or API endpoint
- Always fetch critical data from API, not localStorage
- Backend should return denormalized data to avoid client-side traversal
- Trust backend validation, remove redundant frontend checks

### ✅ Rule 3: No Cross-Role Side Effects
**Status**: **COMPLIANT** (8/8 pages)
- All pages enforce read-only where appropriate (teachers, subjects, classes, students)
- HOD can only modify assignments (scoped to department + secondary grades)
- No Admin boundary violations
- Clear separation of concerns

### ✅ Rule 4: Explicit About Changes
**Status**: **N/A** (analysis document, not implementation)

### ✅ Rule 5: Follow Established Patterns
**Status**: **MOSTLY COMPLIANT** (7/8 pages)
- All pages use consistent pagination logic
- Reuse shared components (tables, cards, dialogs)
- Follow same filter/search UI patterns
- Minor violation: Classes page uses generic `useClasses` instead of `useHodClasses`

### ✅ Rule 6: HARD vs SOFT Invariants
**Status**: **COMPLIANT** (8/8 pages)
- Correctly distinguish HARD (database) from SOFT (business rules)
- Secondary grades = SOFT invariant (correctly treated as configurable)
- No violations of HARD constraints

### ✅ Rule 7: Valid Empty States
**Status**: **COMPLIANT** (8/8 pages)
- All pages handle empty data gracefully
- Show appropriate messages ("no data" vs "filtered out")
- No treating valid empty as errors
- Good UX for loading/error states

### ⚠️ Rule 8: Contract Mismatch vs Bug
**Status**: **MINOR VIOLATIONS** (2/8 pages)
- **Reports**: Uses `any` type, loses type safety
- **Assignments**: Tries to handle multiple API response formats
- **Recommendation**: Define TypeScript interfaces, standardize API contracts

### ✅ Rule 9: Computed vs Stored Data
**Status**: **COMPLIANT** (8/8 pages)
- Dashboard stats always computed fresh
- No stale cached counts
- Uses `refetch()` to get real-time data
- Students page computes derived data on render

### ✅ Rule 10: Read Before Edit
**Status**: **COMPLIANT** (2/2 editable pages)
- Assignments page fetches class data before allowing edits
- Profile page fetches profile before showing change password
- Other pages are read-only

---

## Critical Recommendations

### High Priority (Security/Data Integrity)

1. **Remove localStorage reliance for `hasDefaultPassword`** (Profile page)
   - **Risk**: Stale data, user manipulation
   - **Fix**: Get from API `/api/hod/profile` response

2. **Eliminate hardcoded SECONDARY_GRADES constants** (Classes, Reports, Assignments)
   - **Risk**: Business rule drift, inconsistency with backend
   - **Fix**: Create `/api/constants/secondary-grades` or import shared constant

### Medium Priority (Code Quality)

3. **Add TypeScript interfaces for API responses** (Reports, Assignments)
   - **Risk**: Runtime errors from contract changes
   - **Fix**: Define `HODProfileResponse`, `AssignmentResponse`, etc.

4. **Standardize API response format** (Assignments)
   - **Risk**: Brittle code handling multiple formats
   - **Fix**: Always use `{success: boolean, data: T, error?: string}`

5. **Remove placeholder tabs** (Dashboard)
   - **Risk**: User confusion, misleading UX
   - **Fix**: Hide tabs until features implemented

### Low Priority (Best Practices)

6. **Create HOD-specific hooks** (Classes page)
   - **Consistency**: Use `useHodClasses` like `useHodTeachers`, `useHodSubjects`
   - **Fix**: Wrap `useClasses` with HOD scoping logic

7. **Backend denormalization** (Students page)
   - **Performance**: Avoid client-side relation traversal
   - **Fix**: API returns `gradeName`, `className` directly

8. **Remove redundant frontend validation** (Assignments)
   - **Simplicity**: Backend already validates secondary grades
   - **Fix**: Remove lines 157-167, trust backend 403 response

---

## Conclusion

**Overall Grade**: **B+ (Good)**

The HOD pages demonstrate solid architectural patterns and mostly comply with the Golden Rules. Key strengths:

✅ **Strengths**:
- Excellent domain boundary enforcement (no cross-role violations)
- Proper read-only enforcement where appropriate
- Good empty state handling
- Consistent pagination and filter patterns
- Real-time computed data (no stale caches)

⚠️ **Areas for Improvement**:
- Eliminate hardcoded business rules (secondary grades)
- Remove localStorage reliance for critical data
- Add TypeScript type safety for API contracts
- Implement or remove placeholder features
- Reduce client-side data transformation

**Recommendation**: Address high-priority issues (localStorage, hardcoded constants) before production deployment. Medium and low priority items can be tackled incrementally during refactoring sprints.

---

**End of Analysis**
