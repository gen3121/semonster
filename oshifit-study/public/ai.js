// OshiFit の提案文を、本人の推しと性格に合わせて AI で書く。
// ・まず ChatGPT（研究室の OpenAI の鍵。サーバーの処理 functions/index.js を Hosting の /api/proposal から呼ぶ）、
//   だめなら Google の Gemini（Firebase AI Logic）で頼む。順番は config.js の OSHIFIT_AI.providers
// ・提案の「型」（15種類のどれを出すか）は今までどおりアプリの式で決める。AI は、その型の狙いを保ったまま、
//   推しのジャンル・推しの名前に合わせた具体的な題名とやり方を書くだけ（効果の値・根拠・分析は型のものを使う）
// ・送るのは 6つの軸の点数・性格（TIPI-J の5因子）・推し活の中身の割合・推しのジャンル・推しの名前・推しの数・使うお金の範囲だけ。氏名・メール・自由記述は送らない
// ・失敗・時間切れ・設定なしのときは null を返し、アプリは承認済みの固定の文を出す
// ・保存の処理（store.js、Firebase 10）とは別の Firebase アプリとして読み込む（AI Logic は新しい版の SDK にしかないため）
(function () {
  "use strict";
  const V = "13.2.0";
  const CDN = (m) => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const P = window.OFAI_PROMPT, prompt = P.prompt, clean = P.clean, PROMPT_VERSION = P.PROMPT_VERSION;   // ai_prompt.js
  let ready = null;

  const conf = () => window.OSHIFIT_AI || {};
  // 研究版と編集者用（保存しない版）で使う。どちらも送るのは点数・性格・推し活の中身・推しの名前などだけ（保存はしない）
  const enabled = () => ["study", "demo"].includes(window.OSHIFIT_MODE) && !!(window.OSHIFIT_AI_MOCK || (conf().enabled && window.OSHIFIT_FIREBASE && !window.OSHIFIT_EMULATOR));

  async function load(ids) {
    const [app, ai, ac] = await Promise.all([import(CDN("app")), import(CDN("ai")), conf().appCheckKey ? import(CDN("app-check")) : null]);
    const a = app.getApps().find((x) => x.name === "oshifit-ai") || app.initializeApp(window.OSHIFIT_FIREBASE, "oshifit-ai");
    // AI Logic は App Check で守る（他人に無料枠を使われないため）。reCAPTCHA v3 のサイトキーは config.js
    if (ac) ac.initializeAppCheck(a, { provider: new ac.ReCaptchaV3Provider(conf().appCheckKey), isTokenAutoRefreshEnabled: true });
    // backend："agent"＝Google Cloud の Vertex AI（Agent Platform）。Blaze のお支払い（無料トライアルのクレジットを含む）で払う。送った内容は学習に使われない
    //          "google"＝Gemini Developer API（AI Studio の無料枠・前払い）
    const be = conf().backend === "google" ? new ai.GoogleAIBackend() : new ai.AgentPlatformBackend(conf().location || "global");
    const g = ai.getAI(a, { backend: be });
    const S = ai.Schema;
    const schema = S.object({
      properties: {
        items: S.array({
          items: S.object({ properties: { id: S.enumString({ enum: ids }), title: S.string(), how: S.string(), fit: S.string() } }),
        }),
      },
    });
    // 1つめのモデルが断られたとき（混雑・お支払いの条件）は、次のモデルで頼み直す
    const names = [conf().model || "gemini-4-hydrogen", ...(conf().fallbackModels || ["gemini-3.8-flash"])];
    return names.map((name) => ({ name, m: ai.getGenerativeModel(g, { model: name, generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 } }) }));
  }

  // ctx: { plans:[{id,title,how,axisName,score,cap}], genre, oshi, multi, spend, axes }
  // 戻り値：{ byId:{id:{title,how}}, model, version } または null
  async function tailor(ctx, timeoutMs) {
    if (!enabled() || !ctx || !ctx.plans || !ctx.plans.length) return null;
    const ids = ctx.plans.map((p) => p.id);
    const run = async () => {
      let text, used = "mock";
      if (window.OSHIFIT_AI_MOCK) text = await window.OSHIFIT_AI_MOCK(prompt(ctx), ids);
      else {
        // ChatGPT：材料（ctx）だけを送り、サーバーがプロンプトを組み立てて頼む
        if ((conf().providers || ["openai", "gemini"]).includes("openai")) {
          try {
            const r = await fetch(conf().proposalUrl || "/api/proposal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ctx }) });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j.byId) {
              const byId = clean(Object.entries(j.byId).map(([id, v]) => ({ id, ...v })), ids);
              if (Object.keys(byId).length) return { byId, model: j.model || "openai", version: PROMPT_VERSION };
            }
            console.warn("[OshiFit AI] ChatGPT が使えませんでした", r.status, j.error || "");
          } catch (e) { console.warn("[OshiFit AI] ChatGPT につながりません", e && e.message); }
          if (!(conf().providers || ["openai", "gemini"]).includes("gemini")) throw new Error("ChatGPT が使えません");
        }
        const models = await load(ids);
        // 混雑（429）や一時的な拒否（403）は、モデルを替えながら少し待って3回まで頼む（全体の時間切れの中で）
        for (let k = 0; ; k++) {
          const md = models[k % models.length];
          try { const r = await md.m.generateContent(prompt(ctx)); text = r.response.text(); used = md.name; break; }
          catch (e) { if (k >= 2) throw e; await new Promise((res) => setTimeout(res, k ? 3000 : 1000)); }
        }
      }
      const byId = clean((JSON.parse(text) || {}).items, ids);
      return Object.keys(byId).length ? { byId, model: used, version: PROMPT_VERSION } : null;
    };
    let timer;
    try {
      return await Promise.race([run(), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), timeoutMs || 30000); })]);
    } catch (e) {
      console.warn("[OshiFit AI] 固定の文を使います", e && (e.message || e));
      return null;
    } finally { clearTimeout(timer); }
  }

  window.OFAI = { tailor, enabled, PROMPT_VERSION };
})();
