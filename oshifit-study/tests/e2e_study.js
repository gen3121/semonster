// 研究版（OSHIFIT_MODE="study"）の通し確認。Firebase エミュレーター（auth・firestore・hosting）の上で、実際のブラウザで操作し、
// Firestore に入った記録を確かめる。npm test（emulators:exec の中）で実行する。
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, getDoc, getDocs, collection, setDoc } = require("firebase/firestore");

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
  // 提案文の AI（ai.js）は外部に送らず、決まった文を返す見本に置き換える。送る文はあとで確かめる
  await ctx.addInitScript(() => { window.OSHIFIT_AI_MOCK = async (prompt, ids) => { window.__aiPrompt = prompt; await new Promise((r) => setTimeout(r, 300)); return JSON.stringify({ items: ids.map((id) => ({ id, title: "阪神の試合の日の" + id + "をする", how: "甲子園の中継を見る日は、" + id + "のやり方で整える", fit: "試合を大切にしているあなただからこそ続けやすい形です" })).concat([{ id: ids[0], title: "重複", how: "重複" }, { id: "x", title: "https://bad", how: "x" }]), avoid: ids.length > 1 ? [{ a: ids[0], b: ids[1], why: "どちらも試合の夜の時間を使うので続けにくそう" }, { a: ids[0], b: ids[0], why: "同じ" }] : [] }); }; });
  await ctx.addInitScript(() => { const off = +(localStorage.getItem("__e2e_offset") || 0); const real = Date.now.bind(Date); Date.now = () => real() + off; });
}

