// 共通の小さな道具（日付・統計）。ブラウザでは window.OF.util、Node では require で使う。
(function () {
  const api = {};

  api.pad = (n) => String(n).padStart(2, '0');
  api.ymd = (d) => `${d.getFullYear()}-${api.pad(d.getMonth() + 1)}-${api.pad(d.getDate())}`;
  api.parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  api.addDays = (s, n) => { const d = api.parseYmd(s); d.setDate(d.getDate() + n); return api.ymd(d); };
  api.daysBetween = (a, b) => Math.round((api.parseYmd(b) - api.parseYmd(a)) / 86400000);

  api.median = (xs) => {
    const v = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  api.mean = (xs) => {
    const v = xs.filter((x) => x != null && !Number.isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  api.clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // 標準正規分布の逆累積分布（Acklam の近似）
  api.normInv = (p) => {
    if (p <= 0 || p >= 1) throw new RangeError('p must be in (0,1)');
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };

  if (typeof module !== 'undefined') module.exports = api;
  else (window.OF = window.OF || {}).util = api;
})();
