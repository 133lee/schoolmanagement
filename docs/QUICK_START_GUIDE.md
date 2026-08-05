# Quick Start Guide - Timetable Configuration Fix

## Problem Fixed

The error `Cannot read properties of undefined (reading 'findUnique')` occurred because:

1. ✅ **Prisma schema** - TimetableConfiguration model was added
2. ✅ **Prisma client** - Regenerated with `npx prisma generate`
3. ✅ **Types export** - Added TimetableConfiguration to `types/prisma-enums.ts`
4. ✅ **Service layer** - Fixed to handle `doublePeriodConfigs`
5. ❌ **Next.js cache** - Still using old Prisma client (needs restart)

## 🚀 Quick Fix (2 steps)

### Step 1: Restart Development Server

**Stop your dev server** (Ctrl+C in terminal) and **restart it**:

```bash
# Option A: Simple restart
npm run dev

# Option B: Clean restart (if issue persists)
rm -rf .next
npm run dev
```

### Step 2: Test the Configuration

1. Open browser and go to **Admin → Timetable → Configuration**
2. Configure school times and periods
3. Enable double periods for subjects (e.g., Science)
4. Click **Save Configuration** - should work now! ✅

## What Was Fixed

### 1. Database Schema ✅
- Added `timetable_configurations` table with `double_period_configs` JSONB column
- Added `timetable_slots` table for generated timetables
- Added `class_subjects` table for curriculum data

### 2. Prisma Models ✅
```prisma
model TimetableConfiguration {
  id                  String   @id @default(cuid())
  academicYearId      String   @unique
  doublePeriodConfigs Json?    // ✅ Stores double period settings
  // ... other fields
}

model TimetableSlot {
  id           String    @id @default(cuid())
  classId      String
  subjectId    String
  teacherId    String
  dayOfWeek    DayOfWeek
  periodNumber Int       // ✅ Used for consecutive double periods
  // ... other fields
}

model ClassSubject {
  id             String  @id @default(cuid())
  classId        String
  subjectId      String
  periodsPerWeek Int     // ✅ Used by solver
  isCore         Boolean
}
```

### 3. Type Exports ✅
```typescript
// types/prisma-enums.ts
export type {
  TimetableConfiguration,  // ✅ Added
  TimetableSlot,           // ✅ Added
  ClassSubject,            // ✅ Added
  // ... other types
} from '@prisma/client';
```

### 4. Service Layer ✅
```typescript
// features/timetables/timetable.service.ts
export interface TimetableConfigInput {
  academicYearId: string;
  // ... other fields
  doublePeriodConfigs?: DoublePeriodConfig[];  // ✅ Added
}

async createOrUpdateConfiguration(input, context) {
  return repository.update(id, {
    // ... other fields
    doublePeriodConfigs: input.doublePeriodConfigs || [],  // ✅ Now saves
  });
}
```

## Full Stack Trace

```
UI (Configuration Page)
  ↓ doublePeriodConfigs state
  ↓
POST /api/admin/timetable/configuration
  ↓ body: { doublePeriodConfigs: [...] }
  ↓
timetableService.createOrUpdateConfiguration()
  ↓ input.doublePeriodConfigs ✅
  ↓
timetableConfigurationRepository.update()
  ↓ Prisma UpdateInput ✅
  ↓
prisma.timetableConfiguration.update()
  ↓ After dev server restart ✅
  ↓
PostgreSQL timetable_configurations table
  ✅ Data saved successfully!
```

## Verification Steps

After restarting the dev server, verify:

1. **Configuration Page Loads**:
   - Go to Admin → Timetable → Configuration
   - Page should load without errors

2. **Subjects Load**:
   - Double period section should show all subjects
   - Console: `GET /api/subjects?mode=all 200`

3. **Configuration Saves**:
   - Check some subjects for double periods
   - Click "Save Configuration"
   - Console: `POST /api/admin/timetable/configuration 200` ✅
   - Success message displayed

4. **Configuration Persists**:
   - Refresh the page
   - Previously checked subjects should still be checked
   - doublePeriodConfigs loaded from database

## Next Steps

Once configuration saving works:

1. **Set Up Curriculum**:
   - Create ClassSubject entries with periodsPerWeek
   - Link classes to subjects

2. **Assign Teachers**:
   - Create SubjectTeacherAssignment entries
   - Link teachers to classes and subjects

3. **Generate Timetable**:
   - Go to Admin → Timetable → Generate
   - Click "Generate Timetable"
   - Solver will create double periods for configured subjects

4. **View Results**:
   - Check generated timetable
   - Verify double periods are consecutive (period N and N+1)
   - Check no teacher/class conflicts

## Troubleshooting

### Issue: Error still occurs after restart

**Solution**:
```bash
# Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

### Issue: TypeScript errors about TimetableConfiguration

**Solution**: The types file was updated, but TypeScript might need to restart its language server:
- **VS Code**: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
- **Other IDEs**: Restart the IDE or close/reopen the project

### Issue: Configuration saves but doublePeriodConfigs is empty

**Solution**: Check the request payload in browser DevTools:
1. Open DevTools → Network tab
2. Save configuration
3. Click the `/api/admin/timetable/configuration` request
4. Check "Payload" tab - should include `doublePeriodConfigs` array

### Issue: Can't find TimetableConfiguration in database

**Solution**: Run database push to ensure tables exist:
```bash
npx prisma db push
```

## Documentation

- [TIMETABLE_STACK_TRACE.md](docs/TIMETABLE_STACK_TRACE.md) - Complete end-to-end trace
- [SCHEMA_MIGRATION_SUMMARY.md](docs/SCHEMA_MIGRATION_SUMMARY.md) - Migration details
- [TIMETABLE_SOLVER_INTEGRATION.md](docs/TIMETABLE_SOLVER_INTEGRATION.md) - Full integration guide
- [RESTART_DEV_SERVER.md](RESTART_DEV_SERVER.md) - Detailed restart instructions

## Summary

**What to do now**:
1. **Restart your dev server** (Ctrl+C → npm run dev)
2. Test configuration saving
3. If it works, proceed with curriculum setup and timetable generation
4. If it doesn't work, clear caches and restart again

The entire stack is now connected:
- ✅ Database tables exist
- ✅ Prisma models defined
- ✅ Types exported
- ✅ Service handles doublePeriodConfigs
- ✅ API passes data through
- ✅ UI sends correct data
- ⏳ **Dev server needs restart to use new Prisma client**

After restart: **Everything should work!** 🎉
