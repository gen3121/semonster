// 展示用（OSHIFIT_MODE="demo"）が今までどおり動くか：file:// で開き、通信しない・編集者モードがある・エラーがない
const path = require("path"), assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const b = await chromium.launch(), page = await b.newPage(); const errs = [], reqs = [];
  page.on("pageerror", (e) => errs.push(e.message)); page.on("request", (r) => { if (!r.url().startsWith("file:") && !/fonts\.g/.test(r.url())) reqs.push(r.url()); });
  await page.goto("file://" + path.resolve(__dirname, "..", "public", "index.html"));
  assert.ok(await page.locator("#ed-sel").count(), "編集者モードがある");
  for (const v of ["analysis", "future", "home", "checkin", "final", "result", "mypage", "admin"]) { await page.evaluate((v) => (location.hash = v), v); await page.waitForTimeout(150); }
  assert.deepEqual(errs, []); assert.deepEqual(reqs, [], "展示用は Firebase に通信しない");
  await b.close(); console.log("OK demo");
})().catch((e) => { console.error(e); process.exit(1); });
