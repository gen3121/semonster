// 会話の一言から、記録の項目を取り出す（ルールベース。LLM は使わない）。
// 取り出せなかった項目は null のまま返し、アプリが1問ずつ聞き返す。
// 楽しさ・疲れは口調から推定せず、必ず本人が 1〜5 で答えた値だけを使う。
(function () {
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

  const STREAM_KW = /(配信|動画|アーカイブ|youtube|ユーチューブ|切り抜き|視聴|生放送|ニコ生)/i;
  const SNS_KW = /(sns|ツイッター|twitter|インスタ|タイムライン|エゴサ|ファンアカ|(?<![a-z])x(?![a-z])|(?<![ァ-ヶ])tl(?![a-z]))/i;
  const SPEND_VERB = /(買|使|課金|ポチ|購入|スパチャ|投げ銭|グッズ|払|ガチャ|予約|チケット)/;
  const NEG_SPEND = /((買|使|課金|ポチ)って?(い)?(ない|なかった)|買わなかった|使わなかった|(グッズ|出費|お金|課金)は?(なし|ゼロ|0|ない))/;

  // 継続時間（分）を、直前のキーワードで配信 / SNS に振り分ける
  function extractMinutes(t) {
    const out = { stream: null, sns: null, mentionedStream: STREAM_KW.test(t), mentionedSns: SNS_KW.test(t) };
    const re = /(\d+(?:\.\d+)?)\s*(時間半|時間|分)/g;
    let m;
    while ((m = re.exec(t))) {
      let minutes = parseFloat(m[1]) * (m[2] === '分' ? 1 : 60);
      if (m[2] === '時間半') minutes += 30;
      const left = Math.max(t.lastIndexOf('。', m.index), t.lastIndexOf('、', m.index), t.lastIndexOf('！', m.index), t.lastIndexOf(',', m.index), t.lastIndexOf('\n', m.index)) + 1;
      let right = t.length;
      for (const d of ['。', '、', '！', ',', '\n']) { const i = t.indexOf(d, m.index); if (i >= 0) right = Math.min(right, i); }
      const clause = t.slice(left, right);
      const at = m.index - left;
      const kws = [];
      for (const [cat, rx] of [['stream', STREAM_KW], ['sns', SNS_KW]]) {
        const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g');
        let k;
        while ((k = g.exec(clause))) kws.push({ cat, pos: k.index });
      }
      if (!kws.length) continue;
      kws.sort((a, b) => a.pos - b.pos);
      const before = kws.filter((k) => k.pos < at);
      const chosen = before.length ? before[before.length - 1] : kws[0];
      out[chosen.cat] = (out[chosen.cat] || 0) + minutes;
    }
    return out;
  }

  function extractGoods(t) {
    let total = null;
    const re = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(万円|万|千円|千|円)/g;
    let m;
    while ((m = re.exec(t))) {
      const left = Math.max(t.lastIndexOf('。', m.index), t.lastIndexOf('！', m.index), t.lastIndexOf('\n', m.index)) + 1;
      const clause = t.slice(left, m.index + m[0].length + 6);
      if (!SPEND_VERB.test(clause)) continue;
      const n = parseFloat(m[1].replace(/,/g, ''));
      const yen = /万/.test(m[2]) ? n * 10000 : /千/.test(m[2]) ? n * 1000 : n;
      total = (total || 0) + yen;
    }
    if (total == null && NEG_SPEND.test(t)) total = 0;
    return total;
  }

  function extractLive(t) {
    const ctx = t.replace(/ライブ配信|ライブ映像|ライブビューイング|ライブ動画/g, '');
    const place = /(ライブ|現場|イベント|遠征|握手会|オフ会|コンサート|ライブハウス|ファンミ|リリイベ|撮影会)/;
    if (!place.test(ctx)) return null;
    if (/(行って(い)?ない|行かなかった|参加(して)?(い)?(ない|なかった)|(ライブ|現場|イベント|遠征)は?(なし|ない|なかった|なし))/.test(ctx)) return 0;
    if (/(行った|行ってきた|参加|入った|現地|遠征した|行く|行きました|行ってた)/.test(ctx)) return 1;
    return null;
  }

  function extractSleep(t) {
    if (/(徹夜|朝まで|ほとんど寝て(い)?ない|一睡も|全然寝て)/.test(t)) return 2;
    if (/(ちゃんと寝|早く寝|早めに寝|よく寝|睡眠は(とれ|大丈夫|足り)|十分(に)?寝|寝不足(で)?は(ない|なし))/.test(t)) return 0;
    if (/(寝るの(が)?遅|夜更かし|寝不足|遅くまで|睡眠.{0,4}(減|削|短)|寝れ(な|ず)|眠れ(な|ず)|寝落ち|寝るのが遅)/.test(t)) return 1;
    const clock = /(\d{1,2})\s*時(まで|過ぎ|すぎ|ごろまで|頃まで)/.exec(t);
    if (clock) { const h = parseInt(clock[1], 10); if ((h >= 1 && h <= 5) || h >= 25) return 1; }
    return null;
  }

  function extractRatings(t) {
    const j = /楽し[さい]?(?:度)?\D{0,3}([1-5])/.exec(t);
    const f = /(?:疲れ|疲労)(?:度)?\D{0,3}([1-5])/.exec(t);
    return { joy: j ? +j[1] : null, fatigue: f ? +f[1] : null };
  }

  function facetCandidates(t, rec) {
    const c = [];
    if (rec.sleepImpact > 0) c.push('sleep');
    if ((rec.goodsYen || 0) >= 5000 || /(出費|金欠|お金が)/.test(t)) c.push('money');
    if (/(しなきゃ|しなければ|ねば|義務|追わなきゃ|買わなきゃ|行かなきゃ|見なきゃ|プレッシャー)/.test(t)) c.push('duty');
    if (/(比べ|比較|嫉妬|羨ま|うらやま|他のファン|他の人|自己嫌悪)/.test(t)) c.push('compare');
    return c;
  }

  // 自由文 → 記録の下書き
  api.extractLog = function (text) {
    const t = normalize(text);
    const mins = extractMinutes(t);
    const rec = {
      live: extractLive(t),
      goodsYen: extractGoods(t),
      streamMin: mins.stream,
      snsMin: mins.sns,
      sleepImpact: extractSleep(t),
      joy: null,
      fatigue: null,
      mainFatigue: null,
    };
    // 「配信なし」「SNSは見てない」
    if (rec.streamMin == null && mins.mentionedStream && /(配信|動画)[^。、]{0,6}(見て(い)?ない|なし|ゼロ|見なかった)/.test(t)) rec.streamMin = 0;
    if (rec.snsMin == null && mins.mentionedSns && /(sns|x|ツイッター|twitter)[^。、]{0,6}(見て(い)?ない|なし|ゼロ|見なかった|やって(い)?ない)/i.test(t)) rec.snsMin = 0;
    const r = extractRatings(t);
    rec.joy = r.joy; rec.fatigue = r.fatigue;
    rec._facets = facetCandidates(t, rec);
    rec._flags = { mentionedStream: mins.mentionedStream, mentionedSns: mins.mentionedSns };
    return rec;
  };

  // 聞き返しへの返事 → 値
  const NO = /^(いいえ|ううん|ない|なし|なかった|ゼロ|0|行ってない|行かなかった|買ってない|なし。?)$/;
  api.parseAnswer = function (field, text) {
    const t = normalize(text);
    if (/^(わからない|分からない|不明|覚えてない|スキップ|パス)$/.test(t)) return { unknown: true };
    switch (field) {
      case 'live': {
        const v = extractLive('ライブ ' + t);
        if (v != null) return { value: v };
        if (NO.test(t) || /(行ってない|行かなかった|なし|ない|いいえ)/.test(t)) return { value: 0 };
        if (/(行った|はい|参加|あり|行きました|行ってきた)/.test(t)) return { value: 1 };
        return null;
      }
      case 'goods': {
        const g = extractGoods('グッズ ' + t.replace(/^(グッズ)?/, ''));
        if (g != null) return { value: g };
        const n = /^(\d+(?:,\d{3})*)$/.exec(t);
        if (n) return { value: parseInt(n[1].replace(/,/g, ''), 10) };
        if (NO.test(t) || /(買ってない|使ってない|なし|ゼロ|ない)/.test(t)) return { value: 0 };
        return null;
      }
      case 'time': {
        // 「配信2時間、SNS1時間」「2時間と1時間」「配信なし SNS30分」
        const m = extractMinutes(t);
        let stream = m.stream, sns = m.sns;
        if (stream == null && sns == null) {
          const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(時間半|時間|分)/g)].map((x) => parseFloat(x[1]) * (x[2] === '分' ? 1 : 60) + (x[2] === '時間半' ? 30 : 0));
          if (nums.length >= 2) { stream = nums[0]; sns = nums[1]; }
          else if (nums.length === 1 && /(配信|動画)/.test(t)) stream = nums[0];
          else if (nums.length === 1 && SNS_KW.test(t)) sns = nums[0];
          else if (nums.length === 1) stream = nums[0];
        }
        if (stream == null && /(配信|動画)[^。、]{0,5}(なし|ない|見てない|ゼロ)/.test(t)) stream = 0;
        if (sns == null && /(sns|x|ツイッター)[^。、]{0,5}(なし|ない|見てない|ゼロ)/i.test(t)) sns = 0;
        if (/^(どっちも|両方)?(なし|ない|見てない|ゼロ)$/.test(t)) { stream = 0; sns = 0; }
        if (stream == null && sns == null) return null;
        return { value: { stream, sns } };
      }
      case 'sleep': {
        if (/(かなり|ひどい|大きい|徹夜|ほとんど寝)/.test(t)) return { value: 2 };
        if (/(少し|ちょっと|やや|軽く|すこし)/.test(t)) return { value: 1 };
        if (/(なし|ない|大丈夫|ちゃんと寝|寝れた|影響なし)/.test(t)) return { value: 0 };
        const s = extractSleep(t);
        return s != null ? { value: s } : null;
      }
      case 'rating': {
        const m = /([1-5])\D+([1-5])/.exec(t);
        if (m) return { value: { joy: +m[1], fatigue: +m[2] } };
        const r = extractRatings(t);
        if (r.joy != null && r.fatigue != null) return { value: r };
        return null;
      }
      case 'facet': {
        if (/(睡眠|寝)/.test(t)) return { value: 'sleep' };
        if (/(出費|お金|金)/.test(t)) return { value: 'money' };
        if (/(義務|しなきゃ|プレッシャー)/.test(t)) return { value: 'duty' };
        if (/(比較|比べ|嫉妬)/.test(t)) return { value: 'compare' };
        return null;
      }
      default: return null;
    }
  };

  // まだ聞いていない項目（聞く順）
  api.missingFields = function (rec) {
    const q = [];
    if (rec.sleepImpact == null) q.push('sleep');
    if (rec.streamMin == null || rec.snsMin == null) q.push('time');
    if (rec.goodsYen == null) q.push('goods');
    if (rec.live == null) q.push('live');
    return q;
  };

  if (typeof module !== 'undefined') module.exports = api;
  else (window.OF = window.OF || {}).extract = api;
})();
