const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../js/instrument.js');
const T = require('../js/topics.js');
const X = require('../js/extract.js');
const R = require('../js/reader.js');
const IV = require('../js/interview.js');
const S = require('../js/safety.js');
const M = require('../js/model.js');
const P = require('../js/proposals.js');
const TP = require('../js/tipi.js');
const W = require('../js/who5.js');
const U = require('../js/util.js');
const SD = require('../js/state.js');
const RD = require('../js/radar.js');
const ST = require('../js/store.js');

// ---------------------------------------------------------------- 質問紙の定義
test('instrument: 初回は39項目、毎週は12項目で、話題の項目と一致する', () => {
  assert.equal(I.BLOCKS.baseline.length, 39);
  assert.equal(I.BLOCKS.weekly.length, 12);
  for (const k of ['baseline', 'weekly']) {
    const ids = T.SEQ[k].flatMap((t) => T.itemsOf(t));
    assert.deepEqual([...ids].sort(), [...I.BLOCKS[k]].sort());
    assert.equal(new Set(ids).size, ids.length, '項目が2つの話題に重ならない');
  }
  for (const f of M.MODEL.features) assert.ok(f === 'avatar' || I.ITEMS[f], f + ' が質問紙の項目にある');
  assert.equal(I.TIPI.length, 10);
});
test('instrument: 選択式の項目は上限が昇順で、最後が上の端', () => {
  for (const id of ['income', 'expense', 'spend', 'free_wd', 'free_hd']) {
    const v = I.ITEMS[id].options.filter((o) => o[1] != null);
    const his = v.map((o) => o[2]);
    assert.equal(his[his.length - 1], null, id);
    his.slice(0, -1).forEach((x, i) => { if (i) assert.ok(x > his[i - 1], id); });
  }
});

test('topics: AIインタビューの問いかけは、質問紙の項目の文そのもの（言い換えない）', () => {
  for (const [k, t] of Object.entries(T.TOPICS)) {
    if (!t.openFree) continue;
    for (const id of t.items) assert.ok(t.open.includes(I.ITEMS[id].text.replace(/^この1週間（これまで）、/, '')), `${k}/${id}`);
  }
  assert.ok(T.TOPICS.burden.open.startsWith('この1週間（これまで）のことで、'));
  assert.ok(!T.TOPICS.current.open.startsWith('この1週間'));
});

// ---------------------------------------------------------------- 規則での読み取り
test('extract: 尺度の言葉を1〜5に読む（あいまいなら null）', () => {
  const a = (t) => X.parseLikert('agree', t), f = (t) => X.parseLikert('freq', t);
  assert.deepEqual(a('4'), { value: 4 });
  assert.deepEqual(a('やや当てはまる'), { value: 4 });
  assert.deepEqual(a('あまり当てはまらない'), { value: 2 });
  assert.deepEqual(a('全然ない'), { value: 1 });
  assert.deepEqual(a('かなりある'), { value: 5 });
  assert.deepEqual(a('どちらでもない'), { value: 3 });
  assert.equal(a('ないです'), null, '「ない」だけでは 1 か 2 か決めない');
  assert.equal(a('うーん'), null);
  assert.deepEqual(a('わからない'), { unknown: true });
  assert.deepEqual(f('ほとんどしない'), { value: 1 });
  assert.deepEqual(f('毎日'), { value: 5 });
  assert.deepEqual(f('たまに行く'), { value: 3 });
  assert.deepEqual(f('とてもよくする'), { value: 5 });
  assert.deepEqual(f('よくする'), { value: 4 });
  assert.equal(f('3日'), null);
});
test('extract: お金・時間は範囲のどこに入るかで選ぶ。境目は上の範囲', () => {
  const c = (id, t) => X.parseChoice(I.ITEMS[id], t);
  assert.deepEqual(c('income', '月12万円くらい'), { value: '10〜15万円' });
  assert.deepEqual(c('income', '10万'), { value: '10〜15万円' });
  assert.deepEqual(c('spend', '3000円'), { value: '5,000円未満' });
  assert.deepEqual(c('spend', '0円'), { value: '0円' });
  assert.deepEqual(c('spend', '2万円'), { value: '1万円〜3万円' });
  assert.deepEqual(c('expense', 'なし'), { value: '負担なし' });
  assert.deepEqual(c('free_wd', '90分'), { value: '2〜3時間' });
  assert.deepEqual(c('free_hd', '6時間'), { value: '6時間以上' });
  assert.deepEqual(c('income', '答えたくない'), { value: '回答しない' });
  assert.equal(c('spend', '12'), null, '単位のない数字は決めない');
});

