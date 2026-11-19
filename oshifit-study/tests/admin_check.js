// 開発者ページの「設定と管理」を、エミュレーターの Google ログインで実際に操作して確かめる。
// 実験の条件を作る → 提案を書き込む → 変更（版2・履歴）→ 固定 → 提案を出さない → 運用の基準 → コンソールでの直接変更に警告
// 使い方：npx firebase emulators:exec --project demo-oshifit --only auth,firestore,hosting --config ../firebase.json "node admin_check.js"
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, getDoc, getDocs, setDoc, updateDoc, collection } = require("firebase/firestore");

const BASE = "http://127.0.0.1:5000/";
const CACHE = path.join(__dirname, ".sdk-cache");
const OUT = process.env.SHOTS || path.join(__dirname, "shots");
fs.mkdirSync(CACHE, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const step = (m) => console.log("•", m);
const MAIL = "admin@oit.ac.jp";
function sdk(url) { const f = path.join(CACHE, url.split("/").pop()); if (!fs.existsSync(f)) execFileSync("curl", ["-sSf", "-o", f, url]); return fs.readFileSync(f); }
const TEST_CONFIG = `window.OSHIFIT_MODE="study";window.OSHIFIT_APP_VERSION="admin-check";
window.OSHIFIT_FIREBASE={apiKey:"demo-key",authDomain:"demo-oshifit.firebaseapp.com",projectId:"demo-oshifit",appId:"demo"};
window.OSHIFIT_EMULATOR={auth:"http://127.0.0.1:9099",firestore:["127.0.0.1",8080]};`;

(async () => {
  const env = await initializeTestEnvironment({ projectId: "demo-oshifit", firestore: { host: "127.0.0.1", port: 8080, rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") } });
  await env.clearFirestore();
  const read = async (fn) => { let out; await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()); }); return out; };
  await read((db) => setDoc(doc(db, "admins", MAIL), { name: "試験" }));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ body: sdk(r.request().url()), contentType: "text/javascript" }));
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await ctx.route("**/config.js", (r) => r.fulfill({ body: TEST_CONFIG, contentType: "text/javascript" }));
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  let promptAnswer = "";
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); if (process.env.DEBUG) console.log("DIALOG", d.message()); return d.type() === "prompt" ? d.accept(promptAnswer) : d.accept(); });

  // 保存のあとはページが読み込み直される。その読み込みと表示を待つ
  const act = async (fn) => { const nav = page.waitForEvent("load", { timeout: 20000 }); await fn(); await nav; await page.locator("#manage").waitFor(); };
  const refused = async (fn) => { const dl = page.waitForEvent("dialog", { timeout: 10000 }); await fn(); await dl; await page.waitForTimeout(300); };

  // ---------- Google でログイン（エミュレーターの画面で新しいアカウントを作る）
  await page.goto(BASE + "admin.html");
  const [pop] = await Promise.all([page.waitForEvent("popup"), page.locator("#g").click()]);
  await pop.waitForLoadState();
  await pop.getByText("Add new account").click();
  await pop.locator("#email-input").fill(MAIL);
  await pop.locator("#display-name-input").fill("試験の開発者").catch(() => {});
  await pop.locator("#sign-in").click();
  await page.locator("#manage").waitFor({ timeout: 20000 });
  step("開発者（admins に登録した Google アカウント）でログインすると、「設定と管理」が出る");

  // ---------- ② 実験の条件を作る（版1・履歴1）
  await act(() => page.locator("#pr-create").click());
  let pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().version, 1); assert.equal(pr.data().gapDays, 4); assert.equal(pr.data().locked, false);
  let hs = await read((db) => getDocs(collection(db, "study", "protocol", "history")));
  assert.equal(hs.size, 1);
  assert.match(await page.locator("#manage").innerText(), /版 1・変更できます/);
  step("「初期値で実験の条件を作る」→ study/protocol（版1）と history/1 ができる");

  // ---------- 提案を plans に書き込む
  await act(() => page.locator('[data-seed="plans"]').click());
  const pl = await read((db) => getDocs(collection(db, "plans")));
  assert.equal(pl.size, 15);
  step("「今の提案を plans に書き込む」→ plans に15件");

  // ---------- 変更する（理由なしは保存しない → 理由ありで版2）
  await page.locator('.pf[data-k="gapDays"]').fill("5");
  await refused(() => page.locator("#pr-save").click());   // 理由がないので保存しない（alert）
  pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().version, 1, "理由がなければ保存しない");
  await page.locator('.pf[data-k="gapDays"]').fill("5");
  await page.locator("#pr-reason").fill("試験：間隔を5日に");
  await act(() => page.locator("#pr-save").click());
  pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().version, 2); assert.equal(pr.data().gapDays, 5);
  const h2 = await read((db) => getDoc(doc(db, "study", "protocol", "history", "2")));
  assert.equal(h2.data().reason, "試験：間隔を5日に"); assert.deepEqual(h2.data().changed.map((c) => [c.k, c.before, c.after]), [["gapDays", 4, 5]]);
  assert.equal(h2.data().by, MAIL);
  step("値を変えて理由を書くと版2になり、history/2 に前の値・新しい値・理由・だれが が残る（理由がないと保存しない）");

  // ---------- 範囲外の値は保存しない
  await page.locator('.pf[data-k="nChecks"]').fill("9");
  await page.locator("#pr-reason").fill("範囲外の試験");
  await refused(() => page.locator("#pr-save").click());
  pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().version, 2, "範囲外（振り返り9回）は保存しない");
  await page.reload(); await page.locator("#manage").waitFor();
  step("範囲外の値（振り返り9回）は保存しない");

  // ---------- 固定する → 変更の欄が閉じる。提案は出す・出さないだけ
  await act(() => page.locator("#pr-lock").click());
  pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().locked, true);
  assert.equal(await page.locator("#pr-save").count(), 0); assert.ok(await page.locator('.pf[data-k="gapDays"]').isDisabled());
  const ev = await read((db) => getDocs(collection(db, "study", "protocol", "events")));
  assert.equal(ev.size, 1); assert.equal(ev.docs[0].data().type, "lock");
  await act(() => page.locator('[data-plan="event"]').click());
  const evp = await read((db) => getDoc(doc(db, "plans", "event")));
  assert.equal(evp.data().active, false);
  step("「固定する」→ locked:true と固定の記録。固定中も提案の「出さないにする」はできる");

  // ---------- ③ 運用の基準
  await page.locator('.of[data-k="noCheckDays"]').fill("8");
  await act(() => page.locator("#op-save").click());
  const op = await read((db) => getDoc(doc(db, "ops", "alerts")));
  assert.equal(op.data().noCheckDays, 8);
  step("③ 運用の基準（振り返りがない日数）を保存できる（固定中でも変えられる）");

  // ---------- コンソールでの直接変更は警告する
  await read((db) => updateDoc(doc(db, "study", "protocol"), { gapDays: 6 }));
  await page.reload(); await page.locator("#manage").waitFor();
  assert.match(await page.locator("#manage").innerText(), /コンソールで直接変えた可能性があります/);
  await page.locator("#manage").screenshot({ path: path.join(OUT, "06_manage.png") });
  step("Firestore のコンソールで直接変えた（記録と値が違う）ときは、警告が出る");

  // ---------- 固定を外す（理由が必要）
  promptAnswer = "試験：誤りの修正";
  await act(() => page.locator("#pr-unlock").click());
  pr = await read((db) => getDoc(doc(db, "study", "protocol")));
  assert.equal(pr.data().locked, false); assert.equal(pr.data().lockReason, "試験：誤りの修正");
  step("「固定を外す」は理由を書いたときだけ。記録が残る");

  assert.deepEqual(errors, [], "ページのエラー: " + errors.join(" / "));
  await browser.close(); await env.cleanup();
  console.log("OK admin");
})().catch((e) => { console.error(e); process.exit(1); });
