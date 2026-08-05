# Role Hierarchy Testing Guide

This guide will help you test the newly implemented Role Hierarchy Authorization System.

---

## Quick Start Testing

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test User Accounts

Create test accounts with different roles to test the hierarchy:

```sql
-- Create test users (adjust based on your actual user creation process)
INSERT INTO User (id, email, password, role) VALUES
  ('teacher1', 'teacher@school.com', 'hashed_password', 'TEACHER'),
  ('hod1', 'hod@school.com', 'hashed_password', 'HOD'),
  ('deputy1', 'deputy@school.com', 'hashed_password', 'DEPUTY_HEAD'),
  ('head1', 'head@school.com', 'hashed_password', 'HEAD_TEACHER'),
  ('admin1', 'admin@school.com', 'hashed_password', 'ADMIN');
```

---

## Test Scenarios

### Test 1: Dashboard Access Hierarchy ✅

**Objective**: Verify users can access dashboards based on role hierarchy

#### Steps:

1. **Login as TEACHER** (`teacher@school.com`)
   - ✅ Should see Teacher dashboard
   - ✅ Should NOT see dashboard switcher (only 1 accessible dashboard)
   - ❌ Manually navigate to `/hod/dashboard` → Should redirect to `/teacher/dashboard`

2. **Login as HOD** (`hod@school.com`)
   - ✅ Should see HOD dashboard by default
   - ✅ Should see dashboard switcher with 2 options: "HOD" and "Teacher"
   - ✅ Click "Teacher" → Should navigate to `/teacher/dashboard`
   - ✅ Should be able to access teacher features

3. **Login as DEPUTY_HEAD** (`deputy@school.com`)
   - ✅ Should see Deputy Head dashboard
   - ✅ Should see dashboard switcher with 3 options: "Deputy Head", "HOD", "Teacher"
   - ✅ Can switch between all three dashboards
   - ✅ Can access features from all lower roles

4. **Login as HEAD_TEACHER** (`head@school.com`)
   - ✅ Should see Head Teacher dashboard
   - ✅ Should see dashboard switcher with 4 options
   - ✅ Can access all dashboards except Admin

5. **Login as ADMIN** (`admin@school.com`)
   - ✅ Should see Admin dashboard
   - ✅ Should see dashboard switcher with all 5 options
   - ✅ Can access ANY dashboard

**Expected Results:**
- Higher roles can access lower role dashboards
- Dashboard switcher only appears for users with 2+ accessible dashboards
- Current dashboard is highlighted with a checkmark

---

### Test 2: Service Authorization ✅

**Objective**: Verify service-level authorization works correctly

#### Test 2.1: Assessment Creation (TEACHER+)

1. **As TEACHER** - Create an assessment via API:
   ```bash
   curl -X POST http://localhost:3000/api/assessments \
     -H "Authorization: Bearer <teacher_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Quiz","subjectId":"...", ...}'
   ```
   - ✅ Should succeed (200/201)

2. **As HOD** - Create an assessment:
   ```bash
   curl -X POST http://localhost:3000/api/assessments \
     -H "Authorization: Bearer <hod_token>" \
     -d '{"name":"Test Quiz", ...}'
   ```
   - ✅ Should succeed (HOD inherits TEACHER permissions)

3. **As CLERK** - Create an assessment:
   ```bash
   curl -X POST http://localhost:3000/api/assessments \
     -H "Authorization: Bearer <clerk_token>" \
     -d '{"name":"Test Quiz", ...}'
   ```
   - ❌ Should fail with 403 Forbidden

#### Test 2.2: Student Management (CLERK+)

1. **As CLERK** - Create a student:
   ```bash
   curl -X POST http://localhost:3000/api/students \
     -H "Authorization: Bearer <clerk_token>" \
     -d '{"firstName":"John","lastName":"Doe", ...}'
   ```
   - ✅ Should succeed

2. **As HOD** - Create a student:
   ```bash
   curl -X POST http://localhost:3000/api/students \
     -H "Authorization: Bearer <hod_token>" \
     -d '{"firstName":"Jane","lastName":"Doe", ...}'
   ```
   - ✅ Should succeed (HOD has higher authority)

3. **As TEACHER** - Create a student:
   ```bash
   curl -X POST http://localhost:3000/api/students \
     -H "Authorization: Bearer <teacher_token>" \
     -d '{"firstName":"Bob","lastName":"Smith", ...}'
   ```
   - ❌ Should fail with 403 Forbidden

#### Test 2.3: Hard Deletes (ADMIN only)

1. **As ADMIN** - Delete a student:
   ```bash
   curl -X DELETE http://localhost:3000/api/students/<id> \
     -H "Authorization: Bearer <admin_token>"
   ```
   - ✅ Should succeed

2. **As HEAD_TEACHER** - Delete a student:
   ```bash
   curl -X DELETE http://localhost:3000/api/students/<id> \
     -H "Authorization: Bearer <head_token>"
   ```
   - ❌ Should fail with 403 Forbidden

