// 「性格に合わせた提案になっているか」の確認。展示・編集者用の画面（保存しない）で、アプリの中の関数をそのまま使う。
// 同じ推し活の状態で性格だけを変えた2人に、違う提案が出ること／推し活が順調な人には提案しないこと／組み合わせの「おすすめ」を確かめる。
const path = require("path"), fs = require("fs"), os = require("os"), assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oshifit-check-"));
fs.cpSync(path.resolve(__dirname, "..", "public"), dir, { recursive: true });
fs.writeFileSync(path.join(dir, "config.js"), fs.readFileSync(path.join(dir, "config.js"), "utf8").replace(/window\.OSHIFIT_MODE = .*$/m, 'window.OSHIFIT_MODE = "demo";'));
(async () => {
  const b = await chromium.launch(), page = await b.newPage();
  await page.goto("file://" + path.join(dir, "index.html"));
  await page.waitForFunction(() => window.__OSHIFIT_CHECK);
  const r = await page.evaluate(() => {
    const C = window.__OSHIFIT_CHECK;
    const base = () => {
      const A = { Q1: 21, Q2: "女性", Q3: "学生", Q4: "VTuber・配信者", Q5: "1年〜3年未満", Q5b: "1人・1組", Q6: "1万円〜3万円未満" };
      ["Q17","Q18","Q19","Q20","Q21","Q22","Q23","Q24","Q25","Q26","Q27","Q28"].forEach((k) => (A[k] = 3));
      for (let i = 29; i <= 54; i++) A["Q" + i] = 4; A.Q42 = 2;
      ["Q44","Q45","Q46","Q47","Q48","Q49","Q50","Q51"].forEach((k) => (A[k] = 5));   // 推し疲れがやや多い
      ["W1","W2","W3","W4","W5"].forEach((k) => (A[k] = 2));                               // 気分はやや低め
      ["H1","H2","H3","H4"].forEach((k) => (A[k] = 4)); for (let i = 1; i <= 14; i++) A["P" + i] = 2;
      return A;
    };
    const persona = (tipi) => { const A = base(); Object.assign(A, tipi); return A; };
    // 外向的・安定（Q7 外向 5、Q12 ひかえめ 1、Q10 心配性 1、Q15 冷静 5）／内向的・心配性（逆）。どちらも勤勉性・協調性・開放性は同じ
    const mid = { Q8: 3, Q9: 3, Q11: 3, Q13: 3, Q14: 3, Q16: 3 };
    const E = persona({ ...mid, Q7: 5, Q12: 1, Q10: 1, Q15: 5 }), I = persona({ ...mid, Q7: 1, Q12: 5, Q10: 5, Q15: 1 });
    const out = {};
    for (const [k, A] of Object.entries({ E, I })) {
      const sc = C.scores(A), ps = C.plansFor(sc, A);
      out[k] = { big5: C.big5(A), plans: ps.map((p) => p.id), why: ps.map((p) => p.why), sc };
      const cs = C.combos(sc, ps.map((p) => p.id));
      out[k].best = cs.find((c) => c.best).ids; out[k].nCombos = cs.length; out[k].allIds = ps.map((p) => p.id);
    }
    // 推し活が順調な人：負担なし・気分よし
    const G = base(); ["Q44","Q45","Q46","Q47","Q48","Q49","Q50","Q51"].forEach((k) => (G[k] = 1)); for (let i = 29; i <= 34; i++) G["Q" + i] = 6; G.Q39 = 6; ["W1","W2","W3","W4","W5"].forEach((k) => (G[k] = 4));
    out.good = C.scores(G);
    // 相性が悪い組み合わせ（イベント×予算）の見込みは、別々に足したものより悪くなる
    const sc = out.E.sc, both = C.predictMulti(sc, ["event", "budget"]), ev = C.predictMulti(sc, ["event"]), bu = C.predictMulti(sc, ["budget"]);
    out.clash = { both: both.B.burnout - sc.burnout, sum: (ev.B.burnout - sc.burnout) + (bu.B.burnout - sc.burnout), n: both.clashes.length };
    return out;
  });
  console.log("外向的・安定の人  ：", r.E.plans.join(", "), "｜おすすめ", r.E.best.join("×"));
  r.E.why.forEach((w) => console.log("   理由：", w));
  console.log("内向的・心配性の人：", r.I.plans.join(", "), "｜おすすめ", r.I.best.join("×"));
  r.I.why.forEach((w) => console.log("   理由：", w));
  assert.notDeepEqual(r.E.plans, r.I.plans, "性格だけが違う2人に、違う提案が出る");
  assert.ok(r.E.why.some((w) => /外向性が高め/.test(w)) || r.I.why.some((w) => /気持ちが揺れやすい|ひとりで楽しむ/.test(w)), "理由に性格が書かれる");
  assert.equal(r.E.nCombos, 2 ** r.E.allIds.length - 1, "すべての組み合わせを見積もる");
  assert.ok(r.clash.n === 1 && r.clash.both > r.clash.sum, "相性が悪い組み合わせは、別々に足すより推し疲れの見込みが悪い");
  const goodAxes = ["wb", "joy", "sleep", "money", "duty", "compare"].filter((k) => r.good[k] >= 60).length;
  assert.ok(goodAxes >= 5 && r.good.who5raw >= 13, "順調な人は群A（提案なし）の条件を満たす");
  await b.close(); console.log("OK personalization");
})().catch((e) => { console.error(e); process.exit(1); });
