// 研究版（OSHIFIT_MODE="study"）の通し確認。Firebase エミュレーター（auth・firestore・hosting）の上で、実際のブラウザで操作し、
// Firestore に入った記録を確かめる。npm test（emulators:exec の中）で実行する。
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, getDoc, getDocs, collection } = require("firebase/firestore");

const BASE = "http://127.0.0.1:5000/";
const OUT = process.env.SHOTS || path.join(__dirname, "shots");
const CACHE = path.join(__dirname, ".sdk-cache");
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
const step = (m) => console.log("•", m);
const DAY = 864e5;

// gstatic の Firebase SDK は curl（プロキシ経由）で取ってきて、ブラウザには手元から渡す
function sdk(url) {
  const f = path.join(CACHE, url.split("/").pop());
  if (!fs.existsSync(f)) execFileSync("curl", ["-sSf", "-o", f, url]);
  return fs.readFileSync(f);
}
const TEST_CONFIG = `window.OSHIFIT_MODE="study";window.OSHIFIT_APP_VERSION="e2e";
window.OSHIFIT_FIREBASE={apiKey:"demo-key",authDomain:"demo-oshifit.firebaseapp.com",projectId:"demo-oshifit",appId:"demo"};
window.OSHIFIT_EMULATOR={auth:"http://127.0.0.1:9099",firestore:["127.0.0.1",8080]};`;

async function setup(ctx) {
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ body: sdk(r.request().url()), contentType: "text/javascript" }));
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await ctx.route("**/config.js", (r) => r.fulfill({ body: TEST_CONFIG, contentType: "text/javascript" }));
  // 端末の時計だけを進める（振り返りの4日ルールの確認用）。サーバーの時刻は進まない
  await ctx.addInitScript(() => { const off = +(localStorage.getItem("__e2e_offset") || 0); const real = Date.now.bind(Date); Date.now = () => real() + off; });
}

async function answerAll(page, stop) {
  for (let i = 0; i < 200; i++) {
    if (await stop()) return;
    const num = page.locator("#f-num");
    if (await num.count()) { await num.fill("21"); await page.locator("#sv-next").click(); continue; }
    const tx = page.locator("#f-text");
    if (await tx.count()) { await page.locator("#sv-next").click(); continue; }
    if (!(await page.locator(".qid").count())) { await page.waitForTimeout(200); continue; }   // 画面の切り替え中
    const id = (await page.locator(".qid").innerText()).trim();
    const opts = page.locator("[data-j]");
    const n = await opts.count();
    const pick = id === "Q42" ? 1 : n === 7 ? 4 : Math.min(2, n - 1);        // Q42 は注意確認（2を選ぶ）
    await opts.nth(pick).click();
    await page.waitForFunction((prev) => { const q = document.querySelector(".qid"); return !q || q.textContent.trim() !== prev; }, id, { timeout: 5000 }).catch(() => {});
  }
  throw new Error("終わらない");
}

