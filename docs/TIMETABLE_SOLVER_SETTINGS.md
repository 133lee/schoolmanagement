# Timetable Solver Configuration Guide

Based on analysis of actual school timetables (F1A, F2A, 10B, 12A), here are the recommended settings to produce natural, varied timetables.

## Current Problem

The solver is **too aggressive** with core subject morning preference. It places MATHS in Period 1 every single day, creating an unnatural pattern.

### Observed Reality from Templates:
- **F1A**: Monday starts with ICT (not MATHS)
- **F2A**: Monday starts with PHY (not MATHS)
- **10B**: Monday starts with BIO (not MATHS)
- **12A**: Monday starts with MATHS ← Only 1 out of 4!

### What's Happening:
The `scoreMorningPreference()` function gives these scores:
- P1-P2 (early morning): **100 points** ← MATHS always goes here!
- P3-P4 (mid morning): 80 points
- P5-P6 (afternoon): 60 points
- P7-P8 (late): 40 points

This 100-point bias forces core subjects into P1 every time.

---

## Recommended Configuration

### Option 1: Disable Core Subject Morning Bias (Recommended)

```typescript
{
  preferMorningForCore: false,  // ← Turn OFF aggressive P1 bias
  spreadSubjectsAcrossWeek: true,
  avoidConsecutiveDays: false,
  enableBacktracking: true,
  maxAttempts: 1000,
  maxBacktrackDepth: 50,
}
```

**Why:** Natural variation produces realistic timetables. Subjects will distribute naturally across periods.

### Option 2: Gentle Morning Preference (Moderate)

If you still want a **slight** morning bias, modify the scoring in `solver/constraint-checker.ts`:

```typescript
// OLD (too aggressive):
if (slot.periodNumber <= earlyMorning) {
  return { score: 100, reason: 'Core subject in early morning - excellent' };
}

// NEW (gentle preference):
if (slot.periodNumber <= midMorning) {  // P1-P4
  return { score: 92, reason: 'Core subject in morning - good' };
} else {
  return { score: 88, reason: 'Core subject in afternoon - acceptable' };
}
```

**Result:** Only 4-point difference instead of 60-point difference. Creates gentle preference without forcing P1.

---

## Complete Recommended Settings

```typescript
{
  // School structure
  schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  totalPeriodsPerDay: 9,  // Including breaks

  // Teacher/Class limits
  maxLessonsPerDayPerClass: 8,  // Exclude break
  maxLessonsPerDayPerTeacher: 6,

  // Subject distribution (KEEP THESE ENABLED)
  spreadSubjectsAcrossWeek: true,  // ✅ Good! Prevents MATHS on Mon/Tue/Wed only
  avoidConsecutiveDays: false,      // Can cluster if needed (like 10B with P5 pattern)

  // Core subject preference (FIX THIS)
  preferMorningForCore: false,  // ✅ Disable aggressive P1 bias
  coreSubjectIds: [],            // Or populate with actual IDs

  // Double periods
  doublePeriodConfigs: [
    {
      subjectId: "camf_ed_id",
      requiresDoublePeriod: true,
      allowedDays: ['FRIDAY'],  // Optional: restrict to specific days
    }
  ],

  // Solver performance
  maxAttempts: 1000,
  enableBacktracking: true,
  maxBacktrackDepth: 50,
}
```

---

## Subject Configuration (Class Subjects)

For each class, configure `periodsPerWeek` to match your curriculum:

### Example: FORM 1A (Junior Secondary)
```typescript
{
  classId: "form1a",
  subjects: [
    { subjectId: "mathematics", periodsPerWeek: 4, isCore: true },
    { subjectId: "english", periodsPerWeek: 3, isCore: true },
    { subjectId: "ict", periodsPerWeek: 3, isCore: false },
    { subjectId: "physics", periodsPerWeek: 3, isCore: true },
    { subjectId: "geography", periodsPerWeek: 3, isCore: false },
    { subjectId: "re", periodsPerWeek: 3, isCore: false },
    { subjectId: "ce", periodsPerWeek: 3, isCore: false },
    { subjectId: "camf_ed", periodsPerWeek: 1, isDoublePeriod: true },
  ]
  // Total: 23 periods out of 40 slots (5 days × 8 periods)
  // Remaining 17 slots = study/free periods ✅ Natural!
}
```

