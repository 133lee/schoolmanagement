# Grading Systems - Implementation Guide

This document explains how the school management system handles **two different grading systems** used in Zambia's education system.

---

## 🎓 Two Systems Overview

### **OLD SYSTEM** (Grades 1-9)
- **Used by:** Primary and Junior Secondary (Grades 1-9)
- **Example Classes:** Grade 8 Blue, Grade 7 A, Grade 9 B
- **Grading Scale:** 5-point system (Grades 1-4 + Fail)
- **Best Six:** Sum of **top 6 percentages** out of 600
- **Higher is better!**

### **NEW SYSTEM** (Forms 1-5, Grades 10-12)
- **Used by:** Senior Secondary (Forms 1-5, Grades 10-12)
- **Example Classes:** Grade 8 F1A (Form 1A), Form 3 Blue, Grade 12 Science
- **Grading Scale:** 9-point system (Points 1-9)
- **Best Six:** Sum of **points** from best 6 subjects
- **Lower is better!**

---

## 📊 OLD SYSTEM (Grades 1-9) - Detailed

### Grade Bands
| Percentage | Grade | Description |
|------------|-------|-------------|
| 75-100%    | 1     | Distinction |
| 60-74%     | 2     | Merit       |
| 50-59%     | 3     | Credit      |
| 40-49%     | 4     | Pass        |
| 0-39%      | Fail  | No grade    |

### Best Six Calculation
```
Example: Grade 8 Blue student
├── Mathematics: 70%
├── English: 84%
├── Literature: 90%
├── Computer Studies: 70%
├── Science: 55%
└── History: 65%

Best Six Total = 70 + 84 + 90 + 70 + 55 + 65 = 434/600
Average = 434 ÷ 6 = 72.33%
```

**Rules:**
- Takes the **top 6 highest percentages** (regardless of core/elective)
- Absent subjects = 0% and cannot count
- Certificate requires **minimum 6 passes** (Grade 4 or better)
- Result shown as: **"434/600 (Total %)"**

### UI Display
```
┌─────────────────────────────────────┐
│ Best 6 (Total %)                    │
│ 434/600                             │
└─────────────────────────────────────┘
```

---

## 📊 NEW SYSTEM (Forms/Grades 10-12) - Detailed

### Points Scale
| Percentage | Points | Grade Quality |
|------------|--------|---------------|
| 75-100%    | 1      | Distinction   |
| 70-74%     | 2      | Very Good     |
| 65-69%     | 3      | Good          |
| 60-64%     | 4      | Credit        |
| 55-59%     | 5      | Credit        |
| 50-54%     | 6      | Pass          |
| 45-49%     | 7      | Weak Pass     |
| 40-44%     | 8      | Very Weak     |
| 0-39%      | 9      | Fail          |

### Best Six Calculation
```
Example: Grade 8 F1A student
├── Mathematics (Core): 70% → 2 points
├── English (Core): 84% → 1 point
├── Literature (Core): 90% → 1 point
├── Computer Studies (Elective): 70% → 2 points
├── Science (Elective): 55% → 5 points
└── History (Elective): 65% → 3 points

Best Six Total = 2 + 1 + 1 + 2 + 5 + 3 = 14 points
```

**Rules:**
- **All core subjects MUST be included**
- Fill remaining slots with **best electives** (lowest points)
- Total should be 6 subjects
- **Lower points = better performance**
- Result shown as: **"14 Points (ECZ Points)"**

### UI Display
```
┌─────────────────────────────────────┐
│ Best 6 (ECZ Points)                 │
│ 14 Points                           │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### 1. Curriculum Detection

The system automatically detects which grading system to use based on the **grade level**:

```typescript
// lib/services/performance-calculator.ts

