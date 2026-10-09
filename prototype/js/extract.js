// 自由な一言 → 質問紙の回答（ルールベース。LLM が使えないとき、または LLM を使わない設定のときの読み取り）。
// ひとつの項目に対する返事だけを読む。あいまいなときは null を返し、画面が選択肢のボタンで聞き直す（推測で埋めない）。
// 尺度の向きは instrument.js と同じ：5＝とても当てはまる／とてもよくする、1＝全く当てはまらない／ほとんどしない。
(function () {
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const api = {};

  const KANJI = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  function normalize(text) {
    let t = String(text || '').normalize('NFKC');
    t = t.replace(/[〇一二三四五六七八九]?十[〇一二三四五六七八九]?/g, (m) => {
      const [a, b] = m.split('十');
      return String((a ? KANJI[a] : 1) * 10 + (b ? KANJI[b] : 0));
    });
    t = t.replace(/[〇一二三四五六七八九]/g, (c) => String(KANJI[c]));
    return t.replace(/\s+/g, ' ').trim();
  }
  api.normalize = normalize;

  const UNKNOWN = /^(わからない|分からない|不明|覚えてない|スキップ|パス|答えたくない|言いたくない|回答しない)[。.!！]?$/;
  const NEG = /(ない|違う|違います|思わない|しなかった|しません)/;

  function labelHit(kind, t) {
    const scale = kind === 'freq' ? I.FREQ : I.AGREE;
    const hit = scale.filter(([, l]) => t.includes(l)).sort((a, b) => b[1].length - a[1].length)[0];
    return hit ? hit[0] : null;
  }

  // kind: 'agree'（当てはまる度合い）| 'freq'（頻度）。戻り値 { value } | { unknown: true } | null
  api.parseLikert = function (kind, text) {
    const t = normalize(text);
    if (!t) return null;
    if (UNKNOWN.test(t)) return { unknown: true };
    const d = /^([1-5])(?:\s*(?:です|番|点|くらい|かな|だと思う))?[。.!！]?$/.exec(t);
    if (d) return { value: +d[1] };
    const lab = labelHit(kind, t);
    if (lab != null) return { value: lab };
    if (kind === 'freq') {
      if (/(ほとんど|全く|まったく|全然|ぜんぜん)(しない|ない|やらない|見ない|しなかった|行かない|買わない)/.test(t)) return { value: 1 };
      if (/(あまり|そんなに|それほど)/.test(t)) return { value: 2 };
      if (/(とても|めっちゃ|めちゃ|毎日|ほぼ毎日|常に|しょっちゅう)/.test(t) && !NEG.test(t)) return { value: 5 };
      if (/(たまに|時々|ときどき|月に|年に|まれに)/.test(t)) return { value: 3 };
      if (/(よく|週に|頻繁|けっこう)/.test(t) && !NEG.test(t)) return { value: 4 };
      return null;
    }
    // agree
    if (/(全く|まったく|全然|ぜんぜん|少しも)/.test(t) && NEG.test(t)) return { value: 1 };
    if (/(あまり|それほど|さほど|そんなに)/.test(t)) return { value: 2 };
    if (/(どちらでもない|どちらとも|ふつう|普通|半々|なんとも)/.test(t)) return { value: 3 };
    if (/(少し|ちょっと|やや|すこし)/.test(t) && NEG.test(t)) return { value: 2 };
    if (NEG.test(t)) return null;                                  // 「ない」だけでは 1 か 2 か決められない
    if (/(とても|すごく|非常に|めちゃ|めっちゃ|強く|かなり|まさに|完全に|ほんとに|本当に)/.test(t)) return { value: 5 };
    if (/(やや|ちょっと|少し|すこし|まあ|わりと|そこそこ|どちらかと言えば|当てはまる|そう思う|はい)/.test(t)) return { value: 4 };
    return null;
  };

  // 金額（万円）・時間（時間）に直す
  function toUnit(t, unit) {
    const m = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(万円|万|千円|千|円|時間半|時間|分)/.exec(t);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ''));
    const u = m[2];
    if (unit === 'man') return /万/.test(u) ? n : /千/.test(u) ? n / 10 : u === '円' ? n / 10000 : null;
    if (unit === 'hour') return u === '時間半' ? n + 0.5 : u === '時間' ? n : u === '分' ? n / 60 : null;
    return null;
  }

  // 選択式の項目（お金・時間）。戻り値 { value: 選択肢のラベル } | { unknown: true } | null
  api.parseChoice = function (item, text) {
    const t = normalize(text);
    if (!t) return null;
    const opts = item.options;
    const decline = opts.find((o) => o[1] == null);
    if (UNKNOWN.test(t) || /(答えたくない|言いたくない|回答しない)/.test(t)) return decline ? { value: decline[0] } : { unknown: true };
    // ラベルそのもの、または4文字以上のラベルを含むとき（「0円」が「3000円」に当たらないように）
    const exact = opts.filter((o) => o[1] != null && (t === normalize(o[0]) || (o[0].length >= 4 && t.includes(normalize(o[0]))))).sort((a, b) => b[0].length - a[0].length)[0];
    if (exact) return { value: exact[0] };
    let x = toUnit(t, item.unit);
    if (x == null && /^(なし|ない|ゼロ|0|0円|負担なし|かからない)[。.]?$/.test(t)) x = 0;
    if (x == null) return null;
    const valued = opts.filter((o) => o[1] != null);
    const hit = valued.find((o) => o[2] == null || x < o[2]);
    return hit ? { value: hit[0] } : null;
  };

  // 項目ID＋返事 → 読み取り（画面から使う入口）
  api.parseItem = function (id, text) {
    const it = I.ITEMS[id];
    return it.type === 'choice' ? api.parseChoice(it, text) : api.parseLikert(it.kind, text);
  };

  if (typeof module !== 'undefined') module.exports = api;
  else (window.OF = window.OF || {}).extract = api;
})();
