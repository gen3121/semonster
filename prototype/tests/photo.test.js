// 写真アバター（js/photo.js の純粋な部分と js/avatar.js の拡張）のテスト。ブラウザ・MediaPipe は不要。使い方: node --test tests/photo.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const PH = require('../js/photo.js');
const A = require('../js/avatar.js');

// ---------- 合成の顔（468 点のうち使う番号だけ意味のある位置に置く）
const L = PH.LANDMARK, PR = PH.PRIORS;
function makeFace(o = {}) {
  const { H = 0.4, faceRatio = PR.faceRatio.mean, jawRatio = PR.jawRatio.mean, eyeGapRatio = PR.eyeGapRatio.mean, eyeYRatio = PR.eyeYRatio.mean,
    cx = 0.5, cy = 0.55, rollDeg = 0, yaw = 0, aspect = 1 } = o;
  const W = H * faceRatio, th = rollDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
  const lm = Array.from({ length: 468 }, () => ({ x: cx, y: cy, z: 0 }));
  const top = cy - H / 2;
  const put = (i, dx, dy) => { const X = dx * c - dy * s, Y = dx * s + dy * c; lm[i] = { x: (cx + X) / aspect * 1, y: cy + Y, z: 0 }; };   // dx, dy は顔の中心からの距離（縦の長さ = 1 の単位）
  put(L.forehead, 0, -H / 2); put(L.chin, 0, H / 2);
  put(L.cheekR, -W / 2, 0); put(L.cheekL, W / 2, 0);
  put(L.jawR, -jawRatio * W / 2, 0.3 * H); put(L.jawL, jawRatio * W / 2, 0.3 * H);
  const eyeDy = top + eyeYRatio * H - cy, ed = eyeGapRatio * W, ow = 0.07 * W;
  put(L.eyeOuterR, -ed / 2 - ow, eyeDy); put(L.eyeInnerR, -ed / 2 + ow, eyeDy);
  put(L.eyeInnerL, ed / 2 - ow, eyeDy); put(L.eyeOuterL, ed / 2 + ow, eyeDy);
  put(L.lowerLidR, -ed / 2, eyeDy + 0.03 * H); put(L.lowerLidL, ed / 2, eyeDy + 0.03 * H);
  put(L.nose, yaw * W / 2, 0.1 * H); put(L.bridge, 0, eyeDy);
  put(50, -0.3 * W, 0.12 * H); put(280, 0.3 * W, 0.12 * H); put(205, -0.28 * W, 0.28 * H); put(425, 0.28 * W, 0.28 * H); put(151, 0, -0.38 * H);
  return lm;
}
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (h1, h2, tol = 3) => hexToRgb(h1).every((v, i) => Math.abs(v - hexToRgb(h2)[i]) <= tol);
// 顔の上端（ランドマーク 10 の y）より上なら髪、下なら肌、という単純な画像
function scene({ skin = '#E8BE9C', hair = '#3A2B2E', bg = null, topY }) {
  return (x, y) => (y < topY - 0.01 ? hexToRgb(bg || hair) : hexToRgb(skin));
}
const topOf = (lm) => lm[L.forehead].y;
const derive = (o = {}, sc = {}) => { const lm = makeFace(o); return PH.deriveParams(lm, scene({ ...sc, topY: topOf(lm) }), { aspect: o.aspect || 1 }); };

