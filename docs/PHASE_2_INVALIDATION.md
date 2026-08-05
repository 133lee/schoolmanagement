# Phase 2: Invalidation Layer Implementation

**Date:** 2026-01-10
**Status:** 🟢 IN PROGRESS

---

## 🎯 Goal

Add lightweight cache invalidation to coordinate cross-page freshness without introducing global state.

**What this is:**
- ✅ Explicit invalidation signals after mutations
- ✅ Hooks subscribe to relevant keys
- ✅ Subscribers decide when to refetch

**What this is NOT:**
- ❌ Global state
- ❌ Shared cache
- ❌ Derived state
- ❌ Real-time sync

---

## 📋 Implementation Status

### ✅ Core Infrastructure (Complete)

- [x] **lib/invalidation.ts** - Invalidation bus with TypeScript-strict keys
- [x] **hooks/useInvalidation.ts** - React hook for subscribing to invalidation events

### 🚧 Mutation Updates (In Progress)

#### High Priority (Operational Impact)

- [x] **useClasses.ts**
  - [x] `assignClassTeacher()` → invalidates `'classes'`, `'teachers'`, `'teacher-classes'`
  - [x] `removeClassTeacher()` → invalidates `'classes'`, `'teachers'`, `'teacher-classes'`

- [ ] **useStudents.ts**
  - [ ] `createStudent()` → invalidates `'students'`, `'admin-dashboard'`, `'enrollments'`
  - [ ] `deleteStudent()` → invalidates `'students'`, `'admin-dashboard'`, `'enrollments'`

- [ ] **useTeachers.ts**
  - [ ] `createTeacher()` → invalidates `'teachers'`, `'admin-dashboard'`
  - [ ] `deleteTeacher()` → invalidates `'teachers'`, `'admin-dashboard'`

#### Medium Priority

- [ ] **Enrollment mutations** (when identified)
  - [ ] `enrollStudent()` → invalidates `'students'`, `'classes'`, `'enrollments'`
  - [ ] `withdrawStudent()` → invalidates `'students'`, `'classes'`, `'enrollments'`

- [ ] **Assessment mutations** (when identified)
  - [ ] `createAssessment()` → invalidates `'assessments'`
  - [ ] `enterGrades()` → invalidates `'assessments'`, `'report-cards'`

#### Low Priority (Manual Refresh Acceptable)

- [ ] Attendance mutations → `'attendance-analytics'` (already has manual refresh button)
- [ ] Report generation → No invalidation needed (static snapshots)

### 🎯 Consumer Updates (Complete)

#### Critical Operational Pages

- [x] **Teacher "My Classes"** (`/teacher/classes/page.tsx`)
  - Subscribe to: `'teacher-classes'`
  - Strategy: **Eager refetch** (operational page)
  - Freshness Policy: Must be current

- [ ] **HOD Dashboard** (`/hod/page.tsx`)
  - Subscribe to: `'hod-dashboard'`
  - Strategy: **Lazy refetch** (next mount)
  - Freshness Policy: Manual refresh acceptable

#### Optional Enhancements

- [ ] **Admin Dashboard** (`/admin/page.tsx`)
  - Subscribe to: `'admin-dashboard'`
  - Strategy: Keep 60s interval OR add lazy invalidation
  - Freshness Policy: 60s acceptable

---

## 📊 Invalidation Contract Matrix

| Mutation | Invalidates | Reason |
|----------|-------------|--------|
| **assignClassTeacher()** | `'classes'`, `'teachers'`, `'teacher-classes'` | Teacher sees new class, class shows new teacher |
| **removeClassTeacher()** | `'classes'`, `'teachers'`, `'teacher-classes'` | Teacher loses class, class shows no teacher |
| **createStudent()** | `'students'`, `'admin-dashboard'`, `'enrollments'` | Student count changed |
| **deleteStudent()** | `'students'`, `'admin-dashboard'`, `'enrollments'` | Student count changed |
| **createTeacher()** | `'teachers'`, `'admin-dashboard'` | Teacher count changed |
| **deleteTeacher()** | `'teachers'`, `'admin-dashboard'` | Teacher count changed |
| **enrollStudent()** | `'students'`, `'classes'`, `'enrollments'` | Enrollment affects multiple views |
| **withdrawStudent()** | `'students'`, `'classes'`, `'enrollments'` | Withdrawal affects multiple views |
| **createAssessment()** | `'assessments'` | New assessment visible to teachers |
| **enterGrades()** | `'assessments'`, `'report-cards'` | Grades affect reports |
| **markAttendance()** | `'attendance-analytics'` | Analytics must refresh (manual button) |

---

## 🎓 Freshness Policy Guide

### Immediate Refetch (Operational Pages)
Pages where stale data causes user confusion or operational errors.

