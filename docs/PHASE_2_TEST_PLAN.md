# Phase 2: Invalidation Testing Plan

**Status:** Ready for Manual Testing
**Date:** 2026-01-10

---

## Test Scenario: Teacher Assignment Cross-Role Synchronization

### Objective
Verify that when an Admin assigns a teacher to a class, the teacher sees the new class assignment immediately upon navigation without requiring a manual page refresh.

### Prerequisites
- Application running locally or in test environment
- Two browser sessions (or one normal + one incognito):
  - Session 1: Logged in as ADMIN
  - Session 2: Logged in as TEACHER

### Test Steps

#### Step 1: Initial State
1. **Teacher Session:** Navigate to `/teacher/classes`
2. **Verify:** Note the current list of classes assigned to the teacher
3. **Verify:** If no classes assigned, note the empty state message

#### Step 2: Admin Assigns Teacher to Class
1. **Admin Session:** Navigate to `/admin/classes` (or wherever class management is)
2. **Admin Action:** Assign the teacher to a new class (or reassign to a different class)
3. **Verify:** Admin sees success message
4. **Verify:** Assignment saved successfully (check in database if needed)

#### Step 3: Teacher Navigation (Critical Test)
1. **Teacher Session:** Click away from "My Classes" page to any other page (e.g., Dashboard)
2. **Teacher Session:** Navigate back to `/teacher/classes`
3. **VERIFY (Critical):** Teacher sees the newly assigned class **immediately** without manual refresh
4. **VERIFY:** No stale data is displayed
5. **VERIFY:** Class appears in appropriate tab (Class Teacher or Subject Teacher)

#### Step 4: Verify Class Details
1. **Teacher Session:** Click on the newly assigned class
2. **VERIFY:** Class details load correctly
3. **VERIFY:** Student list loads (if applicable)
4. **VERIFY:** No console errors

#### Step 5: Verify Reverse Flow (Remove Assignment)
1. **Admin Session:** Remove the teacher's class assignment
2. **Teacher Session:** Navigate away and back to `/teacher/classes`
3. **VERIFY:** Class is no longer visible
4. **VERIFY:** Teacher sees appropriate empty state or remaining classes

---

## Expected Behavior

### ✅ Success Criteria
- Teacher sees new class assignment within 1 second of navigation
- No manual refresh required
- No console errors
- Invalidation signal fires correctly
- `fetchClasses()` called when page becomes visible

### ❌ Failure Indicators
- Teacher must manually refresh to see new assignment
- Stale data persists after navigation
- Console errors related to invalidation
- Infinite refetch loops

---

## Technical Verification (Optional)

### Console Debugging
Add these console logs temporarily to verify invalidation flow:

**In `useClasses.ts` (assignClassTeacher):**
```typescript
console.log('[INVALIDATION] Broadcasting: teacher-classes');
invalidationBus.invalidate('classes', 'teachers', 'teacher-classes');
```

**In `/teacher/classes/page.tsx` (invalidation handler):**
```typescript
useInvalidation('teacher-classes', () => {
  console.log('[INVALIDATION] Received: teacher-classes, visible:', document.visibilityState);
  if (document.visibilityState === 'visible') {
    console.log('[INVALIDATION] Refetching classes...');
    fetchClasses();
  }
});
```

### Expected Console Output
```
[INVALIDATION] Broadcasting: teacher-classes
[INVALIDATION] Received: teacher-classes, visible: visible
[INVALIDATION] Refetching classes...
```

---

## Known Limitations (Expected Behavior)

1. **Page Must Be Visible:** Invalidation only triggers refetch if page is visible (hidden tabs won't refetch until activated)
2. **Navigation Required:** Teacher must navigate to the page (backend doesn't push updates in real-time)
3. **Single Tab Context:** If teacher has multiple tabs open, only visible tab refetches immediately

---

## Troubleshooting

### Issue: Class Doesn't Appear After Assignment
**Check:**
- Is teacher session still authenticated? (check localStorage for `auth_token`)
- Did admin assignment actually succeed? (check network tab)
- Is invalidation signal firing? (check console logs)
- Is teacher's browser tab visible? (hidden tabs skip refetch)

### Issue: Infinite Refetch Loop
**Check:**
- Is `fetchClasses` wrapped in useCallback or defined outside component?
- Is invalidation being called on every render accidentally?

### Issue: 401 Unauthorized Errors
**Check:**
- Is auth token expired?
- Log out and log back in to refresh token

---

## Test Result Template

```markdown
## Test Result: [Date]
- **Tester:** [Name]
- **Environment:** [Local/Staging/Production]
- **Result:** [PASS/FAIL]

### Step 1: Initial State
- [ ] Teacher session shows current class list

### Step 2: Admin Assignment
- [ ] Admin successfully assigns teacher to class
- [ ] Success message displayed

### Step 3: Teacher Navigation
- [ ] Teacher navigates away and back to /teacher/classes
- [ ] New class appears immediately (no manual refresh)

### Step 4: Class Details
- [ ] Class details load correctly
- [ ] No console errors

### Step 5: Reverse Flow
- [ ] Admin removes assignment
- [ ] Teacher no longer sees class after navigation

### Notes:
[Any observations, issues, or comments]
```

---

## Next Steps After Testing

### If Test PASSES ✅
1. Mark Phase 2 as COMPLETE in `PHASE_2_INVALIDATION.md`
2. Remove console.log debugging statements
3. Commit changes with message:
   ```
   feat: Add invalidation layer for teacher class assignments

   - Implement lightweight invalidation bus
   - Add eager refetch to Teacher "My Classes" page
   - Teacher sees new assignments without manual refresh

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```
4. Deploy to staging/production
5. Monitor for user feedback

### If Test FAILS ❌
1. Capture console logs and network tab
2. Document exact failure scenario
3. Review invalidation bus implementation
4. Check timing of invalidate() calls (must be after success)
5. Verify useInvalidation hook subscription/cleanup

---

**Remember:** This is a minimal implementation. DO NOT expand to other mutations/pages unless users report issues.
