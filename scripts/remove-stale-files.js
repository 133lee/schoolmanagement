// Removes files that were deleted from the repo but can linger on a server
// that received the update by file copy instead of a git checkout.
const fs = require("fs");
const path = require("path");

const STALE_FILES = ["app/(dashboard)/teacher/assessments/[id]/page.tsx"];

for (const rel of STALE_FILES) {
  const abs = path.join(__dirname, "..", rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs);
    console.log(`removed ${rel}`);
  } else {
    console.log(`already gone ${rel}`);
  }
}
