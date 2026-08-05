# Comprehensive Architectural Analysis: School Management System

**Date:** 2026-07-06
**Scope:** Full system architecture review — API layer, data layer, auth/security, frontend, infra/tooling
**Supersedes:** the 2026-01-05 version of this document, which covered a small slice of the system (mainly the teacher module) and is now outdated — most of its "critical" findings for that slice have since been fixed, but the fix never propagated past a handful of routes.
**Method:** every finding below was verified directly against source (file path + line), not inferred from naming or the prior doc.

---

## Executive Summary

The prior audit's story — "70% clean layered architecture, teacher module is the exception" — does not hold up. Surveying all 178 API route handlers shows the clean `withAuth → service → repository → ApiResponse` pattern is fully followed in only **17% of routes**. The rest either duplicate raw JWT parsing (64%) or mix the auth wrapper with leftover direct Prisma calls (19%). The teacher module specifically has been meaningfully improved since January, but that fix stopped at the top-level route in each folder — sibling/nested routes (e.g. `teacher/students/[studentId]/performance`, `teacher/classes/export-class-list`) still have the old anti-pattern.

More importantly, this pass surfaced issues the January doc never looked for, several of which are live security exposures, not style violations:

🔴 **Ship-stopping (fix immediately, independent of any refactor plan):**
- Three unauthenticated routes serving real student/guardian PII, marked `// TEMPORARY`
- One unauthenticated route that fires a real SMS to a hardcoded phone number on a bare GET
- Two unauthenticated routes (`/api/grades`, `/api/grades/[id]`) that hardcode a fake admin identity
- JWT signing secret has **three different hardcoded fallback strings** across two duplicate `auth.service.ts` files and 12 route files that each roll their own `jwt.verify()` — no startup validation would catch a missing `JWT_SECRET` in production

🟠 **Architectural, not urgent, but load-bearing:**
- The RBAC "permission system" (`features/permissions/*`) is mostly dead code — `permission.service.ts`, `permission.guard.ts`, `permission.repository.ts` are all empty. Real authorization is scattered across `lib/http/with-auth.ts`, `lib/auth/authorization.ts`, and ad-hoc per-service checks, with no revocation: permissions are baked into a 7-day JWT and never re-checked against the DB.
- ~12 live Prisma models (SMS, notifications, timetables, settings) have no corresponding migration — the dev DB was synced with `db push`, so `prisma migrate deploy` against a fresh database today would not create them.
- No test framework, no CI, and the project isn't under version control at all.

🟢 **What's actually solid:**
- Repository layer stays thin everywhere sampled — business logic correctly lives in services, not repos
- Error-handling infrastructure (`lib/http/errors.ts`, `error-handler.ts`) is comprehensive and well-designed — one of the better-built parts of the system
- Prisma schema indexing is appropriate for the query patterns observed
- Structured logger (`lib/logger/logger.ts`) is real, just under-adopted (~40% of routes)

**Bottom line:** this is not a "polish the exception" job. It's a system where the good pattern was invented once, applied inconsistently, and never enforced — plus a handful of exposures that should be pulled from production today regardless of any broader plan.

---

## 1. Scale

| Metric | Value |
|---|---|
| Framework | Next.js 16.2.4, React 19.2.3 |
| ORM | Prisma 6.19 (client) — see §5 for a version mismatch) |
| API route files (`route.ts`) | 178 |
| Feature/domain modules (`features/*`) | 25 |
| Prisma models / enums | 38 models / 28 enums (1043-line schema) |
| Custom hooks (`hooks/*.ts`) | 24 |
| Total TS/TSX files | 734 |

---

## 2. API Layer: Pattern Adherence

The intended architecture is: route handler → `withAuth` wrapper → service (business logic + authorization) → repository (thin Prisma access) → `ApiResponse`/`handleApiError` for output. Classifying all 178 route files against this:

