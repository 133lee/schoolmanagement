# Double Period Patterns (2+2+1 Constraint)

## Overview

The timetable solver now automatically applies optimal lesson patterns based on weekly period counts, with a special focus on the **2+2+1 pattern** for 5-period subjects.

## Smart Defaults (Automatic)

The system now automatically applies double period patterns without requiring manual configuration:

### 5 Periods → **2+2+1 Pattern** ✨
- **2 double periods** (4 periods total)
- **1 single period** (1 period)
- **Best for:** Sciences, Languages, Mathematics
- **Benefits:**
  - Deep focus blocks for practical work, labs, and projects
  - Single period for review, assessment, or homework check
  - Better learning retention with concentrated study time

### 4 Periods → **2+2 Pattern**
- **2 double periods** (4 periods total)
- **Best for:** Practical subjects, Computer Studies, Art
- **Benefits:**
  - Consistent extended learning blocks
  - Better for hands-on activities

### 6 Periods → **2+2+2 Pattern**
- **3 double periods** (6 periods total)
- **Best for:** Intensive core subjects
- **Benefits:**
  - All lessons as extended blocks
  - Ideal for major subjects requiring deep engagement

### 3 Periods → **2+1 Pattern**
- **1 double period** (2 periods)
- **1 single period** (1 period)
- **Best for:** Moderate subjects

## Recent Improvements

### 1. Time Slot Variety Constraint ✓
Added `scoreAvoidSameTimeSlot` soft constraint to prevent subjects from always appearing at the same time:

**Before:**
```
Period 1: Computer Studies Mon, Tue, Wed, Thu ❌
Period 2: Mathematics Mon, Tue, Wed ❌
```

**After:**
```
Period 1 Monday: Computer Studies
Period 2 Tuesday: Computer Studies
Period 3 Wednesday: Computer Studies
Period 1 Thursday: Mathematics ✓
```

### 2. Automatic Pattern Detection ✓
The system now automatically detects and applies optimal patterns:

```typescript
// Auto-apply 2+2+1 for 5-period subjects
if (periodsPerWeek === 5 && !doublePeriodConfig) {
  requiresDouble = true;
}

// Auto-apply 2+2 for 4-period subjects
if (periodsPerWeek === 4 && !doublePeriodConfig) {
  requiresDouble = true;
}
```

## Manual Override (Optional)

You can still manually configure double periods via the Timetable Configuration:

```json
{
  "doublePeriodConfigs": [
    {
      "subjectId": "chemistry-uuid",
      "requiresDoublePeriod": true,
      "allowedDays": ["TUESDAY", "THURSDAY"],
      "preferTimeOfDay": "MORNING"
    },
    {
      "subjectId": "pe-uuid",
      "requiresDoublePeriod": false  // Explicitly disable doubles
    }
  ]
}
```

## Educational Benefits

### Why 2+2+1 is Optimal for 5-Period Subjects

1. **Deep Learning Blocks**
   - Double periods allow uninterrupted focus
   - Essential for labs, experiments, and practical work
   - Students can complete full investigations in one session

2. **Cognitive Advantages**
   - Reduced context switching between subjects
   - Time for warm-up, main activity, and reflection
   - Better memory consolidation with spaced repetition

3. **Practical Efficiency**
   - Less time wasted on setup/cleanup (labs, equipment)
   - Teachers can complete complex lessons without rushing
   - Students stay engaged longer with meaningful activities

4. **Balanced Schedule**
   - Not too heavy (all doubles would be 6+ periods)
   - Not too fragmented (all singles lose deep focus benefits)
   - Single period perfect for assessments, reviews, discussions

## How Double Periods Work in the Solver

### Activity Generation
- Each double period is treated as **one activity** occupying **2 consecutive slots**
- Solver automatically finds two adjacent periods in the same day
- Cannot be split across different days

### Constraint Checking
The solver ensures:
- ✓ Both slots are free for teacher and class
- ✓ Period numbers are consecutive (e.g., Period 2 & 3)
- ✓ Doesn't cross break time
- ✓ Respects max lessons per day limits

### Soft Constraints (Preferences)
- Avoids placing same subject at same time across different days
- Spreads subjects across the week
- Balances teacher workload
- Avoids consecutive days (optional)

## Examples

### Physics (5 periods/week) with 2+2+1 Pattern

| Day | Period | Subject | Type |
|-----|--------|---------|------|
| Mon | 1-2 | Physics | Double |
| Wed | 3-4 | Physics | Double |
| Fri | 2 | Physics | Single |

**Benefits:**
- Monday/Wednesday: Lab experiments, investigations
- Friday: Discussion, problem-solving, assessment

### Computer Studies (4 periods/week) with 2+2 Pattern

| Day | Period | Subject | Type |
|-----|--------|---------|------|
| Tue | 2-3 | Computer Studies | Double |
| Thu | 1-2 | Computer Studies | Double |

**Benefits:**
- Both sessions allow for coding projects
- Consistent extended blocks for hands-on work

## Regenerating the Timetable

To apply these improvements:

1. Navigate to `/admin/timetable/generate`
2. Click **Generate Timetable**
3. The solver will automatically:
   - Apply 2+2+1 pattern for 5-period subjects
   - Apply 2+2 pattern for 4-period subjects
   - Vary time slots to prevent monotonous schedules
   - Spread subjects across the week

**Note:** Regeneration replaces the entire timetable. Export current timetable first if needed.

## Technical Details

### Modified Files
1. `features/timetables/solver/activity-generator.ts`
   - Added smart default logic for double periods
   - Documented pattern examples

2. `features/timetables/solver/constraint-checker.ts`
   - Added `scoreAvoidSameTimeSlot` constraint
   - Weighted scoring (2x weight for time slot variety)

### Configuration
No manual configuration required! The system automatically applies optimal patterns.

For advanced customization, edit `doublePeriodConfigs` in Timetable Configuration.
