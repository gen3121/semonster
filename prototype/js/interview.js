// 会話インタビューの進行（画面に依存しない状態機械）。話題ごとに
//   open    … 自由な1文で答えてもらう（AI読み取りが使えるときだけ）
//   confirm … 読み取った値を見せ、本人がボタンで直す／OKする
//   items   … 残りの項目を1つずつ、選択肢のボタン（または短い文）で聞く
// ボタンで選んだ値はそのまま確定。文章から読み取った値は、必ず confirm を通ってから確定する。
// src: 'tap'（ボタン）| 'rules' | 'llm'（読み取りの方法）。直したものは 'llm+edit' のように記録する。
(function () {
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const T = typeof module !== 'undefined' ? require('./topics.js') : window.OF.topics;
  const R = typeof module !== 'undefined' ? require('./reader.js') : window.OF.reader;
  const api = {};

  const unanswered = (iv, topic) => T.itemsOf(topic).filter((id) => iv.answers[id] == null);
  function enter(iv) {
    const topic = iv.seq[iv.ti];
    const t = T.TOPICS[topic];
    iv.phase = iv.llm && t.openFree && unanswered(iv, topic).length > 1 ? 'open' : 'items';
    iv.draft = null;
  }
  function settle(iv) {
    while (iv.ti < iv.seq.length && !unanswered(iv, iv.seq[iv.ti]).length) { iv.ti++; if (iv.ti < iv.seq.length) enter(iv); }
    return iv;
  }

  // kind: 'baseline' | 'weekly'。answers/src を渡すと、途中から再開する。
  api.create = function (kind, { llm = false, answers = {}, src = {}, only = null } = {}) {
    const iv = { kind, llm: !!llm, seq: (only || T.SEQ[kind]).slice(), ti: 0, answers: { ...answers }, src: { ...src }, phase: 'items', draft: null, note: null, via: null };
    while (iv.ti < iv.seq.length && !unanswered(iv, iv.seq[iv.ti]).length) iv.ti++;
    if (iv.ti < iv.seq.length) enter(iv);
    return iv;
  };

  api.done = (iv) => iv.ti >= iv.seq.length;
  api.topic = (iv) => (api.done(iv) ? null : iv.seq[iv.ti]);
  api.progress = function (iv) {
    const all = iv.seq.flatMap((t) => T.itemsOf(t));
    return { done: all.filter((id) => iv.answers[id] != null).length, total: all.length };
  };

  // いま画面に出すもの
  api.view = function (iv) {
    if (api.done(iv)) return { kind: 'done' };
    const topic = iv.seq[iv.ti];
    const t = T.TOPICS[topic];
    if (iv.phase === 'confirm') {
      return { kind: 'confirm', topic, title: t.title, rows: Object.entries(iv.draft).map(([id, d]) => ({ id, item: I.ITEMS[id], value: d.value, src: d.src, evidence: d.evidence || null })) };
    }
    if (iv.phase === 'open') return { kind: 'open', topic, title: t.title, text: t.open };
    const id = unanswered(iv, topic)[0];
    return { kind: 'ask', topic, title: t.title, intro: unanswered(iv, topic).length === t.items.length ? t.open : null, item: I.ITEMS[id] };
  };

  api.tap = function (iv, id, value) {
    iv.answers[id] = value; iv.src[id] = 'tap'; iv.note = null;
    return settle(iv);
  };

  // 文章での返事。戻り値 { ok, hint? }（ok=false は読み取れなかった）
  api.text = async function (iv, text, opts = {}) {
    if (iv.phase === 'confirm' || api.done(iv)) return { ok: false, hint: 'confirm' };
    const topic = iv.seq[iv.ti];
    if (iv.phase === 'open') {
      const res = await R.readTopic(topic, text, opts);
      iv.via = res.via; iv.fallback = res.fallback || null;
      const draft = {};
      for (const id of unanswered(iv, topic)) if (res.answers[id]) draft[id] = { ...res.answers[id] };
      if (Object.keys(draft).length) { iv.draft = draft; iv.phase = 'confirm'; iv.note = null; return { ok: true, read: Object.keys(draft).length }; }
      iv.phase = 'items'; iv.note = 'unread';
      return { ok: false, hint: res.fallback ? 'fallback' : 'unread' };
    }
    const id = unanswered(iv, topic)[0];
    const p = R.ruleOne(id, text);
    if (p && p.value != null) { iv.draft = { [id]: { value: p.value, src: 'rules' } }; iv.phase = 'confirm'; iv.note = null; return { ok: true, read: 1 }; }
    return { ok: false, hint: p && p.unknown ? 'unknown' : 'unread' };
  };

  api.edit = function (iv, id, value) {
    if (iv.phase !== 'confirm' || !iv.draft[id]) return iv;
    const d = iv.draft[id];
    if (d.value !== value) { d.value = value; d.src = d.src.replace(/\+edit$/, '') + '+edit'; delete d.evidence; }
    return iv;
  };
  api.confirm = function (iv) {
    if (iv.phase !== 'confirm') return iv;
    for (const [id, d] of Object.entries(iv.draft)) { iv.answers[id] = d.value; iv.src[id] = d.src; }
    iv.draft = null; iv.phase = 'items';
    return settle(iv);
  };
  api.reject = function (iv) { if (iv.phase === 'confirm') { iv.draft = null; iv.phase = 'items'; } return iv; };
  api.skipOpen = function (iv) { if (iv.phase === 'open') iv.phase = 'items'; return iv; };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.interview = api;
})();
