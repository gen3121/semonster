// OshiFit の提案文を、本人の推しに合わせて AI（Google の Gemini、Firebase AI Logic）で書く。
// ・提案の「型」（15種類のどれを出すか）は今までどおりアプリの式で決める。AI は、その型の狙いを保ったまま、
//   推しのジャンル・推しの名前に合わせた具体的な題名とやり方を書くだけ（効果の値・根拠・分析は型のものを使う）
// ・送るのは 6つの軸の点数・推しのジャンル・推しの名前・推しの数・使うお金の範囲だけ。氏名・メール・自由記述は送らない
// ・失敗・時間切れ・設定なしのときは null を返し、アプリは承認済みの固定の文を出す
// ・保存の処理（store.js、Firebase 10）とは別の Firebase アプリとして読み込む（AI Logic は新しい版の SDK にしかないため）
(function () {
  "use strict";
  const V = "13.2.0";
  const CDN = (m) => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const PROMPT_VERSION = "ai-v1";
  let ready = null;

  const conf = () => window.OSHIFIT_AI || {};
  // 研究版だけで使う。編集者用・展示用（保存しない版）は外部に何も送らない
  const enabled = () => window.OSHIFIT_MODE === "study" && !!(window.OSHIFIT_AI_MOCK || (conf().enabled && window.OSHIFIT_FIREBASE && !window.OSHIFIT_EMULATOR));

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
          items: S.object({ properties: { id: S.enumString({ enum: ids }), title: S.string(), how: S.string() } }),
        }),
      },
    });
    return ai.getGenerativeModel(g, {
      model: conf().model || "gemini-4-hydrogen",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
    });
  }

  function prompt(ctx) {
    const plans = ctx.plans.map((p, i) =>
      `提案${i + 1}（id: ${p.id}）\n- 改善を狙う軸：${p.axisName}（今 ${p.score}点）\n- 型の題名：${p.title}\n- 型のやり方：${p.how}` +
      (p.cap ? `\n- 本人の月の推し活費の目安上限：${p.cap}` : "")).join("\n\n");
    return `あなたは、推し活（ファン活動）を無理なく続けるための提案を書く担当です。
次の人に向けて、下の${ctx.plans.length}つの提案の型それぞれについて、この人の推しに合わせた具体的な提案を1つずつ書いてください。

【この人】
- 推しのジャンル：${ctx.genre || "不明"}
- 推しの名前・チーム名：${ctx.oshi || "（未回答）"}
- 推しの数：${ctx.multi || "不明"}
- この1か月の推し活費：${ctx.spend || "不明"}
- 推し活の状態（0〜100点、高いほど良い）：${ctx.axes}

【提案の型】
${plans}

【書き方の決まり】
- 型の狙い（改善を狙う軸）と、型のやり方の中心は変えない。推しの実際の推し活の場面に置き換えて具体的にする。
  例：プロ野球のチームなら、試合中継・ハイライト・球場・応援グッズなど。アイドルなら、配信・ライブ・SNSの投稿・グッズなど。
- 推し活をやめさせない。量を減らすより、関わり方を整える小さな変更にする。今日から1人でできることにする。
- 新しい買い物・課金・遠征をすすめない。転売・フリマでの高額取引・無理な節約・食事や睡眠を削ることをすすめない。
- 医療・診断の言葉、断定的な効果の約束を使わない。
- 試合や公演の日程・値段・URL・団体名など、確かめられない事実を書かない。推しの名前が分からないときは、ジャンルに合わせて一般的に書く。
- やさしい日本語。title は30字以内で「〜する」「〜にする」などで終える。how は120字以内で、いつ・何を・どうするかを書く。
- id は提案の型の id をそのまま使い、${ctx.plans.length}つの型すべてに1つずつ書く。`;
  }

  // 返ってきた文を確かめる。だめなものは捨てる（その提案は固定の文になる）
  const BAD = /https?:|www\.|転売|診断|治療|必ず治|絶対に/;
  function clean(items, ids) {
    const out = {};
    for (const it of items || []) {
      if (!it || !ids.includes(it.id) || out[it.id]) continue;
      const t = String(it.title || "").replace(/\s+/g, " ").trim(), h = String(it.how || "").replace(/\s+/g, " ").trim();
      if (!t || !h || t.length > 40 || h.length > 180 || BAD.test(t + h)) continue;
      out[it.id] = { title: t, how: h };
    }
    return out;
  }

  // ctx: { plans:[{id,title,how,axisName,score,cap}], genre, oshi, multi, spend, axes }
  // 戻り値：{ byId:{id:{title,how}}, model, version } または null
  async function tailor(ctx, timeoutMs) {
    if (!enabled() || !ctx || !ctx.plans || !ctx.plans.length) return null;
    const ids = ctx.plans.map((p) => p.id);
    const run = async () => {
      let text;
      if (window.OSHIFIT_AI_MOCK) text = await window.OSHIFIT_AI_MOCK(prompt(ctx), ids);
      else {
        const model = await load(ids);
        const r = await model.generateContent(prompt(ctx));
        text = r.response.text();
      }
      const byId = clean((JSON.parse(text) || {}).items, ids);
      return Object.keys(byId).length ? { byId, model: window.OSHIFIT_AI_MOCK ? "mock" : conf().model || "gemini-4-hydrogen", version: PROMPT_VERSION } : null;
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
