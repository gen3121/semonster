// レーダーチャート（SVG）。axes: [{label, value(0〜max)|null}]、max: 軸の最大値。
(function () {
  const api = {};
  api.svg = function (axes, { max = 100, color = '#E8457C', size = 280, rings = [1 / 3, 2 / 3, 1], fmt = (v) => String(v) } = {}) {
    const n = axes.length, c = size / 2, R = size / 2 - 52, pad = 44;   // 左右の余白は、長い軸ラベルが切れないように
    const pt = (i, f) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [c + R * f * Math.cos(a), c + R * f * Math.sin(a)]; };
    const poly = (f) => axes.map((_, i) => pt(i, f).map((x) => x.toFixed(1)).join(',')).join(' ');
    let g = rings.map((f) => `<polygon points="${poly(f)}" fill="none" stroke="#D5DEE8" stroke-width="1"/>`).join('');
    g += axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E3E8EF"/>`; }).join('');
    const have = axes.map((a) => (a.value == null ? null : Math.min(1, Math.max(0, a.value / max))));
    if (have.every((v) => v != null)) {
      g += `<polygon points="${have.map((f, i) => pt(i, f).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    g += have.map((f, i) => { if (f == null) return ''; const [x, y] = pt(i, f); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>`; }).join('');
    g += axes.map((a, i) => {
      const [x, y] = pt(i, 1.2); const anchor = x < c - 8 ? 'end' : x > c + 8 ? 'start' : 'middle';
      return `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="13" fill="#0B3C6E" font-weight="bold">${a.label}</text><text x="${x.toFixed(1)}" y="${(y + 14).toFixed(1)}" text-anchor="${anchor}" font-size="13" fill="#24303F">${a.value == null ? '—' : fmt(a.value)}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} 0 ${size + 2 * pad} ${size}" role="img" aria-label="レーダーチャート：${axes.map((a) => `${a.label} ${a.value == null ? '未入力' : fmt(a.value)}`).join('、')}" style="width:100%;max-width:${size + 2 * pad}px;display:block;margin:0 auto">${g}</svg>`;
  };
  if (typeof module !== 'undefined') module.exports = api; else window.OF.radar = api;
})();
