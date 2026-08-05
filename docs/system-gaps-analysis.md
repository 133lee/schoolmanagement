# System Gaps Analysis - What's Missing

**Date**: 2026-01-01
**Status**: In Progress
**Purpose**: Identify missing components needed for a complete school management system

---

## Overview

This document catalogs what exists in the system and identifies gaps that need to be filled for a production-ready Zambian school management system.

---

## ✅ What Exists (Inventory)

### Backend Services & Repositories

#### Authentication & Authorization ✅
- ✅ `features/auth/` - Login, password change, user context
- ✅ `features/permissions/` - Role-based permissions, user permission overrides
- ✅ APIs: `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`

#### Core Academic Structure ✅
- ✅ `features/academic-years/` - Academic year management
- ✅ `features/terms/` - Term management (TERM_1, TERM_2, TERM_3)
- ✅ `features/grade-levels/` - Grade repository
- ✅ APIs: `/api/grades`, `/api/terms/active`

#### User Management ✅
- ✅ `features/students/` - Full student CRUD + validation
- ✅ `features/teachers/` - Full teacher CRUD + validation
- ✅ `features/parents/` - Full parent CRUD + validation
- ✅ APIs: Complete CRUD for students, teachers, parents

#### Academic Organization ✅
- ✅ `features/classes/` - Class management
- ✅ `features/subjects/` - Subject management
- ✅ `features/departments/` - Department management
- ✅ `features/enrollments/` - Student class enrollment
- ✅ `features/grade-subjects/` - Grade-subject relationships
- ✅ `features/teacher-subjects/` - Teacher subject qualifications
- ✅ APIs: Complete CRUD for classes, subjects, departments

#### Timetabling System (Partial) ✅
- ✅ `features/timetables/timeSlot.repository.ts` + service
- ✅ `features/timetables/classTimetable.repository.ts` + service
- ✅ `features/timetables/secondaryTimetable.repository.ts` + service
- ✅ `features/timetables/subjectPeriodRequirement.repository.ts` + service
- ✅ `features/timetables/room.repository.ts`
- ✅ `features/timetables/timetableConfiguration.repository.ts`
- ✅ APIs:
  - `/api/timetables/check-availability` ✅
  - `/api/timetables/suggestions` ✅
  - `/api/timetables/detect-clashes` ✅
  - `/api/admin/timetable/configuration` ✅
  - `/api/admin/timetable/generate` ✅
  - `/api/admin/timetable/view` ✅
  - `/api/admin/rooms` ✅
  - `/api/teacher/timetable` ✅

#### Assessment & Grading (Partial) ✅
- ✅ `features/assessments/assessment.repository.ts`
- ✅ `features/assessment-results/studentAssessmentResult.repository.ts` + service
- ✅ APIs: `/api/teacher/gradebook`, `/api/teacher/gradebook/analysis`

#### Report Cards (Partial) ✅
- ✅ `features/report-cards/reportCard.repository.ts`
- ✅ `features/report-cards/reportCardSubject.repository.ts`
- ✅ APIs: `/api/teacher/reports`, `/api/teacher/reports/terms`

#### Attendance (Partial) ✅
- ✅ `features/attendance/attendanceRecord.repository.ts`
- ✅ APIs: `/api/teacher/attendance/trends`

#### Student Promotions (Partial) ✅
- ✅ `features/promotions/studentPromotion.repository.ts`

### Frontend Pages

#### Authentication ✅
- ✅ `/app/(auth)/login/page.tsx`

#### Dashboard Pages ✅
- ✅ `/app/(dashboard)/admin/page.tsx` - Admin dashboard
- ✅ `/app/(dashboard)/teacher/page.tsx` - Teacher dashboard
- ✅ `/app/(dashboard)/hod/page.tsx` - HOD dashboard

#### Admin Pages ✅
- ✅ `/app/(dashboard)/admin/students/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/teachers/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/parents/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/classes/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/subjects/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/departments/page.tsx` + `/new/page.tsx`
- ✅ `/app/(dashboard)/admin/permissions/page.tsx`
- ✅ `/app/(dashboard)/admin/rooms/page.tsx`
- ✅ `/app/(dashboard)/admin/timetable/configuration/page.tsx`
- ✅ `/app/(dashboard)/admin/timetable/generate/page.tsx`
- ✅ `/app/(dashboard)/admin/timetable/view/page.tsx`

