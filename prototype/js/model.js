// 予測モデル（試作用）。
// ★ 係数は予備調査の実測値ではなく、試作を動かすための仮の値（PLACEHOLDER）。
//   実験前に、予備調査215名から作った v1.0 の係数に data/model_v1.json を差し替えること。
// 個人補正は、モデルの予測と本人の記録のずれを正規分布で更新する（ベイズ更新）。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const api = {};

  // 5つの活動を 0〜4（現場は 0〜3）の段階にして使う
  api.ACTIVITIES = [
    { key: 'live', label: 'ライブ・現場', unit: '回/週', levels: [0, 1, 2, 3], wish: 'ライブ・イベント' },
    { key: 'goods', label: 'グッズ・課金', unit: '円/週', levels: [0, 3000, 8000, 15000, 25000], wish: 'グッズ・課金' },
    { key: 'stream', label: '配信・動画', unit: '時間/日', levels: [0, 1, 2, 3, 5], wish: '配信・動画' },
    { key: 'sns', label: 'SNS', unit: '時間/日', levels: [0, 1, 2, 3, 5], wish: 'SNS' },
    { key: 'late', label: '夜更かし', unit: '日/週', levels: [0, 1, 2, 4, 6], wish: '夜更かし' },
  ];

  api.PARAMS = {
    placeholder: true,
    version: 'prototype-placeholder-0',
    mean: { live: 1, goods: 1.5, stream: 1.5, sns: 1.5, late: 1 }, // 段階の平均（仮）
    sd: { live: 1, goods: 1.2, stream: 1.2, sns: 1.2, late: 1.2 },
    joy: { intercept: 3.6, b: { live: 0.22, goods: 0.05, stream: 0.18, sns: 0.02, late: -0.04 }, sigma: 0.71 },
    fatigue: { intercept: 2.9, b: { live: 0.10, goods: 0.14, stream: 0.08, sns: 0.16, late: 0.30 }, sigma: 0.92 },
    tau: { joy: 0.5, fatigue: 0.6 },   // 個人差の事前の大きさ（仮）
    weekFactor: 0.75,                  // 週平均の揺れ = 日ごとの誤差 × この値（仮）
    highFatigue: 3.5,                  // 「疲れ高め」の境目
  };

  // 値 → いちばん近い段階
  api.toLevel = function (key, value) {
    const lv = api.ACTIVITIES.find((a) => a.key === key).levels;
    let best = 0, bd = Infinity;
    lv.forEach((x, i) => { const d = Math.abs(x - value); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  // 直近 window 日の記録 → 習慣（5活動の段階）
  api.habitFromLogs = function (logs, today, window = 14) {
    const from = U.addDays(today, -(window - 1));
    const L = logs.filter((l) => l.date >= from && l.date <= today);
    const days = Math.max(1, L.length);
    const sum = (f) => L.reduce((s, l) => s + (f(l) || 0), 0);
    const liveWeek = sum((l) => l.live) / days * 7;
    const goodsWeek = sum((l) => l.goodsYen) / days * 7;
    const streamH = sum((l) => l.streamMin) / days / 60;
    const snsH = sum((l) => l.snsMin) / days / 60;
    const lateWeek = L.filter((l) => l.sleepImpact > 0).length / days * 7;
    return {
      n: L.length,
      values: { live: liveWeek, goods: goodsWeek, stream: streamH, sns: snsH, late: lateWeek },
      levels: {
        live: api.toLevel('live', liveWeek), goods: api.toLevel('goods', goodsWeek), stream: api.toLevel('stream', streamH),
        sns: api.toLevel('sns', snsH), late: api.toLevel('late', lateWeek),
      },
    };
  };

  api.predictMean = function (levels, outcome, params = api.PARAMS) {
    const p = params[outcome];
    let y = p.intercept;
    for (const a of api.ACTIVITIES) y += p.b[a.key] * ((levels[a.key] - params.mean[a.key]) / params.sd[a.key]);
    return y;
  };

  // 個人差の更新: 事前 N(0, tau²)、観測の誤差 sigma
  api.personalOffset = function (logs, today, outcome, params = api.PARAMS) {
    const habit = api.habitFromLogs(logs, today, 28);
    const L = logs.filter((l) => l.date <= today && U.daysBetween(l.date, today) < 28 && l[outcome] != null);
    const n = L.length;
    const tau = params.tau[outcome], sigma = params[outcome].sigma;
    if (!n) return { offset: 0, varPost: tau * tau, n: 0, habit };
    const resid = U.mean(L.map((l) => l[outcome])) - api.predictMean(habit.levels, outcome, params);
    const prec = 1 / (tau * tau) + n / (sigma * sigma);
    return { offset: (n / (sigma * sigma)) / prec * resid, varPost: 1 / prec, n, habit };
  };

  // 予測（平均・80%区間・20点）
  api.forecast = function (logs, today, levels, params = api.PARAMS) {
    const out = {};
    for (const o of ['joy', 'fatigue']) {
      const po = api.personalOffset(logs, today, o, params);
      const mean = api.predictMean(levels, o, params) + po.offset;
      const sd = Math.sqrt((params[o].sigma * params.weekFactor) ** 2 + po.varPost);
      const z = U.normInv(0.9);
      const dots = Array.from({ length: 20 }, (_, i) => U.clamp(mean + sd * U.normInv((i + 0.5) / 20), 1, 5));
      out[o] = { mean: U.clamp(mean, 1, 5), sd, lo: U.clamp(mean - z * sd, 1, 5), hi: U.clamp(mean + z * sd, 1, 5), dots, n: po.n };
    }
    out.highCount = out.fatigue.dots.filter((d) => d >= params.highFatigue).length;
    return out;
  };

  api.expressionFor = function (fatigueMean, params = api.PARAMS) {
    if (fatigueMean >= params.highFatigue) return 'tired';
    if (fatigueMean >= 2.8) return 'neutral';
    return 'good';
  };

  if (typeof module !== 'undefined') module.exports = api;
  else window.OF.model = api;
})();