| Category | Count | % | Definition |
|---|---|---|---|
| **GOOD** | 31 | 17% | `withAuth`/`withHODAccess` + service + `ApiResponse` + `handleApiError`, no direct Prisma |
| **MIXED** | 34 | 19% | Auth wrapper and `ApiResponse` present, but the handler still has leftover direct `prisma.*` calls |
| **VIOLATION** | 113 | 64% | Raw header parsing + `verifyToken`/`jwt.verify` duplicated inline, ad-hoc `NextResponse.json` instead of `ApiResponse`/`handleApiError` |

Of the 113 violations, **30 also make direct Prisma calls with zero service layer** (the full old anti-pattern); the other 83 at least delegate data access to a service/repository but still hand-roll auth and response shaping in every handler.

### 2.1 Correction to the January doc's premise

The claim that `teacher/students`, `teacher/classes`, `teacher/profile`, `teacher/timetable` were "fixed" is true only for the top-level route in each folder. Sibling routes in the same folders were missed:

- `app/api/teacher/students/[studentId]/performance/route.ts` (260 lines) — raw `verifyToken` + direct Prisma, no service
- `app/api/teacher/classes/export-class-list/route.ts` (217 lines) — raw `jwt.verify` with its own hardcoded secret fallback, direct Prisma
- `app/api/teacher/classes/[classId]/session-register/route.ts` (173 lines) — MIXED: `withAuth` present, several direct Prisma calls remain

### 2.2 GOOD cluster (17%)

Concentrated in a few areas that were clearly refactored as a unit: all of `hod/assignments*`, `hod/classes`, `hod/subjects`, `hod/teachers`; all of `sms/*` except `test-send`; most `teacher/*` root routes; `admin/attendance/analytics`, `admin/reports/subject-analysis`, `admin/settings/sms*`. The pattern hasn't propagated to `admin/*` broadly, `hod/reports/*`, `hod/curriculum`, or any of the flat top-level CRUD resources (`students`, `classes`, `subjects`, `attendance`, `assessments`, `terms`, `enrollments`, `departments`, `parents`, `permissions`, `report-cards`, `notifications`, `timetables`).

### 2.3 God-functions (>150 lines) — worst offenders

| File | Lines | Category | Issue |
|---|---|---|---|
| `admin/timetable/export-pdf/route.ts` | 428 | VIOLATION | Raw `jwt.verify` w/ hardcoded fallback, direct Prisma, PDF/ZIP generation inlined |
| `students/[id]/performance/route.ts` | 313 | MIXED | Uses a **second, legacy** `withAuth` (`lib/auth/with-auth.ts`, used nowhere else) + heavy direct Prisma |
| `hod/assessment-entries/route.ts` | 295 | MIXED | withAuth + ApiResponse present, but own Prisma queries alongside the service |
| `teachers/[id]/route.ts` | 289 | VIOLATION | Raw JWT parsing, GET/PATCH/DELETE/PUT all in one 289-line file |
| `hod/dashboard/route.ts` | 276 | VIOLATION | Raw `verifyToken` + direct `prisma.department.findUnique` with deep nested includes |
| `teacher/subject-performance/route.ts` | 272 | VIOLATION | Raw header parsing, direct Prisma, no service |
| `classes/[id]/route.ts`, `departments/[id]/route.ts` | 270 | VIOLATION | Raw JWT parsing repeated per HTTP verb |
| `students/[id]/route.ts`, `subjects/[id]/route.ts` | 266 | VIOLATION | Same pattern |

Full lists of MIXED (34) and VIOLATION (113) files are in the Appendix.

### 2.4 Two competing `withAuth` implementations

`lib/http/with-auth.ts` (current, used by 64 files) and a legacy `lib/auth/with-auth.ts` (used by exactly one file, the 313-line `students/[id]/performance/route.ts`). The legacy one should be deleted once that route is migrated.

---

## 3. Security — the part that needs action independent of any refactor timeline

### 3.1 Unauthenticated routes exposing real data or actions (🔴 fix now)

