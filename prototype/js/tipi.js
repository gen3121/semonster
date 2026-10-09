// 日本語版 TIPI-J（小塩・阿部・カトローニ, 2012）10項目、7件法。
(function () {
  const api = {};
  api.ITEMS = [
    '活発で、外向的だと思う', '他人に不満を持ち、もめごとを起こしやすいと思う', 'しっかりしていて、自分に厳しいと思う',
    '心配性で、うろたえやすいと思う', '新しい経験に開かれていて、複雑だと思う', 'ひかえめで、おとなしいと思う',
    '人に気をつかう、やさしい人間だと思う', 'だらしなく、うっかりしていると思う', '冷静で、気分が安定していると思う',
    '発想力に欠けた、平凡な人間だと思う',
  ];
  const rev = (x) => 8 - x;
  api.score = (a) => ({
    extraversion: (a[0] + rev(a[5])) / 2, agreeableness: (rev(a[1]) + a[6]) / 2, conscientiousness: (a[2] + rev(a[7])) / 2,
    neuroticism: (a[3] + rev(a[8])) / 2, openness: (a[4] + rev(a[9])) / 2,
  });
  api.LABELS = { extraversion: '外向性', agreeableness: '協調性', conscientiousness: '勤勉性', neuroticism: '神経症傾向', openness: '開放性' };
  if (typeof module !== 'undefined') module.exports = api; else (window.OF = window.OF || {}).tipi = api;
})();
