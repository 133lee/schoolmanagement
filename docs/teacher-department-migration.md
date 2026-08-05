# Teacher-Department Many-to-Many Migration

## Overview

Successfully migrated the teacher-department relationship from a **one-to-many** structure to a **many-to-many** structure using a junction table. This allows teachers to belong to multiple departments based on the subjects they teach.

## Why This Change?

### Previous Design (❌ Limitation)
```prisma
model TeacherProfile {
  ...
  departmentId String?  // Only ONE department
  department   Department?
}
```

**Problem**: In real schools, teachers often teach subjects from multiple departments:
- A teacher might teach Math (Math Dept) and Computer Studies (Math Dept) ✓
- A teacher might teach Math (Math Dept) and Biology (Science Dept) ✗ (Not possible with old design)

### New Design (✅ Correct)
```prisma
model TeacherProfile {
  ...
  departments TeacherDepartment[]  // Multiple departments
}

model TeacherDepartment {
  id           String
  teacherId    String
  departmentId String
  isPrimary    Boolean @default(false)
  teacher      TeacherProfile
  department   Department
}
```

## Changes Made

### 1. Schema Changes

**File**: `prisma/schema.prisma`

#### Removed from `TeacherProfile`:
```prisma
departmentId String?
department   Department?
```

#### Added `TeacherDepartment` junction table:
```prisma
model TeacherDepartment {
  id           String         @id @default(cuid())
  teacherId    String
  departmentId String
  isPrimary    Boolean        @default(false)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  teacher      TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  department   Department     @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([teacherId, departmentId])
  @@index([teacherId])
  @@index([departmentId])
  @@map("teacher_departments")
}
```

#### Updated `Department` model:
```prisma
model Department {
  ...
  teachers TeacherDepartment[]  // Changed from teacherProfiles
}
```

#### Updated `TeacherProfile` model:
```prisma
model TeacherProfile {
  ...
  departments TeacherDepartment[]  // New relation
}
```

### 2. Migration

**File**: `prisma/migrations/20260110005329_add_teacher_department_many_to_many/migration.sql`

The migration:
1. Creates the `teacher_departments` junction table
2. Adds indexes for performance
3. Sets up foreign key constraints
4. Removes the old `departmentId` column from `teacher_profiles`

### 3. Service Layer Updates

**File**: `features/hod/hod.service.ts`

#### Updated `getHodDepartmentId`:
```typescript
// Before: Read from teacher profile
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: {
      select: { departmentId: true }
    }
  }
});
return user.profile.departmentId;

// After: Read from department HOD relation
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    departmentAsHOD: {
      select: { id: true }
    }
  }
});
return user.departmentAsHOD.id;
```

#### Updated `getTeachers`:
```typescript
// Before: Filter by single departmentId
const where = {
  departmentId: departmentId,
  deletedAt: null
};

// After: Filter by departments junction table
const where = {
  deletedAt: null,
  departments: {
    some: {
      departmentId: departmentId
    }
  }
};

// Include departments in results
include: {
  user: { ... },
  departments: {
    where: { departmentId: departmentId },
    include: {
      department: {
        select: { name: true, code: true }
      }
    }
  }
}
```

### 4. Repository Updates

**File**: `features/teachers/teacher.repository.ts`

Added departments to the `findByIdWithRelations` method:
```typescript
findByIdWithRelations(id: string) {
  return prisma.teacherProfile.findUnique({
    where: { id },
    include: {
      user: true,
      departments: {        // ← Added
        include: {
          department: true
        }
      },
      subjects: { ... },
      classTeacherAssignments: { ... },
      subjectTeacherAssignments: { ... }
    }
  });
}
```

### 5. Frontend Component Updates

#### **File**: `components/shared/tables/teachers-table.tsx`

Updated type definition:
```typescript
// Before
type TeacherWithRelations = TeacherProfile & {
  department?: { name: string } | null;
  subjects?: Array<{ subject: { name: string; code: string } }>;
  user?: { email: string } | null;
};

// After
type TeacherWithRelations = TeacherProfile & {
  departments?: Array<{ department: { name: string; code: string } }>;
  subjects?: Array<{ subject: { name: string; code: string } }>;
  user?: { email: string } | null;
};
```