**Expected Results:**
- Authorization happens at service level, not route level
- Higher roles inherit lower role permissions
- Proper HTTP status codes (403 for Forbidden)
- Clear error messages

---

### Test 3: Grade Management Security ✅

**Objective**: Verify the critical vulnerability fix for grade management

#### Test 3.1: Create Grades (TEACHER+)

1. **As TEACHER** - Enter grades:
   ```bash
   curl -X POST http://localhost:3000/api/assessments/<id>/results \
     -H "Authorization: Bearer <teacher_token>" \
     -d '{"studentId":"...","marks":85}'
   ```
   - ✅ Should succeed

2. **As CLERK** - Try to enter grades:
   ```bash
   curl -X POST http://localhost:3000/api/assessments/<id>/results \
     -H "Authorization: Bearer <clerk_token>" \
     -d '{"studentId":"...","marks":85}'
   ```
   - ❌ Should fail with 403 Forbidden

#### Test 3.2: Delete Grades (ADMIN only)

1. **As ADMIN** - Delete a grade:
   ```bash
   curl -X DELETE http://localhost:3000/api/assessment-results/<id> \
     -H "Authorization: Bearer <admin_token>"
   ```
   - ✅ Should succeed

2. **As HEAD_TEACHER** - Try to delete a grade:
   ```bash
   curl -X DELETE http://localhost:3000/api/assessment-results/<id> \
     -H "Authorization: Bearer <head_token>"
   ```
   - ❌ Should fail with 403 Forbidden

**Expected Results:**
- Only TEACHER+ can enter grades
- Only ADMIN can delete grades
- Critical security vulnerability is fixed

---

### Test 4: Route Authorization ✅

**Objective**: Verify client-side route protection works

#### Steps:

1. **Login as TEACHER**
   - Manually type `/hod/dashboard` in browser
   - ✅ Should automatically redirect to `/teacher/dashboard`

2. **Login as HOD**
   - Manually type `/teacher/dashboard` in browser
   - ✅ Should allow access (HOD can access teacher routes)
   - Manually type `/admin/overview` in browser
   - ❌ Should redirect to `/hod/dashboard`

3. **Without Login**
   - Try to access any dashboard route
   - ✅ Should redirect to `/login`

**Expected Results:**
- `canAccessRoute()` properly enforces hierarchy
- Unauthorized users redirected to their default dashboard
- Unauthenticated users redirected to login

---

### Test 5: Dashboard Switcher UI ✅

**Objective**: Verify dashboard switcher works correctly

#### Steps:

1. **Login as HOD**
   - ✅ Dashboard switcher should appear in navbar
   - ✅ Should show "HOD View" as current selection
   - ✅ Click switcher → Should show 2 options: "HOD" and "Teacher"
   - ✅ Click "Teacher" → Should navigate to teacher dashboard
   - ✅ Switcher should now show "Teacher View" as current
   - ✅ Current option should have checkmark

2. **Login as DEPUTY_HEAD**
   - ✅ Should show 3 options: "Deputy Head", "HOD", "Teacher"
   - ✅ Can switch between all three
   - ✅ Navigation works correctly

3. **Login as TEACHER**
   - ❌ Dashboard switcher should NOT appear (only 1 dashboard)

**Expected Results:**
- Switcher only appears for users with 2+ dashboards
- Shows all accessible dashboards based on hierarchy
- Navigation works correctly
- Current dashboard is highlighted

---

## Automated Testing (Optional)

### Unit Tests Example

```typescript
// tests/role-hierarchy.test.ts
import { describe, it, expect } from 'vitest';
import { getEffectiveRoles, hasRoleAuthority, getAccessibleDashboards } from '@/lib/auth/role-hierarchy';
import { Role } from '@/types/prisma-enums';

describe('Role Hierarchy', () => {
  describe('getEffectiveRoles', () => {
    it('HOD should have TEACHER permissions', () => {
      const roles = getEffectiveRoles(Role.HOD);
      expect(roles).toContain(Role.HOD);
      expect(roles).toContain(Role.TEACHER);
    });

    it('DEPUTY_HEAD should have HOD and TEACHER permissions', () => {
      const roles = getEffectiveRoles(Role.DEPUTY_HEAD);
      expect(roles).toContain(Role.DEPUTY_HEAD);
      expect(roles).toContain(Role.HOD);
      expect(roles).toContain(Role.TEACHER);
    });

    it('TEACHER should only have TEACHER permissions', () => {
      const roles = getEffectiveRoles(Role.TEACHER);
      expect(roles).toEqual([Role.TEACHER]);
    });
  });

  describe('hasRoleAuthority', () => {
    it('HOD has authority over TEACHER', () => {
      expect(hasRoleAuthority(Role.HOD, Role.TEACHER)).toBe(true);
    });

    it('TEACHER does not have authority over HOD', () => {
      expect(hasRoleAuthority(Role.TEACHER, Role.HOD)).toBe(false);
    });

    it('Same level roles have equal authority', () => {
      expect(hasRoleAuthority(Role.TEACHER, Role.CLERK)).toBe(true);
      expect(hasRoleAuthority(Role.CLERK, Role.TEACHER)).toBe(true);
    });
  });

  describe('getAccessibleDashboards', () => {
    it('HOD should have 2 accessible dashboards', () => {
      const dashboards = getAccessibleDashboards(Role.HOD);
      expect(dashboards).toHaveLength(2);
      expect(dashboards[0].role).toBe(Role.HOD);
      expect(dashboards[1].role).toBe(Role.TEACHER);
    });

    it('TEACHER should have 1 accessible dashboard', () => {
      const dashboards = getAccessibleDashboards(Role.TEACHER);
      expect(dashboards).toHaveLength(1);
      expect(dashboards[0].role).toBe(Role.TEACHER);
    });
  });
});
```

