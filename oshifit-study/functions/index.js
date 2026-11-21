// OshiFit：提案文を推しと性格に合わせて ChatGPT（OpenAI の API）で書く（Firebase Functions 第2世代、東京）
// 参考：Qiita「Firebase Functions で ChatGPT の API を作る」の形（onRequest・asia-northeast1）に、次の安全策を足した
//  ・API の鍵は Secret Manager（defineSecret）。リポジトリやアプリには置かない
//    設定：npx firebase-tools functions:secrets:set OPENAI_API_KEY （聞かれたら鍵を貼る。チャットには貼らない）
//  ・アプリは「プロンプト」ではなく、点数や推しの名前などの材料だけを送る。プロンプトはここで組み立てる
//    （誰でも好きな文を ChatGPT に頼めてしまう入口にしないため）。材料の型と長さを確かめる
//  ・1日に頼める回数に上限（ops/aiUsage/{日付}）。研究室の鍵を使いすぎないため
//  ・アプリと同じアドレス（Hosting の /api/proposal）から呼ぶので、CORS を開けない
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const P = require("./ai_prompt.js");   // public/ai_prompt.js の写し（firebase.json の predeploy で写す）

setGlobalOptions({ region: "asia-northeast1", maxInstances: 3 });
initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
// 秘密ではない設定。変えるときは functions/.env に書く（例：OPENAI_MODEL=gpt-4o-mini）
const MODEL = () => process.env.OPENAI_MODEL || "gpt-4o";                        // 研究室で使えるモデル
const BASE = () => process.env.OPENAI_BASE || "https://api.openai.com";          // テストのときだけ替える
const LIMIT = () => +(process.env.AI_DAILY_LIMIT || 300);                       // 1日に頼める回数

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : v == null ? "" : null);
// アプリから来た材料を確かめ、決まった形だけを残す
function checkCtx(c) {
  if (!c || typeof c !== "object" || !Array.isArray(c.plans) || c.plans.length < 1 || c.plans.length > 3) return null;
  const plans = c.plans.map((p) => ({
    id: str(p && p.id, 20), title: str(p && p.title, 60), how: str(p && p.how, 300), axisName: str(p && p.axisName, 20),
    score: Number.isFinite(+p.score) ? Math.max(0, Math.min(100, Math.round(+p.score))) : 0, cap: p && p.cap ? str(p.cap, 20) : null,
  }));
  if (plans.some((p) => !p.id || !/^[a-z0-9_]+$/.test(p.id) || !p.title || p.how == null)) return null;
  const out = { plans };
  for (const [k, n] of [["genre", 30], ["oshi", 40], ["multi", 20], ["spend", 30], ["traits", 200], ["acts", 400], ["axes", 200]]) {
    const v = str(c[k], n); if (v === null) return null; out[k] = v;
  }
  out.money = Number.isFinite(+c.money) ? Math.round(+c.money) : null;
  return out;
}

// 1日の回数（日本時間の日付）。上限を超えたら断る
async function countToday() {
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const db = getFirestore(), ref = db.doc(`ops/aiUsage/days/${day}`);
  return db.runTransaction(async (t) => {
    const n = ((await t.get(ref)).data() || {}).n || 0;
    if (n >= LIMIT()) return false;
    t.set(ref, { n: n + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

exports.proposal = onRequest({ secrets: [OPENAI_API_KEY], timeoutSeconds: 60, memory: "256MiB", cors: false }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST だけ受け付けます" });
  const ctx = checkCtx(req.body && req.body.ctx);
  if (!ctx) return res.status(400).json({ error: "材料の形が違います" });
  try {
    if (!(await countToday())) return res.status(429).json({ error: "今日の上限に達しました" });
    const ids = ctx.plans.map((p) => p.id);
    const schema = {
      type: "object", additionalProperties: false, required: ["items"],
      properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "title", "how", "fit"],
        properties: { id: { type: "string", enum: ids }, title: { type: "string" }, how: { type: "string" }, fit: { type: "string" } } } } },
    };
    const r = await fetch(`${BASE()}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY.value()}` },
      body: JSON.stringify({
        model: MODEL(), temperature: 0.7, max_tokens: 1500,
        messages: [{ role: "user", content: P.prompt(ctx) }],
        response_format: { type: "json_schema", json_schema: { name: "proposals", strict: true, schema } },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("OpenAI", r.status, j.error && j.error.message); return res.status(502).json({ error: "ChatGPT から返事がありません", status: r.status }); }
    const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    const byId = P.clean((JSON.parse(text || "{}") || {}).items, ids);
    if (!Object.keys(byId).length) return res.status(502).json({ error: "使える文がありませんでした" });
    return res.status(200).json({ byId, model: j.model || MODEL(), version: P.PROMPT_VERSION });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "サーバーの処理に失敗しました" });
  }
});
