const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../js/extract.js');
const S = require('../js/safety.js');
const M = require('../js/model.js');
const P = require('../js/proposals.js');
const T = require('../js/tipi.js');
const W = require('../js/who5.js');
const U = require('../js/util.js');
const SD = require('../js/state.js');
const RD = require('../js/radar.js');

const pick = (r) => ({ live: r.live, goods: r.goodsYen, stream: r.streamMin, sns: r.snsMin, sleep: r.sleepImpact });

test('extract: 配信とSNSの時間を振り分ける', () => {
  assert.deepEqual(pick(X.extractLog('夜に配信を2時間くらい見て、そのあとXもだらだら1時間。グッズは買ってない。寝るの遅くなった。')),
    { live: null, goods: 0, stream: 120, sns: 60, sleep: 1 });
  assert.deepEqual(pick(X.extractLog('配信2時間とSNS30分。ちゃんと寝た。')), { live: null, goods: null, stream: 120, sns: 30, sleep: 0 });
});
test('extract: ライブ配信はライブ参加として数えない', () => {
  const r = X.extractLog('ライブ配信を3時間見た。スパチャ5千円。深夜2時まで起きてた');
  assert.equal(r.live, null); assert.equal(r.streamMin, 180); assert.equal(r.goodsYen, 5000); assert.equal(r.sleepImpact, 1);
});
test('extract: 現場に行った・金額の単位・漢数字', () => {
  const r = X.extractLog('ライブに行ってきた！グッズに8千円使った。帰りが遅くて寝不足');
  assert.equal(r.live, 1); assert.equal(r.goodsYen, 8000); assert.equal(r.sleepImpact, 1);
  assert.equal(X.extractLog('三千円課金した。二時間配信見てた').goodsYen, 3000);
  assert.equal(X.extractLog('グッズに1.5万円使った').goodsYen, 15000);
  assert.equal(X.extractLog('現場には行ってない').live, 0);
  assert.equal(X.extractLog('徹夜で配信を見た').sleepImpact, 2);
});
test('extract: 楽しさ・疲れは口調から推定せず、明示された数字だけ', () => {
  const r = X.extractLog('すごく楽しかったけど、めちゃくちゃ疲れた');
  assert.equal(r.joy, null); assert.equal(r.fatigue, null);
  const r2 = X.extractLog('楽しさ4 疲れ2');
  assert.equal(r2.joy, 4); assert.equal(r2.fatigue, 2);
});
test('extract: 何も取れない文は全部 null（聞き返しになる）', () => {
  const r = X.extractLog('今日は何もしてない');
  assert.deepEqual(pick(r), { live: null, goods: null, stream: null, sns: null, sleep: null });
  assert.deepEqual(X.missingFields(r), ['sleep', 'time', 'goods', 'live']);
});
test('parseAnswer: 各項目の返事', () => {
  assert.deepEqual(X.parseAnswer('rating', '4と2'), { value: { joy: 4, fatigue: 2 } });
  assert.deepEqual(X.parseAnswer('sleep', '少し'), { value: 1 });
  assert.deepEqual(X.parseAnswer('sleep', 'かなり'), { value: 2 });
  assert.deepEqual(X.parseAnswer('live', '行ってない'), { value: 0 });
  assert.deepEqual(X.parseAnswer('live', '行った'), { value: 1 });
  assert.deepEqual(X.parseAnswer('goods', '5千円くらい'), { value: 5000 });
  assert.deepEqual(X.parseAnswer('goods', '0円'), { value: 0 });
  assert.deepEqual(X.parseAnswer('time', '配信2時間、SNS1時間'), { value: { stream: 120, sns: 60 } });
  assert.deepEqual(X.parseAnswer('time', '2時間と30分'), { value: { stream: 120, sns: 30 } });
  assert.deepEqual(X.parseAnswer('time', 'どっちも見てない'), { value: { stream: 0, sns: 0 } });
  assert.deepEqual(X.parseAnswer('facet', '義務感'), { value: 'duty' });
  assert.deepEqual(X.parseAnswer('sleep', 'わからない'), { unknown: true });
  assert.equal(X.parseAnswer('rating', 'うーん'), null);
});

test('safety: 強い言葉・つらさ・連続する強い疲れ・WHO-5', () => {
  assert.equal(S.detectText('もう消えたい'), 'severe');
  assert.equal(S.detectText('今日は楽しかった'), null);
  assert.equal(S.detectText('もう無理'), 'heavy');
  assert.equal(S.detectStreak([{ fatigue: 5 }, { fatigue: 5 }, { fatigue: 5 }]), true);
  assert.equal(S.detectStreak([{ fatigue: 5 }, { fatigue: 4 }, { fatigue: 5 }]), false);
  assert.equal(S.detectWho5(12), true); assert.equal(S.detectWho5(13), false);
});