// ---------------------------------------------------------------- AI読み取りの受け取り側
test('reader: サーバーの返事を検証する（範囲外・未知の項目・選択肢の番号）', () => {
  const ok = R.normalizeResponse('burden', { ok: true, answers: { b_sleep: { value: 4, evidence: '夜更かし' }, b_money: { value: 9, evidence: 'x' }, b_duty: { value: null }, b_envy: { value: 2.5 }, zzz: { value: 3 } } });
  assert.deepEqual(Object.keys(ok), ['b_sleep']);
  assert.equal(ok.b_sleep.src, 'llm');
  const lim = R.normalizeResponse('limits', { ok: true, answers: { income: { value: 2, evidence: '12万' }, spend: { value: 99 } } });
  assert.equal(lim.income.value, '10〜15万円');
  assert.equal(lim.spend, undefined);
  assert.equal(R.normalizeResponse('burden', { ok: false }), null);
});
const fakeFetch = (json, status = 200) => async () => ({ ok: status === 200, status, json: async () => json });
test('reader: 失敗（HTTPエラー・通信エラー）は理由つきで空を返す', async () => {
  assert.equal((await R.readTopic('burden', 'x', { fetch: fakeFetch({}, 502) })).fallback, 'http_502');
  assert.equal((await R.readTopic('burden', 'x', { fetch: async () => { throw new Error('down'); } })).fallback, 'network');
  assert.equal((await R.readTopic('burden', 'x', { fetch: fakeFetch({ ok: true }) })).fallback, 'bad_response');
});

