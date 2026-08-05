# Database Reset & Re-seed Guide

This guide explains how to completely reset the database and re-seed it with fresh test data.

---

## ⚠️ WARNING

The reset script will **DELETE ALL DATA** from the database. This is irreversible!

- ❌ All students will be deleted
- ❌ All teachers will be deleted
- ❌ All assessments will be deleted
- ❌ All report cards will be deleted
- ❌ All users and permissions will be deleted
- ❌ ALL data will be lost

**Only use this in development environments!**

---

## 🔄 Complete Reset & Re-seed Process

### Step 1: Reset the Database

```bash
npm run db:reset
```

This will:
1. Delete ALL data from the database
2. Respect foreign key constraints (deletes in correct order)
3. Show summary of deleted records

### Step 2: Run Main Seed

```bash
npm run db:seed
```

This creates:
- ✅ Admin user (`admin@school.zm`)
- ✅ Head Teacher (`head@school.zm`)
- ✅ Teacher 1 (`teacher@school.zm`)
- ✅ Teacher 2 (`teacher2@school.zm`)
- ✅ Academic Year 2024 (active)
- ✅ Term 1 (2024)
- ✅ All grades (1-12)
- ✅ All subjects (Math, English, Science, etc.)
- ✅ Grade-subject mappings
- ✅ Classes for each grade
- ✅ Departments
- ✅ Role permissions

### Step 3: Seed Teacher 2 (Primary School)

```bash
# Create teacher assignments
npm run seed:teacher2:assignments

# Create students (25 per class)
npm run seed:teacher2:students

# Create report cards with all subjects
npm run seed:report:cards
```

This creates:
- ✅ Class teacher assignment (Grade 2 A)
- ✅ Subject assignments (English: Grades 1A & 1B, Science: Grades 2A & 2B)
- ✅ 100 students (25 per class × 4 classes)
- ✅ 120 assessments (CAT, MID, EOT for all subjects)
- ✅ 100 complete report cards

### Step 4: Seed Teacher 3 (Secondary School)

```bash
npm run seed:teacher3:secondary
```

This creates:
- ✅ Teacher 3 user (`teacher3@school.zm`)
- ✅ Commerce subject (if not exists)
- ✅ Class teacher assignment (Grade 10 A)
- ✅ Subject assignments (Computer Studies & Commerce for Grades 8-12)
- ✅ 50 students (10 per class × 5 classes)
- ✅ 30 assessments (CAT, MID, EOT for both subjects)
- ✅ 300 assessment results

---

## 🚀 Quick Reset & Full Re-seed (One-Liner Chain)

### PowerShell (Windows)
```powershell
npm run db:reset; npm run db:seed; npm run seed:teacher2:assignments; npm run seed:teacher2:students; npm run seed:report:cards; npm run seed:teacher3:secondary
```

### Bash (Linux/Mac)
```bash
npm run db:reset && npm run db:seed && npm run seed:teacher2:assignments && npm run seed:teacher2:students && npm run seed:report:cards && npm run seed:teacher3:secondary
```

---

## 📋 What Gets Deleted (In Order)

The reset script deletes data in this specific order to respect foreign key constraints:

1. **UserPermission** - User-specific permissions
2. **RolePermission** - Role-based permissions
3. **StudentAssessmentResult** - Student test scores
4. **ReportCardSubject** - Subject entries in report cards
5. **ReportCard** - Student report cards
6. **Assessment** - Tests and exams
7. **AttendanceRecord** - Attendance records
8. **ClassTimetable** - Primary school timetables
9. **SecondaryTimetable** - Secondary school timetables
10. **TimeSlot** - Time slot definitions
11. **SubjectPeriodRequirement** - Period requirements per subject
12. **StudentPromotion** - Student promotion records
13. **StudentGuardian** - Student-guardian relationships
14. **Guardian** - Guardian/parent records
15. **StudentClassEnrollment** - Class enrollment records
16. **Student** - Student records
17. **ClassTeacherAssignment** - Class teacher assignments
18. **SubjectTeacherAssignment** - Subject teacher assignments
19. **TeacherSubject** - Teacher subject qualifications
20. **TeacherProfile** - Teacher profiles
21. **User** - User accounts
22. **Class** - Class records
23. **GradeSubject** - Grade-subject mappings
24. **Subject** - Subject records
25. **Grade** - Grade records
26. **Department** - Department records
27. **Term** - Term records
28. **AcademicYear** - Academic year records