#### Teacher Pages ✅
- ✅ `/app/(dashboard)/teacher/profile/page.tsx`
- ✅ `/app/(dashboard)/teacher/classes/page.tsx`
- ✅ `/app/(dashboard)/teacher/students/page.tsx`
- ✅ `/app/(dashboard)/teacher/gradebook/page.tsx`
- ✅ `/app/(dashboard)/teacher/gradebook/analysis/page.tsx`
- ✅ `/app/(dashboard)/teacher/reports/page.tsx`
- ✅ `/app/(dashboard)/teacher/timetable/page.tsx`

#### HOD Pages ✅
- ✅ `/app/(dashboard)/hod/classes/page.tsx`
- ✅ `/app/(dashboard)/hod/students/page.tsx`
- ✅ `/app/(dashboard)/hod/subjects/page.tsx`
- ✅ `/app/(dashboard)/hod/teachers/page.tsx`

---

## ❌ What's Missing - Critical Gaps

### 1. Academic Year & Term Management (CRITICAL)

**Missing Backend**:
- ❌ `features/academic-years/academicYear.service.ts` - EXISTS but needs verification
- ❌ `features/terms/term.service.ts` - Missing!
- ❌ APIs:
  - `/api/academic-years` - List all years ❌
  - `/api/academic-years/[id]` - Get/Update/Delete year ❌
  - `/api/academic-years/[id]/close` - Close year (prevent changes) ❌
  - `/api/academic-years/[id]/activate` - Activate year ❌
  - `/api/terms` - List all terms ❌
  - `/api/terms/[id]` - Get/Update/Delete term ❌
  - `/api/terms/[id]/activate` - Activate term ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/academic-years/page.tsx` - List years
- ❌ `/app/(dashboard)/admin/academic-years/new/page.tsx` - Create year
- ❌ `/app/(dashboard)/admin/academic-years/[id]/page.tsx` - Edit year
- ❌ `/app/(dashboard)/admin/terms/page.tsx` - List terms
- ❌ `/app/(dashboard)/admin/terms/new/page.tsx` - Create term

**Impact**: **HIGH** - Can't create/manage school years and terms!

---

### 2. Student Class Enrollment Management (CRITICAL)

**Missing Backend**:
- ✅ Repository exists: `features/enrollments/enrollment.repository.ts`
- ✅ Service exists: `features/enrollments/enrollment.service.ts`
- ❌ APIs Missing:
  - `/api/enrollments` - Create enrollment ❌
  - `/api/enrollments/[id]` - Get/Update/Delete enrollment ❌
  - `/api/classes/[id]/students` - List students in class ❌
  - `/api/classes/[id]/enroll` - Bulk enroll students ❌
  - `/api/students/[id]/enrollments` - Student enrollment history ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/classes/[id]/students/page.tsx` - Manage class enrollment
- ❌ `/app/(dashboard)/admin/classes/[id]/enroll/page.tsx` - Enroll students form
- ❌ `/app/(dashboard)/admin/students/[id]/enrollments/page.tsx` - Student enrollment history

**Impact**: **HIGH** - Can't assign students to classes!

---

### 3. Subject-Teacher-Class Assignments (CRITICAL)

**Missing Backend**:
- ❌ `features/subject-teacher-assignments/` folder doesn't exist!
- ❌ No repository for `SubjectTeacherAssignment`
- ❌ No service for managing assignments
- ❌ APIs Missing:
  - `/api/assignments` - Create assignment ❌
  - `/api/assignments/[id]` - Get/Update/Delete assignment ❌
  - `/api/classes/[id]/assignments` - List all subject-teacher assignments for class ❌
  - `/api/teachers/[id]/assignments` - List teacher's assignments ❌
  - `/api/subjects/[id]/assignments` - List assignments for subject ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/classes/[id]/assignments/page.tsx` - Assign teachers to subjects
- ❌ `/app/(dashboard)/admin/teachers/[id]/assignments/page.tsx` - View teacher assignments

**Impact**: **CRITICAL** - Can't assign which teacher teaches what subject to which class!

---

### 4. Class Teacher Assignment (Important)

**Missing Backend**:
- ✅ API exists: `/api/classes/[id]/class-teacher/route.ts`
- ❌ May need service layer verification

**Missing Frontend**:
- ❌ UI to assign class teacher embedded in class edit page

**Impact**: **MEDIUM** - API exists, just need UI

---

### 5. Assessment & Gradebook System (Partial)

**Missing Backend**:
- ❌ `features/assessments/assessment.service.ts` - Missing!
- ❌ APIs Missing:
  - `/api/assessments` - Create assessment ❌
  - `/api/assessments/[id]` - Get/Update/Delete assessment ❌
  - `/api/assessments/[id]/results` - Get all results for assessment ❌
  - `/api/assessments/[id]/results/[studentId]` - Get student result ❌
  - `/api/assessments/[id]/stats` - Assessment statistics ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/teacher/assessments/page.tsx` - List assessments
