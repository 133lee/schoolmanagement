# Complete Repository Layer Inventory

## ✅ Already Completed

1. **StudentRepository** - DONE
2. **EnrollmentRepository** - DONE

---

## 📋 Required Repositories (Ordered by Dependency)

### Core Academic Structure (Priority 1)

These are foundational and needed by almost everything else:

3. **AcademicYearRepository**

   - Used by: Enrollments, Terms, Assessments, Report Cards, Timetables
   - Key methods:
     - `findActive()` - Get current academic year
     - `isActiveAndOpen()` - Validate year for operations
     - `findById()`, `findMany()`, `create()`, `update()`
     - `close()` - End-of-year operations

4. **TermRepository**

   - Used by: Assessments, Attendance, Report Cards
   - Key methods:
     - `findByAcademicYear()` - Get all terms for a year
     - `findActive()` - Current term
     - `findByType()` - Specific term (TERM_1, TERM_2, TERM_3)
     - CRUD operations

5. **GradeRepository**

   - Used by: Classes, Students, Enrollments
   - Key methods:
     - `findByLevel()` - Get specific grade
     - `findBySchoolLevel()` - PRIMARY or SECONDARY
     - `findWithProgression()` - Grade with next/previous grades
     - CRUD operations

6. **ClassRepository**
   - Used by: Enrollments, Teachers, Timetables, Assessments
   - Key methods:
     - `findByGrade()` - All classes in a grade
     - `getWithEnrollmentCount()` - Class with current enrollment
     - `isAtCapacity()` - Check if class is full
     - `findByStatus()` - Active/Inactive classes
     - CRUD operations

### Subjects & Departments (Priority 2)

7. **SubjectRepository**

   - Used by: Teachers, Assessments, Timetables, Report Cards
   - Key methods:
     - `findByGrade()` - Subjects for a grade level
     - `findByDepartment()` - Department's subjects
     - `findCore()` - Core vs optional subjects
     - CRUD operations

8. **DepartmentRepository**

   - Used by: Teachers, Subjects
   - Key methods:
     - `findByStatus()` - Active departments
     - `findWithSubjects()` - Department with all subjects
     - `findWithTeachers()` - Department with staff
     - CRUD operations

9. **GradeSubjectRepository**
   - Links grades to subjects
   - Key methods:
     - `findByGrade()` - All subjects for a grade
     - `findBySubject()` - Which grades teach this subject
     - `assignSubjectToGrade()`, `removeSubjectFromGrade()`

### Guardians (Priority 2)

10. **GuardianRepository**

    - Used by: Students
    - Key methods:
      - `findByStudent()` - All guardians for a student
      - `findPrimaryContact()` - Primary guardian for student
      - `findByPhone()`, `findByEmail()` - Contact lookup
      - CRUD operations

11. **StudentGuardianRepository**
    - Junction table for student-guardian relationships
    - Key methods:
      - `linkGuardian()` - Connect student to guardian
      - `unlinkGuardian()` - Remove relationship
      - `setPrimary()` - Set primary contact
      - `findByStudent()`, `findByGuardian()`

### Teachers & Staff (Priority 3)

12. **UserRepository**

    - Authentication and authorization
    - Key methods:
      - `findByEmail()` - Login lookup
      - `findByRole()` - Role-based queries
      - `updateLastLogin()` - Track sessions
      - CRUD operations

13. **TeacherProfileRepository**

    - Used by: Assignments, Attendance, Report Cards
    - Key methods:
      - `findByUser()` - Get profile from user
      - `findByStaffNumber()` - Staff lookup
      - `findByDepartment()` - Department staff
      - `findByStatus()` - Active teachers
      - `findWithSubjects()` - Teacher qualifications
      - CRUD operations

14. **TeacherSubjectRepository**

    - Teacher qualifications
    - Key methods:
      - `findByTeacher()` - Teacher's qualified subjects
      - `findBySubject()` - Qualified teachers for subject
      - `assignSubject()`, `removeSubject()`

15. **ClassTeacherAssignmentRepository**

    - Class teacher assignments
    - Key methods:
      - `findByClass()` - Class teacher for a class
      - `findByTeacher()` - Classes assigned to teacher
      - `findByAcademicYear()` - All assignments for year
      - `assignClassTeacher()`, `removeAssignment()`

16. **SubjectTeacherAssignmentRepository**
    - Subject teacher assignments (secondary only)
    - Key methods:
      - `findByClass()` - All subject teachers for a class
      - `findByTeacher()` - Teacher's teaching schedule
      - `findBySubject()` - Who teaches this subject
      - `assignSubjectTeacher()`, `removeAssignment()`

### Timetable (Priority 3)