**Examples:**
- Teacher "My Classes" (just assigned, must see it)
- Active workflows (grading, attendance recording)

**Implementation:**
```typescript
/**
 * FRESHNESS POLICY:
 * - Refetch on mount
 * - Immediate refetch on invalidation
 */
useInvalidation('teacher-classes', () => {
  if (document.visibilityState === 'visible') {
    fetchMyClasses(); // Refetch now
  }
});
```

### Lazy Refetch (Summary Pages)
Pages where slight staleness is acceptable.

**Examples:**
- Dashboards (already have 60s interval or manual refresh)
- Analytics (explicit snapshot nature)
- Reports (static data)

**Implementation:**
```typescript
/**
 * FRESHNESS POLICY:
 * - Refetch on mount
 * - No immediate refetch on invalidation
 */
useInvalidation('hod-dashboard', () => {
  // Do nothing - will refetch on next navigation
  // OR mark stale flag if implemented
});
```

### No Refetch (Optimistic Update Pages)
Pages that already update optimistically.

**Examples:**
- Students list (uses optimistic updates)
- Teachers list (uses optimistic updates)
- Classes list (uses optimistic updates)

**Implementation:**
```typescript
// No subscription needed - already consistent
```

---

## 🔍 Testing Scenarios

### Scenario 1: Teacher Assignment
1. Admin assigns teacher to class
2. **Expected:** Teacher navigates to "My Classes" → sees new class immediately
3. **Test:** Subscribe Teacher "My Classes" to `'teacher-classes'`

### Scenario 2: Student Enrollment
1. Admin enrolls new student
2. **Expected:** Student appears in Students list (optimistic update)
3. **Expected:** Dashboard count updates within 60s (acceptable delay)
4. **Test:** No invalidation needed (optimistic update already works)

### Scenario 3: Assessment Creation
1. Teacher creates assessment
2. **Expected:** Assessment appears in teacher's list (optimistic update or refetch)
3. **Expected:** HOD sees assessment on next dashboard visit
4. **Test:** Subscribe HOD dashboard to `'assessments'` (lazy)

---

## 🚫 What NOT to Do

### ❌ Do NOT invalidate on optimistic updates
```typescript
// ❌ WRONG
const createStudent = async (input) => {
  setStudents([newStudent, ...students]); // Optimistic update
  invalidationBus.invalidate('students'); // DON'T DO THIS
};

// ✅ CORRECT
const createStudent = async (input) => {
  const response = await api.post('/students', input);
  setStudents([response.data, ...students]); // Optimistic update
  invalidationBus.invalidate('students', 'admin-dashboard'); // AFTER success
};
```

### ❌ Do NOT invalidate before mutation succeeds
```typescript
// ❌ WRONG
invalidationBus.invalidate('students'); // Before mutation
await createStudent(input);

// ✅ CORRECT
await createStudent(input);
invalidationBus.invalidate('students'); // After success
```

### ❌ Do NOT use invalidation as state management
```typescript
// ❌ WRONG - Using invalidation to share data
invalidationBus.subscribe('students', (newStudents) => {
  setLocalStudents(newStudents); // Treating it as state
});

// ✅ CORRECT - Using invalidation to signal staleness
invalidationBus.subscribe('students', () => {
  fetchStudents(); // Just refetch from source of truth
});
```

---

## 📈 Next Steps

1. **Complete High Priority Mutations** (2-3 hours)
   - Update useStudents, useTeachers with invalidation calls

2. **Update Critical Consumers** (2-3 hours)
   - Teacher "My Classes" page
   - HOD Dashboard (optional)

3. **Test Cross-Page Scenarios** (1 hour)
   - Teacher assignment flow
   - Student enrollment flow

4. **Document Contracts** (30 min)
   - Add "Invalidates:" comments to all mutations
   - Update this file with final matrix

5. **Stop & Reassess** (Phase 2 Complete)
   - Monitor user feedback
   - Only add more if users complain

---

## 📝 Architecture Principles

### Principle 1: Backend is Authoritative
Invalidation signals "ask backend again," not "here's new data."

### Principle 2: Invalidate After Success
Only invalidate when mutation succeeds. Preserve correctness.

### Principle 3: Subscribers Decide Strategy
Invalidation bus doesn't decide when to refetch. Consumers do.

### Principle 4: Semantic, Not Contextual
Keys represent data domains (`'students'`), not contexts (`'admin-students'`).

### Principle 5: Document Contracts
Every mutation that invalidates must document what it invalidates and why.

---

**Phase 2 Target:** 6-8 hours total
**Current Progress:** ~3 hours (infrastructure complete, critical mutations + consumer complete)
**Status:** ✅ READY FOR TESTING - Core implementation complete
