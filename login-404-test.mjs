import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const responses = [];
page.on("response", (r) => {
  responses.push({ url: r.url(), status: r.status() });
});
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE_ERROR:", m.text());
});
page.on("pageerror", (e) => console.log("PAGE_ERROR:", e.message));

await page.goto(`${BASE}/login`);
await page.fill("#email", "admin@school.gov.zm");
await page.fill("#password", "Admin@123");
await page.click('button[type="submit"]');

try {
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  console.log("NAVIGATED_TO", page.url());
} catch (e) {
  console.log("NAV_TIMEOUT, current url:", page.url());
}

await page.waitForTimeout(3000);

console.log("--- ALL 404s ---");
responses.filter((r) => r.status === 404).forEach((r) => console.log(r.status, r.url));

console.log("--- ALL non-2xx/3xx ---");
responses.filter((r) => r.status >= 400).forEach((r) => console.log(r.status, r.url));

// check if a service worker is (unexpectedly) controlling this page in dev mode
const swInfo = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return { supported: false };
  const regs = await navigator.serviceWorker.getRegistrations();
  return {
    supported: true,
    controller: navigator.serviceWorker.controller?.scriptURL || null,
    registrations: regs.map((r) => ({ scope: r.scope, active: r.active?.scriptURL || null })),
  };
});
console.log("SW_INFO", JSON.stringify(swInfo, null, 2));

await browser.close();
