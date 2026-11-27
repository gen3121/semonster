// パーツで作る似顔アバター（SVG）。表情は 3 区分（良好 / ふつう / 少し疲れ）だけ。誇張した疲弊表現はしない。
(function () {
  const api = {};
  api.OPTIONS = {
    hairStyle: [['bob', 'ボブ'], ['short', 'ショート'], ['long', 'ロング'], ['twin', 'ふたつ結び']],
    hairColor: [['#3A2B2E', 'こげ茶'], ['#1E1B1F', '黒'], ['#8A5A3C', '茶'], ['#C9A24B', '金'], ['#B76A8E', 'ピンク'], ['#9A9AA0', 'グレー'], ['#E6E6EA', '白']],
    skin: [['#FBE6D6', 'とてもあかるい'], ['#F7D9C4', 'あかるい'], ['#E8BE9C', 'ふつう'], ['#D9A389', 'やや濃い'], ['#B9785A', '濃い'], ['#8A5A40', 'とても濃い'], ['#5F3B2B', '最も濃い']],
    shirt: [['#5B8DEF', '青'], ['#12A38A', '緑'], ['#E8457C', 'ピンク'], ['#7C6BC4', 'むらさき'], ['#E0A030', '黄']],
    glasses: [[false, 'なし'], [true, 'あり']],
    pin: [['#E8457C', 'ピンク'], ['#0099FF', '青'], ['#F5B300', '黄'], ['#12A38A', '緑']],
  };
  api.DEFAULT = { hairStyle: 'bob', hairColor: '#3A2B2E', skin: '#F7D9C4', shirt: '#5B8DEF', glasses: false, pin: '#E8457C' };

  // 目・眉は左右のペアで返す（[...].join('') は従来の文字列と同じ）。比率パラメータがあるときだけ左右を別々に動かす。
  const eyePair = (e) => e === 'good'
    ? ['<path d="M108,152 Q121,137 134,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/>', '<path d="M166,152 Q179,137 192,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/>']
    : e === 'neutral'
      ? ['<ellipse cx="121" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="124" cy="146" r="3" fill="#fff"/>', '<ellipse cx="179" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="182" cy="146" r="3" fill="#fff"/>']
      : ['<path d="M109,150 L133,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/><path d="M112,151 Q121,160 130,151" fill="#2B2024"/>', '<path d="M167,150 L191,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/><path d="M170,151 Q179,160 188,151" fill="#2B2024"/>'];
  const mouth = (e) => e === 'good' ? '<path d="M134,188 Q150,210 166,188 Z" fill="#B8324F"/><path d="M140,196 Q150,205 160,196 Z" fill="#F08AA0"/>'
    : e === 'neutral' ? '<path d="M139,194 Q150,201 161,194" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : '<path d="M139,199 Q150,192 161,199" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>';
  const browPair = (e, c) => e === 'tired'
    ? [`<path d="M108,128 Q121,124 134,131" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`, `<path d="M166,131 Q179,124 192,128" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`]
    : [`<path d="M108,126 Q121,119 134,125" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`, `<path d="M166,125 Q179,119 192,126" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`];

  // ---- 写真由来の比率パラメータ（任意）。すべて -1..1、0 が標準（従来の絵と同じ）。変化はわざと控えめにしてある。
  //   faceW  : + で顔が横に広い        eyeGap : + で目が離れている
  //   jaw    : + でエラが張る（四角め）、- であごが細い   eyeY : + で目が低い（おでこが広い）、- で高い
  const clamp1 = (v) => (typeof v === 'number' && isFinite(v)) ? Math.max(-1, Math.min(1, v)) : 0;
  const rnd = (v) => Math.round(v * 100) / 100;
  api.GEOMETRY_KEYS = ['faceW', 'jaw', 'eyeGap', 'eyeY'];
  const geometry = (a) => {
    const f = clamp1(a.faceW), j = clamp1(a.jaw), g = clamp1(a.eyeGap), y = clamp1(a.eyeY);
    return { f, j, g, y, any: !!(f || j || g || y), dx: rnd(6 * g), dy: rnd(y > 0 ? 8 * y : 4 * y) };
  };
  // 顔の輪郭。変更がなければ従来の円をそのまま返す。
  function faceShape(skin, G) {
    if (!(G.f || G.j)) return `<circle cx="150" cy="156" r="88" fill="${skin}"/>`;
    const rx = rnd(88 + 6 * G.f), ry = rnd(88 - 2 * G.f);
    const kx = rnd(0.5523 + 0.10 * G.j), ky = rnd(0.5523 + 0.12 * G.j);   // 下半分のふくらみ（大きいほど四角、小さいほど細く尖る）
    const cx = 150, cy = 156, b = cy + ry;
    return `<path d="M${cx - rx},${cy} A${rx},${ry} 0 0 1 ${cx + rx},${cy} C${cx + rx},${rnd(cy + ry * ky)} ${rnd(cx + rx * kx)},${b} ${cx},${b} C${rnd(cx - rx * kx)},${b} ${cx - rx},${rnd(cy + ry * ky)} ${cx - rx},${cy} Z" fill="${skin}"/>`;
  }
  const shift = (svg, x, y) => (x || y) ? `<g transform="translate(${x},${y})">${svg}</g>` : svg;
  const pair = (p, G) => G.dx || G.dy ? shift(p[0], -G.dx, G.dy) + shift(p[1], G.dx, G.dy) : p.join('');
  const glassesSvg = (G) => `<g fill="none" stroke="#2B2024" stroke-width="4"><circle cx="${rnd(121 - G.dx)}" cy="${rnd(150 + G.dy)}" r="22"/><circle cx="${rnd(179 + G.dx)}" cy="${rnd(150 + G.dy)}" r="22"/><path d="M${rnd(143 - G.dx)},${rnd(150 + G.dy)} h${rnd(14 + 2 * G.dx)}"/></g>`;

  function hairBack(style, c) {
    if (style === 'long') return `<path d="M52,170 C40,80 100,44 150,44 C204,44 260,80 248,170 L254,310 L46,310 Z" fill="${c}"/>`;
    if (style === 'twin') return `<ellipse cx="62" cy="200" rx="26" ry="62" fill="${c}"/><ellipse cx="238" cy="200" rx="26" ry="62" fill="${c}"/><path d="M60,160 C60,80 104,48 150,48 C198,48 242,80 240,160 Z" fill="${c}"/>`;
    if (style === 'short') return `<path d="M60,160 C58,80 104,46 150,46 C200,46 244,80 240,160 Z" fill="${c}"/>`;
    return `<path d="M56,170 C46,80 100,46 150,46 C204,46 256,80 244,170 L246,232 C232,222 226,200 226,176 L74,176 C74,200 68,222 54,232 Z" fill="${c}"/>`;
  }
  const bangs = (c) => `<path d="M62,150 C62,86 104,58 150,58 C198,58 240,86 238,150 C226,120 200,104 176,98 C170,112 150,120 128,118 C108,118 92,112 86,104 C74,116 66,132 62,150 Z" fill="${c}"/>`;

  api.svg = function (av, expr = 'neutral') {
    const a = { ...api.DEFAULT, ...av };
    const G = geometry(a);
    const blush = expr === 'good' ? 0.55 : expr === 'neutral' ? 0.35 : 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" role="img" aria-label="あなたのアバター">
      ${hairBack(a.hairStyle, a.hairColor)}
      <path d="M58,340 C58,276 104,252 150,252 C196,252 242,276 242,340 Z" fill="${a.shirt}"/>
      <path d="M128,252 L150,276 L172,252 Z" fill="#fff" opacity="0.9"/>
      <rect x="134" y="228" width="32" height="30" fill="${a.skin}"/>
      ${faceShape(a.skin, G)}
      ${bangs(a.hairColor)}
      <path d="M206,92 l14,-10 l4,16 Z" fill="${a.pin}"/><circle cx="214" cy="94" r="5" fill="#fff"/>
      ${pair(browPair(expr, a.hairColor), G)}${pair(eyePair(expr), G)}
      <ellipse cx="104" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/><ellipse cx="196" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/>
      ${mouth(expr)}
      ${a.glasses ? glassesSvg(G) : ''}
    </svg>`;
  };

  // ---- 写真から導いた値（photo.js の deriveParams / fromImage の結果）を、参加者が選んだアバターに重ねる。
  // - base の髪型・シャツ・ピンは必ず残す（髪型は写真から決めない）。
  // - skin / hairColor / glasses / 比率は、信頼度が足りるときだけ上書きする。足りないものは base のまま。
  // - 返す値は全部これまでと同じパーツ選びで直せる（色は任意の #rrggbb。選択肢にない色でも svg は描ける）。
  // - 写真そのものはどこにも入らない。入るのは色と小さな数値だけ。
  api.MIN_CONFIDENCE = 0.5;
  const HEX = /^#[0-9a-fA-F]{6}$/;
  api.fromPhotoParams = function (params, base, opts) {
    const min = (opts && typeof opts.minConfidence === 'number') ? opts.minConfidence : api.MIN_CONFIDENCE;
    const out = { ...api.DEFAULT, ...(base || {}) };
    const applied = [];
    if (!params || typeof params !== 'object') return Object.assign(out, { photoApplied: applied });
    const c = params.confidence || {};
    const ok = (k) => typeof c[k] === 'number' && c[k] >= min;
    if (ok('skin') && typeof params.skin === 'string' && HEX.test(params.skin)) { out.skin = params.skin.toUpperCase(); applied.push('skin'); }
    if (ok('hair') && typeof params.hairColor === 'string' && HEX.test(params.hairColor)) { out.hairColor = params.hairColor.toUpperCase(); applied.push('hairColor'); }
    if (ok('glasses') && typeof params.glasses === 'boolean') { out.glasses = params.glasses; applied.push('glasses'); }
    if (ok('proportions')) {
      for (const k of api.GEOMETRY_KEYS) if (typeof params[k] === 'number' && isFinite(params[k])) { out[k] = rnd(clamp1(params[k])); applied.push(k); }
    }
    out.photoApplied = applied;   // どの項目を写真から反映したか（画面に「写真から反映: …」と出す用。保存は不要）
    return out;
  };

  if (typeof module !== 'undefined') module.exports = api; else window.OF.avatar = api;
})();
