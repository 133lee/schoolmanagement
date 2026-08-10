import { config } from "dotenv";
import path from "node:path";

// Must run before any app module (lib/db/prisma.ts especially) is imported —
// Vitest guarantees setupFiles execute before a test file's own imports load,
// so this is the one place that's safe to override DATABASE_URL/JWT_SECRET
// for the whole run. Never point this at the dev/prod .env: resetDb() (see
// tests/helpers/db.ts) truncates every app table between tests.
config({ path: path.resolve(__dirname, "../.env.test") });

const dbUrl = process.env.DATABASE_URL ?? "";
const looksLikeTestDb = dbUrl.endsWith("_test");
// This repo is a local/offline checkout — the live deployment (imbra-hosted)
// runs its own copy of this code against a differently-named database on a
// different host, never reachable from here. `rebuild_school_db` on
// localhost is this project's local dev database, confirmed by the project
// owner (2026-08-10) as safe for resetDb() to truncate between test runs.
const isKnownSafeLocalDb = /^postgresql:\/\/[^@]+@(localhost|127\.0\.0\.1):\d+\/rebuild_school_db(\?|$)/.test(
  dbUrl
);

if (!looksLikeTestDb && !isKnownSafeLocalDb) {
  throw new Error(
    "DATABASE_URL does not look like a test database (expected a name ending in _test). " +
      "Refusing to run — check .env.test."
  );
}
