// 予測モデル v1.0（予備調査215名のリッジ回帰。係数は data/model_v1.json、作り方は analysis/README.md）。
// 入力: 現状の頻度4つ・アバター意識（3項目の平均）・スイッチ5項目。出力: 幸福度（WB）・推し疲れ（BO）の指標（1〜5）。
// ※ 横断データの「関連」にもとづく見込みで、頻度を変えたときの効果ではない。
// 個人差の更新: 本人の回答とモデルのずれを、正規分布（事前）で更新する。個人内の週ごとの揺れ(SIGMA_W)は予備調査では測れておらず、仮の値。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const D = typeof module !== 'undefined' ? require('./data.js') : window.OF.data;
  const api = {};
  api.MODEL = D.model;
  api.NORMS = D.norms;
  api.SIGMA_W = 0.4;           // 仮: 個人内の週ごとの揺れ（1〜5の指標）
  api.OUTCOMES = ['WB', 'BO'];

  api.to100 = (x) => (x - 1) / 4 * 100;
  api.mean = (xs) => U.mean(xs);

  // 回答（id→1〜5）から指標を作る
  api.index = (answers, ids) => {
    const v = ids.map((id) => answers[id]).filter((x) => x != null);
    return v.length === ids.length ? U.mean(v) : null;
  };
  api.indices = (answers) => ({ WB: api.index(answers, I.WB_ITEMS), BO: api.index(answers, I.BO_ITEMS) });

  // 質問紙の回答 → モデルの入力（現状の頻度は最新のチェックイン、アバター・スイッチは初回）
  api.inputs = function (survey) {
    if (!survey || !survey.baseline) return null;
    const b = survey.baseline.answers, last = survey.weekly.length ? survey.weekly[survey.weekly.length - 1].answers : b;
    const x = {};
    for (const f of api.MODEL.features) {
      if (f === 'avatar') x.avatar = U.mean(['av_empathy', 'av_mood', 'av_visual'].map((k) => b[k]));
      else if (f.startsWith('cur_')) x[f] = last[f];
      else x[f] = b[f];
    }
    return Object.values(x).some((v) => v == null || Number.isNaN(v)) ? null : x;
  };

  api.predictMean = (x, y) => {
    const o = api.MODEL.outcomes[y];
    return api.MODEL.features.reduce((s, f) => s + o.coef[f] * x[f], o.intercept);
  };

  // 個人差の更新（チェックインごとの観測）
  api.personal = function (checkins, y) {
    const o = api.MODEL.outcomes[y];
    const tau2 = Math.max(o.rmseCV ** 2 - api.SIGMA_W ** 2, 0.01);
    const obs = checkins.filter((c) => c.obs[y] != null && c.x);
    if (!obs.length) return { offset: 0, varPost: tau2, n: 0, tau2 };
    const resid = U.mean(obs.map((c) => c.obs[y] - api.predictMean(c.x, y)));
    const prec = 1 / tau2 + obs.length / api.SIGMA_W ** 2;
    return { offset: (obs.length / api.SIGMA_W ** 2) / prec * resid, varPost: 1 / prec, n: obs.length, tau2 };
  };

  // 質問紙の回答の並び → チェックイン列（初回＋毎週）
  api.checkins = function (survey) {
    if (!survey || !survey.baseline) return [];
    const b = survey.baseline.answers;
    const mk = (date, ans) => {
      const x = {};
      for (const f of api.MODEL.features) x[f] = f === 'avatar' ? U.mean(['av_empathy', 'av_mood', 'av_visual'].map((k) => b[k])) : f.startsWith('cur_') ? ans[f] : b[f];
      const ok = Object.values(x).every((v) => v != null && !Number.isNaN(v));
      return { date, x: ok ? x : null, obs: api.indices(ans) };
    };
    return [mk(survey.baseline.date, b), ...survey.weekly.map((w) => mk(w.date, w.answers))];
  };

  // 予測（平均・80%の幅・20点）
  api.forecast = function (survey, x) {
    const cks = api.checkins(survey);
    const z = U.normInv(0.9), out = {};
    for (const y of api.OUTCOMES) {
      const p = api.personal(cks, y);
      const mean = U.clamp(api.predictMean(x, y) + p.offset, 1, 5);
      const sd = Math.sqrt(api.SIGMA_W ** 2 + p.varPost);
      out[y] = { mean, sd, lo: U.clamp(mean - z * sd, 1, 5), hi: U.clamp(mean + z * sd, 1, 5), n: p.n,
        dots: Array.from({ length: 20 }, (_, i) => U.clamp(mean + sd * U.normInv((i + 0.5) / 20), 1, 5)) };
    }
    out.highCount = out.BO.dots.filter((d) => d >= api.highBO()).length;
    return out;
  };

  // 2つの頻度の組の差（係数のばらつきから、差の確からしさ）
  api.diff = function (x1, x2, y) {
    const o = api.MODEL.outcomes[y], f = api.MODEL.features;
    const dx = f.map((k) => x2[k] - x1[k]);
    const delta = f.reduce((s, k, i) => s + o.coef[k] * dx[i], 0);
    let v = 0; for (let i = 0; i < f.length; i++) for (let j = 0; j < f.length; j++) v += dx[i] * o.coefCov[i][j] * dx[j];
    return { delta, se: Math.sqrt(Math.max(v, 0)) };
  };

  api.highBO = () => api.NORMS.indices.BO.tertiles[1];   // 215名の上位3分の1の境目（1〜5の指標）
  api.expressionFor = (bo) => (bo >= api.highBO() ? 'tired' : bo >= api.NORMS.indices.BO.tertiles[0] ? 'neutral' : 'good');

  if (typeof module !== 'undefined') module.exports = api; else window.OF.model = api;
})();
