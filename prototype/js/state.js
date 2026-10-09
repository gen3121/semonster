// 「いまの状態」の計算。ストレス（推し疲れ）5軸と幸福度（WHO-5）を 0〜100 で出し、
// 数字ごとに「計算式・使った入力値・限界」を文章で返す（画面の「この数字の根拠」ボタンで表示）。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const api = {};
  const WINDOW = 14; // 直近14日
  const r1 = (x) => Math.round(x * 10) / 10;
  const r0 = Math.round;

  api.band = (v) => (v == null ? null : v < 34 ? 'ゆとりあり' : v < 67 ? 'ふつう' : '重め');
  api.BAND_NOTE = '「ゆとりあり／ふつう／重め」の区切りは 0〜100 を三等分した試作の仮の目安で、基準値（一般の平均）との比較ではありません。';
  api.MONTH_BUDGETS = [[5000, '〜5千円'], [10000, '〜1万円'], [30000, '〜3万円'], [50000, '〜5万円'], [100000, '〜10万円'], [150000, '10万円以上']];
  api.HOURS = [[1, '1時間'], [2, '2時間'], [3, '3時間'], [4, '4時間'], [6, '6時間'], [8, '8時間以上']];

  api.compute = function (s, today) {
    const from = U.addDays(today, -(WINDOW - 1));
    const L = s.logs.filter((l) => l.date >= from && l.date <= today);
    const lim = s.limits || {};
    const days = L.length;
    const vals = (k) => L.map((l) => l[k]).filter((x) => x != null);
    const out = { window: WINDOW, days, ready: days >= 3, from, today };

    const axes = [];
    // 1 睡眠
    const sl = vals('sleepImpact');
    axes.push({
      key: 'sleep', label: '睡眠', value: sl.length ? r0(U.mean(sl) / 2 * 100) : null,
      formula: '睡眠への影響の平均（なし0・少し1・かなり2）÷ 2 × 100',
      inputs: sl.length ? [`睡眠への影響を答えた日：${sl.length}日（直近${WINDOW}日のうち）`, `なし ${sl.filter((x) => x === 0).length}日・少し ${sl.filter((x) => x === 1).length}日・かなり ${sl.filter((x) => x === 2).length}日`, `平均 ${r1(U.mean(sl))}（÷2×100 ＝ ${r0(U.mean(sl) / 2 * 100)}）`] : ['この期間に答えがありません'],
      note: '毎日の記録の「睡眠への影響」だけから計算しています。睡眠時間そのものは測っていません。',
    });
    // 2 出費
    const gy = vals('goodsYen');
    const budgetWeek = lim.budgetYenMonth ? lim.budgetYenMonth * 7 / 30 : null;
    const spendWeek = gy.length ? gy.reduce((a, b) => a + b, 0) / gy.length * 7 : null;
    axes.push({
      key: 'money', label: '出費', value: budgetWeek && spendWeek != null ? r0(U.clamp(spendWeek / budgetWeek * 100, 0, 100)) : null,
      formula: '1週間あたりの推し活の支出 ÷ 使ってよい額（月の目安 × 7/30） × 100（100を上限）',
      inputs: budgetWeek && spendWeek != null ? [`支出を答えた日：${gy.length}日、合計 ${gy.reduce((a, b) => a + b, 0).toLocaleString()}円`, `1週間あたりに直すと ${Math.round(spendWeek).toLocaleString()}円（合計 ÷ ${gy.length}日 × 7）`, `使ってよい額：月 ${lim.budgetYenMonth.toLocaleString()}円 → 1週間で ${Math.round(budgetWeek).toLocaleString()}円`, `${Math.round(spendWeek).toLocaleString()} ÷ ${Math.round(budgetWeek).toLocaleString()} × 100 ＝ ${r0(spendWeek / budgetWeek * 100)}（100を超えたら100）`] : ['使ってよい額（月）を入力すると計算されます'],
      note: '「使ってよい額」はご自身の申告です。お金の余裕そのもの（収入や貯金）は測っていません。',
    });
    // 3 時間
    const tm = L.filter((l) => l.streamMin != null && l.snsMin != null).map((l) => l.streamMin + l.snsMin);
    const hrs = lim.hoursPerDay;
    axes.push({
      key: 'time', label: '時間', value: hrs && tm.length ? r0(U.clamp(U.mean(tm) / 60 / hrs * 100, 0, 100)) : null,
      formula: '1日あたりの配信・動画とSNSの時間 ÷ 推し活に使える時間（1日の目安） × 100（100を上限）',
      inputs: hrs && tm.length ? [`配信・動画とSNSの両方を答えた日：${tm.length}日`, `1日あたり平均 ${r1(U.mean(tm) / 60)}時間（配信・動画 ＋ SNS）`, `使える時間：1日 ${hrs}時間`, `${r1(U.mean(tm) / 60)} ÷ ${hrs} × 100 ＝ ${r0(U.mean(tm) / 60 / hrs * 100)}（100を超えたら100）`] : ['使える時間（1日）を入力すると計算されます'],
      note: 'ライブ・現場に行った時間は含みません（記録では回数だけを聞いているため）。',
    });
    // 4 疲れの自己評価
    const fa = vals('fatigue');
    axes.push({
      key: 'fatigue', label: '疲れ', value: fa.length ? r0((U.mean(fa) - 1) / 4 * 100) : null,
      formula: '疲れ（1〜5）の平均 → (平均 − 1) ÷ 4 × 100',
      inputs: fa.length ? [`疲れを答えた日：${fa.length}日`, `平均 ${r1(U.mean(fa))}（1〜5）`, `(${r1(U.mean(fa))} − 1) ÷ 4 × 100 ＝ ${r0((U.mean(fa) - 1) / 4 * 100)}`] : ['この期間に答えがありません'],
      note: 'ご自身がつけた 1〜5 の点数をそのまま換算した値です。',
    });
    // 5 気持ちの負担（義務感・比較）
    const withRating = L.filter((l) => l.fatigue != null);
    const feel = withRating.filter((l) => l.mainFatigue === 'duty' || l.mainFatigue === 'compare').length;
    axes.push({
      key: 'feeling', label: '気持ち', value: withRating.length ? r0(feel / withRating.length * 100) : null,
      formula: '「いちばんの疲れ」が義務感または比較だった日 ÷ 疲れを答えた日 × 100',
      inputs: withRating.length ? [`疲れを答えた日：${withRating.length}日`, `いちばんの疲れが義務感だった日：${withRating.filter((l) => l.mainFatigue === 'duty').length}日、比較だった日：${withRating.filter((l) => l.mainFatigue === 'compare').length}日`, `${feel} ÷ ${withRating.length} × 100 ＝ ${r0(feel / withRating.length * 100)}`] : ['この期間に答えがありません'],
      note: '1日の記録では「いちばんの疲れ」を1つだけ聞くため、義務感・比較は「その日いちばんだった割合」で表しています。実際より小さく出ることがあります。',
    });
    out.axes = axes;

    const have = axes.filter((a) => a.value != null);
    out.stress = {
      value: have.length >= 4 ? r0(U.mean(have.map((a) => a.value))) : null,
      formula: '5つの軸（睡眠・出費・時間・疲れ・気持ち）の平均。重みは等しい（試作の仮）',
      inputs: have.map((a) => `${a.label} ${a.value}`).concat(have.length >= 4 ? [`合計 ${have.reduce((x, a) => x + a.value, 0)} ÷ ${have.length} ＝ ${r0(U.mean(have.map((a) => a.value)))}`] : ['5つのうち4つ以上がそろうと表示します']),
      note: '総合値は、予備調査の結果から重みを決めたものではなく、等しい重みの平均です。診断や評価ではありません。',
    };

    // 楽しさ
    const jo = vals('joy');
    out.joy = {
      value: jo.length ? r0((U.mean(jo) - 1) / 4 * 100) : null,
      formula: '楽しさ（1〜5）の平均 → (平均 − 1) ÷ 4 × 100',
      inputs: jo.length ? [`楽しさを答えた日：${jo.length}日`, `平均 ${r1(U.mean(jo))}（1〜5）`, `(${r1(U.mean(jo))} − 1) ÷ 4 × 100 ＝ ${r0((U.mean(jo) - 1) / 4 * 100)}`] : ['この期間に答えがありません'],
      note: 'その日の推し活の楽しさです。生活全体の幸福度ではありません。',
    };

    // WHO-5（幸福度）
    const w = s.who5.length ? s.who5.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0] : null;
    out.who5 = w ? {
      value: w.raw * 4, raw: w.raw, date: w.date, answers: w.answers,
      formula: 'WHO-5 の素点（5項目 × 0〜5点 ＝ 0〜25）× 4 ＝ 0〜100',
      inputs: [`回答日：${w.date}`, `5項目の点数：${w.answers.join(' ＋ ')} ＝ ${w.raw}（素点）`, `${w.raw} × 4 ＝ ${w.raw * 4}`, w.raw < 13 ? '素点13未満（100点換算で52未満）は、気分の落ち込みなどを確かめる目安とされる水準です。' : '素点13以上（100点換算で52以上）です。'],
      note: 'WHO-5 は世界保健機関の「精神的健康状態表」で、直近2週間の気分を聞きます（Topp et al., 2015）。診断ではなく、気分の目安です。2週ごとに更新されます。',
    } : null;
    return out;
  };

  api.SECTION_HELP = {
    stress: '推し活によるストレス（推し疲れ）は、睡眠・出費・時間・疲れ・気持ち（義務感や比較）の5つの軸で見ます。各軸は0〜100で、大きいほど負担が重いことを表します。直近14日の、あなたが会話で答えた内容だけから計算しています。',
    wellbeing: '幸福度は、2週ごとに答える WHO-5（5つの質問）の得点です。0〜100で、大きいほど気分がよい状態を表します。毎日の「楽しさ」は別に表示します。',
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.state = api;
})();
