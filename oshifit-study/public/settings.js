// OshiFit の設定（初期値）と、Firestore の上書きを安全に混ぜる関数。アプリ（index.html）と開発者ページ（admin.html）が使う。
// 研究者は Firestore の config/app の文書で値を変えられる（コードを変えずに）。書いていない項目は、ここの初期値を使う。
// 範囲外・型の違う値は無視して初期値を使う（RANGE）。値を変えたら version を1つ上げる（参加者の記録に、そのとき使った版が残る）。
// 研究の途中で変えると、変える前と後の参加者で条件が変わる。変える前に指導教員と確認し、README_ja.md の変更の記録に書く。
(function () {
  "use strict";
  const DEFAULT = {
    version: 0,
    gapDays: 4,            // 振り返りの間隔（前回から何日あけるか）
    nChecks: 6,            // 振り返りの回数（ルールの都合で最大6）
    finalDay: 28,          // 最後の調査が開く日（開始からの日数）
    finalMaxDay: 35,       // 振り返りが終わっていなくても最後の調査を開く日
    groupA: { axisMin: 60, axisCount: 5, who5Min: 13 },   // 群A：6軸のうち axisCount 以上が axisMin 点以上、かつ WHO-5 素点が who5Min 以上
    ref: { wb: 52, joy: 70, sleep: 70, money: 65, duty: 70, compare: 70 },   // 提案を選ぶときの各軸の「目安」
    weights: { trait: 12, act: 18 },                       // 提案の点数：性格との合い方 × trait ＋ 活動の比重 × act
    diminish: [1, 0.8, 0.6],                               // 提案を複数選んだときの効果の倍率（効果の大きい順）
    clashFactor: 0.5,                                      // 相性の悪い組み合わせの効果の倍率
    burden: 3,                                             // 2つめ以降の提案1つあたり、推し疲れに足す点数
    interval: { hw: 15, hwWb: 12, hwStep: 5, hwWbStep: 4 }, // 見込みの80%の幅（半幅）と、提案が1つ増えるごとに広げる量
    pc: { burnout: { su: 10, se: 14 }, wb: { su: 9, se: 10 } }, // 個人補正のばらつき（σu・σe）
    alerts: { noCheckDays: 10, noDailyDays: 3, who5Max: 7 },    // 開発者ページの「確認が必要」の基準
  };
  // [最小, 最大]。この範囲の数だけ受け付ける
  const RANGE = {
    version: [0, 1e6], gapDays: [1, 14], nChecks: [1, 6], finalDay: [7, 60], finalMaxDay: [7, 90],
    "groupA.axisMin": [0, 100], "groupA.axisCount": [1, 6], "groupA.who5Min": [0, 25],
    "ref.*": [0, 100], "weights.*": [0, 100], "diminish.*": [0, 1], clashFactor: [0, 1], burden: [0, 20],
    "interval.*": [0, 50], "pc.*.*": [0.1, 100], "alerts.*": [1, 60],
  };
  const rangeOf = (path) => RANGE[path] || RANGE[path.replace(/\.[^.]+$/, ".*")] || RANGE[path.replace(/\.[^.]+\.[^.]+$/, ".*.*")];
  // 初期値の形に合わせて、上書きの値を1つずつ確かめながら混ぜる。受け付けなかった項目は rejected に入れて返す
  function merge(def, over, path, rejected) {
    if (Array.isArray(def)) {
      if (!Array.isArray(over)) { if (over !== undefined) rejected.push(path); return def.slice(); }
      return def.map((d, i) => merge(d, over[i], `${path}.${i}`.replace(/^\./, ""), rejected)).concat(over.slice(def.length).filter((x, i) => ok(x, `${path}.${def.length + i}`)));
    }
    if (def && typeof def === "object") {
      const o = {};
      for (const k of Object.keys(def)) o[k] = merge(def[k], over && typeof over === "object" ? over[k] : undefined, path ? `${path}.${k}` : k, rejected);
      return o;
    }
    if (over === undefined || over === null) return def;
    if (ok(over, path)) return over;
    rejected.push(path); return def;
  }
  const ok = (v, path) => { const r = rangeOf(path); return typeof v === "number" && isFinite(v) && (!r || (v >= r[0] && v <= r[1])); };
  function apply(remote) {
    const rejected = [];
    const cfg = merge(DEFAULT, remote || {}, "", rejected);
    if (cfg.finalMaxDay < cfg.finalDay) { cfg.finalMaxDay = cfg.finalDay; rejected.push("finalMaxDay（finalDay より小さい）"); }
    return { cfg, rejected };
  }
  // 提案：初期値（plans.js）に Firestore の plans/{id} を重ねる。新しい id は足す。active:false は新しい人に出さない（選んだ人の記録には残す）
  const AXES = ["wb", "joy", "sleep", "money", "duty", "compare"], TRAITS = ["E", "E-", "O", "C", "N", "A"];
  function mergePlans(base, remote) {
    const out = base.map((p) => ({ ...p, active: true, source: "初期値" })), rejected = [];
    for (const r of remote || []) {
      if (!r || typeof r.id !== "string" || !/^[a-z0-9_]{2,20}$/.test(r.id)) { rejected.push(String(r && r.id)); continue; }
      let p = out.find((x) => x.id === r.id);
      if (!p) { p = { id: r.id, trait: null, active: true, source: "Firestore（追加）" }; out.push(p); } else p.source = "初期値＋Firestore";
      if (typeof r.title === "string" && r.title.trim()) p.title = r.title.trim();
      if (typeof r.how === "string" && r.how.trim()) p.how = r.how.trim();
      if (AXES.includes(r.axis)) p.axis = r.axis;
      if (typeof r.eff === "number" && r.eff >= 0 && r.eff <= 40) p.eff = r.eff;
      if (r.trait === null || r.trait === "" || TRAITS.includes(r.trait)) p.trait = r.trait || null;
      if (typeof r.act === "string") p.act = r.act;
      if (typeof r.multi === "boolean") p.multi = r.multi;
      if (typeof r.active === "boolean") p.active = r.active;
      if (!p.title || !p.how || !AXES.includes(p.axis) || typeof p.eff !== "number") { rejected.push(r.id + "（題名・やり方・軸・効果のどれかがない）"); p.active = false; }
    }
    return { plans: out, rejected };
  }
  window.OSHIFIT_SETTINGS = { DEFAULT, RANGE, apply, mergePlans };
})();