async function answerAll(page, stop) {
  for (let i = 0; i < 200; i++) {
    if (await stop()) return;
    const num = page.locator("#f-num");
    if (await num.count()) { await num.fill("21"); await page.locator("#sv-next").click(); continue; }
    const tx = page.locator("#f-text");
    if (await tx.count() && (await page.locator(".qid").getAttribute("data-qid").catch(() => "")).trim() === "Q4b") { await tx.fill("阪神タイガース"); }
    if (await tx.count()) { await page.locator("#sv-next").click({ timeout: 3000 }).catch(() => {}); continue; }   // 押す前に画面が変わることがある
    if (!(await page.locator(".qid").count())) { await page.waitForTimeout(200); continue; }   // 画面の切り替え中
    const id = (await page.locator(".qid").getAttribute("data-qid")).trim();
    const opts = page.locator("[data-j]");
    const n = await opts.count();
    const pick = id === "Q42" ? 1 : n === 7 ? 4 : Math.min(2, n - 1);        // Q42 は注意確認（2を選ぶ）
    await opts.nth(pick).click();
    await page.waitForFunction((prev) => { const q = document.querySelector(".qid"); return !q || q.dataset.qid !== prev; }, id, { timeout: 5000 }).catch(() => {});
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

  // ---------- 研究者が Firestore で管理する項目（②実験の条件・③お知らせ）
  await read(async (db) => {
    await setDoc(doc(db, "study", "protocol"), { version: 3, gapDays: 4, nChecks: 6, finalDay: 28, groupA: { axisMin: "x" }, locked: true });   // 型の違う値は無視される
    await setDoc(doc(db, "study", "protocol", "history", "3"), { version: 3, reason: "試験" });
    await setDoc(doc(db, "notices", "n1"), { text: "試験用のお知らせです", active: true, target: "all", level: "info" });
    await setDoc(doc(db, "notices", "n2"), { text: "出さないお知らせ", active: false });
  });
  await page.goto(BASE);
  await page.locator("#notices").getByText("試験用のお知らせです").waitFor();
  assert.equal(await page.getByText("出さないお知らせ").count(), 0);
  step("Firestore の notices のお知らせ（active:true だけ）が、はじめにの画面に出る");

  // ---------- 同意 → 開始時の質問
  await page.goto(BASE);
  assert.equal(await page.locator("#ed-sel").count(), 0, "研究版では編集者モードを出さない");
  await page.goto(BASE + "#analysis");
  await page.waitForFunction(() => location.hash === "#start");
  step("登録する前は、分析などの画面に入れない（回答の自動補完もしない）");
  const MAIL = `p${Date.now()}@example.com`, PW = "oshifit-pass1";
  await page.locator("#go").click();
  await page.waitForFunction(() => location.hash === "#signup");
  await page.locator("#su-mail").fill(MAIL); await page.locator("#su-pw").fill(PW);
  await page.locator("#su-info").click();
  await page.getByRole("dialog").getByText("参加は自由です").waitFor();
  await page.screenshot({ path: path.join(OUT, "08_consent_info.png") });
  await page.locator("#ci-close").click();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator("#su-mail").inputValue(), MAIL, "説明を開いて閉じても、入力した内容は残る");
  step("登録画面の「研究の説明はこちら」で説明が開き、閉じると入力はそのまま");
  await page.locator("[data-g='男性']").click();
  assert.equal(await page.locator("#su-go").isDisabled(), true, "同意しないと登録できない");
  await page.locator("#agree").check();
  await page.screenshot({ path: path.join(OUT, "00_signup.png") });
  await page.locator("#su-go").click();
  await page.locator(".qid").waitFor();
  const uid = await page.evaluate(() => window.OFStore.uid);
  assert.ok(uid, "メールアドレスで登録した");
  let d = await read((db) => getDoc(doc(db, "participants", uid)));
  assert.equal(d.data().mode, "study"); assert.equal(d.data().answers.Q2, "男性"); assert.equal(d.data().email, undefined, "メールは Firestore に入れない");
  assert.equal(await page.locator(".qid").getAttribute("data-qid"), "Q1");
  step("新規登録（メール・パスワード・性別・同意）→ participants/{uid} が作られ、質問へ進む（性別は質問で聞き直さない）");

  // 途中まで答えて、読み込み直すと続きから
  await page.locator("#f-num").fill("21"); await page.locator("#sv-next").click();          // Q1 年齢
  // 選び直し：待っている間に別の選択肢を押すと、そちらが残る（次へはまだ進まない）
  const q0 = (await page.locator(".qid").getAttribute("data-qid")).trim();
  await page.locator("[data-j]").nth(0).click(); await page.waitForTimeout(150);
  await page.locator("[data-j]").nth(2).click(); await page.waitForTimeout(150);
  assert.equal((await page.locator(".qid").getAttribute("data-qid")).trim(), q0, "選んでから少しの間は、次へ進まない");
  await page.waitForTimeout(800);
  assert.notEqual((await page.locator(".qid").getAttribute("data-qid")).trim(), q0, "少し待つと次へ進む");
  assert.match(await page.locator("#autosave").innerText(), /自動で保存/);
  step("最初の質問：選んでから約0.5秒は選び直せる（その後に次へ）。「自動で保存されています」と表示");
  for (let i = 0; i < 10; i++) { if (await page.locator("#f-text").count()) { await page.locator("#f-text").fill("阪神タイガース"); await page.locator("#sv-next").click(); await page.waitForTimeout(300); continue; } await page.locator("[data-j]").nth(1).click(); await page.waitForTimeout(950); }   // Q4b（推しの名前）は入力して次へ
  await page.waitForTimeout(2200);                                 // 途中経過は1.5秒まとめて送る
  d = await read((db) => getDoc(doc(db, "participants", uid)));
  const savedN = Object.keys(d.data().answers).length;
  assert.ok(savedN >= 10, `途中経過が保存される（${savedN}問）`);
  // ログアウトして、ログインし直すと続きから
  await page.evaluate(async () => { await window.OFStore.logout(); });
  await page.reload(); await page.waitForFunction(() => location.hash === "#start" || location.hash === "" ); await page.evaluate(() => (location.hash = "login"));
  await page.locator("#li-mail").waitFor({ timeout: 8000 }).catch(async (e) => { console.log("DEBUG", page.url(), (await page.locator("#app").innerText()).slice(0, 200), errors); throw e; });
  await page.locator("#li-mail").fill(MAIL); await page.locator("#li-pw").fill("wrong-pass");
  await page.locator("#li-go").click();
  await page.getByText("メールアドレスかパスワードが違います").waitFor();
  await page.locator("#li-pw").fill(PW); await page.locator("#li-go").click();
  await page.locator(".qid").waitFor({ timeout: 15000 });
  const resumeAt = (await page.locator(".qid").getAttribute("data-qid")).trim();
  assert.notEqual(resumeAt, "Q1", "ログインし直すと続きの質問から");
  step(`ログアウト → ログイン（パスワード違いは断る）で、続き（${resumeAt}）から再開できる`);

  await answerAll(page, async () => (await page.locator("#av-go").count()) > 0);
  for (let i = 0; i < 25; i++) { d = await read((db) => getDoc(doc(db, "participants", uid))); if (d.data().baselineDone) break; await page.waitForTimeout(200); }
  assert.equal(d.data().baselineDone, true);
  const keys = Object.keys(d.data().answers).filter((k) => k !== "Q62" && k !== "Q4b");
  assert.equal(keys.length, 68, "短縮版：67項目＋性別が保存される");
  assert.ok(!keys.includes("Q35") && !keys.includes("Q55"), "省いた項目は聞かない");
  assert.ok(d.data().scores && d.data().scores.pss != null && d.data().scores.wb != null);
  assert.equal(d.data().answers.Q42, 2);
  step("短縮版の67項目＋性別と、得点（PSS-J・WHO-5 など）が保存される");

  // アバターの画面から質問に戻って、答えを直せる（群が決まる前だけ）
  assert.equal((await page.locator("#av-back").innerText()).trim(), "質問に戻る");
  await page.locator("#av-back").click();
  await page.locator(".qid").waitFor();
  const lastId = await page.locator(".qid").getAttribute("data-qid");
  await page.locator("#sv-prev").click(); await page.waitForTimeout(300);
  const prevId = await page.locator(".qid").getAttribute("data-qid");
  const prevVal = d.data().answers[prevId];
  await page.locator("[data-j]").nth(0).click();                                  // 答えを変える → 自動で最後の質問へ
  await page.waitForFunction((id) => document.querySelector(".qid")?.dataset.qid === id, lastId);
  await page.locator("#sv-next").click();                                          // 回答を終える
  await page.locator("#av-go").waitFor();
  for (let i = 0; i < 25; i++) { d = await read((db) => getDoc(doc(db, "participants", uid))); if (d.data().baselineDone && d.data().answers[prevId] !== prevVal) break; await page.waitForTimeout(200); }
  assert.equal(d.data().baselineDone, true); assert.notEqual(d.data().answers[prevId], prevVal, "直した答えが保存される");
  step(`アバターの画面から「質問に戻る」で質問に戻り、答えを直せる（${prevId}）。終えるとアバターの画面に戻る`);

  // ---------- アバター → 分析 → 2つの未来 → プランB
  const hairNames = await page.locator(".avopt span").allInnerTexts();
  assert.ok(hairNames.includes("ショート") && hairNames.includes("ツンツン") && !hairNames.includes("ツインテール"), "男性向けの髪型が並ぶ");
  await page.locator(".avopt", { hasText: "ツンツン" }).click();
  await page.locator("[data-tab=hairColor]").click();
  assert.equal(await page.locator(".sw").count(), 36, "髪の色は36色");
  await page.locator(".sw").nth(30).click();
  await page.locator("[data-tab=shirt]").click();
  await page.locator(".sw").nth(5).click();
  await page.locator("[data-tab=beard]").click();
  await page.locator(".avopt").nth(1).click();
  await page.screenshot({ path: path.join(OUT, "02_avatar.png") });
  await page.locator("#av-go").click();
  await page.locator("#an-go").waitFor();
  await page.screenshot({ path: path.join(OUT, "01_analysis.png"), fullPage: false });
  await page.locator("#an-go").click();
  let group;
  if (await page.locator("#pickB").count().then((n) => n > 0).catch(() => false) || (await page.waitForSelector("#pickB", { timeout: 4000 }).catch(() => null))) {
    if (await page.locator("#combos").count()) {
      assert.equal(await page.locator("#combos .chip.good").count(), 1, "おすすめの組み合わせは1つ");
      await page.screenshot({ path: path.join(OUT, "03_combos.png"), fullPage: true });
    }
    await page.waitForFunction(() => document.querySelector(".aimark") && /あなたに合う理由/.test(document.querySelector(".aimark").textContent), null, { timeout: 8000 });
    assert.ok(!(await page.locator(".card.plan").innerText()).includes("が書いた文です"), "「AI が書いた文です」は出さない");
    if (await page.locator("#combos").count()) assert.match(await page.locator("#combos").innerText(), /一緒に選ばない方がよさそうです：どちらも試合の夜の時間を使うので続けにくそう/, "AI が見つけた組み合わせの注意が出る");
    assert.match(await page.locator(".card.plan h3").innerText(), /^阪神の試合の日の/, "提案の題名が推しに合わせた文になる");
    const pr = await page.evaluate(() => window.__aiPrompt);
    assert.ok(pr.includes("阪神タイガース") && pr.includes("推しのジャンル"), "推しの名前とジャンルを送る");
    assert.ok(!pr.includes("@") && !pr.includes("Q62"), "メールアドレスや自由記述は送らない");
    await page.locator("#pickThis").check();
    // 分析に戻って、また2つの未来へ（群が決まる前は行き来できる）
    await page.locator("#fu-back").click(); await page.locator("#an-go").waitFor();
    assert.equal((await page.locator("#an-back").innerText()).trim(), "アバターに戻る");
    await page.locator("#an-go").click(); await page.locator("#pickB").waitFor();
    if (!(await page.locator("#pickThis").isChecked())) await page.locator("#pickThis").check();
    await page.locator("#pickB").click();
    // 確認のシート：「戻って考え直す」で閉じる → もう一度押して「この内容で始める」
    await page.locator("#lk-no").click(); assert.equal(await page.locator(".sheet").count(), 0);
    await page.locator("#pickB").click();
    assert.match(await page.locator(".sheet").innerText(), /変えられません/);
    await page.locator("#lk-ok").click();
    step("2つの未来から分析に戻れる。プランを選ぶと「決めた後は変えられない」確認が出て、考え直すこともできる");
    group = "B";
  } else { await page.locator("#lk-ok").click({ timeout: 4000 }); group = "A"; }   // 群A：確認のシートで始める
  await page.waitForFunction(() => location.hash === "#home");
  for (let i = 0; i < 25; i++) { d = await read((db) => getDoc(doc(db, "participants", uid))); if (d.data().group) break; await page.waitForTimeout(200); }
  const p = d.data();
  if (!p.group) console.log("DEBUG errors", errors);
  assert.equal(p.group, group);
  assert.equal(p.avatar.hair, "spiky"); assert.equal(p.avatar.hairColor, 30); assert.equal(p.avatar.shirt, 5); assert.equal(p.avatar.beard, 1); assert.equal(p.avatarDone, true);
  assert.equal(JSON.stringify(p.avatar).includes("data:"), false, "写真は保存しない");
  assert.ok(p.decidedAt && p.decidedAt.toMillis(), "決めた時刻（サーバー）");
  if (group === "B") { assert.ok(p.planIds.length >= 1); assert.ok(p.pred && p.pred.B && p.pred.hw); assert.ok(p.plansOffered.length >= 1);
    assert.ok(p.plansOffered.every((x) => x.ai && x.ai.title.startsWith("阪神の試合の日の") && x.ai.model === "mock"), "推しに合わせた文と型を、提示した提案として残す");
    assert.equal(p.answers.Q4b, "阪神タイガース"); }
  step(`群${group}に決まり、群・提案・見込み・時刻が保存される`);
  { const pd = await read((db) => getDoc(doc(db, "participants", uid))); assert.equal(pd.data().cfgVersion, 3, "使った設定の版が残る"); assert.equal(pd.data().cfgUsed.groupA.axisMin, 60, "型の違う値は初期値"); }
  step("群を決めたときの実験の条件（study/protocol の版と値）が、参加者の記録に残る");

  // 群は変えられない：未来の画面に戻れない
  await page.goto(BASE + "#future");
  await page.waitForFunction(() => location.hash === "#home");
  step("群が決まったあとは、2つの未来の画面に戻れない（群を変えられない）");

  if (group === "B") {
    // 毎日のアンケート（お金・時間を入れる）
    await page.goto(BASE + "#daily");
    await page.locator(".qid").waitFor();
    for (let i = 0; i < 40; i++) {
      if ((await page.evaluate(() => location.hash)) === "#home") break;
      const id = (await page.locator(".qid").getAttribute("data-qid").catch(() => "")).trim();
      if (await page.locator("#f-num").count()) { await page.locator("#f-num").fill(id === "yen" ? "1500" : "90"); await page.locator("#sv-next").click(); continue; }
      if (await page.locator("[data-j]").count()) { await page.locator("[data-j]").nth(id === "mood" ? 4 : id.startsWith("did_") ? 0 : 3).click(); await page.waitForTimeout(350); continue; }
      await page.waitForTimeout(200);
    }
    let dd; for (let i = 0; i < 25; i++) { dd = await read((db) => getDocs(collection(db, "participants", uid, "daily"))); if (dd.size) break; await page.waitForTimeout(200); }
    assert.equal(dd.size, 1); const d1 = dd.docs[0].data();
    assert.equal(d1.yen, 1500); assert.equal(d1.minutes, 90); assert.equal(d1.mood, 5); assert.match(d1.date, /^\d{4}-\d{2}-\d{2}$/);
    await page.locator("#daily-card").getByText("今日は回答済み").waitFor();
    assert.match(await page.locator("#stats").innerText(), /1,500円/);
    step("毎日のアンケート（気分・お金・時間など）→ daily/{日付} に保存。ホームに合計が出る");
    await page.getByRole("button", { name: "相談先を見る" }).click();
    await page.getByRole("dialog").getByText("0120-279-338").waitFor();
    assert.equal(await page.evaluate(() => location.hash), "#home", "相談先はホームのまま開く（マイページに移らない）");
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, "09_help.png") });
    await page.locator("#hp-close").click(); assert.equal(await page.getByRole("dialog").count(), 0);
    step("ホームの「相談先を見る」で、その場で相談先（電話番号など）が開く");
    // 振り返り：4日たつまで押せない
    await page.goto(BASE + "#checkin");
    await page.getByText("日後からできます").waitFor();
    await page.evaluate((off) => localStorage.setItem("__e2e_offset", String(off)), 4 * DAY + 60000);
    await page.reload();
    await page.waitForFunction(() => location.hash === "#checkin");
    await page.locator("#period").waitFor();
    const per = await page.locator("#period").innerText();
    assert.match(per, /1,500円/); assert.match(per, /1\.5時間/); assert.match(per, /記録した日\s*1日/);
    await page.locator("#predadj").waitFor();
    await page.screenshot({ path: path.join(OUT, "05_period.png"), fullPage: true });
    await page.locator("#ck-start").click();
    await page.locator(".qid").waitFor();
    await answerAll(page, async () => (await page.evaluate(() => location.hash)) === "#home");
    let ck; for (let i = 0; i < 25; i++) { ck = await read((db) => getDocs(collection(db, "participants", uid, "checkins"))); if (ck.size) break; await page.waitForTimeout(200); }
    assert.equal(ck.size, 1); const c1 = ck.docs[0].data();
    assert.equal(c1.week, 1); assert.equal(c1.day, 4); assert.ok(!Object.keys(c1).some((k) => k.startsWith("did_")) && c1.Q44 === undefined && c1.joy === undefined, "振り返りでは毎日と重なる質問を聞かない");
    assert.ok(Object.keys(c1).some((k) => k.startsWith("exec_") && c1[k] === 1), "提案の実行は毎日の記録からまとめる"); assert.equal(c1.dMood, 5); assert.equal(c1.dExecDays, 1); assert.equal(typeof c1.dBurn, "number"); assert.ok([0, 1, 2].includes(c1.stress));
    assert.equal(c1.W1, undefined, "WHO-5 は3回目だけ");
    assert.equal(c1.sumYen, 1500, "振り返りに、前回からのお金の合計が入る"); assert.equal(c1.sumMin, 90);
    assert.equal(typeof c1.adjBurn, "number", "本人の記録で直した見込みが保存される"); assert.ok(c1.adjN === 1 && c1.adjBurnHw > 0 && c1.adjBurnHw < 15);
    await page.locator("#predadj").waitFor(); assert.match(await page.locator("#predadj").innerText(), /記録\d+回/);
    step("振り返りの前に、前回からのまとめ（お金・時間・気分・負担・提案を行った日）と、直した見込みが出る");
    step("4日後に1回目の振り返り → checkins/1（week=1, day=4、前回からの合計つき）が保存される");
    await page.reload();
    await page.locator(".rounds").waitFor();
    assert.match(await page.locator(".rounds").innerText(), /✓/);
    step("読み込み直しても、振り返りの記録が戻る");
  }

  // ---------- 開発者ページの CSV（ページの書き出し関数を、実際の記録で動かす）
  const raw = await read(async (db) => { const s = await getDoc(doc(db, "participants", uid)); const c = await getDocs(collection(db, "participants", uid, "checkins")); const dl = await getDocs(collection(db, "participants", uid, "daily"));
    const conv = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v.toMillis === "function" ? { __ts: v.toMillis() } : v)));
    return { p: conv(s.data()), cks: c.docs.map((x) => conv(x.data())), daily: dl.docs.map((x) => conv(x.data())) }; });
  const ap = await ctx.newPage();
  await ap.goto(BASE + "admin.html");
  await ap.waitForFunction(() => typeof window.__oshifitTables === "function");
  const csv = await ap.evaluate(({ raw, uid }) => {
    const rev = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && v.__ts ? { toMillis: () => v.__ts } : v));
    const p = rev(raw.p); return window.__oshifitTables([{ uid, ...p, cks: raw.cks.map(rev), daily: raw.daily.map(rev), pilot: 0 }]);
  }, { raw, uid });
  const head = csv.baseline.replace(/^﻿/, "").split("\r\n")[0].split(",");
  ["pid", "group", "Q1", "Q61", "W5", "H4", "P14", "pss", "who5raw"].forEach((c) => assert.ok(head.includes(c), "baseline.csv に " + c));
  assert.equal(csv.baseline.split("\r\n").length, 2);
  if (group === "B") assert.equal(csv.weekly.split("\r\n").length, 2);
  if (csv.daily) { const dh = csv.daily.replace(/^\uFEFF/, "").split("\r\n"); assert.ok(dh[0].split(",").includes("yen")); if (group === "B") assert.equal(dh.length, 2); }
  const zb64 = await ap.evaluate(({ raw, uid }) => {
    const rev = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && v.__ts ? { toMillis: () => v.__ts } : v));
    return window.__oshifitZip([{ uid, ...rev(raw.p), cks: raw.cks.map(rev), daily: raw.daily.map(rev), pilot: 0 }]);
  }, { raw, uid });
  const mh = await ap.evaluate(() => window.__oshifitManage());
  assert.match(mh, /実験の条件（study\/protocol）/); assert.match(mh, /運用：確認が必要の基準（ops\/alerts）/); assert.match(mh, /提案（plans）/); assert.match(mh, /sns23/); assert.match(mh, /お知らせ（notices）/);
  step("開発者ページの「設定と管理」に、設定・提案・お知らせ・メモの説明と一覧が出る");
  const zbuf = Buffer.from(zb64, "base64"); assert.equal(zbuf.readUInt32LE(0), 0x04034b50, "ZIP の形");
  fs.writeFileSync(path.join(OUT, "export_test.zip"), zbuf);
  for (const f of ["baseline.csv", "weekly.csv", "daily.csv", "trial.csv", "free.csv", "README_export.txt"]) assert.ok(zbuf.includes(Buffer.from(f)), "ZIP に " + f);
  await ap.close();
  step("開発者ページの「分析用にまとめて書き出す（ZIP）」で、5つの CSV と書き出しの記録が1つのファイルになる");
  step("開発者ページの CSV（baseline / weekly）が DATA_SCHEMA の列で書き出せる");

  // ---------- 「参加をやめる」の欄はない（同意書で参加の同意を得るため、2026-11-17 に削除）
  await page.goto(BASE + "#mypage");
  await page.getByText("問い合わせ先").waitFor();
  assert.equal(await page.getByText("参加をやめる").count(), 0);
  await page.goto(BASE + "#withdraw"); await page.waitForTimeout(300);
  assert.equal(await page.getByText("参加をやめますか").count(), 0);
  step("マイページに「参加をやめる」の欄がない");

  assert.deepEqual(errors.filter((e) => !/auth\/|Firestore|offline|unavailable/i.test(e)), [], "ページのエラー: " + errors.join(" / "));
  await browser.close(); await env.cleanup();
  console.log("OK");
})().catch((e) => { console.error(e); process.exit(1); });