const mkLogs = (n, over = {}) => Array.from({ length: n }, (_, i) => ({ date: U.addDays('2026-11-02', i), live: 0, goodsYen: 500, streamMin: 150, snsMin: 180, sleepImpact: 1, joy: 4, fatigue: 3.8, ...over }));
test('model: 記録が増えると予測の幅がせまくなる', () => {
  const lv = M.habitFromLogs(mkLogs(14), '2026-11-15').levels;
  const sd = (n) => M.forecast(mkLogs(n), U.addDays('2026-11-02', n - 1), lv).fatigue.sd;
  assert.ok(sd(1) > sd(7) && sd(7) > sd(14) && sd(14) > sd(28));
});
test('model: 80%区間が平均を含み、1〜5に収まる。20点は昇順に並ぶ', () => {
  const lg = mkLogs(14), lv = M.habitFromLogs(lg, '2026-11-15').levels;
  const f = M.forecast(lg, '2026-11-15', lv);
  for (const o of ['joy', 'fatigue']) { assert.ok(f[o].lo <= f[o].mean && f[o].mean <= f[o].hi); assert.ok(f[o].lo >= 1 && f[o].hi <= 5); }
  assert.equal(f.fatigue.dots.length, 20);
  assert.ok(f.highCount >= 0 && f.highCount <= 20);
});
test('model: 個人差の更新は、実際が予測より疲れているほど上に動く', () => {
  const lo = M.forecast(mkLogs(14, { fatigue: 2 }), '2026-11-15', M.habitFromLogs(mkLogs(14), '2026-11-15').levels).fatigue.mean;
  const hi = M.forecast(mkLogs(14, { fatigue: 5 }), '2026-11-15', M.habitFromLogs(mkLogs(14), '2026-11-15').levels).fatigue.mean;
  assert.ok(hi > lo + 0.3);
});
test('proposals: 増やしたいは減らさない・減らしたいは増やさない／疲れが下がる案だけ／3案までで重複なし', () => {
  const lg = mkLogs(14, { live: 0, sleepImpact: 1 });
  const wishes = { live: 'more', goods: 'same', stream: 'more', sns: 'less', late: 'same' };
  const r = P.generate(lg, '2026-11-15', wishes);
  assert.ok(r.options.length >= 1 && r.options.length <= 3);
  const ids = new Set();
  for (const o of r.options) {
    assert.ok(o.dFatigue < 0, o.label);
    for (const c of o.changes) { if (wishes[c.key] === 'more') assert.ok(c.dir > 0); if (wishes[c.key] === 'less') assert.ok(c.dir < 0); }
    const sig = o.changes.map((c) => c.key + c.dir).sort().join(); assert.ok(!ids.has(sig)); ids.add(sig);
    assert.ok(o.changes.length <= 2);
  }
});
test('tipi / who5 の得点', () => {
  const sc = T.score([7, 1, 7, 1, 7, 1, 7, 1, 7, 1]);
  assert.deepEqual(sc, { extraversion: 7, agreeableness: 7, conscientiousness: 7, neuroticism: 1, openness: 7 }); // 神経症傾向 = (項目4 + 反転した項目9) / 2 = (1 + 1) / 2
  assert.equal(W.raw([5, 5, 5, 5, 5]), 25); assert.equal(W.raw([0, 0, 0, 0, 0]), 0);
});

const sampleState = (over = {}) => ({
  logs: Array.from({ length: 14 }, (_, i) => ({ date: U.addDays('2026-11-02', i), live: 0, goodsYen: i % 7 >= 5 ? 6000 : 500, streamMin: 150, snsMin: 180, sleepImpact: i % 7 < 5 ? 1 : 0, joy: 4, fatigue: 4, mainFatigue: i % 2 ? 'duty' : 'sleep' })),
  limits: { budgetYenMonth: 30000, hoursPerDay: 4 }, who5: [{ date: '2026-11-15', raw: 11, answers: [2, 2, 2, 3, 2] }], ...over });
test('state: 各軸の値が、画面に出す計算式どおりに手計算と一致する', () => {
  const r = SD.compute(sampleState(), '2026-11-15');
  const ax = Object.fromEntries(r.axes.map((a) => [a.key, a.value]));
  assert.equal(ax.sleep, 36);                       // 平均0.714 / 2 * 100
  assert.equal(ax.money, 100);                      // 週14,500円 / 7,000円 → 上限100
  assert.equal(ax.time, 100);                       // 5.5h / 4h → 上限100
  assert.equal(ax.fatigue, 75);                     // (4-1)/4*100
  assert.equal(ax.feeling, 50);                     // 7/14
  assert.equal(r.stress.value, Math.round((36 + 100 + 100 + 75 + 50) / 5));
  assert.equal(r.joy.value, 75);
  assert.equal(r.who5.value, 44);                   // 11 * 4
});
test('state: 入力が足りない軸は null、4軸未満なら総合は出さない。根拠の文には実際の入力値が入る', () => {
  const r = SD.compute(sampleState({ limits: null }), '2026-11-15');
  assert.equal(r.axes.find((a) => a.key === 'money').value, null);
  assert.equal(r.axes.find((a) => a.key === 'time').value, null);
  assert.equal(r.stress.value, null);
  const r2 = SD.compute(sampleState(), '2026-11-15');
  assert.ok(r2.axes.find((a) => a.key === 'money').inputs.some((t) => t.includes('14,500円')));
  assert.ok(r2.who5.inputs.some((t) => t.includes('2 ＋ 2 ＋ 2 ＋ 3 ＋ 2 ＝ 11')));
  for (const a of [...r2.axes, r2.stress, r2.joy, r2.who5]) { assert.ok(a.formula && a.note && a.inputs.length); }
});
test('state: 記録が3日未満なら ready=false。直近14日より前の記録は使わない', () => {
  assert.equal(SD.compute({ ...sampleState(), logs: sampleState().logs.slice(0, 2) }, '2026-11-03').ready, false);
  const r = SD.compute(sampleState(), '2026-12-10');
  assert.equal(r.days, 0);
});
test('radar: 値のない軸があると多角形を描かず、ラベルに値が入る', () => {
  const full = RD.svg([{ label: 'A', value: 50 }, { label: 'B', value: 80 }, { label: 'C', value: 20 }]);
  assert.ok(full.includes('<polygon') && full.includes('>80<'));
  const part = RD.svg([{ label: 'A', value: 50 }, { label: 'B', value: null }, { label: 'C', value: 20 }]);
  assert.ok(part.includes('—') && part.split('<polygon').length === 4); // グリッド3本のみ
});
