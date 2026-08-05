Golden Rules for System Architecture

1. Respects Domain Invariants
   Use existing models and service patterns
   Query only fields that exist in the actual Prisma schema
   Never assume fields exist without verification
   No made-up columns or imaginary schema features
2. No UI Hacks
   Proper validation at API and service layers
   Backend enforces business rules, not just UI
   Never rely on frontend validation alone
   Handle errors at the source, not with workarounds
3. No Cross-Role Side Effects
   Each role's scope is isolated (Admin, HOD, Teacher, Parent)
   HOD changes don't affect Admin data
   Clear boundaries: HOD = department + secondary grades only
   Role-specific services with explicit scoping
4. Explicit About Changes
   Document both backend (service + API routes) and frontend (pages + components)
   List all files being modified or created
   No hidden dependencies or implicit requirements
   Clear separation: what exists vs what needs to be built
5. Follow Established Patterns
   Reuse existing architecture (don't reinvent)
   If Admin has a pattern, HOD follows the same pattern with scoping
   Use ApiResponse.success/error contract consistently
   Follow existing service → repository → database flow
6. HARD vs SOFT Invariants
   HARD: Database constraints, never violate (unique keys, foreign keys, required fields)
   SOFT: Business rules that can change (HOD manages secondary grades, academic year closure)
   Distinguish between immutable system rules vs configurable policies
7. Valid Empty States
   Recognize legitimate empty conditions (no active academic year during setup)
   Don't treat valid empty states as errors
   Return null values gracefully, not 500 errors
   Empty database at initialization is expected, not broken
8. Contract Mismatch vs Bug
   Distinguish API contract violations from actual bugs
   If API contract is wrong, fix the contract first
   If schema doesn't match code, trust the schema
   Prisma schema is source of truth, code must match it
9. Computed vs Stored Data
   Dashboard stats are computed from queries, never cached
   Class.currentEnrolled is never updated, always computed from enrollments
   Don't store derived state that can be calculated
   Query for real-time data, don't trust stale counts
10. Read Before Edit
    Always use Read tool before Edit tool
    Verify file contents match expectations
    Check schema before writing queries
    Validate assumptions against actual code
    These rules ensure architectural integrity, data correctness, and maintainable patterns across the entire system. They prevent hacks, enforce boundaries, and respect the domain model.

Foundation
Recommend A NON-HACKY FIX

Your solution must:

Respect domain invariants

Avoid UI hacks or forced refetches

Avoid cross-role side effects

Be explicit about what changes (API, DB, frontend, or all)

If the fix requires redefining business rules, say so.

Do NOT jump straight to code — reasoning first.

🔒 Golden Rule (write this down):

apiRequest must return ONE stable shape, always.
Hooks decide how to consume it.

The correct model is:

Admin defines structure
HOD operates within a strictly derived slice of that structure
Teacher is a leaf consumer

Which means:

This page should never decide what’s valid

It should only reflect already-scoped data

# architectural concept

# admin

Admin module = Reactive

Admin changes the system state

Creates departments, assigns HODs, opens years, configures grades

Admin actions cause side effects

Admin owns source-of-truth mutations

# Teacher & HOD

Teacher & HOD modules = Derived

They do not define structure

They derive their world from Admin-created data

They read + act within constraints

So:

A teacher is not a role with its own data

An HOD is a teacher with a derived responsibility

HOD ≠ separate identity

HOD = Teacher assigned as department.hodTeacherId
