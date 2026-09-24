import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Plain Node CommonJS scripts (`.js`/`.cjs`) can't use ES `import`, so
    // `require()` is the only option there — the rule targets app code.
    files: ["scripts/**/*.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Architectural guardrail — see CLAUDE.md. Route handlers must go through
    // withAuth + a service/repository, never touch Prisma or JWTs directly.
    files: ["app/api/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db/prisma",
              message:
                "Route handlers must not import Prisma directly. Call a repository through a service instead. See CLAUDE.md.",
            },
            {
              name: "jsonwebtoken",
              message:
                "Route handlers must not verify JWTs directly. Use withAuth from @/lib/http/with-auth. See CLAUDE.md.",
            },
            {
              name: "@/lib/auth/with-auth",
              message:
                "This is the legacy auth wrapper. Use @/lib/http/with-auth instead. See CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