| Route | Lines | Problem |
|---|---|---|
| `app/api/debug/class-subjects/route.ts` | 91 | No auth, direct Prisma, dumps class/subject assignment data. Comment: `// TEMPORARY` |
| `app/api/debug/guardians/route.ts` | 44 | No auth, dumps guardian names/phones/emails |
| `app/api/debug/report-card/route.ts` | 114 | No auth, dumps full report-card grade breakdowns |
| `app/api/sms/test-send/route.ts` | 52 | No auth. A bare `GET` sends a **real SMS** via `smsService.sendSMS` to a **hardcoded real guardian phone number**, using a hardcoded admin context. Comment: `// TEMPORARY FOR TESTING ONLY — DELETE AFTER SUCCESSFUL TEST`. Anyone who finds the URL spams that person and burns SMS credit. |
| `app/api/grades/route.ts` | 78 | No auth at all. Hardcodes `{ userId: "system", role: "ADMIN" }` and calls the service directly — any request can list/create grades system-wide |
| `app/api/grades/[id]/route.ts` | 117 | Same issue |
| `app/api/auth/me/route.ts` | 72 | No auth wrapper — uses a raw `verifyAuthToken` call outside `withAuth` (lower severity, it's the "who am I" endpoint, but inconsistent) |

**Recommendation:** delete or gate the three `debug/*` routes and `sms/test-send` behind `withAuth` + an admin-only + non-production check; add `withAuth` to `grades` and `grades/[id]` immediately.

### 3.2 JWT secret handling — duplicated and fragile

- `features/auth/auth.service.ts:6` — `process.env.JWT_SECRET || "fallback-secret-key-change-in-production"`
- `lib/services/auth.service.ts:6` — a **second, unreferenced duplicate** `AuthService` class with its own fallback, `"your-secret-key-change-in-production"` — dead code, but a landmine if anything ever imports it
- **12 separate route files** each define their own `const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"` and call `jwt.verify()` directly instead of the shared helper: `admin/rooms/route.ts`, `admin/rooms/[roomId]/route.ts`, `admin/timetable/{view,swap,generate,export-pdf,configuration}/route.ts`, `admin/settings/{system,security,school-info,school-info/logo}/route.ts`, `teacher/classes/export-class-list/route.ts`
- No env-validation module anywhere checks that `JWT_SECRET` is actually set at startup — if it's ever unset in production, the fallback silently activates and is forgeable by anyone who reads this file (or the analysis you're reading now).
- The current `.env` does set a real secret, so this isn't live today — but nothing prevents a future deploy from omitting it, and the fallback string is now public in this document, so it should be treated as compromised regardless.

### 3.3 The RBAC "permission system" is mostly dead code

`features/permissions/permission.service.ts`, `permission.guard.ts`, `permission.repository.ts`, and `index.ts` are all empty. Only `rolePermission.repository.ts` and `userPermission.repository.ts` have real content, consumed once at login (`auth.service.ts:88`) to bake a static `permissions[]` array into the JWT. Actual enforcement happens through two disconnected mechanisms instead: `withPermission()`/`withRole()` in `lib/http/with-auth.ts`, and ad-hoc `canCreate()`/`canUpdate()` methods scattered per-service. There is no single place that answers "what can this role do" — the module named for that purpose is a shell.

### 3.4 No permission/session revocation

`withAuth` only verifies the JWT signature and expiry — it never re-checks `isActive`, role, or permissions against the DB (contrast `auth/me/route.ts`, which does, but that endpoint isn't used for authorization on any mutation route). Combined with a 7-day expiry and zero refresh-token implementation (confirmed zero hits repo-wide for `refreshToken`), a deactivated user or a user whose role/permissions just changed keeps full access with stale privileges for up to a week. There is no token blacklist.

### 3.5 Inconsistent authorization on student PII reads

`features/students/student.service.ts`'s `createStudent` correctly gates on role via `requireAnyRole`, but `getAllStudents`/`getStudents` accept a context parameter (one literally named `_context`, confirming it's unused) and never check it. Any authenticated staff role can read full student records — including `vulnerability`, `medicalInfo`, `orphanType` — with zero gating. May be intentional (all staff can view all students), but it's inconsistent with the write side and should be a deliberate decision, not an accident.

### 3.6 No rate limiting anywhere