17. **TimetableSlotRepository**
    - School schedule
    - Key methods:
      - `findByClass()` - Class schedule
      - `findByTeacher()` - Teacher schedule
      - `findByDay()` - Daily schedule
      - `checkConflict()` - Prevent double-booking
      - CRUD operations

### Assessments & Results (Priority 4)

18. **AssessmentRepository**

    - Exams and tests
    - Key methods:
      - `findByClass()` - Class assessments
      - `findBySubject()` - Subject assessments
      - `findByTerm()` - Term assessments
      - `findByType()` - CAT, MID, EOT
      - `findByStatus()` - DRAFT, PUBLISHED, COMPLETED
      - CRUD operations

19. **StudentAssessmentResultRepository**
    - Student marks/grades
    - Key methods:
      - `findByStudent()` - Student's results
      - `findByAssessment()` - All results for assessment
      - `findByStudentAndTerm()` - Term results
      - `calculateAverage()` - Compute aggregates
      - CRUD operations

### Report Cards (Priority 4)

20. **ReportCardRepository**

    - Student report cards
    - Key methods:
      - `findByStudent()` - Student's report cards
      - `findByClass()` - Class report cards
      - `findByTerm()` - Term report cards
      - `generateReportCard()` - Create from results
      - CRUD operations

21. **ReportCardSubjectRepository**
    - Subject breakdown in report cards
    - Key methods:
      - `findByReportCard()` - All subjects in report
      - `findBySubject()` - Subject across students
      - CRUD operations

### Attendance (Priority 4)

22. **AttendanceRecordRepository**
    - Daily attendance tracking
    - Key methods:
      - `findByStudent()` - Student attendance history
      - `findByClass()` - Class attendance for date
      - `findByDateRange()` - Attendance reports
      - `markAttendance()` - Record attendance
      - `getAttendanceStats()` - Aggregate statistics
      - CRUD operations

### Promotions (Priority 5)

23. **StudentPromotionRepository**
    - End-of-year promotions
    - Key methods:
      - `findByStudent()` - Student's promotion history
      - `findByAcademicYear()` - Year's promotions
      - `findByStatus()` - PROMOTED, REPEATED, GRADUATED
      - `createPromotion()` - Record promotion
      - CRUD operations

### Permissions (Priority 5)

24. **RolePermissionRepository**

    - Role-based permissions
    - Key methods:
      - `findByRole()` - Permissions for a role
      - `hasPermission()` - Check if role has permission
      - `assignPermission()`, `revokePermission()`

25. **UserPermissionRepository**
    - User-specific permission overrides
    - Key methods:
      - `findByUser()` - User's special permissions
      - `findActive()` - Non-expired permissions
      - `grantPermission()`, `revokePermission()`
      - `cleanupExpired()` - Remove expired permissions

---

## 📊 Implementation Priority Summary

### Phase 1: Core Foundation (Week 1)

- ✅ Student
- ✅ Enrollment
- 🔲 AcademicYear
- 🔲 Term
- 🔲 Grade
- 🔲 Class

### Phase 2: Relationships (Week 1-2)

- 🔲 Subject
- 🔲 Department
- 🔲 GradeSubject
- 🔲 Guardian
- 🔲 StudentGuardian

### Phase 3: Staff & Teaching (Week 2)

- 🔲 User
- 🔲 TeacherProfile
- 🔲 TeacherSubject
- 🔲 ClassTeacherAssignment
- 🔲 SubjectTeacherAssignment
- 🔲 TimetableSlot

### Phase 4: Academic Operations (Week 2-3)

- 🔲 Assessment
- 🔲 StudentAssessmentResult
- 🔲 ReportCard
- 🔲 ReportCardSubject
- 🔲 AttendanceRecord

### Phase 5: Advanced Features (Week 3)

- 🔲 StudentPromotion
- 🔲 RolePermission
- 🔲 UserPermission

---

## 🎯 Recommended Next Steps

I recommend building them in this order:

**Next 4 (Critical for Service Layer):**

1. **AcademicYearRepository** - Everything depends on this
2. **ClassRepository** - Needed for enrollment service
3. **GradeRepository** - Needed for class operations
4. **TermRepository** - Needed for assessments/attendance

**After That:** 5. **GuardianRepository** - Complete student management 6. **SubjectRepository** - Enable teaching assignments 7. **TeacherProfileRepository** - Staff management 8. **AssessmentRepository** - Begin academic tracking

Would you like me to:

1. **Generate the next 4 repositories** (AcademicYear, Class, Grade, Term)?
2. **Create a single repository** as the next example?
3. **Build a generator script** that creates all repositories from the schema?

Let me know which approach works best for your workflow!
