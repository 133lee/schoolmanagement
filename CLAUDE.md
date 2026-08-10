# CLAUDE.md — School Management System

This file is binding, not advisory. It exists because this codebase has drifted from its own
established patterns before — see `docs/ARCHITECTURAL_ANALYSIS.md` for the full account. Every
session (mine or a future one) must read this before touching `app/api/`, `features/`, or `hooks/`.

## Stack

Next.js 16 (App Router) + React 19, PostgreSQL via Prisma, JWT auth, Tailwind + Radix UI,
Zod validation, `bcryptjs` for hashing, Sonner for toasts.

## The architecture (non-negotiable)

Every API route MUST follow this chain, in this order:

```
route.ts  →  withAuth()  →  Service (business logic + authorization)  →  Repository (Prisma)  →  ApiResponse
```

- **`app/api/**/route.ts`** — thin. Extract params, call one service method, return the result. No
  business logic, no direct Prisma calls, no manual JWT parsing. Target: under ~50 lines.
- **`lib/http/with-auth.ts`** — the ONLY way a route authenticates. Never parse
  `authorization` headers or call `verifyToken`/`jwt.verify` directly inside a route handler.
- **`features/*/[domain].service.ts`** — owns business logic, authorization checks
  (`canCreate`/`canUpdate`/`requireAnyRole`), and validation orchestration. This is where
  permission checks belong — always call them, even on read paths (`getAll`, `getById`), not just
  writes.
- **`features/*/[domain].repository.ts`** — thin Prisma access only. No conditionals beyond
  filtering, no calculations, no orchestration across other repositories. Wrap any multi-step write
  (more than one `prisma.*` call that must succeed or fail together) in `prisma.$transaction(...)`.
  See `assessment.service.ts`'s `bulkEnterResults` as the reference implementation for batched
  transactional writes — copy that shape, not a sequential loop.