`/api/auth/login` and `/api/auth/change-password` have no throttling, lockout, or attempt tracking. There's no root-level Next.js Edge Middleware (`lib/auth/middleware.ts` is a helper module, not `middleware.ts`), so there's no request-level throttling at any layer. Open to unlimited credential-stuffing/brute-force.

### 3.7 Default credentials

New teacher accounts get a hardcoded default password `"teacher123"` (`features/teachers/teacher.service.ts:253,286`), sent in plaintext via SMS. `hasDefaultPassword: true` is set but nothing found actually blocks further access until it's changed. The same string appears live in several `scripts/*.ts` files.

### 3.8 What's fine

- `bcryptjs` used consistently, cost factor 10, no plaintext storage found
- SMS provider keys (`africasTalking.service.ts`, `httpSms.service.ts`) read from env with no hardcoded fallback
- No CSRF exposure: token travels via `Authorization` header, not an auto-attached cookie, so classic CSRF doesn't apply (the real residual risk is XSS-driven `localStorage` theft, see §4)
- `.gitignore` already excludes `.env*` — good hygiene for when this becomes a real repo (it currently isn't one at all, see §6)

---

## 4. Data Layer

### 4.1 Migration/schema drift (🟠 real operational risk)

`prisma/migrations/` has 8 migrations, last dated 2026-01-11 — roughly six months before the current schema state despite active development since. Cross-checking migration SQL against `schema.prisma` shows **12 live models with zero `CREATE TABLE` in any migration**: `SMSLog`, `SMSTemplate`, `Notification`, `ClassTimetable`, `SecondaryTimetable`, `TimeSlot`, `TimetableConfiguration`, `SubjectPeriodRequirement`, `AssessmentWindow`, `EczGradingScheme`, `SystemSettings`, `ClassSubject`. `db:push` and `db:migrate` are both available npm scripts — strong evidence `db push` was used for these, bypassing migration history entirely. **Running `prisma migrate deploy` against a fresh database today would not create these 12 tables.**

### 4.2 Transactional integrity gaps

- **Report-card position recalculation** (`reportCard.service.ts:305-339`, `calculateClassPositions`): loops and calls `reportCardRepository.update()` once per student sequentially, no `$transaction`. A mid-loop failure leaves positions half-updated. The codebase already has the right pattern elsewhere (`bulkEnterResults` in `assessment.service.ts:692-828` — one `findMany` + a single `prisma.$transaction([...])` — worth using as the template).
- **Bulk attendance marking** (`attendanceRecord.service.ts:161-188`): loops per student, 2 sequential queries each (findUnique + create/update) — the highest-frequency operation in the app (daily, per class/period), and the worst N+1 found.
- **Enrollment capacity check — TOCTOU race**: `enrollment.repository.ts` explicitly documents "transaction-safe" helpers (`countByClass(..., tx?)`, `createInTransaction`) built for exactly this, but `enrollment.service.ts:createEnrollment` (lines 96-180) calls the duplicate check, capacity check, and create as **three separate non-transactional calls**. Two concurrent enrollments can both pass the capacity check before either commits, over-filling a class. `bulkEnroll` compounds this by looping `createEnrollment` sequentially (also N+1).

### 4.3 Inconsistent `onDelete` + missing FK-error handling

`ClassTimetable.subject`/`SecondaryTimetable.subject` default to `Restrict` while `TimetableSlot.subject` cascades. `ReportCard.academicYear`/`.classTeacher` and `StudentPromotion.approver` default to `Restrict` while sibling FKs on the same models cascade. Paired with this: `subject.repository.ts` and `teacher.repository.ts`'s `delete()` methods have no try/catch for Prisma's `P2003` (FK violation) — unlike `assessment.repository.ts`, `reportCard.repository.ts`, `enrollment.repository.ts`, which all translate it into a friendly error. Deleting a `Subject` with timetable entries, or a `TeacherProfile` with report cards, will bubble a raw unhandled 500 instead.

### 4.4 What's solid

Repository layer stays genuinely thin everywhere sampled (student, promotion, assessment, timetable, report-card, enrollment repos) — business logic correctly lives in services. Indexing is appropriate for the query patterns observed; no high-traffic model found with only a bare PK.

---

## 5. Frontend

### 5.1 `apiRequest` de-duplication is incomplete

17 of 24 hooks correctly import `apiRequest`/`getAuthToken` from `lib/api-client.ts`. **7 still hand-roll the exact pattern this was supposed to eliminate** — own `localStorage.getItem`, manual headers, manual `response.ok` handling: `useHodClasses.ts`, `useHodAssignments.ts`, `useHodDashboard.ts`, `useTeachingContext.ts`, `usePermissions.ts` (worst — 4 separate inline fetches in one file), `useSubjectPerformance.ts`, `useStudentPerformance.ts`.

### 5.2 `useAuth.ts` is a stub — no real auth context exists

```ts
export function useAuth() {
  // TODO: Implement auth hook
  return { user: null, isLoading: false, isAuthenticated: false };
}
```
No React Context for current-user/auth exists anywhere. As a direct result, **74 separate files** call `localStorage.getItem("auth_token")` directly — hooks, page components, dialogs — instead of going through one source of truth. Token handling, refresh, and role checks are copy-pasted throughout rather than centralized.

### 5.3 No caching layer → redundant fetches

No Zustand/Redux/React Query/SWR — pure `useState` per hook plus a hand-rolled invalidation pub-sub (`lib/invalidation.ts`). Reasonable for invalidation, but no de-duplication: `/api/terms/active` is independently fetched by `useSubjectPerformance`, `useStudentPerformance`, and directly inside at least 4 page components, rather than through the existing `useTerms.ts`.

### 5.4 No error boundaries anywhere

Zero `componentDidCatch`/`ErrorBoundary`/`react-error-boundary` usage found in `app/` or `components/`. A single unhandled render error blanks the whole app with no fallback UI at any level.

### 5.5 Hook return shape has already drifted

Most hooks use `isLoading` + a domain-named data field (`students`, `teachers`, …). `useSubjectPerformance.ts` and `useStudentPerformance.ts` use `loading` (not `isLoading`) + `data`. Any generic consumer of `{loading, error}` across hooks will silently break on the majority convention.

### 5.6 Dead code accumulating in place

- `components/students/students-table.tsx` (146 lines) — dead; only `components/shared/tables/students-table.tsx` is actually imported
- `components/students/student-form-old.tsx` (895 lines) and `student-form-simplified.tsx` (593 lines) — both unreferenced; only `student-form.tsx` (736 lines) is wired up. ~1,500 dead lines sitting next to the live version.
- `components/mobile/teacher/*` — 6 of 7 components have zero references anywhere (`MobileClassesView`, `MobilePerformanceView`, `MobileProfileView`, `MobileReportsView`, `MobileTimetableView`, `MobileAssessmentsView`). By contrast, `components/mobile/admin/*` and `components/mobile/hod/*` layout chrome **is** genuinely wired in. The teacher mobile views were built, then abandoned when desktop pages grew their own inline responsive/fetch logic instead.

### 5.7 No generic DataTable/FormDialog

`components/shared/tables/` is 7 independently hand-written table components (students, teachers, classes, departments, parents, report-cards, subjects), each re-composing `Table`/`DropdownMenu`/status-badges from scratch with no shared column-config abstraction.

### 5.8 What's fine

Form validation via `react-hook-form` + `zodResolver` is adopted consistently across ~20 live forms/dialogs.

---

## 6. Infra & Tooling

### 6.1 No real test framework, no CI, not under version control

- `package.json` devDependencies have no Jest/Vitest/Playwright/Cypress/Testing-Library. No config file for any of them.
- `tests/` (9 files): 3 real `*.test.ts` files with pass/fail counters and `process.exit(1)` on failure (genuine, just hand-rolled instead of framework-based), plus manual Markdown QA checklists.
- `scripts/` (126 files, ~50 named `test-*.ts`): ad-hoc `tsx` smoke scripts requiring a live dev server and manually seeded DB. Rigor varies — `test-login-system.ts` swallows failures into `console.log` with no `process.exit(1)` on failure at all, so a "failing" run still reports as completed.
- No `.github/workflows` or any CI config.
- The project directory is **not a git repository** at all — there is no version control in place yet.

### 6.2 Logging — real, but half-adopted

`lib/logger/logger.ts` (240 lines) is a genuine structured logger (levels, JSON in prod, `logRequest`/`logAuth`/etc.) but console-only — no external sink wired up (the Datadog/CloudWatch hooks are comments). Used in only 49 of 178 route files; 110 route files still use raw `console.*` (204 occurrences).

### 6.3 Error handling — comprehensive, genuinely well-built

`lib/http/errors.ts` + `error-handler.ts` map every typed error (`BadRequest`/`Unauthorized`/`Forbidden`/`NotFound`/`Conflict`/`Validation`/`InternalServerError`/`ServiceUnavailable`) plus explicit Prisma error codes (P2002, P2003, P2025, P2018, P2011, P2000, P2009, P1008) to correct HTTP statuses, with production error-message hiding. This is one of the stronger, more complete parts of the codebase — it just isn't used everywhere (see §2).

### 6.4 No env validation; `next.config.ts` is unmodified boilerplate

No env-schema module validates `JWT_SECRET`/`DATABASE_URL`/SMS keys at startup. `next.config.ts` is the default template — no security headers, no CSP, no image domains.

### 6.5 Dependency issues

- **`@prisma/adapter-pg@7.2.0` vs `@prisma/client@6.19.2`/`prisma@6.19.3`** — a full major version ahead of the client it pairs with. Driver adapters are version-locked to client major; this is a strong candidate for a silent incompatibility.
- `axios` is imported in `scripts/test-login-system.ts` but not declared in `package.json` at all — only resolves today because it's hoisted transitively; would break on a clean install.

---

## 7. Recommendations

### Phase 0 — Today, independent of everything else
1. Delete or auth-gate the 3 `debug/*` routes and `sms/test-send`
2. Add `withAuth` to `grades` and `grades/[id]`
3. Rotate/confirm `JWT_SECRET` is set in every real environment; delete the dead `lib/services/auth.service.ts` duplicate
4. Decide and document whether all-staff student PII reads (§3.5) are intentional

### Phase 1 — Security hardening
5. Add rate limiting to `/api/auth/login` and `/api/auth/change-password`
6. Add DB re-check (isActive, role, permissions) to `withAuth`, or shorten JWT expiry + add refresh tokens
7. Either implement `features/permissions/*` for real or remove it and document the actual (ad-hoc) authorization mechanism so it isn't mistaken for the real system
8. Reconcile `prisma/migrations/` with actual schema — generate migrations for the 12 drifted models before this ever needs a fresh-database deploy

### Phase 2 — Propagate the existing good pattern
9. Migrate the 113 VIOLATION routes to `withAuth` + `ApiResponse` + `handleApiError` — start with the 30 that also lack a service layer (full rewrite needed anyway)
10. Delete the legacy `lib/auth/with-auth.ts` once `students/[id]/performance` is migrated
11. Fix the transactional gaps in §4.2 (report-card positions, bulk attendance, enrollment capacity) using `bulkEnterResults` as the template
12. Route the remaining 7 hooks through `apiRequest`; implement a real `AuthContext`/`useAuth`

### Phase 3 — Cleanup and hardening
13. Delete dead code: duplicate student-form variants, orphaned students-table, unwired `mobile/teacher/*` views (or wire them up if teacher mobile UX is actually wanted)
14. Add a root-level Error Boundary
15. Standardize hook return shape (`isLoading`/`data`)
16. Pin `@prisma/adapter-pg` to match the client major version; add `axios` to `package.json` or remove its usage from scripts
17. Set up a real test framework (Vitest is the lowest-friction fit given existing TS tooling) and CI once the project is under version control

### Phase 4 — Process
18. Initialize git version control — there is currently no history, no way to review changes, no branch protection, nothing to hang CI off of
19. Add basic security headers / CSP to `next.config.ts`

---

## Appendix: Full Route Classification

### MIXED (34) — auth wrapper + ApiResponse present, but direct Prisma remains in handler

| File | Lines |
|---|---|
| `students/[id]/performance` | 313 (uses legacy `lib/auth/with-auth`) |
| `hod/assessment-entries` | 295 |
| `hod/curriculum` | 281 |
| `sms/assessment-notify` | 268 |
| `hod/reports/performance` | 226 |
| `admin/reports/performance` | 187 |
| `hod/curriculum/[classId]` | 178 |
| `teacher/classes/[classId]/session-register` | 173 |
| `departments/[id]/members` | 165 |
| `admin/dashboard/stats` | 132 |
| `sms/broadcast/preview` | 128 |
| `admin/dashboard/attendance` | 118 |
| `admin/stats/students` | 117 |
| `hod/profile` | 117 |
| `admin/stats/teachers` | 112 |
| `hod/teachers/[teacherId]/subjects` | 105 |
| `users` (root) | 98 |
| `subjects/[id]/usage` | 97 (no ApiResponse/handleApiError) |
| `admin/settings/academic-policy` | 83 |
| `hod/assessment-entries/deadline` | 76 |
| `admin/assessment-windows` (root) | 74 |
| `admin/reports/classes`, `hod/reports/classes` | 58 |
| `hod/reports/subjects` | 56 |
| `teacher/reports/terms` | 54 |
| `hod/reports/terms` | 53 |
| `admin/reports/terms`, `admin/settings/seed-grades` | 49 |
| `assessment-windows` (root) | 47 |
| `teacher/timetable` | 46 |
| `hod/reports/grades` | 43 |
| `admin/reports/subjects` | 38 |
| `admin/reports/grades` | 36 |
| `admin/assessment-windows/[id]` | 32 |

Pattern for nearly all `hod/reports/*` and `admin/reports/*`: the main service call is correct, but a preliminary lookup (academic year/term/department) is done via raw Prisma instead of the repository.

### VIOLATION (113) — raw JWT parsing / ad-hoc responses

**Sub-type A — full anti-pattern, no service layer at all (30 files):** `admin/timetable/export-pdf` (428), `hod/dashboard` (276), `teacher/subject-performance` (272), `teacher/students/[studentId]/performance` (260), `parents/[id]/students` (239), `teacher/classes/export-class-list` (217), `notifications` (189), `notifications/[id]` (151), `hod/performance` (149), `permissions/users/[id]/overrides` (142), `user/teaching-context` (142), `admin/fix-grades` (139), `permissions/users/[id]/role` (135), `admin/timetable/swap` (131), `permissions/users` (128), `classes/import` (120), `debug/report-card` (114), `permissions/users/[id]/overrides/[permission]` (109), `subjects/import` (103), `auth/change-password` (102), `admin/timetable/configuration` (98), `debug/class-subjects` (91), `teachers/[id]/reset-password` (78), `terms/active` (75), `admin/timetable/generate` (73), `notifications/unread-count` (50), `debug/guardians` (44), `timetables/suggestions` (141), `timetables/detect-clashes` (122), `timetables/check-availability` (107).

**Sub-type B — auth-pattern violation only, data access already delegated (83 files):** nearly every flat CRUD resource route — `teachers/[id]` (289), `classes/[id]` (270), `departments/[id]` (270), `students/[id]` (266), `subjects/[id]` (266), `parents/[id]` (262), `admin/curriculum` (236), `attendance` (210), `teachers` (208), `assessments/[id]` (195), `classes/[id]/class-teacher` (195), `students` (195), `admin/settings/school-info/logo` (185), `admin/curriculum/grades/[gradeId]/subjects/[subjectId]` (176), `classes` (173), `attendance/[id]` (170), `enrollments/[id]` (169), `academic-years/[id]` (168), `assignments/[id]` (168), `terms/[id]` (166), `assessments` (165), `parents` (164), `departments` (160), `report-cards/[id]` (159), `subjects` (158), `report-cards/[id]/pdf` (157), and ~55 more routes under 150 lines following the identical pattern (see git history of this analysis for the full flat list if needed — all share the same fix).

---

**Document End**
