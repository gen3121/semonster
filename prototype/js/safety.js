// つらさの検知。強い言葉・続く強い推し疲れ・WHO-5 の低得点で相談先を出し、予測の表示を止める。
// 相談先の電話番号は data/resources.json にあり、研究者が確認・差し替えるもの。
(function () {
  const api = {};

  const SEVERE = /(死にたい|消えたい|自殺|自傷|生きていたくない|いなくなりたい|終わりにしたい|死んだ方|死んでしまいたい|リスカ|OD(して|した)?)/i;
  const HEAVY = /(もう無理|限界(だ|です|かも)?$|つらすぎ|辛すぎ|しんどすぎ|何もしたくない|眠れなくて(つら|辛)|全部いや)/;

  // 'severe' | 'heavy' | null
  api.detectText = function (text) {
    const t = String(text || '').normalize('NFKC');
    if (SEVERE.test(t)) return 'severe';
    if (HEAVY.test(t)) return 'heavy';
    return null;
  };

  // 推し疲れの指標（1〜5）が、続けて2回のチェックインで 4.5 以上
  api.detectBurden = function (boSeries) {
    const v = boSeries.filter((x) => x != null).slice(-2);
    return v.length === 2 && v.every((x) => x >= 4.5);
  };

  // WHO-5 素点 0〜25。13 未満は不調の目安（Topp et al., 2015）
  api.detectWho5 = (raw) => raw != null && raw < 13;

  if (typeof module !== 'undefined') module.exports = api;
  else (window.OF = window.OF || {}).safety = api;
})();
