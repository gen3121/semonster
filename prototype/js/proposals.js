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

  api.generate = function (survey, ans) {
    const x = M.inputs(survey);
    if (!x) return { x: null, options: [], candidateCount: 0 };
    const wishes = api.wishes(survey.baseline.answers);
    const evald = api.candidates(x, wishes).map((ch) => {
      const x2 = api.apply(x, ch);
      const wb = M.diff(x, x2, 'WB'), bo = M.diff(x, x2, 'BO');
      return { changes: ch, dWB: wb.delta, dBO: bo.delta, seWB: wb.se, seBO: bo.se };
    }).filter((c) => c.dBO < -0.005);                 // 推し疲れが下がる見込みの案だけ
    const front = evald.filter((a) => !evald.some((b) => b !== a && b.dBO <= a.dBO && b.dWB >= a.dWB && (b.dBO < a.dBO || b.dWB > a.dWB)));
    const pool = front.length ? front : evald;
    const pick = [];
    const sig = (c) => c.changes.map((k) => k.key + k.dir).sort().join();
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
    return { x, wishes, options: pick, candidateCount: evald.length };
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.proposals = api;
})();