(async () => {
  const env = await initializeTestEnvironment({ projectId: "demo-oshifit", firestore: { host: "127.0.0.1", port: 8080, rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") } });
  await env.clearFirestore();
  const read = async (fn) => { let out; await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()); }); return out; };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
  await setup(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|fonts/.test(m.text())) errors.push(m.text()); });

  // ---------- 同意 → 開始時の質問
  await page.goto(BASE);
  assert.equal(await page.locator("#ed-sel").count(), 0, "研究版では編集者モードを出さない");
  await page.goto(BASE + "#analysis");
  await page.waitForFunction(() => location.hash === "#start");
  step("同意する前は、分析などの画面に入れない（回答の自動補完もしない）");
  await page.locator("#agree").check();
  await page.locator("#go").click();
  await page.locator(".qid").waitFor();
  const uid = await page.evaluate(() => window.OFStore.uid);
  assert.ok(uid, "匿名ログインした");
  let d = await read((db) => getDoc(doc(db, "participants", uid)));
  assert.equal(d.data().mode, "study"); assert.match(d.data().pid, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  step("同意して始めると、匿名ログインし participants/{uid} が作られる");

  // 途中まで答えて、読み込み直すと続きから
  await page.locator("#f-num").fill("21"); await page.locator("#sv-next").click();          // Q1 年齢
  for (let i = 0; i < 11; i++) { await page.locator("[data-j]").nth(1).click(); await page.waitForTimeout(400); }
  await page.waitForTimeout(2200);                                 // 途中経過は1.5秒まとめて送る
  d = await read((db) => getDoc(doc(db, "participants", uid)));
  const savedN = Object.keys(d.data().answers).length;
  assert.ok(savedN >= 10, `途中経過が保存される（${savedN}問）`);
  await page.reload();
  await page.locator(".qid").waitFor({ timeout: 15000 }).catch(async (e) => { console.log("DEBUG", page.url(), (await page.locator("#app").innerText()).slice(0, 300), errors); throw e; });
  const resumeAt = (await page.locator(".qid").innerText()).trim();
  assert.notEqual(resumeAt, "Q1", "読み込み直すと続きの質問から");
  step(`途中で閉じても、続き（${resumeAt}）から再開できる`);

  await answerAll(page, async () => (await page.locator("#av-go").count()) > 0);
  d = await read((db) => getDoc(doc(db, "participants", uid)));
  assert.equal(d.data().baselineDone, true);
  assert.equal(Object.keys(d.data().answers).filter((k) => k !== "Q62").length, 85, "85項目が保存される");
  assert.ok(d.data().scores && d.data().scores.pss != null && d.data().scores.wb != null);
  assert.equal(d.data().answers.Q42, 2);
  step("85項目の回答と得点（PSS-J・WHO-5 など）が保存される");

  // ---------- アバター → 分析 → 2つの未来 → プランB
  await page.locator("[data-style=long]").click();
  await page.locator("#av-go").click();
  await page.locator("#an-go").waitFor();
  await page.screenshot({ path: path.join(OUT, "01_analysis.png"), fullPage: false });
  await page.locator("#an-go").click();
  let group;
  if (await page.locator("#pickB").count().then((n) => n > 0).catch(() => false) || (await page.waitForSelector("#pickB", { timeout: 4000 }).catch(() => null))) {
    await page.locator("#pickThis").check();
    await page.locator("#pickB").click();
    group = "B";
  } else group = "A";
  await page.waitForFunction(() => location.hash === "#home");
  for (let i = 0; i < 25; i++) { d = await read((db) => getDoc(doc(db, "participants", uid))); if (d.data().group) break; await page.waitForTimeout(200); }
  const p = d.data();
  if (!p.group) console.log("DEBUG errors", errors);
  assert.equal(p.group, group);
  assert.equal(p.avatar.style, "long"); assert.equal(p.avatarDone, true);
  assert.ok(p.decidedAt && p.decidedAt.toMillis(), "決めた時刻（サーバー）");
  if (group === "B") { assert.ok(p.planIds.length >= 1); assert.ok(p.pred && p.pred.B && p.pred.hw); assert.ok(p.plansOffered.length >= 1); }
  step(`群${group}に決まり、群・提案・見込み・時刻が保存される`);

  // 群は変えられない：未来の画面に戻れない
  await page.goto(BASE + "#future");
  await page.waitForFunction(() => location.hash === "#home");
  step("群が決まったあとは、2つの未来の画面に戻れない（群を変えられない）");

  if (group === "B") {
    // 振り返り：4日たつまで押せない
    await page.goto(BASE + "#checkin");
    await page.getByText("日後からできます").waitFor();
    await page.evaluate((off) => localStorage.setItem("__e2e_offset", String(off)), 4 * DAY + 60000);
    await page.reload();
    await page.waitForFunction(() => location.hash === "#checkin");
    await page.locator(".qid").waitFor();
    await answerAll(page, async () => (await page.evaluate(() => location.hash)) === "#home");
    let ck; for (let i = 0; i < 25; i++) { ck = await read((db) => getDocs(collection(db, "participants", uid, "checkins"))); if (ck.size) break; await page.waitForTimeout(200); }
    assert.equal(ck.size, 1); const c1 = ck.docs[0].data();
    assert.equal(c1.week, 1); assert.equal(c1.day, 4); assert.ok(Object.keys(c1).some((k) => k.startsWith("did_")));
    assert.equal(c1.W1, undefined, "WHO-5 は3回目だけ");
    step("4日後に1回目の振り返り → checkins/1（week=1, day=4）が保存される");
    await page.reload();
    await page.locator(".rounds").waitFor();
    assert.match(await page.locator(".rounds").innerText(), /✓/);
    step("読み込み直しても、振り返りの記録が戻る");
  }

  // ---------- 開発者ページの CSV（ページの書き出し関数を、実際の記録で動かす）
  const raw = await read(async (db) => { const s = await getDoc(doc(db, "participants", uid)); const c = await getDocs(collection(db, "participants", uid, "checkins"));
    const conv = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v.toMillis === "function" ? { __ts: v.toMillis() } : v)));
    return { p: conv(s.data()), cks: c.docs.map((x) => conv(x.data())) }; });
  const ap = await ctx.newPage();
  await ap.goto(BASE + "admin.html");
  await ap.waitForFunction(() => typeof window.__oshifitTables === "function");
  const csv = await ap.evaluate(({ raw, uid }) => {
    const rev = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && v.__ts ? { toMillis: () => v.__ts } : v));
    const p = rev(raw.p); return window.__oshifitTables([{ uid, ...p, cks: raw.cks.map(rev), pilot: 0 }]);
  }, { raw, uid });
  const head = csv.baseline.replace(/^﻿/, "").split("\r\n")[0].split(",");
  ["pid", "group", "Q1", "Q61", "W5", "H4", "P14", "pss", "who5raw"].forEach((c) => assert.ok(head.includes(c), "baseline.csv に " + c));
  assert.equal(csv.baseline.split("\r\n").length, 2);
  if (group === "B") assert.equal(csv.weekly.split("\r\n").length, 2);
  await ap.close();
  step("開発者ページの CSV（baseline / weekly）が DATA_SCHEMA の列で書き出せる");

  // ---------- 参加をやめる
  await page.goto(BASE + "#withdraw");
  await page.locator("#wk").check();
  await page.locator("#w-go").click();
  await page.waitForFunction(() => location.hash === "#withdrawn");
  d = await read((db) => getDoc(doc(db, "participants", uid)));
  assert.equal(d.exists(), false, "記録が消える");
  const ck2 = await read((db) => getDocs(collection(db, "participants", uid, "checkins")));
  assert.equal(ck2.size, 0, "振り返りも消える");
  step("参加をやめると、サーバーの記録（本体・振り返り）が消える");

  assert.deepEqual(errors.filter((e) => !/auth\/|Firestore|offline|unavailable/i.test(e)), [], "ページのエラー: " + errors.join(" / "));
  await browser.close(); await env.cleanup();
  console.log("OK");
})().catch((e) => { console.error(e); process.exit(1); });