### Integration Tests Example

```typescript
// tests/api/assessments.test.ts
import { describe, it, expect } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as assessmentRoute from '@/app/api/assessments/route';

describe('POST /api/assessments', () => {
  it('allows TEACHER to create assessment', async () => {
    await testApiHandler({
      handler: assessmentRoute.POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer teacher_token',
          },
          body: JSON.stringify({ name: 'Test Quiz', /* ... */ }),
        });

        expect(res.status).toBe(201);
      },
    });
  });

  it('allows HOD to create assessment', async () => {
    // HOD inherits TEACHER permissions
    await testApiHandler({
      handler: assessmentRoute.POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer hod_token',
          },
          body: JSON.stringify({ name: 'Test Quiz' }),
        });

        expect(res.status).toBe(201);
      },
    });
  });

  it('rejects CLERK from creating assessment', async () => {
    await testApiHandler({
      handler: assessmentRoute.POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer clerk_token',
          },
          body: JSON.stringify({ name: 'Test Quiz' }),
        });

        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toContain('Permission denied');
      },
    });
  });
});
```

---

## Common Issues & Solutions

### Issue 1: Dashboard Switcher Not Appearing

**Symptoms**: HOD doesn't see dashboard switcher

**Possible Causes:**
1. User role not properly passed to Navbar component
2. `getAccessibleDashboards()` not returning multiple dashboards

**Debug Steps:**
```javascript
// In navbar component, add console.log:
console.log('User role:', user?.role);
console.log('Dashboards:', getAccessibleDashboards(user.role as Role));
```

**Solution:**
- Check user data is properly stored in localStorage
- Verify role is correctly typed as Role enum

---

### Issue 2: Authorization Still Failing

**Symptoms**: HOD cannot access teacher features

**Possible Causes:**
1. Service not using role hierarchy helpers
2. Manual role checks still in place

**Debug Steps:**
```typescript
// Check if service is using correct authorization:
// ✅ Good:
requireMinimumRole(context, Role.TEACHER, "Permission denied");

// ❌ Bad:
if (context.role !== "TEACHER") throw new Error("Unauthorized");
```

**Solution:**
- Search codebase for manual role checks
- Replace with `requireMinimumRole()` or `requireAnyRole()`

---

### Issue 3: 401 vs 403 Error Codes

**Symptoms**: Getting 401 instead of 403 for permission denied

**Possible Causes:**
1. Not using centralized error handling
2. Old error handling code

**Solution:**
```typescript
// Use instanceof checks:
if (error instanceof UnauthorizedError) {
  return NextResponse.json({ error: error.message }, { status: 403 });
}
```

---

## Performance Testing

### Check Authorization Performance

```typescript
// Measure time for authorization check
console.time('auth-check');
requireMinimumRole(context, Role.TEACHER, "Permission denied");
console.timeEnd('auth-check');
// Should be < 1ms (no database queries)
```

### Expected Performance:
- Role hierarchy checks: **< 1ms** (pure computation)
- Service authorization: **< 1ms** (no DB queries)
- API route handling: **< 10ms** (total)

---

## Success Criteria ✅

The implementation is successful if ALL of these are true:

- [ ] HOD can access teacher dashboard via switcher
- [ ] HOD can create assessments (inherited from TEACHER)
- [ ] TEACHER cannot create students (CLERK+ only)
- [ ] Only ADMIN can hard delete records
- [ ] Unauthorized users get 403 with clear error messages
- [ ] Dashboard switcher appears only for multi-dashboard users
- [ ] Route protection prevents unauthorized access
- [ ] No security vulnerabilities in grade management
- [ ] Authorization checks are < 1ms (no DB queries)
- [ ] All 27 service files use centralized authorization

---

## Reporting Issues

If you find any issues during testing:

1. **Document the issue:**
   - What you did (steps to reproduce)
   - What you expected
   - What actually happened
   - User role being tested

2. **Check the logs:**
   - Browser console for client-side errors
   - Server logs for API errors
   - Network tab for API response codes

3. **Reference the documentation:**
   - [ROLE_HIERARCHY_SYSTEM.md](./ROLE_HIERARCHY_SYSTEM.md)
   - [SECURITY_REVIEW_REPORT.md](./SECURITY_REVIEW_REPORT.md)
   - [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)

---

**Happy Testing!** 🚀

The Role Hierarchy Authorization System should now be working perfectly. If all tests pass, the system is **production ready**.
