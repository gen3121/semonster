// 提案づくり: 4つの頻度のうち最大2つを ±1段階動かした候補を、モデルで比べる。
// 「理想のほうが多い」と答えた活動は減らさず、「理想のほうが少ない」活動は増やさない。
// 数値は、予備調査の関連にもとづく見込み（効果の保証ではない）。
(function () {
  const M = typeof module !== 'undefined' ? require('./model.js') : window.OF.model;
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const api = {};

  api.wishes = (ans) => Object.fromEntries(I.ACTIVITIES.map((a) => [a.key, ans[a.ideal] > ans[a.cur] ? 'more' : ans[a.ideal] < ans[a.cur] ? 'less' : 'same']));

  api.describe = (changes) => changes.map((c) => {
    const a = I.ACTIVITIES.find((x) => x.key === c.key);
    return `${a.label}の頻度を、1段階${c.dir > 0 ? 'ふやす' : 'へらす'}`;
  });

  api.candidates = function (x, wishes) {
    const singles = [];
    for (const a of I.ACTIVITIES) for (const dir of [-1, 1]) {
      const w = wishes[a.key] || 'same', next = x[a.cur] + dir;
      if (next < 1 || next > 5) continue;
      if (dir < 0 && w === 'more') continue;
      if (dir > 0 && w === 'less') continue;
      singles.push({ key: a.key, dir });
    }
    const out = [];
    for (let i = 0; i < singles.length; i++) {
      out.push([singles[i]]);
      for (let j = i + 1; j < singles.length; j++) if (singles[i].key !== singles[j].key) out.push([singles[i], singles[j]]);
    }
    return out;
  };

  api.apply = (x, changes) => {
    const y = { ...x };
    for (const c of changes) y[I.ACTIVITIES.find((a) => a.key === c.key).cur] += c.dir;
    return y;
  };

  // 最適度: 「いちばん幸せ」と答えた理想の頻度と、いまの頻度の近さ。4つの活動それぞれの差（0〜4段階）の合計を、最大（16）に対する割合で見る。
  // モデルの予測は使わない（質問紙の回答だけ）。「理想どおりなら、いまのままで良い」という考え方。
  api.OPTIMAL = 80;
  api.optimality = function (ans) {
    const gaps = I.ACTIVITIES.map((a) => ({ key: a.key, label: a.label, cur: ans[a.cur], ideal: ans[a.ideal] }));
    if (gaps.some((g) => g.cur == null || g.ideal == null)) return null;
    gaps.forEach((g) => { g.gap = Math.abs(g.ideal - g.cur); });
    const total = gaps.reduce((s, g) => s + g.gap, 0), max = gaps.length * 4;
    const score = Math.round(100 * (1 - total / max));
    return { score, total, max, gaps, optimal: score >= api.OPTIMAL };
  };
  // 初回の回答に、最新のチェックインの回答を重ねたもの（いまの頻度は最新）
  api.latestAnswers = (survey) => {
    const last = survey.weekly.length ? survey.weekly[survey.weekly.length - 1] : survey.baseline;
    return { ...survey.baseline.answers, ...last.answers };
  };

  api.generate = function (survey) {
    const x = M.inputs(survey);
    if (!x) return { x: null, options: [], candidateCount: 0, optimality: null, micro: false };
    const ans = api.latestAnswers(survey);
    const wishes = api.wishes(ans);
    const opt = api.optimality(ans);
    const micro = !!(opt && opt.optimal);                         // すでに最適に近い → 大きな組み替えではなく、微修正だけ
    const all = api.candidates(x, wishes).filter((ch) => !micro || ch.length === 1);
    const closes = (ch) => ch.some((c) => { const a = I.ACTIVITIES.find((v) => v.key === c.key); return Math.sign(ans[a.ideal] - ans[a.cur]) === c.dir; });
    const evald = all.map((ch) => {
      const x2 = api.apply(x, ch);
      const wb = M.diff(x, x2, 'WB'), bo = M.diff(x, x2, 'BO');
      return { changes: ch, dWB: wb.delta, dBO: bo.delta, seWB: wb.se, seBO: bo.se, closesGap: closes(ch) };
    }).filter((c) => c.dBO < -0.005 || (micro && c.closesGap));  // 推し疲れが下がる見込みの案（微修正では「理想に近づく」案も）
    const sig = (c) => c.changes.map((k) => k.key + k.dir).sort().join();
    const pick = [];
    if (micro) {
      evald.sort((a, b) => (b.closesGap - a.closesGap) || (a.dBO - b.dBO)).slice(0, 3).forEach((c, i) => {
        pick.push({ id: 'micro' + (i + 1), label: `${'①②③'[i]} ${api.describe(c.changes)[0]}`, ...c, texts: api.describe(c.changes), reason: c.closesGap ? 'ideal' : 'model' });
      });
      return { x, wishes, options: pick, candidateCount: evald.length, optimality: opt, micro };
    }
    const front = evald.filter((a) => !evald.some((b) => b !== a && b.dBO <= a.dBO && b.dWB >= a.dWB && (b.dBO < a.dBO || b.dWB > a.dWB)));
    const pool = front.length ? front : evald;
    const take = (label, id, sorter, filter = () => true) => {
      for (const set of [pool, evald]) {
        const c = [...set].filter((v) => filter(v) && !pick.some((p) => sig(p) === sig(v))).sort(sorter)[0];
        if (c) { pick.push({ id, label, ...c, texts: api.describe(c.changes) }); return; }
      }
    };
    take('③ 回復重視型', 'recover', (a, b) => a.dBO - b.dBO);                                   // 推し疲れが最も下がる
    take('① 楽しさキープ型', 'keep', (a, b) => b.dWB - a.dWB, (c) => c.dWB >= -0.03);           // 幸福度がほぼ下がらない
    take('② バランス型', 'balance', (a, b) => (b.dWB - b.dBO) - (a.dWB - a.dBO));
    pick.sort((p, q) => p.label.localeCompare(q.label));
    return { x, wishes, options: pick, candidateCount: evald.length, optimality: opt, micro };
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.proposals = api;
})();
