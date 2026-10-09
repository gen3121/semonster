// 端末内の保存（localStorage）。サーバーへは送らない。研究者への提出は「記録を書き出す」で JSON を渡す。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const api = {};
  const KEY = 'oshifit.state.v1';
  const memory = {};
  const ls = (() => { try { const s = typeof localStorage !== 'undefined' ? localStorage : null; if (s) { s.setItem('__t', '1'); s.removeItem('__t'); } return s; } catch (e) { return null; } })();
  const read = () => { const raw = ls ? ls.getItem(KEY) : memory[KEY]; return raw ? JSON.parse(raw) : null; };
  const write = (s) => { const raw = JSON.stringify(s); if (ls) ls.setItem(KEY, raw); else memory[KEY] = raw; };

  const fresh = () => ({
    id: 'P' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    group: 'C', startDate: null, consent: false, tipi: null, wishes: {}, avatar: null,
    logs: [], who5: [], proposals: [], distress: [], devOffsetDays: 0, createdAt: new Date().toISOString(),
  });

  api.load = () => read() || fresh();
  api.save = write;
  api.reset = () => { if (ls) ls.removeItem(KEY); else delete memory[KEY]; };

  // 「今日」: 開発用にずらせる
  api.today = (s) => { const d = new Date(); d.setDate(d.getDate() + (s.devOffsetDays || 0)); return U.ymd(d); };
  api.dayIndex = (s) => (s.startDate ? U.daysBetween(s.startDate, api.today(s)) : 0);
  // 割付は 2 週間の記録期間の後。それまでは全員、記録だけ（群A と同じ）。
  api.effectiveGroup = (s) => (api.dayIndex(s) >= 14 ? s.group : 'A');
  api.logToday = (s) => s.logs.find((l) => l.date === api.today(s)) || null;

  api.upsertLog = (s, rec) => {
    const i = s.logs.findIndex((l) => l.date === rec.date);
    if (i >= 0) s.logs[i] = rec; else s.logs.push(rec);
    s.logs.sort((a, b) => a.date.localeCompare(b.date));
  };

  // 研究者へ渡す書き出し（本文は端末内に残し、書き出しには含めない）
  api.exportData = (s) => JSON.stringify({
    id: s.id, group: s.group, startDate: s.startDate, tipi: s.tipi && s.tipi.scores, wishes: s.wishes,
    logs: s.logs.map(({ text, ...r }) => r), who5: s.who5,
    proposals: s.proposals.map((p) => ({ week: p.week, createdDate: p.createdDate, chosen: p.chosen, skipped: p.skipped, exec: p.exec, options: p.options.map((o) => ({ id: o.id, texts: o.texts })) })),
    distress: s.distress, modelVersion: typeof window !== 'undefined' && window.OF && window.OF.model ? window.OF.model.PARAMS.version : null,
  }, null, 2);

  if (typeof module !== 'undefined') module.exports = api; else window.OF.store = api;
})();