- **`lib/http/api-response.ts` / `error-handler.ts`** — the ONLY way a route returns JSON. Never
  hand-roll `NextResponse.json({...})` for success or error paths. Throw typed errors from
  `lib/http/errors.ts` (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ConflictError`,
  etc.) and let `handleApiError` translate them.
- **`lib/logger/logger.ts`** — the only logging call. Never `console.log`/`console.error` in a
  route or service.
- **`features/*/[domain].validation.ts`** — real Zod schemas, checked at the API boundary before
  the service is called. Never leave one of these empty.

## Authorization — how it actually works

There is no separate "RBAC engine" — `features/permissions/` used to contain empty stub files
(`permission.service.ts`, `.guard.ts`, `.repository.ts`, `.types.ts`) that looked like one but were
never implemented; they were deleted (2026-07-06) rather than built out, because real enforcement
already works, split across three genuinely-used mechanisms. Know all three before touching auth
code:

1. **Role hierarchy** (`lib/auth/role-hierarchy.ts`) — `ADMIN > HEAD_TEACHER > DEPUTY_HEAD >
   {TEACHER, CLERK}`. Checked via `requireAnyRole`/`requireMinimumRole`/`hasRoleAuthority`
   (`lib/auth/authorization.ts`). This is what most service-layer checks use.
2. **HOD position** (`lib/auth/position-helpers.ts`) — HOD is NOT a role (removed from the `Role`
   enum in migration `remove_hod_from_role_enum`). It's derived live from
   `Department.hodTeacherId`. Use `isHOD(userId)`/`getHODDepartment(userId)`, never a
   `Role.HOD`-style check — that constant doesn't exist and a role-only check will silently exclude
   HODs from things they should access (they're `Role.TEACHER` underneath).
3. **Per-user permission overrides** — time-boxed grants/revocations on top of the role, checked via
   `withPermission()` in `lib/http/with-auth.ts`. The actual read path is
   `features/auth/auth.repository.ts`'s `getUserPermissions()`, which queries the `RolePermission`
   and `UserPermission` Prisma models directly — not via `features/permissions/rolePermission.repository.ts`
   (deleted 2026-07-12: dead code, never called; verified with `knip` plus a manual trace of the
   actual call path before removing it). `features/permissions/userPermission.repository.ts` is
   still real and in active use, but only for the admin UI that *manages* overrides
   (`userManagement.service.ts`), not for the request-time permission check itself.
   `withAuth` recomputes both `role` and this permission list from the database on every request
   (not from the JWT payload) so deactivation, role changes, and permission overrides/expiry take
   effect on the next request rather than waiting out the 7-day token lifetime.

If you're about to add a new kind of access check, use one of these three — don't create a fourth.

## Hard rules — MUST NOT

- MUST NOT import `@/lib/db/prisma` inside `app/api/**/route.ts`. Prisma is only ever called from
  a repository.
- MUST NOT define a local `JWT_SECRET` fallback string anywhere (`|| "..."`.) There is exactly one
  place JWT secrets are read: `features/auth/auth.service.ts`, from `process.env.JWT_SECRET` with
  no fallback. If it's missing, fail loudly, don't substitute a guessable string.
- MUST NOT ship an unauthenticated route, including "temporary" debug/test endpoints. If you need
  a scratch endpoint while developing, delete it before ending the session — don't leave a
  `// TEMPORARY` comment as a substitute for actually removing it.
- MUST NOT create a second implementation of something that already exists (a second `withAuth`, a
  second `AuthService`, a second table component per domain). Before writing a new hook, service,
  or wrapper, grep for an existing one first.
- MUST NOT leave dead/superseded files in place "just in case" (e.g. `*-old.tsx`,
  `*-simplified.tsx`, unwired components). If a replacement is written, delete the file it
  replaces in the same change.
- MUST NOT use `db push` to add a new Prisma model or field. Always `prisma migrate dev` so
  `prisma/migrations/` stays the source of truth. (Note: 12 existing models currently have no
  migration — see the architecture doc; don't add a 13th.)

## When writing a new API route, model it on these (known-good)

**Good reference files** — read one of these before writing a new route:
`app/api/hod/teachers/route.ts`, `app/api/sms/send/route.ts`, `app/api/teacher/students/route.ts`.

As of 2026-07-09, every route in `app/api/**` has been migrated onto the chain above (verified by
grepping for `verifyToken`/`jwt.verify` and `@/lib/db/prisma` inside `app/api/**/route.ts` — zero
matches) — there is no longer a "known-bad, don't copy" list. A few routes (documented inline with
a comment where it applies, e.g. `app/api/admin/timetable/{configuration,generate,swap,view,export-pdf}/route.ts`,
`app/api/admin/settings/{school-info,security,system}/route.ts`) intentionally return a bare
top-level shape instead of the standard `ApiResponse` envelope because existing frontend pages read
that shape directly and non-defensively — that's a deliberate, called-out exception, not something
to flag as a violation.

## Integration testing

Real, automated tests live in `tests/integration/**/*.test.ts`, run via `npm test` (Vitest —
`vitest run`; `npm run test:watch` for the watch mode). There is no other test framework in this
project — never add a new one-off `scripts/*.ts` "test" script; that pattern (60+ ad-hoc
`npx tsx scripts/test-*.ts` files, none using a real framework, 45+ already broken by schema/API
drift) was deleted 2026-07-09 for exactly this reason.

- **No running server, no Supertest.** Import the route's exported `GET`/`POST`/etc. directly from
  `route.ts` and invoke it with `callRoute()` (`tests/helpers/callRoute.ts`) — it builds a real
  `NextRequest` and reads the real `NextResponse`, exercising the full
  `withAuth`/`withRole` → service → repository → `ApiResponse` chain with no HTTP round trip.
- **Auth**: mint tokens with `loginAs(email, password)` (`tests/helpers/auth.ts`) — it calls the
  real `authService.login`, so it's a genuinely signed JWT (password hash check included), not a
  forged token.
- **Fixtures**: `tests/helpers/db.ts` has `createTestUser`/`createTestAcademicYear`/`createTestTerm`/
  `createTestGrade`/`createTestClass`/`createTestStudent`. Extend this file with new factories
  rather than inlining ad-hoc Prisma calls per test.
- **Isolation**: call `resetDb()` (same file) in `beforeEach` — it truncates every app table.
  Repositories share one module-level `prisma` singleton rather than accepting an injectable
  per-call client, so transaction-rollback isolation isn't available; don't try to work around this
  per-test, extend `resetDb()`/the fixtures instead if something new is needed.
- **Test database only**: `tests/setup.ts` loads `.env.test` (a separate local Postgres DB, name
  ending in `_test`) before anything else and refuses to run if `DATABASE_URL` doesn't look like a
  test DB. Never point `.env.test` at the dev/prod database — `resetDb()` will wipe it.
- **Concurrency bugs need a real concurrent test, not a mock.** The enrollment-capacity race fixed
  this session (`features/enrollments/enrollment.service.ts`) was originally "fixed" with a bare
  `prisma.$transaction` wrap, verified only by code review — the integration test built to prove it
  (`tests/integration/enrollment.test.ts`, firing two real concurrent requests) caught that the wrap
  alone doesn't close the race under Postgres's default `READ COMMITTED` isolation, which needed an
  explicit `SELECT ... FOR UPDATE` row lock (see `enrollmentRepository.lockClassForUpdate`). If
  you're fixing a race condition, the test must actually run concurrent requests against a real DB —
  a single-threaded test proves nothing here.

## Security baseline

- Every route authenticates via `withAuth`, no exceptions, including internal/admin/debug tooling.
- Every service method that reads or writes data the user shouldn't universally see calls a
  permission/role check — including list/read endpoints, not just create/update/delete.
- Default passwords (e.g. new teacher accounts) must force a change before any other action
  succeeds — don't just set a flag and trust the client to enforce it.
- No secrets, tokens, or real credentials in code, comments, or scripts, even for local dev — use
  `.env` (already gitignored) and clearly-fake placeholder values in seed scripts.

## Server-side PDF generation

`@react-pdf/renderer`'s `renderToStream` is CPU-bound and blocks Node's single event loop for
several hundred milliseconds per document — while it's running, the whole server can't process
*any* other request, not just other PDF requests. Every server-side route that calls
`renderToStream` (currently `report-cards/[id]/pdf`, `admin/timetable/export-pdf`,
`teacher/classes/export-class-list`) MUST wrap that call in `pdfLimiter.run(...)`
(`lib/pdf/pdf-limiter.ts`) — a semaphore that caps concurrent renders (`PDF_CONCURRENCY` env,
default 3) and queues the rest instead of letting them pile up and saturate the CPU. If you add a
new PDF-exporting route, wrap it too — don't call `renderToStream` directly.

Any loop that renders multiple PDFs in a single request (e.g. `export-pdf`'s `exportAll` case,
one render per class) must also `await` a yield back to the event loop between iterations
(`setImmediate`-based, see `yieldToEventLoop` in that route) — otherwise a single request can
monopolize the event loop for the loop's entire duration before anyone else gets served, even with
the limiter in place.

**Known limitation, by design, not yet fixed**: this bounds and queues the blocking, it doesn't
eliminate it — each individual render still blocks the event loop while it runs. A proper fix
(true non-blocking PDF generation) would move rendering into a `worker_threads` pool, but that
turned out to need a separate pre-compilation build step (Node can't execute the `.tsx` PDF
templates directly, and Next's own bundler doesn't process files only ever reached via a runtime
`new Worker(path)` string) — real added complexity, not implemented, and not worth doing before
this is proven necessary at actual scale. Don't reach for `worker_threads` here without first
building and testing that separate build step end-to-end against a real production build.

## Offline support (removed, 2026-08-10)

A Phase 1 read-only offline cache for the teacher module (service worker via `@serwist/next`,
`app/sw.ts` → `public/sw.js`, `NetworkFirst` caching for `/api/teacher/**` and `/api/terms`, plus
an install manifest and an offline banner) was built and shipped, but did not work reliably in
practice and has been fully removed — `@serwist/next`/`serwist` are no longer dependencies,
`next.config.ts` no longer wraps the config with Serwist, and `npm run build` runs plain
`next build` again (the earlier `--webpack` flag existed solely to satisfy Serwist).
**If offline support is revisited, don't just re-add the same service-worker approach without
first diagnosing why Phase 1 didn't work** — re-shipping the same broken mechanism helps no one.

## Before marking any task done

1. Run `npm run lint`.
2. If you touched `app/api/**`, re-check the route against the chain above — does it use
   `withAuth`, a service, and `ApiResponse`/`handleApiError`? No direct Prisma, no manual JWT
   parsing, no hand-rolled `NextResponse.json`.
3. If you touched a hook, confirm it imports `apiRequest`/`getAuthToken` from `lib/api-client.ts`
   rather than redefining them.
4. Don't claim something is fixed without having read the resulting file back.
5. `tsc`/`eslint` passing proves the code compiles, not that it behaves correctly. If you changed
   business logic in a service — anything involving a `$transaction`, concurrency, or a bug fix —
   that change isn't done until a test in `tests/integration/` (see "Integration testing" below)
   exercises the specific behavior or failure mode, not just a green typecheck. Run `npm test`.

## Where to look for more context

`docs/ARCHITECTURAL_ANALYSIS.md` has the full audit this file is derived from: a route-by-route
classification of the entire API surface, the data-layer transaction/migration issues, the frontend
dead-code inventory, and a phased remediation plan. If you're unsure whether something is an
established pattern or a past mistake, check there before assuming the existing code is right.