// ---------- 肌の色
test('肌: 色をそのまま保つ（明るい・中間・濃い肌でどれも ±3 以内）', () => {
  for (const sk of ['#F3D2BD', '#E8BE9C', '#C68E6A', '#8D5A3B', '#6B4430']) {
    const p = derive({}, { skin: sk });
    assert.ok(near(p.skin, sk), `${sk} -> ${p.skin}`);
    assert.ok(!p.warnings.includes('skin_clamped'), sk);
    assert.ok(p.confidence.skin >= 0.9, `${sk} conf ${p.confidence.skin}`);
  }
});
test('肌: 明るすぎ・暗すぎは描ける範囲に丸め、警告を出す', () => {
  const bright = derive({}, { skin: '#FFF6EE' });
  assert.ok(bright.warnings.includes('skin_clamped') && bright.warnings.includes('skin_overexposed'));
  assert.ok(bright.confidence.skin < 0.7);
  const dark = derive({}, { skin: '#2A1A12' });
  assert.ok(dark.warnings.includes('skin_clamped') && dark.warnings.includes('skin_dark'));
  assert.ok(/^#[0-9A-F]{6}$/.test(dark.skin));
});
test('肌: 肌色らしくない色（青かぶり）は警告して信頼度を下げる', () => {
  const p = derive({}, { skin: '#9FA8C8' });
  assert.ok(p.warnings.includes('skin_hue_unusual'));
  assert.ok(p.confidence.skin < 0.5);
});
test('肌: 1 か所だけ外れたパッチ（髪・影）は無視して、残りの中央値を使う', () => {
  const lm = makeFace();
  const odd = lm[151], base = scene({ topY: topOf(lm) });
  const p = PH.deriveParams(lm, (x, y, r) => (Math.abs(x - odd.x) < 1e-9 && Math.abs(y - odd.y) < 1e-9 ? hexToRgb('#3A2B2E') : base(x, y, r)));
  assert.ok(near(p.skin, '#E8BE9C'));
  assert.ok(p.warnings.includes('skin_patches_inconsistent'));
});
test('肌: パッチが取れなければ null で信頼度 0', () => {
  const lm = makeFace();
  const p = PH.deriveParams(lm, () => null);
  assert.equal(p.skin, null); assert.equal(p.confidence.skin, 0);
});

// ---------- 髪の色
test('髪: 濃い茶色の髪を拾う', () => {
  const p = derive({}, { hair: '#3A2B2E' });
  assert.ok(near(p.hairColor, '#3A2B2E')); assert.ok(p.confidence.hair >= 0.5);
});
test('髪: 明るい背景（白い壁）は null + 警告（アプリはパーツ選びに戻す）', () => {
  const p = derive({}, { bg: '#F2F2F0' });
  assert.equal(p.hairColor, null); assert.ok(p.warnings.includes('hair_region_background_like')); assert.equal(p.confidence.hair, 0);
});
test('髪: 肌に近い色（坊主・壁が肌色）は null + 警告', () => {
  const p = derive({}, { bg: '#E3B898' });
  assert.equal(p.hairColor, null); assert.ok(p.warnings.includes('hair_region_skin_like'));
});
test('髪: 頭の上の色がばらばら（背景が混ざる）なら null', () => {
  const lm = makeFace(); const top = topOf(lm);
  let n = 0;
  const p = PH.deriveParams(lm, (x, y) => (y < top - 0.01 ? hexToRgb(n++ % 2 ? '#101010' : '#40A0E0') : hexToRgb('#E8BE9C')));
  assert.equal(p.hairColor, null); assert.ok(p.warnings.includes('hair_region_inconsistent'));
});
test('髪: 頭の上が画像の外なら null', () => {
  const p = derive({ cy: 0.22 }, {});
  assert.equal(p.hairColor, null); assert.ok(p.warnings.includes('hair_region_out_of_frame'));
});
test('髪: 金髪（彩度のある明るい色）は null にしない', () => {
  const p = derive({}, { hair: '#C9A24B' });
  assert.ok(p.hairColor && near(p.hairColor, '#C9A24B', 4));
});
test('髪型は返さない（髪型は写真から決めない）', () => {
  const p = derive();
  assert.equal(p.hairStyle, undefined); assert.ok(p.warnings.includes('hairstyle_not_derived'));
});

// ---------- 比率
test('比率: 標準の顔は 0 付近、広い顔は +、細い顔は -、-1..1 に収まる', () => {
  const s = derive();
  for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) assert.ok(Math.abs(s[k]) < 0.06, k + ' ' + s[k]);
  assert.ok(derive({ faceRatio: 1.0 }).faceW > 0.5 && derive({ faceRatio: 0.8 }).faceW < -0.5);
  assert.ok(derive({ jawRatio: 0.9 }).jaw > 0.5 && derive({ jawRatio: 0.65 }).jaw < -0.5);
  assert.ok(derive({ eyeGapRatio: 0.5 }).eyeGap > 0.5 && derive({ eyeGapRatio: 0.40 }).eyeGap < -0.5);
  assert.ok(derive({ eyeYRatio: 0.42 }).eyeY > 0.5 && derive({ eyeYRatio: 0.26 }).eyeY < -0.5);
  const x = derive({ faceRatio: 2, jawRatio: 2, eyeGapRatio: 1, eyeYRatio: 1 });
  for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) assert.equal(x[k], 1);
});
test('比率: 首をかしげても（20 度）同じ値になる', () => {
  const a = derive({ faceRatio: 0.98, eyeGapRatio: 0.48 }), b = derive({ faceRatio: 0.98, eyeGapRatio: 0.48, rollDeg: 20 });
  for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) assert.ok(Math.abs(a[k] - b[k]) < 0.05, k);
  assert.ok(b.warnings.includes('tilted'));
});
test('比率: 横長の画像（aspect 4/3）でも縦横の歪みを補正する', () => {
  const a = derive({ faceRatio: 0.98, eyeGapRatio: 0.48 }), b = derive({ faceRatio: 0.98, eyeGapRatio: 0.48, aspect: 4 / 3 });
  for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) assert.ok(Math.abs(a[k] - b[k]) < 0.05, k);
});
test('比率: 横向きだと信頼度を下げ、警告する', () => {
  const p = derive({ yaw: 0.5 });
  assert.ok(p.warnings.includes('not_frontal')); assert.ok(p.confidence.proportions < 0.5);
});
test('比率: 顔が画像のふちで切れていると警告し信頼度を下げる', () => {
  const lm = makeFace(); lm[100] = { x: 0.001, y: 0.5, z: 0 };
  const p = PH.deriveParams(lm, scene({ topY: topOf(lm) }));
  assert.ok(p.warnings.includes('face_cropped')); assert.ok(p.confidence.proportions < 0.5);
});

