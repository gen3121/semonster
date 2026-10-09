// 端末内の保存（localStorage）。サーバーへは送らない。研究者への提出は「記録を書き出す」で JSON を渡す。
// 自由な文章は保存しない（読み取った回答の数字だけを残す）。
(function () {
  const U = typeof module !== 'undefined' ? require('./util.js') : window.OF.util;
  const W = typeof module !== 'undefined' ? require('./who5.js') : window.OF.who5;
  const api = {};
  const KEY = 'oshifit.state.v2';
  const memory = {};
  const ls = (() => { try { const s = typeof localStorage !== 'undefined' ? localStorage : null; if (s) { s.setItem('__t', '1'); s.removeItem('__t'); } return s; } catch (e) { return null; } })();
  const read = () => { const raw = ls ? ls.getItem(KEY) : memory[KEY]; return raw ? JSON.parse(raw) : null; };
  const write = (s) => { const raw = JSON.stringify(s); if (ls) ls.setItem(KEY, raw); else memory[KEY] = raw; };

  api.MAX_WEEKLY = 6;      // 6週間
  api.PLAN_FIRST = 2;      // 週ごとのチェックインが2回済んだら、提案が始まる（記録のみの2週間のあと）

  const fresh = () => ({
    id: 'P' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    group: 'C', startDate: null, consent: false, aiReading: false, avatar: null, avatarSource: 'parts',
    survey: { baseline: null, weekly: [], draft: null },
    who5: [], proposals: [], distress: [], devOffsetDays: 0, createdAt: new Date().toISOString(),
  });

  api.load = () => read() || fresh();
  api.save = write;
  api.reset = () => { if (ls) ls.removeItem(KEY); else delete memory[KEY]; };

  // 「今日」: 開発用にずらせる
  api.today = (s) => { const d = new Date(); d.setDate(d.getDate() + (s.devOffsetDays || 0)); return U.ymd(d); };
  api.dayIndex = (s) => (s.startDate ? U.daysBetween(s.startDate, api.today(s)) : 0);
  // 割付は 2 週間の記録期間の後。それまでは全員、記録だけ（群A と同じ）。
  api.effectiveGroup = (s) => (api.dayIndex(s) >= 14 ? s.group : 'A');

  // 次にやること: 'baseline' | 'weekly' | null
  api.dueCheckin = function (s) {
    if (!s.survey.baseline) return 'baseline';
    const n = s.survey.weekly.length;
    if (n < api.MAX_WEEKLY && api.dayIndex(s) >= 7 * (n + 1)) return 'weekly';
    return null;
  };
  api.whoDue = (s) => W.DUE_DAYS.filter((d) => api.dayIndex(s) >= d && !s.who5.some((w) => w.due === d)).slice(-1)[0];
  // 提案の週（0〜3）。週ごとのチェックインが PLAN_FIRST 回済んでから、4回分
  api.planWeek = (s) => {
    const w = s.survey.weekly.length - api.PLAN_FIRST;
    return w >= 0 && w < 4 ? w : null;
  };

  // 研究者へ渡す書き出し（自由な文章は含まない）
  api.exportData = (s) => JSON.stringify({
    id: s.id, group: s.group, startDate: s.startDate, aiReading: s.aiReading, avatarSource: s.avatarSource,
    baseline: s.survey.baseline, weekly: s.survey.weekly, who5: s.who5,
    proposals: s.proposals.map((p) => ({ week: p.week, createdDate: p.createdDate, chosen: p.chosen, skipped: p.skipped, skipReason: p.skipReason || null, exec: p.exec, execReason: p.execReason || null,
      options: p.options.map((o) => ({ id: o.id, texts: o.texts, dWB: o.dWB, dBO: o.dBO })) })),
    distress: s.distress, modelVersion: typeof window !== 'undefined' && window.OF && window.OF.model ? window.OF.model.MODEL.version : null,
  }, null, 2);

  if (typeof module !== 'undefined') module.exports = api; else window.OF.store = api;
})();
