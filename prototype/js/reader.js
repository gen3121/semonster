// 読み取り（自由な文 → 質問紙の回答）。LLM（サーバー経由）を使う設定のときは話題ごとにまとめて読み取り、
// 使えない・失敗したときは規則（extract.js）に戻す。どちらの場合も、読み取り結果は画面で本人が確かめてから確定する。
// APIキーはブラウザに置かない。サーバー側の仕様は server/README.md。
(function () {
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const T = typeof module !== 'undefined' ? require('./topics.js') : window.OF.topics;
  const X = typeof module !== 'undefined' ? require('./extract.js') : window.OF.extract;
  const api = {};

  api.config = { endpoint: '/api/read', health: '/api/health', timeoutMs: 25000 };

  // サーバーが使えるかを確かめる（file:// で開いたときや、キーが無いときは false）
  api.probe = async function (fetchFn) {
    const f = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f || (typeof location !== 'undefined' && location.protocol === 'file:')) return false;
    try {
      const r = await f(api.config.health);
      if (!r.ok) return false;
      const j = await r.json();
      return !!(j && j.ok && j.llm);
    } catch (e) { return false; }
  };

  // 1項目を規則で読む
  api.ruleOne = (id, text) => X.parseItem(id, text);

  // サーバーの返事を検証して、アプリの回答の形に直す（サーバーも検証するが、ここでも信用しきらない）
  api.normalizeResponse = function (topic, json) {
    const out = {};
    if (!json || json.ok !== true || !json.answers || typeof json.answers !== 'object') return null;
    for (const id of T.itemsOf(topic)) {
      const a = json.answers[id];
      if (!a || a.value == null) continue;
      const it = I.ITEMS[id];
      if (it.type === 'choice') {
        const o = Number.isInteger(a.value) ? it.options[a.value] : null;
        if (o) out[id] = { value: o[0], src: 'llm', evidence: typeof a.evidence === 'string' ? a.evidence.slice(0, 80) : null };
      } else if (Number.isInteger(a.value) && a.value >= 1 && a.value <= 5) {
        out[id] = { value: a.value, src: 'llm', evidence: typeof a.evidence === 'string' ? a.evidence.slice(0, 80) : null };
      }
    }
    return out;
  };

  // 話題の自由な文を読む。戻り値 { answers: {id:{value,src,evidence}}, via: 'llm'|'none', fallback?: 理由 }
  api.readTopic = async function (topic, text, opts = {}) {
    const f = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) return { answers: {}, via: 'none', fallback: 'no_fetch' };
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeoutMs || api.config.timeoutMs) : null;
    try {
      const r = await f(opts.endpoint || api.config.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic, text: String(text).slice(0, 1000) }), signal: ctl ? ctl.signal : undefined });
      if (!r.ok) return { answers: {}, via: 'none', fallback: 'http_' + r.status };
      const norm = api.normalizeResponse(topic, await r.json());
      return norm ? { answers: norm, via: 'llm' } : { answers: {}, via: 'none', fallback: 'bad_response' };
    } catch (e) {
      return { answers: {}, via: 'none', fallback: e && e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally { if (timer) clearTimeout(timer); }
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.reader = api;
})();
