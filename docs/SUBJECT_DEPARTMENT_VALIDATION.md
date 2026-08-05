# Subject Department Change Validation

## Overview

This document explains how department changes for subjects are validated and controlled in the system.

## Configuration

**File:** `config/subject-validation.config.ts`

```typescript
export const SUBJECT_VALIDATION_MODE: SubjectValidationMode = "APPROACH_C_STRICT";
```

You can toggle between two modes:
- `"APPROACH_B_WARNING"` - Warning with confirmation
- `"APPROACH_C_STRICT"` - Strict blocking (default)

---

## Approach B: Warning with Confirmation ⚠️

### How it works

1. **User changes department** in Edit Subject Dialog
2. **System checks usage** via `/api/subjects/[id]/usage`
3. **If subject is in use**, shows warning dialog with details
4. **User can proceed** after acknowledging the impact

### When to use

- ✅ Small to medium schools
- ✅ Trusted admin users
- ✅ Flexible data management requirements
- ✅ Need to fix historical data issues

### Pros

- Flexible - allows admins to make corrections
- User-friendly - not blocking, just informing
- Good for fixing mistakes
- Clear visibility into impact

### Cons

- Doesn't prevent data inconsistencies
- Requires admin judgment
- Relies on user understanding the warning

### UI Flow

```
1. Admin clicks "Update Subject"
   ↓
2. System detects department change
   ↓
3. Fetches usage data from API
   ↓
4. Shows warning dialog:
   ┌─────────────────────────────────────┐
   │ ⚠️ Subject In Use                   │
   │                                     │
   │ This subject has:                   │
   │ • 5 teachers assigned               │
   │ • 3 classes teaching                │
   │ • 12 assessments recorded           │
   │                                     │
   │ Changing from "Science" to "Math"   │
   │ might affect reports.               │
   │                                     │
   │ [Cancel] [Continue Anyway]          │
   └─────────────────────────────────────┘
   ↓
5. Admin chooses:
   - Continue → Update proceeds
   - Cancel → No changes made
```

### Implementation

**Frontend:** `components/subjects/edit-subject-dialog.tsx`
- Checks `SUBJECT_VALIDATION_MODE`
- If `APPROACH_B_WARNING`, fetches usage data
- Shows `DepartmentChangeWarningDialog` if in use
- Proceeds after confirmation

**Backend:** `features/subjects/subject.service.ts`
- Validation is **skipped** in warning mode
- Update proceeds regardless of usage

---

## Approach C: Strict Blocking 🔒 (Default)

### How it works

1. **User changes department** in Edit Subject Dialog
2. **Backend validates** before update
3. **If subject is in use**, throws `ValidationError`
4. **Update is blocked** with detailed error message

### When to use

- ✅ Large schools with many admins
- ✅ Strict audit requirements
- ✅ Mission-critical data integrity
- ✅ Complex department hierarchies
- ✅ Schools with external reporting requirements

### Pros

- Maximum data integrity
- Forces proper cleanup process
- Clear audit trail
- Prevents accidental changes
- No risk of orphaned relationships

### Cons

- Can frustrate admins
- Requires more work to make changes
- Less flexible for fixing mistakes
- May need admin intervention for edge cases

### UI Flow

```
1. Admin clicks "Update Subject"
   ↓
2. System sends update request
   ↓
3. Backend validates department change
   ↓
4. If in use, returns 400 error:
   {
     "error": "Cannot modify department while subject is in use..."
   }
   ↓
5. Frontend shows error toast:
   ┌─────────────────────────────────────┐
   │ ❌ Error                            │
   │                                     │
   │ Cannot modify department while      │
   │ subject is in use. This subject has:│
   │                                     │
   │ • 5 teachers assigned               │
   │ • 3 classes teaching this subject   │
   │                                     │
   │ To change departments, you must:    │
   │ 1. Unassign all teachers            │
   │ 2. Remove from class timetables     │
   │ 3. Archive assessment records       │
   │                                     │
   │ Note: Historical grade data prevents│
   │ department changes.                 │
   └─────────────────────────────────────┘
```

### Implementation

**Frontend:** `components/subjects/edit-subject-dialog.tsx`
- Submits update request normally
- Backend validation handles blocking
- Shows error message if rejected

**Backend:** `features/subjects/subject.service.ts`
- Checks `SUBJECT_VALIDATION_MODE`
- If `APPROACH_C_STRICT`, runs `validateDepartmentChange()`
- Throws `ValidationError` if subject is in use
- Error bubbles up to API layer (400 status)

---

## Usage Data Checked

Both approaches check the same usage data:

| Relationship | Description |
|--------------|-------------|
| **Teachers** | TeacherSubject assignments |
| **Classes** | SubjectTeacherAssignment (timetables) |
| **Assessments** | Assessment records |
| **Grades** | ReportCardSubject (student grades) |
| **Timetables** | ClassTimetable + SecondaryTimetable slots |

---

## API Endpoint

### `GET /api/subjects/[id]/usage`

Returns usage statistics for a subject.

**Response:**
```json
{
  "isInUse": true,
  "hasTeachers": true,
  "teacherCount": 5,
  "hasClasses": true,
  "classCount": 3,
  "hasAssessments": true,
  "assessmentCount": 12,
  "hasGrades": true,
  "gradeCount": 150,
  "hasTimetableSlots": true,
  "timetableSlotCount": 8,
  "subject": {
    "id": "...",
    "name": "Mathematics",
    "code": "MATH",
    "departmentId": "..."
  }
}
```

---

## Switching Modes

### To enable Warning Mode (Approach B):

1. Open `config/subject-validation.config.ts`
2. Change to:
   ```typescript
   export const SUBJECT_VALIDATION_MODE: SubjectValidationMode = "APPROACH_B_WARNING";
   ```
3. Restart dev server (for config change to take effect)
4. Test by editing a subject with active usage

### To enable Strict Mode (Approach C):

1. Open `config/subject-validation.config.ts`
2. Change to:
   ```typescript
   export const SUBJECT_VALIDATION_MODE: SubjectValidationMode = "APPROACH_C_STRICT";
   ```
3. Restart dev server
4. Test by editing a subject with active usage

---

## Testing

### Test Case 1: Subject with no usage

**Expected:** Both modes allow department change without warnings/errors

1. Create a new subject
2. Don't assign to any teachers/classes
3. Edit subject and change department
4. ✅ Should succeed immediately

### Test Case 2: Subject with teachers assigned

**Expected:**
- **Approach B:** Shows warning, allows continuation
- **Approach C:** Blocks with error message

1. Create subject and assign to 2 teachers
2. Edit subject and change department
3. **Approach B:** Warning dialog appears, click "Continue Anyway"
4. **Approach C:** Error toast appears, update blocked

### Test Case 3: Subject with grades recorded

**Expected:**
- **Approach B:** Shows warning with grade count, allows continuation
- **Approach C:** Blocks with message about historical data

1. Create subject and record student grades
2. Edit subject and change department
3. Both modes should highlight the grade data impact

---

## Recommendations

### Start with Approach C (Strict)

- Default configuration
- Maximum data integrity
- Forces proper data management
- Can always relax to Approach B later

### Switch to Approach B if:

- Admins frequently hit blocking errors
- Need to fix historical data issues
- School prefers flexibility over strictness
- Have robust training for admins

---

## Database Schema

The `Subject` model has an **optional** `departmentId` foreign key:

```prisma
model Subject {
  id           String      @id @default(cuid())
  code         String      @unique
  name         String
  description  String?
  departmentId String?     // ← Optional (nullable)

  // Relations
  department   Department? @relation(fields: [departmentId], references: [id])
  teachers     TeacherSubject[]
  classes      SubjectTeacherAssignment[]
  assessments  Assessment[]
  // ... more relations

  @@index([departmentId])
}
```

**Key points:**
- `departmentId` can be `null` (no department)
- Changing from `null` → departmentId is allowed (assigning)
- Changing from departmentId → `null` is allowed (removing)
- Changing from departmentIdA → departmentIdB is allowed (changing)

Both validation approaches **allow these operations** but control **when** they're allowed based on usage.

---

## Security Considerations

### Authorization

Only `ADMIN` and `HEAD_TEACHER` roles can update subjects (enforced in service layer).

### Input Validation

- Department ID is validated to exist in database
- Circular references are prevented by Prisma schema

### Audit Trail

All subject updates are logged with:
- User ID
- Timestamp
- Old and new department IDs
- Success/failure status

---

## Future Enhancements

1. **Soft Migration:** Allow department change but migrate related records
2. **Scheduled Changes:** Queue department changes for future date
3. **Batch Operations:** Change multiple subjects' departments at once
4. **Custom Rules:** Per-department policies for changes
5. **Approval Workflow:** Require head teacher approval for changes

---

## Summary

| Feature | Approach B (Warning) | Approach C (Strict) |
|---------|---------------------|---------------------|
| **Default** | No | ✅ Yes |
| **User Experience** | Flexible, informative | Strict, protective |
| **Data Integrity** | Depends on user judgment | Enforced by system |
| **Best For** | Small schools, trusted admins | Large schools, compliance |
| **Implementation** | Frontend dialog | Backend validation |
| **Error Handling** | Warning → Proceed | Block → Error message |

**Current Mode:** `APPROACH_C_STRICT` (configurable in `config/subject-validation.config.ts`)
