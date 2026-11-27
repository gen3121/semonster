// 日本語版 TIPI-J（小塩・阿部・カトローニ, 2012）10項目。予備調査と同じ5件法（大きいほど当てはまる）で聞く。質問文は instrument.js。
(function () {
  const api = {};
  const rev = (x) => 6 - x;
  // a: tipi_1〜10 の回答（1〜5）の配列
  api.score = (a) => ({
    extraversion: (a[0] + rev(a[5])) / 2, agreeableness: (rev(a[1]) + a[6]) / 2, conscientiousness: (a[2] + rev(a[7])) / 2,
    neuroticism: (a[3] + rev(a[8])) / 2, openness: (a[4] + rev(a[9])) / 2,
  });
  api.fromAnswers = (ans) => { const a = Array.from({ length: 10 }, (_, i) => ans['tipi_' + (i + 1)]); return a.every((v) => v != null) ? api.score(a) : null; };
  api.LABELS = { extraversion: '外向性', agreeableness: '協調性', conscientiousness: '勤勉性', neuroticism: '神経症傾向', openness: '開放性' };
  if (typeof module !== 'undefined') module.exports = api; else (window.OF = window.OF || {}).tipi = api;
})();
