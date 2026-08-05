import { config } from "dotenv";
import path from "node:path";

// Must run before any app module (lib/db/prisma.ts especially) is imported —
// Vitest guarantees setupFiles execute before a test file's own imports load,
// so this is the one place that's safe to override DATABASE_URL/JWT_SECRET
// for the whole run. Never point this at the dev/prod .env: resetDb() (see
// tests/helpers/db.ts) truncates every app table between tests.
config({ path: path.resolve(__dirname, "../.env.test") });

if (!process.env.DATABASE_URL?.endsWith("_test")) {
  throw new Error(
    "DATABASE_URL does not look like a test database (expected a name ending in _test). " +
      "Refusing to run — check .env.test."
  );
}