- ❌ `/app/(dashboard)/teacher/assessments/new/page.tsx` - Create assessment
- ❌ `/app/(dashboard)/teacher/assessments/[id]/page.tsx` - View/edit assessment
- ❌ `/app/(dashboard)/teacher/assessments/[id]/enter-results/page.tsx` - Enter marks

**Impact**: **HIGH** - Teachers can't create tests/exams and enter marks properly!

---

### 6. Attendance System (Partial)

**Missing Backend**:
- ❌ `features/attendance/attendanceRecord.service.ts` - Missing!
- ❌ APIs Missing:
  - `/api/attendance` - Create/update attendance ❌
  - `/api/attendance/class/[classId]` - Get class attendance for date ❌
  - `/api/attendance/student/[studentId]` - Get student attendance history ❌
  - `/api/attendance/student/[studentId]/stats` - Attendance statistics ❌
  - `/api/attendance/reports` - Attendance reports ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/teacher/attendance/page.tsx` - Mark attendance
- ❌ `/app/(dashboard)/teacher/attendance/class/[classId]/page.tsx` - Class attendance view
- ❌ `/app/(dashboard)/admin/attendance/reports/page.tsx` - Attendance reports

**Impact**: **HIGH** - Can't track student attendance!

---

### 7. Report Card System (Partial)

**Missing Backend**:
- ❌ `features/report-cards/reportCard.service.ts` - Missing!
- ❌ APIs Missing:
  - `/api/report-cards/generate` - Generate report cards ❌
  - `/api/report-cards/[id]` - Get/Update report card ❌
  - `/api/report-cards/[id]/pdf` - Download report card PDF ❌
  - `/api/report-cards/student/[studentId]` - Student's report cards ❌
  - `/api/report-cards/class/[classId]` - Class report cards ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/teacher/report-cards/page.tsx` - Report card management
- ❌ `/app/(dashboard)/teacher/report-cards/generate/page.tsx` - Generate report cards
- ❌ `/app/(dashboard)/admin/report-cards/page.tsx` - Admin view report cards
- ❌ `/app/(dashboard)/admin/report-cards/class/[classId]/page.tsx` - Class report cards

**Impact**: **HIGH** - Can't generate/print report cards!

---

### 8. Student Promotion System (Partial)

**Missing Backend**:
- ❌ `features/promotions/studentPromotion.service.ts` - Missing!
- ❌ APIs Missing:
  - `/api/promotions` - Create promotion ❌
  - `/api/promotions/[id]` - Get/Update/Delete promotion ❌
  - `/api/promotions/bulk` - Bulk promote students ❌
  - `/api/promotions/eligible` - Get eligible students for promotion ❌
  - `/api/promotions/approve` - Approve promotion (HEAD_TEACHER) ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/promotions/page.tsx` - Promotion management
- ❌ `/app/(dashboard)/admin/promotions/eligible/page.tsx` - View eligible students
- ❌ `/app/(dashboard)/admin/promotions/approve/page.tsx` - Approve promotions

**Impact**: **MEDIUM** - Manual workaround possible, but tedious

---

### 9. Parent Portal (Missing Entirely)

**Missing Backend**:
- ❌ Parent-specific APIs:
  - `/api/parent/children` - List parent's children ❌
  - `/api/parent/children/[id]/performance` - Child's performance ❌
  - `/api/parent/children/[id]/attendance` - Child's attendance ❌
  - `/api/parent/children/[id]/report-cards` - Child's report cards ❌
  - `/api/parent/children/[id]/timetable` - Child's timetable ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/parent/page.tsx` - Parent dashboard
- ❌ `/app/(dashboard)/parent/children/page.tsx` - List children
- ❌ `/app/(dashboard)/parent/children/[id]/page.tsx` - Child details
- ❌ `/app/(dashboard)/parent/children/[id]/performance/page.tsx` - Performance
- ❌ `/app/(dashboard)/parent/children/[id]/attendance/page.tsx` - Attendance
- ❌ `/app/(dashboard)/parent/children/[id]/report-cards/page.tsx` - Report cards

**Impact**: **MEDIUM** - Not critical for school operations, but expected feature

---

### 10. System Settings & Configuration (Missing)