// ---------------------------------------------------------------- 会話の進行
const ALL3 = (iv, id, v) => IV.tap(iv, id, v);
test('interview: ボタンだけで初回の39項目を答えきる。ボタンの値は tap として確定する', () => {
  const iv = IV.create('baseline');
  let guard = 0;
  while (!IV.done(iv) && guard++ < 100) {
    const v = IV.view(iv);
    assert.equal(v.kind, 'ask');
    IV.tap(iv, v.item.id, v.item.type === 'choice' ? v.item.options[1][0] : 4);
  }
  assert.equal(Object.keys(iv.answers).length, 39);
  assert.ok(Object.values(iv.src).every((x) => x === 'tap'));
});
test('interview: 文章で答えると確認を通る。直すと +edit が付く', async () => {
  const iv = IV.create('weekly');                       // 最初は現状の頻度（音楽・動画）
  assert.equal(IV.view(iv).item.id, 'cur_media');
  const r = await IV.text(iv, 'ほとんどしない');
  assert.equal(r.ok, true);
  assert.equal(IV.view(iv).kind, 'confirm');
  assert.equal(iv.answers.cur_media, undefined, '確認の前は確定しない');
  IV.edit(iv, 'cur_media', 2);
  IV.confirm(iv);
  assert.equal(iv.answers.cur_media, 2);
  assert.equal(iv.src.cur_media, 'rules+edit');
  const r2 = await IV.text(iv, 'うーん');
  assert.equal(r2.ok, false);
  assert.equal(IV.view(iv).item.id, 'cur_live', '読み取れなければ同じ項目のまま');
});
test('interview: AI読み取りで話題をまとめて埋める → 確認 → 残りだけを1つずつ聞く', async () => {
  const iv = IV.create('weekly', { llm: true, answers: { cur_media: 4, cur_live: 3, cur_goods: 3, cur_sns: 4 } });
  assert.equal(IV.view(iv).kind, 'open');               // 話題 burden の自由記述
  const fetch = fakeFetch({ ok: true, answers: { b_sleep: { value: 5, evidence: '徹夜' }, b_money: { value: 2, evidence: 'お金は大丈夫' }, b_duty: { value: null, evidence: null }, b_envy: { value: null, evidence: null } } });
  const r = await IV.text(iv, '徹夜で配信を見た。お金は大丈夫', { fetch });
  assert.equal(r.ok, true);
  const v = IV.view(iv);
  assert.equal(v.kind, 'confirm');
  assert.deepEqual(v.rows.map((x) => x.id), ['b_sleep', 'b_money']);
  IV.edit(iv, 'b_money', 3);
  IV.confirm(iv);
  assert.deepEqual([iv.src.b_sleep, iv.src.b_money], ['llm', 'llm+edit']);
  const nxt = IV.view(iv);
  assert.equal(nxt.kind, 'ask'); assert.equal(nxt.item.id, 'b_duty');
});
test('interview: AI読み取りが失敗したら、ひとつずつ聞く方へ戻る', async () => {
  const iv = IV.create('weekly', { llm: true, answers: { cur_media: 4, cur_live: 3, cur_goods: 3, cur_sns: 4 } });
  const r = await IV.text(iv, '寝不足', { fetch: fakeFetch({}, 503) });
  assert.equal(r.ok, false); assert.equal(r.hint, 'fallback');
  assert.equal(IV.view(iv).kind, 'ask');
});
test('interview: 途中から再開できる／毎週は12項目だけ', () => {
  const iv = IV.create('baseline', { answers: Object.fromEntries(I.BLOCKS.baseline.slice(0, 35).map((id) => [id, 3])) });
  assert.equal(IV.progress(iv).done, 35);
  const wk = IV.create('weekly');
  assert.equal(IV.progress(wk).total, 12);
});

// ---------------------------------------------------------------- 安全層
test('safety: 強い言葉・負担が続く・WHO-5', () => {
  assert.equal(S.detectText('もう消えたい'), 'severe');
  assert.equal(S.detectText('今日は楽しかった'), null);
  assert.equal(S.detectText('もう無理'), 'heavy');
  assert.equal(S.detectBurden([3, 4.5, 5]), true);
  assert.equal(S.detectBurden([5, 4]), false);
  assert.equal(S.detectBurden([5]), false);
  assert.equal(S.detectWho5(12), true); assert.equal(S.detectWho5(13), false);
});

// ---------------------------------------------------------------- 予測モデル
const ANS = { ...Object.fromEntries(I.BLOCKS.baseline.map((id) => [id, 3])), cur_media: 4, cur_live: 3, cur_goods: 3, cur_sns: 5, ideal_media: 4, ideal_live: 4, ideal_goods: 3, ideal_sns: 3,
  b_sleep: 4, b_money: 3, b_duty: 4, b_envy: 4, w_ikigai: 4, w_confidence: 3, w_schedule: 2, w_create: 2,
  income: '10〜15万円', expense: '5〜10万円', spend: '1万円〜3万円', free_wd: '2〜3時間', free_hd: '4〜5時間' };
const survey = (n = 2, over = {}) => ({ baseline: { date: '2026-11-02', answers: { ...ANS } }, weekly: Array.from({ length: n }, (_, i) => ({ date: U.addDays('2026-11-02', 7 * (i + 1)), answers: { ...ANS, ...over } })), draft: null });