---

## 🔍 Verification Commands

After seeding, verify the data:

```bash
# Check Teacher 2 data
npm run check:teacher2

# Check Teacher 3 data
npm run check:teacher3

# Check report cards
npx tsx scripts/check-report-cards.ts

# Check subjects
npx tsx scripts/check-subjects.ts

# Check database state
npm run check:db
```

---

## 🎯 Expected Final State

After complete reset and re-seed, you should have:

### Users (4)
- `admin@school.zm` - System Administrator
- `head@school.zm` - Head Teacher
- `teacher@school.zm` - Teacher 1 (Basic)
- `teacher2@school.zm` - Teacher 2 (Primary, 4 classes, 100 students)
- `teacher3@school.zm` - Teacher 3 (Secondary, 5 classes, 50 students)

### Students (150)
- 100 students for Teacher 2 (Grades 1-2)
- 50 students for Teacher 3 (Grades 8-12)

### Assessments
- 120 for Teacher 2 (all subjects)
- 30 for Teacher 3 (ICT & Commerce only)

### Report Cards
- 100 complete report cards for Teacher 2's students
- 0 report cards for Teacher 3 (only assessment results)

### Subjects (11)
- Mathematics
- English
- Science
- Biology
- Chemistry
- Physics
- Computer Studies (ICT)
- CRE
- Social Studies (2 entries)
- **Commerce** (added by Teacher 3 seed)

### Grades (12)
- Grade 1 through Grade 12

---

## 🐛 Troubleshooting

### Error: Foreign key constraint failed

This means the deletion order is incorrect. The reset script should handle this automatically by deleting child records before parent records.

If you still get this error:
1. Check if you have custom migrations that added constraints
2. Verify all models are included in the reset script
3. Try running: `npx prisma db push --force-reset` (⚠️ Nuclear option - resets schema too)

### Error: Database is locked

Another process might be accessing the database:
1. Stop the Next.js dev server
2. Close Prisma Studio if open
3. Kill any hanging Node processes
4. Try again

### Seed fails with "Unique constraint violation"

The reset didn't complete successfully:
1. Run `npm run db:reset` again
2. Check for errors in the reset output
3. Verify all records were deleted

### Data looks incomplete

Make sure you ran ALL seed scripts:
```bash
npm run db:seed
npm run seed:teacher2:assignments
npm run seed:teacher2:students
npm run seed:report:cards
npm run seed:teacher3:secondary
```

---

## 📝 Notes

### Why This Order?

The deletion order is crucial because:
- Foreign keys prevent deleting parent records before children
- Prisma's cascade deletes work automatically for some relations
- Some tables have circular dependencies (handled by deleting junction tables first)

### What About Migrations?

This script only deletes DATA, not the schema. Your database structure (tables, columns, indexes) remains intact.

To reset the schema too:
```bash
npx prisma migrate reset
```
This will:
1. Drop the entire database
2. Recreate it
3. Run all migrations
4. Run the main seed script automatically

### Production Safety

**NEVER run `npm run db:reset` in production!**

For production:
- Use migrations for schema changes
- Archive old data instead of deleting
- Use soft deletes (deletedAt column)
- Create proper backup/restore procedures

---

## 🔗 Related Scripts

```bash
# Database operations
npm run db:generate    # Regenerate Prisma Client
npm run db:push        # Push schema changes without migrations
npm run db:migrate     # Create and run migrations
npm run db:studio      # Open Prisma Studio (GUI)
npm run db:reset       # Delete all data (this script)

# Seeding
npm run db:seed                    # Main seed (core data)
npm run seed:teacher2:assignments  # Teacher 2 assignments
npm run seed:teacher2:students     # Teacher 2 students
npm run seed:report:cards          # Generate report cards
npm run seed:teacher3:secondary    # Teacher 3 (secondary school)

# Verification
npm run check:teacher2            # Verify Teacher 2 data
npm run check:teacher3            # Verify Teacher 3 data
npm run check:db                  # Check overall database state
```

---

*Last updated: 2026-01-05*
