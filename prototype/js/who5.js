// WHO-5 精神的健康状態表（日本語版）。0〜5 点×5 項目、素点 0〜25。
(function () {
  const api = {};
  api.ITEMS = ['明るく、楽しい気分で過ごした', '落ち着いた、リラックスした気分で過ごした', '意欲的で、活動的に過ごした', 'ぐっすりと休め、気持ちよく目覚めた', '日常生活の中に、興味のあることがたくさんあった'];
  api.CHOICES = [['いつも', 5], ['ほとんどいつも', 4], ['半分以上の期間', 3], ['半分以下の期間', 2], ['ほんのたまに', 1], ['まったくない', 0]];
  api.raw = (a) => a.reduce((s, x) => s + x, 0);
  api.DUE_DAYS = [0, 14, 28, 42];
  if (typeof module !== 'undefined') module.exports = api; else (window.OF = window.OF || {}).who5 = api;
})();