test('model: 予測の平均は 切片＋係数×入力 で、画面に出す式と一致する', () => {
  const x = M.inputs(survey());
  assert.ok(x);
  for (const y of ['WB', 'BO']) {
    const o = M.MODEL.outcomes[y];
    const manual = o.intercept + M.MODEL.features.reduce((s, f) => s + o.coef[f] * x[f], 0);
    assert.ok(Math.abs(M.predictMean(x, y) - manual) < 1e-12);
  }
  assert.equal(x.avatar, 3);
});
test('model: 80%の幅は平均を含み1〜5に収まる。チェックインが増えると個人差の不確かさが減る', () => {
  const x = M.inputs(survey());
  const f = M.forecast(survey(2), x);
  for (const y of ['WB', 'BO']) { assert.ok(f[y].lo <= f[y].mean && f[y].mean <= f[y].hi); assert.ok(f[y].lo >= 1 && f[y].hi <= 5); assert.equal(f[y].dots.length, 20); }
  const sd = (n) => M.forecast(survey(n), x).BO.sd;
  assert.ok(sd(1) > sd(3) && sd(3) > sd(6));
});
test('model: 実際の回答が予測より重いほど、個人差の補正が上に動く', () => {
  const x = M.inputs(survey(2));
  const lo = M.forecast(survey(3, { b_sleep: 1, b_money: 1, b_duty: 1, b_envy: 1 }), x).BO.mean;
  const hi = M.forecast(survey(3, { b_sleep: 5, b_money: 5, b_duty: 5, b_envy: 5 }), x).BO.mean;
  assert.ok(hi > lo + 0.3);
});
test('model: 頻度の差は向きを入れ替えると符号が逆で、ずれの大きさ(se)は同じ', () => {
  const x = M.inputs(survey()), x2 = { ...x, cur_sns: x.cur_sns - 1 };
  const a = M.diff(x, x2, 'BO'), b = M.diff(x2, x, 'BO');
  assert.ok(Math.abs(a.delta + b.delta) < 1e-12);
  assert.ok(Math.abs(a.se - b.se) < 1e-12 && a.se > 0);
});
// 理想から大きく離れた人（最適度 0%）の回答
const FAR = { cur_media: 1, cur_live: 1, cur_goods: 5, cur_sns: 5, ideal_media: 5, ideal_live: 5, ideal_goods: 1, ideal_sns: 1 };
test('optimality: ずれの合計から最適度を計算し、80以上でだけ「最適」とする', () => {
  const o = P.optimality(ANS);                      // ずれ: 音楽0・ライブ1・グッズ0・SNS2 → 合計3
  assert.equal(o.total, 3); assert.equal(o.max, 16);
  assert.equal(o.score, Math.round(100 * (1 - 3 / 16)));   // 81
  assert.equal(o.optimal, true);
  assert.equal(P.optimality({ ...ANS, ...FAR }).score, 0);
  assert.equal(P.optimality({ ...ANS, ...FAR }).optimal, false);
  assert.equal(P.optimality({ ...ANS, cur_sns: 3 }).score, 94);          // 合計1 → 93.75
  const edge = P.optimality({ ...ANS, cur_sns: 5, cur_live: 2 });         // 合計4 → 75（80未満）
  assert.equal(edge.score, 75); assert.equal(edge.optimal, false);
  assert.equal(P.optimality({ ...ANS, ideal_sns: undefined }), null);
});
test('proposals: すでに最適に近い人には、微修正（1つだけの変更）を出す。理想に近づく案が先', () => {
  const sv = survey();
  const r = P.generate(sv);
  assert.equal(r.micro, true); assert.equal(r.optimality.score, 81);
  assert.ok(r.options.length >= 1 && r.options.length <= 3);
  const wishes = P.wishes(P.latestAnswers(sv));           // ライブは理想のほうが多い、SNSは理想のほうが少ない
  assert.equal(wishes.live, 'more'); assert.equal(wishes.sns, 'less');
  for (const o of r.options) {
    assert.equal(o.changes.length, 1, '微修正は1つだけ');
    const c = o.changes[0];
    if (wishes[c.key] === 'more') assert.ok(c.dir > 0); if (wishes[c.key] === 'less') assert.ok(c.dir < 0);
    assert.ok(o.reason === 'ideal' || o.dBO < 0);
  }
  assert.equal(r.options[0].reason, 'ideal');
});
test('proposals: 理想から離れた人には、最大2つの組み替え。理想より少なくならない・多くならない／負担が下がる案だけ／3案までで重複なし', () => {
  const sv = survey(2, FAR); sv.baseline.answers = { ...sv.baseline.answers, ...FAR };
  const r = P.generate(sv);
  assert.equal(r.micro, false);
  assert.ok(r.options.length >= 1 && r.options.length <= 3);
  const wishes = P.wishes(P.latestAnswers(sv));
  const sigs = new Set();
  for (const o of r.options) {
    assert.ok(o.dBO < 0, o.label);
    for (const c of o.changes) { if (wishes[c.key] === 'more') assert.ok(c.dir > 0); if (wishes[c.key] === 'less') assert.ok(c.dir < 0); }
    assert.ok(o.changes.length <= 2);
    const sig = o.changes.map((c) => c.key + c.dir).sort().join(); assert.ok(!sigs.has(sig)); sigs.add(sig);
  }
});
test('proposals: 「いまの頻度」は最新のチェックインを使う（初回の回答ではない）', () => {
  const sv = survey(2, { cur_sns: 3 });             // 週ごとの回答で SNS が理想（3）に一致
  assert.equal(P.optimality(P.latestAnswers(sv)).total, 1);
});