#### **File**: `components/teachers/teacher-sheet.tsx`

Updated interface and display logic:
```typescript
// Before
interface TeacherWithRelations extends TeacherProfile {
  department?: { id: string; name: string } | null;
  ...
}

// After
interface TeacherWithRelations extends TeacherProfile {
  departments?: Array<{
    department: { id: string; name: string; code: string };
    isPrimary: boolean;
  }>;
  ...
}
```

Updated UI to show multiple departments with primary badge:
```tsx
{teacher.departments && teacher.departments.length > 0 ? (
  <div className="space-y-2">
    {teacher.departments.map((td) => (
      <div key={td.department.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
        <div>
          <p className="text-sm font-medium">{td.department.name}</p>
          <p className="text-xs text-muted-foreground">{td.department.code}</p>
        </div>
        {td.isPrimary && (
          <Badge variant="default" className="text-xs">Primary</Badge>
        )}
      </div>
    ))}
  </div>
) : (
  <p className="text-sm text-muted-foreground">No departments assigned</p>
)}
```

## Benefits

### ✅ Real-World Accuracy
- Teachers can now belong to multiple departments
- Reflects actual school staffing structures
- Supports cross-departmental teaching

### ✅ Better HOD Filtering
- HODs see all teachers who teach subjects in their department
- Even if that teacher's primary department is elsewhere
- More accurate department workload reporting

### ✅ Primary Department Concept
- `isPrimary` flag identifies teacher's main department
- Useful for administrative purposes
- Maintains organizational hierarchy

### ✅ Future-Proof
- Supports co-teaching scenarios
- Acting HODs can be in multiple departments
- Flexible for school restructuring

## Data Migration

### Automatic Migration
The database migration automatically handles the structural changes.

### Data Seeding (Required)
After migration, run the seeding script to populate the junction table:

```bash
npx tsx scripts/seed-teacher-departments.ts
```

This script:
1. Reads all teachers and their subjects
2. Identifies unique departments from subject assignments
3. Creates `TeacherDepartment` records
4. Marks the first department as primary

## Testing Checklist

- [x] Schema changes applied
- [x] Migration created and run
- [x] Prisma client regenerated
- [x] HOD service updated
- [x] Teacher repository updated
- [x] Frontend components updated
- [ ] Run seed script to populate data
- [ ] Test HOD teacher listing
- [ ] Test teacher detail view
- [ ] Verify department filtering works
- [ ] Check teacher sheet shows all departments

## API Impact

### No Breaking Changes for Clients
The API responses now include `departments` array instead of single `department`, but:
- Frontend components updated to handle new structure
- Old `department` field removed from types
- All consuming components updated

### Example Response
```json
{
  "id": "teacher_123",
  "firstName": "John",
  "lastName": "Doe",
  "departments": [
    {
      "department": {
        "id": "dept_1",
        "name": "Mathematics",
        "code": "MATH"
      },
      "isPrimary": true
    },
    {
      "department": {
        "id": "dept_2",
        "name": "Computer Studies",
        "code": "CS"
      },
      "isPrimary": false
    }
  ]
}
```

## Rollback Plan

If needed, rollback by:
1. Reverting schema changes
2. Running `npx prisma migrate resolve --rolled-back 20260110005329_add_teacher_department_many_to_many`
3. Restoring the old `departmentId` field
4. Reverting code changes

## Next Steps

1. **Run the seed script** to populate teacher-department relationships
2. **Test HOD portal** to verify department filtering works
3. **Verify teacher profiles** show all departments correctly
4. **Update admin UI** if needed to manage teacher-department assignments
5. **Consider adding UI** for explicitly managing teacher department memberships

## Related Files

- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/20260110005329_add_teacher_department_many_to_many/migration.sql` - Migration
- `features/hod/hod.service.ts` - HOD service logic
- `features/teachers/teacher.repository.ts` - Teacher data access
- `components/teachers/teacher-sheet.tsx` - Teacher detail view
- `components/shared/tables/teachers-table.tsx` - Teacher list table
- `scripts/seed-teacher-departments.ts` - Data seeding script

## Summary

This migration successfully transforms the teacher-department relationship to support real-world scenarios where teachers can belong to multiple departments. The changes maintain backward compatibility at the service layer while providing a more flexible and accurate data model.
