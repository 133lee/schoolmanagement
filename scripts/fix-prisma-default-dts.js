// Workaround for a Prisma generator bug (observed with prisma-client-js 6.19.3):
// `prisma generate` sometimes writes node_modules/.prisma/client/default.d.ts
// empty while the real types land correctly in the sibling index.d.ts.
// @prisma/client's package.json resolves TS types through default.d.ts, so an
// empty file makes every Prisma model type disappear at compile time even
// though the JS runtime (default.js) is unaffected. This re-populates it.
const fs = require("fs");
const path = require("path");

const target = path.join(
  process.cwd(),
  "node_modules",
  ".prisma",
  "client",
  "default.d.ts"
);

if (!fs.existsSync(target)) {
  console.warn(`fix-prisma-default-dts: ${target} not found, skipping`);
  process.exit(0);
}

if (fs.statSync(target).size === 0) {
  fs.writeFileSync(target, "export * from './index'\n", "utf8");
  console.log("fix-prisma-default-dts: repopulated empty default.d.ts");
} else {
  console.log("fix-prisma-default-dts: default.d.ts already populated, no change needed");
}