// ---------- めがね
test('めがね: 強い証拠（両目の下の暗い縁 + 鼻すじの暗い帯）があるときだけ true、ふつうは null（false は返さない）', () => {
  assert.equal(derive().glasses, null);
  const lm = makeFace(); const base = scene({ topY: topOf(lm) });
  const close = (a, b) => Math.abs(a - b) < 1e-6;
  const rim = [L.lowerLidR, L.lowerLidL].map((i) => lm[i]);
  const bridge = { x: (lm[L.eyeInnerR].x + lm[L.eyeInnerL].x) / 2, y: (lm[L.eyeInnerR].y + lm[L.eyeInnerL].y) / 2 };
  const p = PH.deriveParams(lm, (x, y, r) => {
    if (rim.some((q) => close(x, q.x) && y > q.y)) return [30, 25, 25];
    if (close(x, bridge.x) && close(y, bridge.y)) return [90, 70, 60];
    return base(x, y, r);
  });
  assert.equal(p.glasses, true); assert.ok(p.confidence.glasses >= 0.5);
  // 縁だけ（鼻すじは普通）なら true にしない
  const q = PH.deriveParams(lm, (x, y, r) => (rim.some((s) => close(x, s.x) && y > s.y) ? [30, 25, 25] : base(x, y, r)));
  assert.equal(q.glasses, null);
});

