// パーツで作る似顔アバター（SVG）。表情は 3 区分（良好 / ふつう / 少し疲れ）だけ。誇張した疲弊表現はしない。
(function () {
  const api = {};
  api.OPTIONS = {
    hairStyle: [['bob', 'ボブ'], ['short', 'ショート'], ['long', 'ロング'], ['twin', 'ふたつ結び']],
    hairColor: [['#3A2B2E', 'こげ茶'], ['#1E1B1F', '黒'], ['#8A5A3C', '茶'], ['#C9A24B', '金'], ['#B76A8E', 'ピンク']],
    skin: [['#F7D9C4', 'ふつう'], ['#FBE6D6', 'あかるい'], ['#E8BE9C', 'こい']],
    shirt: [['#5B8DEF', '青'], ['#12A38A', '緑'], ['#E8457C', 'ピンク'], ['#7C6BC4', 'むらさき'], ['#E0A030', '黄']],
    glasses: [[false, 'なし'], [true, 'あり']],
    pin: [['#E8457C', 'ピンク'], ['#0099FF', '青'], ['#F5B300', '黄'], ['#12A38A', '緑']],
  };
  api.DEFAULT = { hairStyle: 'bob', hairColor: '#3A2B2E', skin: '#F7D9C4', shirt: '#5B8DEF', glasses: false, pin: '#E8457C' };

  const eyes = (e) => e === 'good'
    ? '<path d="M108,152 Q121,137 134,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M166,152 Q179,137 192,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/>'
    : e === 'neutral'
      ? '<ellipse cx="121" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="124" cy="146" r="3" fill="#fff"/><ellipse cx="179" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="182" cy="146" r="3" fill="#fff"/>'
      : '<path d="M109,150 L133,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/><path d="M112,151 Q121,160 130,151" fill="#2B2024"/><path d="M167,150 L191,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/><path d="M170,151 Q179,160 188,151" fill="#2B2024"/>';
  const mouth = (e) => e === 'good' ? '<path d="M134,188 Q150,210 166,188 Z" fill="#B8324F"/><path d="M140,196 Q150,205 160,196 Z" fill="#F08AA0"/>'
    : e === 'neutral' ? '<path d="M139,194 Q150,201 161,194" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : '<path d="M139,199 Q150,192 161,199" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>';
  const brows = (e, c) => e === 'tired'
    ? `<path d="M108,128 Q121,124 134,131" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M166,131 Q179,124 192,128" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<path d="M108,126 Q121,119 134,125" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M166,125 Q179,119 192,126" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;

  function hairBack(style, c) {
    if (style === 'long') return `<path d="M52,170 C40,80 100,44 150,44 C204,44 260,80 248,170 L254,310 L46,310 Z" fill="${c}"/>`;
    if (style === 'twin') return `<ellipse cx="62" cy="200" rx="26" ry="62" fill="${c}"/><ellipse cx="238" cy="200" rx="26" ry="62" fill="${c}"/><path d="M60,160 C60,80 104,48 150,48 C198,48 242,80 240,160 Z" fill="${c}"/>`;
    if (style === 'short') return `<path d="M60,160 C58,80 104,46 150,46 C200,46 244,80 240,160 Z" fill="${c}"/>`;
    return `<path d="M56,170 C46,80 100,46 150,46 C204,46 256,80 244,170 L246,232 C232,222 226,200 226,176 L74,176 C74,200 68,222 54,232 Z" fill="${c}"/>`;
  }
  const bangs = (c) => `<path d="M62,150 C62,86 104,58 150,58 C198,58 240,86 238,150 C226,120 200,104 176,98 C170,112 150,120 128,118 C108,118 92,112 86,104 C74,116 66,132 62,150 Z" fill="${c}"/>`;

  api.svg = function (av, expr = 'neutral') {
    const a = { ...api.DEFAULT, ...av };
    const blush = expr === 'good' ? 0.55 : expr === 'neutral' ? 0.35 : 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" role="img" aria-label="あなたのアバター">
      ${hairBack(a.hairStyle, a.hairColor)}
      <path d="M58,340 C58,276 104,252 150,252 C196,252 242,276 242,340 Z" fill="${a.shirt}"/>
      <path d="M128,252 L150,276 L172,252 Z" fill="#fff" opacity="0.9"/>
      <rect x="134" y="228" width="32" height="30" fill="${a.skin}"/>
      <circle cx="150" cy="156" r="88" fill="${a.skin}"/>
      ${bangs(a.hairColor)}
      <path d="M206,92 l14,-10 l4,16 Z" fill="${a.pin}"/><circle cx="214" cy="94" r="5" fill="#fff"/>
      ${brows(expr, a.hairColor)}${eyes(expr)}
      <ellipse cx="104" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/><ellipse cx="196" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/>
      ${mouth(expr)}
      ${a.glasses ? '<g fill="none" stroke="#2B2024" stroke-width="4"><circle cx="121" cy="150" r="22"/><circle cx="179" cy="150" r="22"/><path d="M143,150 h14"/></g>' : ''}
    </svg>`;
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.avatar = api;
})();
