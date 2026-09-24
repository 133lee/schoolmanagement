// Stops this project's running production server (`node server.js`) so the
// host panel's Start button can bring the freshly built version up. Only
// processes whose working directory is this project are touched.
// Linux only — elsewhere it just reports what it can see.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log(`platform: ${process.platform}, node ${process.version}`);
console.log(`project:  ${root}`);
console.log(`PORT env: ${process.env.PORT || "(not set in this shell)"}`);
console.log(`build:    ${fs.existsSync(path.join(root, ".next", "BUILD_ID")) ? "present" : "MISSING — run the build first"}`);

if (process.platform !== "linux") {
  console.log("\nNot Linux: can't safely identify the server process from here. Nothing was stopped.");
  process.exit(0);
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function ancestors() {
  const pids = new Set();
  let pid = process.pid;
  while (pid > 1) {
    pids.add(pid);
    const stat = read(`/proc/${pid}/stat`);
    if (!stat) break;
    pid = parseInt(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1], 10);
  }
  return pids;
}

function findServers() {
  const skip = ancestors();
  const found = [];
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (skip.has(pid)) continue;
    const cmdline = read(`/proc/${pid}/cmdline`);
    if (!cmdline) continue;
    const args = cmdline.split("\0").filter(Boolean);
    const isNodeServer = /(^|\/)node(js)?$/.test(args[0] || "") && args.slice(1).some((a) => a === "server.js" || a.endsWith("/server.js"));
    if (!isNodeServer) continue;
    let cwd;
    try {
      cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
    } catch {
      continue;
    }
    if (path.resolve(cwd) === root) found.push({ pid, cmd: args.join(" ") });
  }
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => fs.existsSync(`/proc/${pid}`);

(async () => {
  const servers = findServers();
  if (servers.length === 0) {
    console.log("\nNo running server.js process found for this project. Nothing to stop.");
    return;
  }
  for (const s of servers) console.log(`\nstopping pid ${s.pid}: ${s.cmd}`);

  for (const s of servers) {
    try {
      process.kill(s.pid, "SIGTERM");
    } catch (e) {
      console.log(`pid ${s.pid}: ${e.message}`);
    }
  }
  for (let i = 0; i < 20 && servers.some((s) => alive(s.pid)); i++) await sleep(500);

  for (const s of servers) {
    if (alive(s.pid)) {
      console.log(`pid ${s.pid} ignored SIGTERM, sending SIGKILL`);
      try {
        process.kill(s.pid, "SIGKILL");
      } catch (e) {
        console.log(`pid ${s.pid}: ${e.message}`);
      }
    }
  }
  await sleep(500);
  const left = servers.filter((s) => alive(s.pid));
  console.log(left.length ? `\nStill running: ${left.map((s) => s.pid).join(", ")}` : "\nStopped. Now press Start in the panel.");
})();
