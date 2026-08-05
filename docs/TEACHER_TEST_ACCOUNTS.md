# Teacher Test Accounts

This document contains test teacher accounts for manual testing of the Reports & Analysis system.

## Overview

Three teachers have been created with different roles and teaching assignments to test various scenarios:

---

## 🧑‍🏫 Teacher 1 - Primary School Teacher

**Email:** `teacher@school.zm`
**Password:** `Admin123!`

### Role & Assignments
- **Primary School Teacher** (Grades 1-7)
- General classroom teaching
- No specific subject specialization in the seed data

### Testing Notes
- Basic teacher account
- May have limited data for Reports & Analysis

---

## 👩‍🏫 Teacher 2 - Primary School Subject Teacher

**Email:** `teacher2@school.zm`
**Password:** `Admin123!`

### Role & Assignments
- **Class Teacher:** Grade 2 A
- **Subject Assignments:**
  - English: Grade 1 A, Grade 1 B
  - Science: Grade 2 A, Grade 2 B

### Data Summary
- **4 Classes** with teaching assignments
- **100 Students** (25 per class)
- **120 Assessments** created
- **100 Report Cards** generated with full subject breakdowns
- **All 3 Assessment Types:** CAT, MID, EOT for testing analysis

### Best For Testing
- ✅ Class Reports tab (view report cards for all classes)
- ✅ Subject Analysis tab (analyze performance by assessment type)
- ✅ Class teacher functionality
- ✅ Multi-class teaching scenarios

### Quick Check
```bash
npm run check:teacher2
```

---

## 👨‍🏫 Teacher 3 - Secondary School Teacher

**Email:** `teacher3@school.zm`
**Password:** `Admin123!`

### Profile
- **Name:** Mwape Chitalu Sakala
- **Gender:** Female
- **Staff Number:** TCH003
- **Qualification:** Degree
- **Experience:** 8 years

### Role & Assignments
- **Class Teacher:** Grade 10 A
- **Subject Assignments:**
  - **Computer Studies (ICT)** - Grades 8-12 (5 classes)
  - **Commerce** - Grades 8-12 (5 classes)

### Data Summary
- **5 Secondary Classes** (Grade 8 A through Grade 12 A)
- **10 Students per class** (50 total)
- **30 Assessments** (3 per class: CAT, MID, EOT for both subjects)
- **300 Assessment Results** (10 students × 3 assessments × 2 subjects × 5 classes)
- **Subjects:** Computer Studies & Commerce added to all secondary grades

### Best For Testing
- ✅ Secondary school workflows
- ✅ Class teacher for own class (Grade 10 A)
- ✅ Subject teacher across multiple grades (8-12)
- ✅ Multiple subject teaching (ICT & Commerce)
- ✅ Gradebook and analysis for secondary assessments
- ✅ Cross-grade performance comparison

### Class Breakdown
| Grade | Class | Students | Computer Studies Results | Commerce Results |
|-------|-------|----------|--------------------------|------------------|
| Grade 8 | A | 10 | 30 | 30 |
| Grade 9 | A | 10 | 30 | 30 |
| Grade 10 | A | 10 | 30 | 30 |
| Grade 11 | A | 10 | 30 | 30 |
| Grade 12 | A | 10 | 30 | 30 |

### Quick Check
```bash
npm run check:teacher3
```

---

## 🔄 Seeding Scripts

### Seed All Teachers & Data
```bash
# Basic seed (creates teachers 1 & 2)
npm run db:seed

# Add teacher 2 assignments and students
npm run seed:teacher2:assignments
npm run seed:teacher2:students

# Create report cards for teacher 2's classes
npm run seed:report:cards

# Add teacher 3 (secondary school)
npm run seed:teacher3:secondary
```

### Verification Scripts
```bash
# Check teacher 2 data
npm run check:teacher2

# Check teacher 3 data
npm run check:teacher3

# Check all report cards
npx tsx scripts/check-report-cards.ts

# Check subjects
npx tsx scripts/check-subjects.ts
```

---

## 🧪 Manual Testing Scenarios

### Scenario 1: Primary School Class Teacher (Teacher 2)
1. Login with `teacher2@school.zm`
2. Navigate to Reports & Analysis
3. Test Class Reports tab:
   - Select "Science - Grade 2 A" and "Term 1"
   - Verify 25 students show up with complete report cards
   - Check statistics: total students, average marks, pass rate
   - Verify all 10 subjects show in report cards
4. Test Subject Analysis tab:
   - Should auto-populate with Science for Grade 2 A
   - Switch between CAT 1, MID, EOT assessments
   - Verify grade distribution table
   - Check quantity and quality pass analysis

### Scenario 2: Secondary School Multi-Grade Teacher (Teacher 3)
1. Login with `teacher3@school.zm`
2. Navigate to Reports & Analysis
3. Test multiple class selection:
   - Try Computer Studies - Grade 8 A
   - Try Computer Studies - Grade 12 A
   - Try Commerce - Grade 10 A
4. Verify 10 students per class
5. Test Subject Analysis:
   - Check ICT analysis across different grades
   - Compare Commerce performance across grades
   - Verify secondary grading (GRADE_1 through GRADE_9)

### Scenario 3: Class Teacher Functionality (Teacher 3)
1. Login with `teacher3@school.zm`
2. As class teacher for Grade 10 A:
   - View all students in the class
   - Check report cards (if generated)
   - Verify class teacher remarks

---

## 📊 Data Quality Notes

### Assessment Results
- **Scores:** Randomly generated between 60-95% with realistic variance
- **Grading:** Uses ECZ grading system (GRADE_1 to GRADE_9)
- **Distribution:** Ensures mix of high, medium, and lower performers
- **Remarks:** Contextual based on score (Excellent/Good/Needs improvement)

### Report Cards (Teacher 2 only)
- Complete subject breakdown (10 subjects per student)
- CAT, MID, and EOT marks for each subject
- Total marks and average calculated
- Class positions assigned (1st through 25th)
- Attendance data (days present/absent)

### Missing Data
- **Teacher 3:** Report cards not yet generated (only assessment results)
- **Teacher 1:** May have limited or no assessment data

---

## 🐛 Troubleshooting

### No data showing
```bash
# Re-run the relevant seed script
npm run seed:teacher2:assignments
npm run seed:teacher2:students
npm run seed:report:cards
# OR
npm run seed:teacher3:secondary
```

### Wrong academic year/term
Check that 2024 academic year and Term 1 are active in the database.

### Students not appearing
Verify enrollments exist:
```bash
npx tsx scripts/check-teacher2.ts
npx tsx scripts/check-teacher3.ts
```

---

## 🎯 Recommended Testing Order

1. **Start with Teacher 2** - Most complete dataset with report cards
2. **Test Teacher 3** - Secondary school with assessment results only
3. **Compare workflows** - Primary vs Secondary
4. **Test edge cases** - Empty classes, missing assessments, etc.

---

*Last updated: 2026-01-05*