**Missing Backend**:
- ❌ `features/settings/` - School settings
- ❌ APIs Missing:
  - `/api/settings/school` - School profile (name, address, logo) ❌
  - `/api/settings/grading-scale` - Grading scale configuration ❌
  - `/api/settings/term-dates` - Default term date patterns ❌
  - `/api/settings/notifications` - Notification preferences ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/settings/page.tsx` - System settings
- ❌ `/app/(dashboard)/admin/settings/school/page.tsx` - School profile
- ❌ `/app/(dashboard)/admin/settings/grading/page.tsx` - Grading scale
- ❌ `/app/(dashboard)/admin/settings/notifications/page.tsx` - Notifications

**Impact**: **MEDIUM** - Can hardcode initially, but needed for production

---

### 11. Automated Timetable Generation (Documented, Not Implemented)

**Status**: ✅ Documented in `docs/automated-timetable-generation-spec.md`

**Missing**:
- ❌ Third-party library integration
- ❌ Generation algorithm service
- ❌ Generation history tracking
- ❌ Constraint configuration UI (beyond basic)

**Impact**: **CRITICAL** - Main selling point of the system!

---

### 12. Permission Seed Data (Missing)

**Missing Backend**:
- ❌ `scripts/seed-permissions.js` - Currently empty!
- ❌ Need to populate default `RolePermission` mappings:
  - ADMIN → All permissions
  - HEAD_TEACHER → Most permissions
  - DEPUTY_HEAD → Many permissions
  - HOD → Department-specific permissions
  - TEACHER → Limited permissions
  - CLERK → Data entry permissions

**Impact**: **HIGH** - Can't test permission system properly!

---

### 13. Audit Logging (Missing)

**Missing Entirely**:
- ❌ `features/audit-logs/` - Track user actions
- ❌ Audit log model in schema
- ❌ Middleware to capture actions
- ❌ APIs to view logs

**Impact**: **LOW** (initially), **HIGH** (for production) - Required for accountability

---

### 14. Data Export & Reports (Missing)

**Missing Backend**:
- ❌ `features/reports/` - Report generation
- ❌ APIs Missing:
  - `/api/reports/students/export` - Export student list (CSV/PDF) ❌
  - `/api/reports/attendance/summary` - Attendance summary ❌
  - `/api/reports/performance/class` - Class performance report ❌
  - `/api/reports/timetable/print` - Printable timetable ❌

**Missing Frontend**:
- ❌ `/app/(dashboard)/admin/reports/page.tsx` - Reports hub
- ❌ Export buttons in various list views

**Impact**: **MEDIUM** - Manual workarounds exist, but users expect this

---

### 15. Notifications System (Missing)

**Missing Entirely**:
- ❌ `features/notifications/` - In-app notifications
- ❌ Email/SMS integration
- ❌ Notification preferences
- ❌ Broadcast messages (e.g., school closure)

**Impact**: **LOW** (initially), **MEDIUM** (for user engagement)

---

## Priority Matrix

### P0 - Blocking (Can't operate without)
1. ❌ Academic Year & Term Management
2. ❌ Student Class Enrollment
3. ❌ Subject-Teacher-Class Assignments
4. ❌ Permission Seed Data
5. ❌ Automated Timetable Generation

### P1 - Critical (Severely limits usefulness)
1. ❌ Assessment & Gradebook System
2. ❌ Attendance System
3. ❌ Report Card Generation

### P2 - Important (Expected features)
1. ❌ Student Promotion System
2. ❌ Parent Portal
3. ❌ Data Export & Reports

### P3 - Nice to Have
1. ❌ System Settings & Configuration
2. ❌ Audit Logging
3. ❌ Notifications System

---

## Recommended Implementation Order

### Phase 1: Foundation (Weeks 1-2)
1. ✅ Permission seed data script
2. ✅ Academic Year management (service + APIs + UI)
3. ✅ Term management (service + APIs + UI)
4. ✅ Student enrollment APIs + UI
5. ✅ Subject-Teacher-Class assignment system

### Phase 2: Core Teaching Features (Weeks 3-4)
1. ✅ Assessment service + APIs
2. ✅ Assessment UI (create, view, enter results)
3. ✅ Attendance service + APIs
4. ✅ Attendance UI (mark attendance, view history)

### Phase 3: Reporting (Week 5)
1. ✅ Report card service + APIs
2. ✅ Report card generation UI
3. ✅ Basic data exports (CSV)

### Phase 4: Advanced Features (Weeks 6-8)
1. ✅ Automated timetable generation (per separate spec)
2. ✅ Student promotion system
3. ✅ Parent portal

### Phase 5: Production Readiness (Week 9-10)
1. ✅ System settings
2. ✅ Audit logging
3. ✅ Performance optimization
4. ✅ Security hardening
5. ✅ User documentation

---

## Next Steps

1. ✅ Review this document with stakeholder
2. ⏳ Prioritize which gaps to address first
3. ⏳ Create detailed implementation specs for Phase 1
4. ⏳ Begin development

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Author**: Claude Code
**Status**: Ready for Review
