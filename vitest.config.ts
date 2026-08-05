import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    // Integration tests hit a real Postgres DB sequentially per file (resetDb()
    // in beforeEach) — running files in parallel would race on shared tables.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
