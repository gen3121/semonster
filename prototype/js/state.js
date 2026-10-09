// 「いまの状態」の計算。質問紙と同じ8項目（推し疲れ4・推し活の効果4）をそのまま 0〜100 にし、予備調査215名の中での位置を添える。
// 数字ごとに「計算式・あなたの回答・限界」を返す（画面の「この数字の根拠」ボタンで表示）。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const M = typeof module !== 'undefined' ? require('./model.js') : window.OF.model;
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const api = {};
  const r1 = (x) => Math.round(x * 10) / 10, r0 = Math.round;
  const N = () => M.NORMS;
  const VALUE_LABEL = Object.fromEntries(I.AGREE);

  api.N = () => N().n;
  api.BANDS = {
    BO: ['ゆとりあり', 'ふつう', '重め'],
    WB: ['低め', 'ふつう', '高め'],
  };
  const band = (y, v) => { const t = N().indices[y].tertiles; return api.BANDS[y][v <= t[0] ? 0 : v <= t[1] ? 1 : 2]; };
  const pctIdx = (y, v) => { const s = N().indices[y].sorted; return r0(s.filter((x) => x <= v + 1e-9).length / s.length * 100); };
  const pctItem = (id, v) => { const c = N().items[id].counts, n = c.reduce((a, b) => a + b, 0); return r0(c.slice(0, v).reduce((a, b) => a + b, 0) / n * 100); };

  const itemAxis = (id, ans, label) => {
    const v = ans[id];
    if (v == null) return { key: id, label, value: null, inputs: ['まだ答えていません'], formula: '', note: '' };
    const c = N().items[id].counts;
    return {
      key: id, label, value: r0(M.to100(v)), raw: v, percentile: pctItem(id, v),
      formula: '回答（1〜5）→ (回答 − 1) ÷ 4 × 100',
      inputs: [`質問：${I.ITEMS[id].text.replace(/^この1週間（これまで）、/, '')}`, `あなたの回答：${v}（${VALUE_LABEL[v]}）`, `(${v} − 1) ÷ 4 × 100 ＝ ${r0(M.to100(v))}`,
        `予備調査${N().n}名の回答の内訳（1〜5）：${c.join('・')}人。あなたと同じか低い回答の人は ${pctItem(id, v)}%`],
      note: '質問紙とまったく同じ項目の回答を、そのまま0〜100にしたものです。同じ項目を毎週聞くので、変化も追えます。',
    };
  };

  const indexBlock = (y, ids, title, axes, ans) => {
    const have = ids.every((id) => ans[id] != null);
    if (!have) return { value: null, title, axes, inputs: ['4項目がそろうと表示します'], formula: '', note: '' };
    const v = U.mean(ids.map((id) => ans[id])), norm = N().indices[y];
    return {
      title, axes, raw: v, value: r0(M.to100(v)), band: band(y, v), percentile: pctIdx(y, v),
      formula: `4項目の回答の平均（1〜5）→ (平均 − 1) ÷ 4 × 100`,
      inputs: [`4項目の回答：${ids.map((id) => `${I.SHORT[id]} ${ans[id]}`).join('、')}`, `平均 ＝ ${r1(v)}`, `(${r1(v)} − 1) ÷ 4 × 100 ＝ ${r0(M.to100(v))}`,
        `予備調査${norm.sorted.length}名のうち、あなたと同じか低い人は ${pctIdx(y, v)}%`,
        `区分は、${norm.sorted.length}名を3等分した境目（平均 ${norm.tertiles[0]} と ${norm.tertiles[1]}）で決めています：${api.BANDS[y][0]}（〜${norm.tertiles[0]}）／${api.BANDS[y][1]}／${api.BANDS[y][2]}（${norm.tertiles[1]}超）`],
      note: `予備調査の対象は、ほぼ全員が大学生（${norm.sorted.length}名中213名）です。「重め」は、この${norm.sorted.length}名の中で上位3分の1という意味で、診断ではありません。` +
        (y === 'WB' ? '幸福度の4項目は、まとまりが弱い（α＝0.57）ので、平均の解釈には注意が必要です。' : '4項目のまとまりは、中くらい（α＝0.70）です。'),
    };
  };

  // 使える範囲との比較（質問紙のお金の質問から）
  const money = (ans) => {
    const g = (id) => { const o = I.ITEMS[id].options.find((x) => x[0] === ans[id]); return o ? o[1] : null; };
    const inc = g('income'), exp = g('expense'), sp = g('spend');
    if (inc == null || exp == null || sp == null) return { value: null, inputs: ['手取り・必要経費・推し活費用の3つに答えると計算されます'], formula: '', note: '' };
    const disp = inc - exp;
    if (disp <= 0) return { value: null, inputs: ['手取りから必要経費を引いた額が0以下のため、計算できません'], formula: '', note: '' };
    const ratio = sp / disp;
    return {
      value: r0(ratio * 100), ratio, formula: '推し活費用 ÷ （手取り − 必要経費） × 100（各回答の範囲の中央値で換算）',
      inputs: [`手取り：${ans.income}（${inc}万円で換算）`, `必要経費：${ans.expense}（${exp}万円で換算）`, `推し活費用：${ans.spend}（${sp}万円で換算）`, `${sp} ÷ (${inc} − ${exp}) × 100 ＝ ${r0(ratio * 100)}%`],
      note: '範囲の中央値で換算した概算です。100%を超えると、自由に使える額より推し活費用のほうが多いことを意味します。貯金や仕送りの事情は含みません。',
    };
  };
  api.compute = function (s, today) {
    const sv = s.survey;
    if (!sv || !sv.baseline) return { ready: false };
    const last = sv.weekly.length ? sv.weekly[sv.weekly.length - 1] : sv.baseline;
    const ans = { ...sv.baseline.answers, ...last.answers };
    const out = { ready: true, date: last.date, n: N().n };
    out.bo = indexBlock('BO', I.BO_ITEMS, '推し疲れ（ストレス）', I.BO_ITEMS.map((id) => itemAxis(id, ans, I.SHORT[id])), ans);
    out.wb = indexBlock('WB', I.WB_ITEMS, '推し活の効果（幸福度）', I.WB_ITEMS.map((id) => itemAxis(id, ans, I.SHORT[id])), ans);
    out.money = money(ans);
    const w = s.who5.length ? s.who5.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0] : null;
    out.who5 = w ? {
      value: w.raw * 4, raw: w.raw, date: w.date, answers: w.answers, formula: 'WHO-5 の素点（5項目 × 0〜5点 ＝ 0〜25）× 4 ＝ 0〜100',
      inputs: [`回答日：${w.date}`, `5項目の点数：${w.answers.join(' ＋ ')} ＝ ${w.raw}（素点）`, `${w.raw} × 4 ＝ ${w.raw * 4}`, w.raw < 13 ? '素点13未満（100点換算で52未満）は、気分の落ち込みなどを確かめる目安とされる水準です。' : '素点13以上（100点換算で52以上）です。'],
      note: 'WHO-5 は世界保健機関の「精神的健康状態表」で、直近2週間の気分を聞きます（Topp et al., 2015）。診断ではなく、気分の目安です。2週ごとに更新されます。',
    } : null;
    return out;
  };

  api.HELP = {
    bo: '推し疲れは、質問紙と同じ4項目（睡眠・金銭の不安・義務感・嫉妬と落胆）で見ます。各軸は0〜100で、大きいほど負担が重いことを表します。',
    wb: '推し活の効果は、質問紙と同じ4項目（生きがい・自信・スケジュール管理・創作スキル）で見ます。各軸は0〜100で、大きいほど「当てはまる」ことを表します。',
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.state = api;
})();