// ---------- 入力の検査・出力の形
test('不正な入力は PhotoError(bad_input)', () => {
  assert.throws(() => PH.deriveParams([], () => null), (e) => e instanceof PH.PhotoError && e.code === 'bad_input');
  assert.throws(() => PH.deriveParams(makeFace(), null), (e) => e.code === 'bad_input');
  assert.throws(() => PH.deriveParams(Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 })), () => null), (e) => e.code === 'bad_input');
});
test('エラーコードと警告には日本語の文言がある', () => {
  for (const c of ['no_face', 'multiple_faces', 'too_small', 'too_dark', 'decode_failed', 'engine_unavailable', 'engine_failed', 'bad_input']) assert.ok(PH.ERROR_MESSAGES_JA[c], c);
  const p = derive({ yaw: 0.5, rollDeg: 20 }, { bg: '#F2F2F0' });
  for (const w of p.warnings) assert.ok(PH.WARNING_MESSAGES_JA[w], w);
});
test('出力は小さな数値と色だけ（ランドマークや画素の配列を含まない）', () => {
  const p = derive();
  const walk = (v, depth = 0) => { assert.ok(depth < 3); if (Array.isArray(v)) { assert.ok(v.length <= 4, 'array too long'); v.forEach((x) => walk(x, depth + 1)); } else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, depth + 1)); };
  walk(p); assert.ok(JSON.stringify(p).length < 700, String(JSON.stringify(p).length));
  assert.deepEqual(Object.keys(p).sort(), ['confidence', 'eyeGap', 'eyeY', 'faceW', 'glasses', 'hairColor', 'hairStyle', 'jaw', 'measures', 'skin', 'warnings']);
});
test('photo.js は保存・送信の API を使わない', () => {
  const src = require('node:fs').readFileSync(require.resolve('../js/photo.js'), 'utf8').replace(/\/\/.*$/gm, '');   // コメントは除く
  for (const bad of ['localStorage', 'sessionStorage', 'indexedDB', 'XMLHttpRequest', 'sendBeacon', 'fetch(', 'toDataURL', 'toBlob', 'FileReader', 'FileSystem', 'caches.']) assert.ok(!src.includes(bad), bad);
});