// ---------------------------------------------------------------- 性格・WHO-5
test('tipi / who5 の得点', () => {
  assert.deepEqual(TP.score([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), { extraversion: 5, agreeableness: 5, conscientiousness: 5, neuroticism: 1, openness: 5 });
  assert.equal(TP.fromAnswers({}), null);
  assert.equal(W.raw([5, 5, 5, 5, 5]), 25); assert.equal(W.raw([0, 0, 0, 0, 0]), 0);
});

// ---------------------------------------------------------------- いまの状態
test('state: 各軸と指標が、画面に出す計算式どおりに手計算と一致する', () => {
  const s = { survey: survey(2), who5: [{ date: '2026-11-15', raw: 11, answers: [2, 2, 2, 3, 2] }] };
  const r = SD.compute(s, '2026-11-16');
  const ax = Object.fromEntries([...r.bo.axes, ...r.wb.axes].map((a) => [a.key, a.value]));
  assert.deepEqual(ax, { b_sleep: 75, b_money: 50, b_duty: 75, b_envy: 75, w_ikigai: 75, w_confidence: 50, w_schedule: 25, w_create: 25 });
  assert.equal(r.bo.value, Math.round((75 + 50 + 75 + 75) / 4));      // 68.75 → 69
  assert.equal(r.wb.value, 44);                                        // (4+3+2+2)/4=2.75 → 43.75
  assert.equal(r.money.value, 40);                                     // 2 ÷ (12.5 − 7.5) × 100
  assert.equal(r.who5.value, 44);                                      // 11 × 4
  for (const a of [...r.bo.axes, ...r.wb.axes]) assert.ok(a.percentile >= 0 && a.percentile <= 100);
});
test('state: 最適度のブロックに、式・入力値・しきい値が入る', () => {
  const r = SD.compute({ survey: survey(0), who5: [] }, '2026-11-02');
  assert.equal(r.opt.value, 81); assert.equal(r.opt.optimal, true);
  assert.ok(r.opt.inputs.some((t) => t.includes('ライブ・イベント参加：理想 4、いま 3 → ずれ 1')));
  assert.ok(r.opt.inputs.some((t) => t.includes('100 × (1 − 3 ÷ 16) ＝ 81')));
  assert.ok(r.opt.formula && r.opt.note.includes('しきい値'));
});
test('state: 順位(%)は予備調査の分布から、独立に数え直した値と一致する', () => {
  const r = SD.compute({ survey: survey(0), who5: [] }, '2026-11-02');
  const sorted = M.NORMS.indices.BO.sorted;
  const expect = Math.round(sorted.filter((v) => v <= 3.75 + 1e-9).length / sorted.length * 100);
  assert.equal(r.bo.percentile, expect);
  assert.ok(r.bo.inputs.some((t) => t.includes('3.8') || t.includes('3.75')));
  for (const b of [r.bo, r.wb, r.money]) assert.ok(b.formula && b.note && b.inputs.length);
});
test('state: 回答が足りない指標は null。最初の会話の前は ready=false', () => {
  const sv = survey(0); delete sv.baseline.answers.b_sleep;
  assert.equal(SD.compute({ survey: sv, who5: [] }, '2026-11-02').bo.value, null);
  assert.equal(SD.compute({ survey: { baseline: null, weekly: [] }, who5: [] }, '2026-11-02').ready, false);
  const sv2 = survey(0); sv2.baseline.answers.income = '回答しない';
  assert.equal(SD.compute({ survey: sv2, who5: [] }, '2026-11-02').money.value, null);
});

// ---------------------------------------------------------------- 保存・日程
test('store: チェックインの時期・提案の週・WHO-5の時期・群の切り替え', () => {
  const s = { startDate: '2026-11-02', survey: { baseline: null, weekly: [] }, who5: [], devOffsetDays: 0, group: 'C' };
  s.devOffsetDays = U.daysBetween(new Date().toISOString().slice(0, 10), '2026-11-02');
  const at = (d) => { s.devOffsetDays = U.daysBetween(U.ymd(new Date()), U.addDays('2026-11-02', d)); };
  at(0);
  assert.equal(ST.dueCheckin(s), 'baseline');
  s.survey.baseline = { answers: {} };
  assert.equal(ST.dueCheckin(s), null);
  at(7); assert.equal(ST.dueCheckin(s), 'weekly');
  s.survey.weekly.push({}); assert.equal(ST.dueCheckin(s), null);
  assert.equal(ST.planWeek(s), null);
  s.survey.weekly.push({}); assert.equal(ST.planWeek(s), 0);
  s.survey.weekly.push({}, {}, {}); assert.equal(ST.planWeek(s), 3);
  s.survey.weekly.push({}); assert.equal(ST.planWeek(s), null, '提案は4回分まで');
  at(13); assert.equal(ST.effectiveGroup(s), 'A');
  at(14); assert.equal(ST.effectiveGroup(s), 'C');
  at(0); assert.equal(ST.whoDue(s), 0);
  s.who5.push({ due: 0 }); assert.equal(ST.whoDue(s), undefined);
  at(15); assert.equal(ST.whoDue(s), 14);
});
test('store: 書き出しに自由な文章（本文）は含まれない。見送り・実行の理由コードは含まれる', () => {
  const s = { id: 'PTEST', group: 'B', startDate: '2026-11-02', aiReading: true, avatarSource: 'parts', survey: survey(2), who5: [], distress: [],
    proposals: [{ week: 0, createdDate: '2026-11-16', chosen: null, skipped: true, skipReason: 'busy', exec: null, options: [{ id: 'keep', texts: ['SNSの頻度を、1段階へらす'], dWB: -0.01, dBO: -0.1, label: 'x', changes: [] }] }] };
  const j = JSON.parse(ST.exportData(s));
  assert.equal(j.proposals[0].skipReason, 'busy');
  assert.ok(j.baseline.answers.b_sleep === 4 && j.weekly.length === 2);
  assert.ok(!JSON.stringify(j).includes('text":"'));
});

// ---------------------------------------------------------------- 図
test('radar: 値のない軸があると多角形を描かず、ラベルに値が入る', () => {
  const full = RD.svg([{ label: 'A', value: 50 }, { label: 'B', value: 80 }, { label: 'C', value: 20 }]);
  assert.ok(full.includes('<polygon') && full.includes('>80<'));
  const part = RD.svg([{ label: 'A', value: 50 }, { label: 'B', value: null }, { label: 'C', value: 20 }]);
  assert.ok(part.includes('—') && part.split('<polygon').length === 4);
});