export function getCurriculumType(gradeLevel: string): CurriculumType {
  const oldSystemGrades = [
    'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5',
    'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9'
  ];

  const newSystemGrades = [
    'FORM_1', 'FORM_2', 'FORM_3', 'FORM_4', 'FORM_5',
    'GRADE_10', 'GRADE_11', 'GRADE_12'
  ];

  if (oldSystemGrades.includes(gradeLevel)) {
    return 'OLD_SYSTEM';
  }

  if (newSystemGrades.includes(gradeLevel)) {
    return 'NEW_SYSTEM';
  }

  return 'NEW_SYSTEM'; // Default
}
```

### 2. Grade Conversion Functions

**Old System (5-point):**
```typescript
export function percentageToOldSystemGrade(percentage: number): number {
  if (percentage >= 75) return 1; // Distinction
  if (percentage >= 60) return 2; // Merit
  if (percentage >= 50) return 3; // Credit
  if (percentage >= 40) return 4; // Pass
  return 0; // Fail
}
```

**New System (9-point):**
```typescript
export function percentageToECZPoints(percentage: number): number {
  if (percentage >= 75) return 1;
  if (percentage >= 70) return 2;
  if (percentage >= 65) return 3;
  if (percentage >= 60) return 4;
  if (percentage >= 55) return 5;
  if (percentage >= 50) return 6;
  if (percentage >= 45) return 7;
  if (percentage >= 40) return 8;
  return 9;
}
```

### 3. Best Six Calculation

```typescript
export function calculateBestSixPoints(
  scores: SubjectWithCore[],
  curriculumType: CurriculumType = 'NEW_SYSTEM'
): BestSixResult | null {
  if (curriculumType === 'OLD_SYSTEM') {
    // Sum top 6 percentages (ignore core/elective)
    const sortedByPercentage = [...scores]
      .sort((a, b) => b.percentage - a.percentage);
    const topSix = sortedByPercentage.slice(0, 6);

    return {
      value: topSix.reduce((sum, s) => sum + s.percentage, 0),
      count: topSix.length,
      type: 'percentage',
      maxValue: 600,
    };
  } else {
    // Core subjects + best electives (point-based)
    const cores = scores.filter(s => s.isCore);
    const electives = scores.filter(s => !s.isCore);
    const sortedElectives = [...electives]
      .sort((a, b) => a.points - b.points);

    const bestSix = [...cores, ...sortedElectives.slice(0, 6 - cores.length)];

    return {
      value: bestSix.reduce((sum, s) => sum + s.points, 0),
      count: bestSix.length,
      type: 'points',
      maxValue: bestSix.length * 9,
    };
  }
}
```

### 4. API Response

The `/api/students/[id]/performance` endpoint returns:

```typescript
{
  radarData: { CAT1: [...], MID: [...], EOT: [...] },
  subjectPerformances: [...],
  classPosition: 5,
  classTotal: 30,
  bestSix: 434,              // The value (434 for old, 14 for new)
  bestSixCount: 6,           // Number of subjects included
  bestSixType: "percentage", // "percentage" or "points"
  bestSixMax: 600,           // Max possible value
  curriculumType: "OLD_SYSTEM" // Which system is used
}
```

---

## 🎯 Examples by Class

### Grade 8 Blue (OLD SYSTEM)
```
Class: Grade 8 Blue
Grade Level: GRADE_8
Curriculum: OLD_SYSTEM

Student Performance:
├── Math: 70% → Grade 2
├── English: 84% → Grade 1
├── Literature: 90% → Grade 1
├── Computer Studies: 70% → Grade 2
├── Science: 55% → Grade 3
└── History: 65% → Grade 2

Best Six: 434/600 (Total %)
Average: 72.33%
Display: "434/600 (Total %)"
```

### Grade 8 F1A (NEW SYSTEM)
```
Class: Grade 8 F1A (Form 1A)
Grade Level: FORM_1
Curriculum: NEW_SYSTEM

Student Performance:
├── Math (Core): 70% → 2 points
├── English (Core): 84% → 1 point
├── Literature (Core): 90% → 1 point
├── Computer Studies (Elective): 70% → 2 points
├── Science (Elective): 55% → 5 points
└── History (Elective): 65% → 3 points

Best Six: 14 Points (ECZ Points)
Display: "14 Points (ECZ Points)"
```

---

## ✅ Testing Checklist

To verify the implementation:

- [ ] Grade 8 Blue shows "X/600 (Total %)"
- [ ] Grade 8 F1A shows "X Points (ECZ Points)"
- [ ] Old system uses top 6 percentages regardless of core/elective
- [ ] New system includes all cores + best electives
- [ ] Class position works for both systems
- [ ] Radar chart displays correctly for both
- [ ] Trend calculations work for both systems

---

## 🔍 Key Differences Summary

| Feature              | OLD SYSTEM           | NEW SYSTEM           |
|----------------------|----------------------|----------------------|
| **Grades Used**      | 1-9                  | Forms 1-5, G10-12    |
| **Grade Scale**      | 5-point (1-4 + Fail) | 9-point (1-9)        |
| **Best Six Logic**   | Top 6 percentages    | Cores + best electives |
| **Best Six Format**  | X/600                | X Points             |
| **Better Score**     | Higher %             | Lower points         |
| **Core Priority**    | No                   | Yes (all must include) |
| **Label Suffix**     | (Total %)            | (ECZ Points)         |

---

## 📝 Notes

1. **Absent subjects** are treated as 0% or 9 points (fail) and excluded from Best Six
2. **Certificate eligibility** (OLD): Minimum 6 passes (Grade 4 or better)
3. **University selection** (NEW): Lower points = better chances
4. The system **auto-detects** which curriculum based on grade level
5. Both systems use the **same radar visualization** (percentage-based)

---

Last Updated: 2026-01-28