### Example: GRADE 10B (Senior Secondary - Sciences)
```typescript
{
  classId: "10b",
  subjects: [
    { subjectId: "mathematics", periodsPerWeek: 5, isCore: true },
    { subjectId: "english", periodsPerWeek: 4, isCore: true },
    { subjectId: "biology", periodsPerWeek: 4, isCore: true },
    { subjectId: "chemistry", periodsPerWeek: 3, isCore: true },
    { subjectId: "physics", periodsPerWeek: 3, isCore: true },
    { subjectId: "pure_arts", periodsPerWeek: 3, isCore: false },
    { subjectId: "commerce", periodsPerWeek: 3, isCore: false },
    { subjectId: "nyanja", periodsPerWeek: 3, isCore: false },
    { subjectId: "ce", periodsPerWeek: 3, isCore: false },
  ]
  // Total: 31 periods out of 40 slots
}
```

---

## Period Slots Configuration

Configure breaks properly:

```typescript
periodSlots: [
  { periodNumber: 1, startTime: "07:00", endTime: "07:40", isBreak: false },
  { periodNumber: 2, startTime: "07:40", endTime: "08:20", isBreak: false },
  { periodNumber: 3, startTime: "08:20", endTime: "09:00", isBreak: false },
  { periodNumber: 4, startTime: "09:00", endTime: "09:40", isBreak: false },
  { periodNumber: 5, startTime: "09:40", endTime: "10:00", isBreak: true },  // ← BREAK
  { periodNumber: 6, startTime: "10:00", endTime: "10:40", isBreak: false },
  { periodNumber: 7, startTime: "10:40", endTime: "11:20", isBreak: false },
  { periodNumber: 8, startTime: "11:20", endTime: "12:00", isBreak: false },
  { periodNumber: 9, startTime: "12:00", endTime: "12:40", isBreak: false },
  { periodNumber: 10, startTime: "12:40", endTime: "13:20", isBreak: false },
]
```

---

## Expected Results After Fix

✅ **Natural variation**: Different subjects start the day (not always MATHS)
✅ **Realistic patterns**: MATHS appears at P2, P5, P1 (varied like templates)
✅ **Proper spread**: Subjects distributed across the week
✅ **Empty slots**: Not every period filled (study time)
✅ **Double periods**: CAMF ED correctly spans 2 consecutive slots

---

## Quick Fix Implementation

**Immediate action** - Update `timetable.service.ts` generation call:

```typescript
// In generateTimetable() method:
const solverResult = await solve({
  // ... existing params ...
  config: {
    spreadSubjectsAcrossWeek: true,
    avoidConsecutiveDays: false,
    preferMorningForCore: false,  // ← Change from true to false
    coreSubjectIds,               // Already correct
    maxAttempts: 1000,
    enableBacktracking: true,
    maxBacktrackDepth: 50,
  },
});
```

---

## Testing

After applying settings:

1. **Generate timetable** for a class
2. **Check variety**: Does Monday always start with the same subject?
3. **Check spread**: Is MATHS appearing on different days at different times?
4. **Export PDF**: Compare with template PDFs - should look similar!

---

## Summary

| Setting | Current (Wrong) | Recommended (Natural) |
|---------|----------------|----------------------|
| `preferMorningForCore` | `true` | **`false`** |
| Morning score for core | 100 pts (P1-P2) | 92 pts (or disabled) |
| Result | MATHS always P1 | MATHS varies naturally |
| Matches templates? | ❌ No | ✅ Yes |
