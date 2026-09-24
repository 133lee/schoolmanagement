// Restarts the app on Passenger-managed hosts (e.g. Plesk's Node.js manager):
// Passenger restarts an application the next time it is requested after
// tmp/restart.txt in the application root is touched.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "tmp");
const file = path.join(dir, "restart.txt");

fs.mkdirSync(dir, { recursive: true });
const now = new Date();
if (fs.existsSync(file)) {
  fs.utimesSync(file, now, now);
} else {
  fs.writeFileSync(file, "");
}

console.log(`touched ${file} at ${now.toISOString()}`);
console.log("Passenger restarts the app on the next request — open the site once now.");
