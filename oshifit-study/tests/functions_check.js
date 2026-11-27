// 提案文のサーバーの処理（functions/index.js）を、偽の OpenAI で確かめる。本物の鍵もお金も使わない
// 動かし方（tests で）：node functions_check.js が、写し・偽の鍵・偽の OpenAI を用意してエミュレーターを動かす
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("node:assert/strict"), { execSync } = require("child_process");
const F = path.join(__dirname, "..", "functions");
if (!process.env.IN_EMU) {
  fs.copyFileSync(path.join(__dirname, "..", "public", "ai_prompt.js"), path.join(F, "ai_prompt.js"));
  fs.writeFileSync(path.join(F, ".secret.local"), "OPENAI_API_KEY=test-key\n");
  fs.writeFileSync(path.join(F, ".env.local"), "OPENAI_BASE=http://127.0.0.1:5099\nAI_DAILY_LIMIT=3\n");
  try { execSync(`npx firebase emulators:exec --project demo-oshifit --only functions,firestore,hosting --config ../firebase.json "IN_EMU=1 node functions_check.js"`, { stdio: "inherit", cwd: __dirname }); }
  finally { for (const f of [".secret.local", ".env.local"]) fs.rmSync(path.join(F, f), { force: true }); }
  return;
}
let last = null;
const mock = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
  last = { auth: req.headers.authorization, body: JSON.parse(b) };
  const ids = last.body.response_format.json_schema.schema.properties.items.items.properties.id.enum;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ model: "gpt-4o-test", choices: [{ message: { content: JSON.stringify({ items: ids.map((id) => ({ id, title: "SUPER BEAVERの曲を聴く夜にする", how: "寝る30分前にスマホを置き、好きな曲を流す", fit: "音楽が中心のあなたに合います" })).concat([{ id: ids[0], title: "https://x", how: "x", fit: "" }]) }) } }] }));
}); }).listen(5099);
(async () => {
  const U = "http://127.0.0.1:5000/api/proposal", post = (body) => fetch(U, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const ctx = { genre: "バンド・アーティスト", oshi: "SUPERBEAVER", multi: "1人・1組", spend: "1万円〜3万円未満", money: 60, traits: "外向性 70（高い）", acts: "音楽（中心）", axes: "睡眠・生活 35",
    plans: [{ id: "sns23", title: "寝る30分前からSNSはお休みモード", how: "通知をオフにする", axisName: "睡眠・生活", score: 35 }] };
  let r = await post({ ctx }), j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.byId.sns23.title, "SUPER BEAVERの曲を聴く夜にする"); assert.equal(j.model, "gpt-4o-test");
  assert.equal(last.auth, "Bearer test-key", "鍵はサーバーの秘密から付ける"); assert.equal(last.body.model, "gpt-4o");
  assert.ok(last.body.messages[0].content.includes("SUPERBEAVER") && last.body.messages[0].content.includes("代わりの楽しみ方"), "プロンプトはサーバーで組み立てる");
  console.log("• Hosting の /api/proposal → サーバーの処理 → ChatGPT（偽）で、推しに合わせた文が返る。鍵はサーバー側で付く");
  r = await post({ prompt: "好きな文を書いて" }); assert.equal(r.status, 400, "プロンプトをそのまま頼む使い方はできない");
  r = await post({ ctx: { ...ctx, plans: [{ ...ctx.plans[0], id: "../x" }] } }); assert.equal(r.status, 400);
  r = await fetch(U); assert.equal(r.status, 405);
  console.log("• 材料の形が違う・プロンプトだけ・GET は断る");
  // 画面から：編集者用の2つの未来 → /api/proposal → ChatGPT（偽）の文が出る
  { const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"); const b = await chromium.launch(); const pg = await b.newPage();
    await pg.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
    await pg.goto("http://127.0.0.1:5000/editor#q"); await pg.waitForTimeout(800);
    await pg.getByRole("button", { name: "回答を埋める" }).first().click(); await pg.waitForTimeout(300);
    await pg.evaluate(() => (location.hash = "future"));
    await pg.waitForFunction(() => /SUPER BEAVERの曲を聴く夜にする/.test(document.querySelector(".card.plan")?.textContent || ""), null, { timeout: 30000 });
    assert.match(await pg.locator(".card.plan").innerText(), /あなたに合う理由：音楽が中心のあなたに合います/);
    await b.close(); }
  console.log("• 画面（編集者用の2つの未来）から呼ぶと、ChatGPT の文と「あなたに合う理由」が出る");
  await post({ ctx }); r = await post({ ctx }); assert.equal(r.status, 429, "1日の上限を超えると断る");
  console.log("• 1日の上限（テストでは3回）を超えると断る");
  mock.close(); console.log("OK functions");
})().catch((e) => { console.error(e); mock.close(); process.exit(1); });