// ---------- avatar.js の拡張
const HASHES = {  // 変更前の avatar.js（git の HEAD 時点）の出力の SHA-256
  def_good: '9277c0da9a75852b122fce93de01a3aa8423d36c3d576088050624828734eafb',
  twinGl_good: '38116a94603b645ee7848bd534ba681ec10cd24f8b7f2e7d5c4dcc8853a173de',
  long_good: 'ad6a12d551d0572b136ef5f1bee272fc91e9b3440e88f84a274d4fa9f5620ea4',
  short_good: 'c0f2f78e8b201308ba51daf609e459518dc0d7c1000526c696bc58c9842cdfea',
  def_neutral: 'b6d2f80d66c56ee5f012893a38fa409c6160236fe3956dfe708e919f01986779',
  twinGl_neutral: '2502088b05f7281912790f0fdb8ad586725505a0840094996d8615dc585671bf',
  long_neutral: 'd19828d7343e61a2e323e3ce9ccfad168db6695048af91df794bc26d341cb205',
  short_neutral: '09ea2cb9e1f9bc68bf641801059c32b056b38a47a56408fd171c9ed6149209c9',
  def_tired: 'e805cd66ea1acb9333e5c21ec8ac40b7e341c2fa388e3b7881bc581632333cd9',
  twinGl_tired: 'a47c26b3a6eccbcb8b8fc95d764eaca3229230198f12bcca6f0d12ab9a24f4ce',
  long_tired: '6fe9f35b7abe8ccb9679e7d7d404610b15083130f8f70c58768efed9fbe6a486',
  short_tired: 'c5c0208c1cc8450abcdba1df25f8a8cc3dd65b233bae5e3832f1a089444ffd50',
};
test('avatar: 比率パラメータがなければ、従来の SVG と 1 文字も違わない', () => {
  const avs = { def: undefined, twinGl: { hairStyle: 'twin', glasses: true, skin: '#E8BE9C', shirt: '#12A38A' }, long: { hairStyle: 'long', hairColor: '#C9A24B', pin: '#0099FF' }, short: { hairStyle: 'short' } };
  let n = 0;
  for (const e of ['good', 'neutral', 'tired']) for (const [k, av] of Object.entries(avs)) {
    const h = crypto.createHash('sha256').update(A.svg(av, e)).digest('hex');
    assert.equal(h, HASHES[k + '_' + e], k + '_' + e); n++;
  }
  assert.equal(n, 12);
  // 0 や未定義・非数も「変更なし」
  assert.equal(A.svg({ faceW: 0, jaw: 0, eyeGap: 0, eyeY: 0 }), A.svg());
  assert.equal(A.svg({ faceW: NaN, jaw: 'x', eyeGap: null, eyeY: undefined }), A.svg());
});
test('avatar: 比率パラメータで輪郭・目の位置が変わり、範囲外は丸められる', () => {
  const base = A.svg();
  for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) for (const v of [-1, 0.5, 1]) assert.notEqual(A.svg({ [k]: v }), base, k + v);
  assert.equal(A.svg({ faceW: 9, jaw: -9, eyeGap: 9, eyeY: -9 }), A.svg({ faceW: 1, jaw: -1, eyeGap: 1, eyeY: -1 }));
  for (const e of ['good', 'neutral', 'tired']) {
    const s = A.svg({ faceW: 1, jaw: -1, eyeGap: 1, eyeY: 1, glasses: true }, e);
    assert.ok(!/NaN|undefined|null/.test(s), e);
    assert.equal((s.match(/<g[ >]/g) || []).length, (s.match(/<\/g>/g) || []).length);
  }
  // 顔の輪郭は 82..94 の幅に収まる（誇張しない）
  const m = A.svg({ faceW: 1 }).match(/<path d="M([\d.]+),156 A([\d.]+),([\d.]+)/);
  assert.equal(Number(m[1]), 150 - 94); assert.equal(Number(m[2]), 94);
});
test('avatar.fromPhotoParams: 髪型・シャツ・ピンは残し、信頼度が足りる項目だけ上書き', () => {
  const base = { hairStyle: 'twin', hairColor: '#8A5A3C', skin: '#FBE6D6', shirt: '#12A38A', glasses: false, pin: '#0099FF' };
  const params = { skin: '#c68e6a', hairColor: '#3A2B2E', faceW: 0.4, jaw: -0.3, eyeGap: 0.2, eyeY: -0.5, glasses: true, hairStyle: 'long',
    confidence: { skin: 0.8, hair: 0.3, proportions: 0.8, glasses: 0.5 } };
  const av = A.fromPhotoParams(params, base);
  assert.equal(av.hairStyle, 'twin'); assert.equal(av.shirt, '#12A38A'); assert.equal(av.pin, '#0099FF');
  assert.equal(av.skin, '#C68E6A'); assert.equal(av.hairColor, '#8A5A3C');   // 髪の信頼度が低いので base のまま
  assert.equal(av.glasses, true); assert.equal(av.faceW, 0.4); assert.equal(av.eyeY, -0.5);
  assert.deepEqual(av.photoApplied, ['skin', 'glasses', 'faceW', 'jaw', 'eyeGap', 'eyeY']);
  assert.equal(base.skin, '#FBE6D6', 'base は変更しない');
  assert.doesNotMatch(A.svg(av, 'good'), /undefined|NaN/);
});
test('avatar.fromPhotoParams: null・不正値・信頼度なしは無視（base のまま）', () => {
  const base = { ...A.DEFAULT, hairStyle: 'short' };
  assert.deepEqual({ ...A.fromPhotoParams(null, base), photoApplied: 0 }, { ...base, photoApplied: 0 });
  const bad = A.fromPhotoParams({ skin: 'red;"><script>', hairColor: null, glasses: null, faceW: NaN, confidence: { skin: 1, hair: 1, glasses: 1, proportions: 1 } }, base);
  assert.equal(bad.skin, base.skin); assert.equal(bad.hairColor, base.hairColor); assert.equal(bad.glasses, base.glasses); assert.equal(bad.faceW, undefined);
  const noConf = A.fromPhotoParams({ skin: '#C68E6A', faceW: 1 }, base);
  assert.deepEqual(noConf.photoApplied, []); assert.equal(noConf.skin, base.skin);
  assert.equal(A.fromPhotoParams({ skin: '#C68E6A', confidence: { skin: 0.4 } }, base, { minConfidence: 0.3 }).skin, '#C68E6A');
});
test('avatar.fromPhotoParams: deriveParams の出力をそのまま渡せる', () => {
  const p = derive({ faceRatio: 0.95 }, { skin: '#C68E6A', hair: '#1E1B1F' });
  const av = A.fromPhotoParams(p, { hairStyle: 'bob', shirt: '#5B8DEF', pin: '#E8457C' });
  assert.ok(av.photoApplied.includes('skin') && av.photoApplied.includes('hairColor') && av.photoApplied.includes('faceW'));
  assert.ok(JSON.stringify(av).length < 400);
  assert.match(A.svg(av, 'neutral'), /^<svg/);
});
