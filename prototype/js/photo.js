// 写真から似顔アバターのパラメータ（肌の色・髪の色・顔の比率・めがね）を端末の中だけで取り出す。
// - 写真はアップロードも保存もしない（localStorage / IndexedDB / fetch に書かない）。使い終わったらキャンバスを空にして参照を捨てる。
// - 顔のランドマークは MediaPipe Face Mesh（vendor/mediapipe/ に npm から取り込み。実行時に CDN も外部モデルも使わない）。
// - deriveParams() は DOM に依存しない純粋関数（node でテストできる）。fromImage() / fromFile() はブラウザ専用。
// - 髪型（ボブ/ショート/ロング/ふたつ結び）は写真から決めない。参加者がパーツ選びで選ぶ。
// 詳しくは PHOTO_AVATAR.md。
(function () {
  const api = {};

  // ------------------------------------------------------------------ エラーと警告
  class PhotoError extends Error {
    constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.name = 'PhotoError'; this.code = code; }
  }
  api.PhotoError = PhotoError;
  api.ERROR_MESSAGES_JA = {
    no_face: '顔が見つかりませんでした。正面を向いて、顔全体が大きめに写る写真でもう一度お試しください（顔が小さいときも見つからないことがあります）。',
    multiple_faces: '複数の顔が写っています。ご自身だけが写っている写真を選んでください。',
    too_small: '顔が小さすぎます。もう少し近づいて撮った写真を選んでください。',
    too_dark: '写真が暗すぎます。明るい場所で撮った写真でもう一度お試しください。',
    decode_failed: 'この画像を読み込めませんでした（形式が合わないか、壊れている可能性があります）。JPEG または PNG をお試しください。',
    engine_unavailable: '顔の読み取り機能を読み込めませんでした。通信環境、または配信のしかた（http で開く必要があります）を確認してください。パーツ選びでアバターを作ることもできます。',
    engine_failed: '顔の読み取りに失敗しました。もう一度お試しいただくか、パーツ選びでアバターを作ってください。',
    bad_input: '画像として扱えないデータです。',
  };
  api.WARNING_MESSAGES_JA = {
    not_frontal: '顔が少し横を向いています。正面の写真のほうが正確です。',
    tilted: '顔が傾いています（補正はしています）。',
    face_cropped: '顔が画像のふちで切れています。',
    blurry: 'ピントが甘いようです。',
    skin_patches_inconsistent: '頬やおでこの色がばらついています（影・化粧・ひげ・髪など）。肌の色は目安です。',
    skin_hue_unusual: '照明や写真の加工で色が偏っている可能性があります。肌の色は必ず確認してください。',
    skin_clamped: '肌の色を、描ける範囲に少し調整しました。',
    skin_dark: '顔が暗めに写っています。肌の色は実際より暗く出ているかもしれません。',
    skin_overexposed: '顔が明るく写りすぎています。肌の色は実際より明るく出ているかもしれません。',
    hair_region_out_of_frame: '頭の上が画像から切れているため、髪の色は読み取れませんでした。',
    hair_region_inconsistent: '頭の上の色がばらついていて、髪の色は読み取れませんでした。',
    hair_region_background_like: '頭の上が背景（明るい壁など）のように見えるため、髪の色は読み取れませんでした。',
    hair_region_skin_like: '頭の上が肌に近い色のため、髪の色は読み取れませんでした。',
    hair_clamped: '髪の色を、描ける範囲に少し調整しました。',
    hairstyle_not_derived: '髪型は写真からは決めません。パーツ選びで選んでください。',
  };

  // ------------------------------------------------------------------ ランドマーク番号（MediaPipe Face Mesh 468 点）
  const L = {
    forehead: 10, chin: 152, cheekR: 234, cheekL: 454,   // 顔の上端・あご先・左右の輪郭（R/L は被写体から見た右/左）
    jawR: 172, jawL: 397,                                 // あご（エラ）の左右
    nose: 1, bridge: 168,
    eyeOuterR: 33, eyeInnerR: 133, eyeInnerL: 362, eyeOuterL: 263,
    lowerLidR: 145, lowerLidL: 374,
    skinPatches: [50, 280, 205, 425, 151],                // 頬 ×2、頬の下 ×2、おでこ
  };
  api.LANDMARK = L;
  const MIN_POINTS = 455;

  // ------------------------------------------------------------------ 比率の基準（暫定）
  // 値 = (測った比 - mean) / span を -1..1 に収める。ここの mean / span は一般的な人体計測の目安から置いた「暫定値」で、
  // 参加者集団で較正したものではない。パイロットのデータが出たら見直す（PHOTO_AVATAR.md 参照）。
  // アバター側の変化は ±6px 程度に抑えてあるので、基準がずれても似顔が大きく崩れることはない。
  const PRIORS = {
    faceRatio: { mean: 0.90, span: 0.12 },   // 顔幅(234-454) / 顔の高さ(10-152)
    jawRatio: { mean: 0.78, span: 0.10 },    // あごの幅(172-397) / 顔幅
    eyeGapRatio: { mean: 0.45, span: 0.05 }, // 両目の中心間 / 顔幅
    eyeYRatio: { mean: 0.34, span: 0.06 },   // 目の高さ（ランドマーク 10 =おでこの上のほうから）/ 顔の高さ
  };
  api.PRIORS = PRIORS;

  // ------------------------------------------------------------------ 色の道具
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const gam = (c) => { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return clamp(Math.round(c * 255), 0, 255); };
  const F = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const Finv = (t) => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
  function rgb2lab([r, g, b]) {
    const R = lin(r), G = lin(g), B = lin(b);
    const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    const y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
    const z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
    const fx = F(x), fy = F(y), fz = F(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function lab2rgb([l, a, b]) {
    const fy = (l + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const x = Finv(fx) * 0.95047, y = Finv(fy), z = Finv(fz) * 1.08883;
    return [gam(3.2404542 * x - 1.5371385 * y - 0.4985314 * z), gam(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z), gam(0.0556434 * x - 0.2040259 * y + 1.0572252 * z)];
  }
  const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const chroma = (lab) => Math.hypot(lab[1], lab[2]);
  const hueDeg = (lab) => (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360;
  const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const medianLab = (labs) => [0, 1, 2].map((i) => median(labs.map((x) => x[i])));
  const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;   // 0..255（sRGB 値のまま）
  const r2 = (v) => Math.round(v * 100) / 100;

  // 描ける範囲への「やさしい」調整。明るさ・彩度の両端だけを丸める。全体を明るく/暗くすることはしない。
  function clampLab(lab, Lmin, Lmax, Cmax, Cmin) {
    let [l, a, b] = lab, changed = false;
    const nl = clamp(l, Lmin, Lmax); if (nl !== l) { l = nl; changed = true; }
    const c = Math.hypot(a, b);
    const nc = clamp(c, Cmin || 0, Cmax);
    if (nc !== c) { const k = c > 1e-6 ? nc / c : 0; a *= k; b *= k; changed = true; if (c <= 1e-6) a = nc; }
    return { lab: [l, a, b], changed };
  }

  // ------------------------------------------------------------------ deriveParams（純粋）
  // landmarks: {x,y,z}[]（0..1 に正規化、468 点）。sampler(x, y, r) → [r,g,b]（0..255）| null。r は画像の幅に対する半径（0..1）。
  // opts.aspect: 画像の 幅/高さ（既定 1）。ランドマークは幅・高さで別々に正規化されているので、距離を測るときに必要。
  api.deriveParams = function (landmarks, sampler, opts) {
    if (!Array.isArray(landmarks) || landmarks.length < MIN_POINTS) throw new PhotoError('bad_input', 'landmarks');
    if (typeof sampler !== 'function') throw new PhotoError('bad_input', 'sampler');
    const aspect = opts && opts.aspect > 0 ? opts.aspect : 1;
    const warnings = [];
    const warn = (w) => { if (!warnings.includes(w)) warnings.push(w); };
    const P = (i) => [landmarks[i].x * aspect, landmarks[i].y];             // 縦の長さを 1 とした座標
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const mul = (a, k) => [a[0] * k, a[1] * k];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const norm = (a) => Math.hypot(a[0], a[1]);
    const mid = (a, b) => mul(add(a, b), 0.5);
    const toNorm = (p) => [p[0] / aspect, p[1]];                             // 元の 0..1 に戻す

    // --- 顔の座標系（両目を結ぶ線に合わせる = 首をかしげていても同じ測り方）
    const eyeR = mid(P(L.eyeOuterR), P(L.eyeInnerR)), eyeL = mid(P(L.eyeOuterL), P(L.eyeInnerL));
    let u = sub(eyeL, eyeR); const eyeDist = norm(u);
    if (!(eyeDist > 1e-6)) throw new PhotoError('bad_input', 'degenerate landmarks');
    u = mul(u, 1 / eyeDist);
    if (u[0] < 0) u = mul(u, -1);                                            // 画像の右向きを正に
    const v = [-u[1], u[0]];                                                 // 下向き
    const rollDeg = Math.atan2(u[1], u[0]) * 180 / Math.PI;
    if (Math.abs(rollDeg) > 15) warn('tilted');
    const W = Math.abs(dot(sub(P(L.cheekL), P(L.cheekR)), u));
    const H = Math.abs(dot(sub(P(L.chin), P(L.forehead)), v));
    const jawW = Math.abs(dot(sub(P(L.jawL), P(L.jawR)), u));
    if (!(W > 1e-6 && H > 1e-6)) throw new PhotoError('bad_input', 'degenerate landmarks');

    // --- 正面度（鼻先が左右の輪郭の中央からどれだけずれているか）
    const half = W / 2, cheekMid = mid(P(L.cheekL), P(L.cheekR));
    const yaw = dot(sub(P(L.nose), cheekMid), u) / half;                      // -1..1（0 が正面）
    const frontal = Math.abs(yaw) <= 0.25;
    if (!frontal) warn('not_frontal');

    // --- 顔が画像から切れていないか
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of landmarks) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const margin = 0.005;
    const cropped = minX < margin || maxX > 1 - margin || minY < margin || maxY > 1 - margin;
    if (cropped) warn('face_cropped');

    // --- 比率（-1..1 に正規化）
    const eyeMid = mid(eyeR, eyeL);
    const measures = {
      faceRatio: W / H,
      jawRatio: jawW / W,
      eyeGapRatio: eyeDist / W,
      eyeYRatio: dot(sub(eyeMid, P(L.forehead)), v) / H,
    };
    const z = (name) => clamp((measures[name] - PRIORS[name].mean) / PRIORS[name].span, -1, 1);
    let propConf = 0.8;
    if (!frontal) propConf = Math.min(propConf, 0.35);                         // 横向きだと顔幅・目の間隔が縮んで見える
    if (Math.abs(rollDeg) > 25) propConf = Math.min(propConf, 0.4);
    if (cropped) propConf = Math.min(propConf, 0.4);

    // --- 肌の色
    const Wx = W / aspect;                                                     // 画像の幅に対する顔幅
    const rSkin = clamp(0.045 * Wx, 0.004, 0.05);
    const patches = [];
    for (const i of L.skinPatches) {
      const s = sampler(landmarks[i].x, landmarks[i].y, rSkin);
      if (s && s.every(Number.isFinite)) patches.push(rgb2lab(s));
    }
    let skin = null, skinConf = 0, skinLuma = null, skinLab = null;
    if (patches.length >= 2) {
      let med = medianLab(patches);
      let kept = patches.filter((p) => dE(p, med) <= 15);
      if (kept.length >= 2) med = medianLab(kept); else kept = patches;
      const scatter = kept.reduce((a, p) => a + dE(p, med), 0) / kept.length;
      skinConf = (kept.length / L.skinPatches.length) * (1 - Math.min(1, scatter / 20));
      if (kept.length < patches.length || scatter > 8) warn('skin_patches_inconsistent');
      skinLuma = luma(lab2rgb(med));
      const h = hueDeg(med);
      if (chroma(med) > 6 && (h < 15 || h > 100)) { warn('skin_hue_unusual'); skinConf *= 0.4; }
      if (med[0] < 22) { warn('skin_dark'); skinConf *= 0.6; }
      if (med[0] > 94) { warn('skin_overexposed'); skinConf *= 0.6; }
      // 描ける範囲へ（両端だけ）。L は 22..93、彩度は 6..42。
      const c = clampLab(med, 22, 93, 42, 6);
      if (c.changed) warn('skin_clamped');
      skin = hex(lab2rgb(c.lab));
      skinLab = c.lab;
    }

    // --- 髪の色（おでこの上の帯。輪郭の外側）
    let hairColor = null, hairConf = 0;
    {
      const fv = mul(v, -1);                                                   // 上向き
      const top = P(L.forehead);
      const rHair = clamp(0.035 * Wx, 0.004, 0.05);
      const pts = [];
      for (const dy of [0.12, 0.22]) for (const dx of [-0.22, 0, 0.22]) pts.push(add(add(top, mul(fv, dy * H)), mul(u, dx * W)));
      const labs = [];
      for (const p of pts) {
        const n = toNorm(p);
        if (n[0] < 0 || n[0] > 1 || n[1] < 0 || n[1] > 1) continue;
        const s = sampler(n[0], n[1], rHair);
        if (s && s.every(Number.isFinite)) labs.push(rgb2lab(s));
      }
      if (labs.length < 3) { warn('hair_region_out_of_frame'); }
      else {
        const med = medianLab(labs);
        const disp = median(labs.map((x) => dE(x, med)));
        if (disp > 22) warn('hair_region_inconsistent');
        else if (med[0] > 85 && chroma(med) < 12) warn('hair_region_background_like');
        else if (skinLab && dE(med, skinLab) < 14) warn('hair_region_skin_like');
        else {
          const c = clampLab(med, 6, 78, 55, 0);
          if (c.changed) warn('hair_clamped');
          hairColor = hex(lab2rgb(c.lab));
          // 頭の上が背景かもしれない可能性は消せないので、信頼度の上限は 0.75
          hairConf = clamp(0.75 - disp / 40, 0.2, 0.75) * (labs.length / pts.length > 0.8 ? 1 : 0.7);
        }
      }
    }

    // --- めがね: 「強い証拠があるときだけ true」、それ以外は null（=分からない）。false は返さない。
    //   見るもの: 鼻すじ（両目の内側の間）が、その上下より暗い横帯になっているか + 両目の下に暗い縁があるか。
    //   細い縁・縁なし・色の薄い縁は見えないので、「ない」とは言えない。
    let glasses = null, glassesConf = 0;
    if (frontal && skin) {
      const bridge = mid(P(L.eyeInnerR), P(L.eyeInnerL));
      const g = (p, r) => { const n = toNorm(p); return sampler(n[0], n[1], r); };
      const rb = clamp(0.012 * Wx, 0.003, 0.02);
      const at = (p, off) => add(p, mul(v, off * eyeDist));
      const cB = g(bridge, rb), cUp = g(at(bridge, -0.28), rb), cDn = g(at(bridge, 0.30), rb);
      const lowR = g(at(P(L.lowerLidR), 0.22), rb), lowL = g(at(P(L.lowerLidL), 0.22), rb);
      const skinY = rgb2lab(lab2rgb(skinLab))[0];
      if (cB && cUp && cDn && lowR && lowL) {
        const lb = rgb2lab(cB)[0], lu = rgb2lab(cUp)[0], ld = rgb2lab(cDn)[0];
        const bridgeDark = lb < (lu + ld) / 2 - 10;
        const rimsDark = rgb2lab(lowR)[0] < skinY - 28 && rgb2lab(lowL)[0] < skinY - 28;
        if (bridgeDark && rimsDark) { glasses = true; glassesConf = 0.5; }
      }
    }

    warn('hairstyle_not_derived');
    return {
      skin,
      hairColor,
      faceW: r2(z('faceRatio')),
      jaw: r2(z('jawRatio')),
      eyeGap: r2(z('eyeGapRatio')),
      eyeY: r2(z('eyeYRatio')),
      glasses,
      hairStyle: undefined,                       // 意図的に未定（髪型は写真から決めない）
      confidence: { skin: r2(clamp(skinConf, 0, 1)), hair: r2(hairColor ? hairConf : 0), proportions: r2(propConf), glasses: r2(glassesConf) },
      warnings,
      measures: { ...Object.fromEntries(Object.entries(measures).map(([k, x]) => [k, r2(x)])), rollDeg: r2(rollDeg), yaw: r2(yaw), skinLuma: skinLuma == null ? null : Math.round(skinLuma) },
    };
  };

  // ------------------------------------------------------------------ ここからブラウザ専用
  const SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || null;
  let baseUrl = null;
  const defaultBase = () => {
    try { if (SCRIPT_SRC) return new URL('../vendor/mediapipe/', SCRIPT_SRC).href; } catch (e) { /* 下へ */ }
    return 'vendor/mediapipe/';
  };
  api.configure = function (o) { if (o && o.baseUrl) baseUrl = o.baseUrl.endsWith('/') ? o.baseUrl : o.baseUrl + '/'; };
  api.baseUrl = () => baseUrl || defaultBase();
  // 実行時に読むファイル（vendor_mediapipe.sh が置く）。これ以外にはアクセスしない。
  api.ASSETS = ['face_mesh.js', 'face_mesh.binarypb', 'face_mesh_solution_packed_assets.data', 'face_mesh_solution_packed_assets_loader.js',
    'face_mesh_solution_simd_wasm_bin.js', 'face_mesh_solution_simd_wasm_bin.wasm', 'face_mesh_solution_simd_wasm_bin.data',
    'face_mesh_solution_wasm_bin.js', 'face_mesh_solution_wasm_bin.wasm'];

  const WORK_MAX = 800;            // 作業用の最大辺（px）。これより大きい写真は縮める
  const MIN_FACE_PX = 80;          // 顔の幅がこれ未満（作業画像上）なら too_small
  const MIN_FACE_FRAC = 0.12;      // または画像の幅の 12% 未満
  const DARK_IMAGE = 28;           // 画像全体の平均輝度（0..255）がこれ未満なら too_dark
  const DARK_SKIN = 40;            // 肌の輝度がこれ未満なら too_dark（暗すぎて色が測れない）
  const BLUR_VAR = 20;             // 顔の拡大図のラプラシアン分散がこれ未満なら blurry の警告（暫定値）

  let engine = null;               // Promise<FaceMesh>
  let queue = Promise.resolve();   // 同時実行しない

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new PhotoError('engine_unavailable', src));
      document.head.appendChild(s);
    });
  }
  function getEngine() {
    if (engine) return engine;
    engine = (async () => {
      if (typeof document === 'undefined') throw new PhotoError('engine_unavailable', 'no DOM');
      if (typeof location !== 'undefined' && location.protocol === 'file:') throw new PhotoError('engine_unavailable', 'file:// では動きません。http で開いてください');
      const base = api.baseUrl();
      if (!window.FaceMesh) await loadScript(base + 'face_mesh.js');
      if (!window.FaceMesh) throw new PhotoError('engine_unavailable', 'FaceMesh missing');
      const fm = new window.FaceMesh({ locateFile: (f) => base + f });
      fm.setOptions({ maxNumFaces: 2, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5, selfieMode: false });
      await fm.initialize();
      return fm;
    })().catch((e) => { engine = null; throw e instanceof PhotoError ? e : new PhotoError('engine_unavailable', String(e && e.message || e)); });
    return engine;
  }
  // 読み込みだけ先にしておく（写真を選んでいる間などに）。失敗しても例外は投げず、結果を返す。
  api.preload = () => getEngine().then(() => true, (e) => { api.lastEngineError = e; return false; });
  api.dispose = async function () {
    const p = engine; engine = null;
    if (p) { try { const fm = await p; if (fm.close) await fm.close(); } catch (e) { /* 何もしない */ } }
  };

  function sendToMesh(fm, canvas) {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new PhotoError('engine_failed', 'timeout')), 60000);
      fm.onResults((r) => {
        clearTimeout(timer);
        // 数値だけ取り出す。r.image（=入力キャンバス）は持ち出さない。
        const faces = (r.multiFaceLandmarks || []).map((f) => f.map((p) => ({ x: p.x, y: p.y, z: p.z })));
        res(faces);
      });
      try { if (fm.reset) fm.reset(); } catch (e) { /* 何もしない */ }   // 前の写真の追跡状態を持ち越さない（毎回、検出からやり直す）
      fm.send({ image: canvas }).catch((e) => { clearTimeout(timer); rej(new PhotoError('engine_failed', String(e && e.message || e))); });
    });
  }

  function makeSampler(ctx, W, H) {
    return (x, y, r) => {
      const cx = Math.round(x * W), cy = Math.round(y * H);
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) return null;
      const rp = Math.max(1, Math.round(r * W));
      const x0 = Math.max(0, cx - rp), y0 = Math.max(0, cy - rp), x1 = Math.min(W, cx + rp + 1), y1 = Math.min(H, cy + rp + 1);
      const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let sr = 0, sg = 0, sb = 0, n = 0;
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
        if ((i - cx) ** 2 + (j - cy) ** 2 > rp * rp) continue;
        const k = ((j - y0) * (x1 - x0) + (i - x0)) * 4;
        if (d[k + 3] < 128) continue;
        sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; n++;
      }
      return n ? [sr / n, sg / n, sb / n] : null;
    };
  }
  const meanLuma = (ctx, W, H) => { const d = ctx.getImageData(0, 0, W, H).data; let s = 0; for (let k = 0; k < d.length; k += 4) s += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; return s / (d.length / 4); };
  function laplacianVar(ctx, W, H) {
    const d = ctx.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
    for (let k = 0; k < g.length; k++) g[k] = 0.2126 * d[k * 4] + 0.7152 * d[k * 4 + 1] + 0.0722 * d[k * 4 + 2];
    let s = 0, s2 = 0, n = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, l = g[i - 1] + g[i + 1] + g[i - W] + g[i + W] - 4 * g[i]; s += l; s2 += l * l; n++; }
    return n ? s2 / n - (s / n) ** 2 : 0;
  }

  const wipe = (c) => { try { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); } catch (e) { /* 何もしない */ } c.width = 0; c.height = 0; };

  // source: HTMLImageElement | HTMLCanvasElement | ImageBitmap。source 自体は閉じない・書き換えない（fromFile が閉じる）。
  api.fromImage = function (source) {
    const run = async () => {
      if (!source) throw new PhotoError('bad_input');
      const sw = source.naturalWidth || source.videoWidth || source.width, sh = source.naturalHeight || source.videoHeight || source.height;
      if (!(sw > 0 && sh > 0)) throw new PhotoError('bad_input', 'size');
      const k = Math.min(1, WORK_MAX / Math.max(sw, sh));
      const W = Math.max(1, Math.round(sw * k)), H = Math.max(1, Math.round(sh * k));
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let crop = null;
      try {
        ctx.drawImage(source, 0, 0, W, H);
        if (meanLuma(ctx, W, H) < DARK_IMAGE) throw new PhotoError('too_dark');
        const fm = await getEngine();
        const faces = await sendToMesh(fm, canvas);
        if (faces.length === 0) throw new PhotoError('no_face');
        if (faces.length > 1) throw new PhotoError('multiple_faces');
        const lm = faces[0];
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const p of lm) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
        const facePx = (maxX - minX) * W;
        if (facePx < MIN_FACE_PX || (maxX - minX) < MIN_FACE_FRAC) throw new PhotoError('too_small');
        const params = api.deriveParams(lm, makeSampler(ctx, W, H), { aspect: W / H });
        if (params.measures.skinLuma != null && params.measures.skinLuma < DARK_SKIN) throw new PhotoError('too_dark');
        // ピントの目安（顔の部分だけ 128px に拡大縮小して見る）
        try {
          crop = document.createElement('canvas'); crop.width = 128; crop.height = 128;
          const cx = crop.getContext('2d', { willReadFrequently: true });
          cx.drawImage(canvas, Math.max(0, minX * W), Math.max(0, minY * H), Math.max(1, (maxX - minX) * W), Math.max(1, (maxY - minY) * H), 0, 0, 128, 128);
          const lv = laplacianVar(cx, 128, 128);
          params.measures.sharpness = Math.round(lv);
          if (lv < BLUR_VAR) params.warnings.push('blurry');
        } catch (e) { /* ピント確認は任意 */ }
        return params;
      } finally {
        wipe(canvas); if (crop) wipe(crop);
        crop = null;
      }
    };
    const p = queue.then(run, run);
    queue = p.then(() => {}, () => {});
    return p;
  };

  // File（<input type="file"> / ドロップ）→ パラメータ。写真はメモリ内で処理して閉じる。どこにも書かない。
  api.fromFile = async function (file) {
    if (!file || typeof file.size !== 'number') throw new PhotoError('bad_input');
    if (file.type && !/^image\//.test(file.type)) throw new PhotoError('decode_failed', file.type);
    if (file.size > 30 * 1024 * 1024) throw new PhotoError('decode_failed', 'too large');
    let bmp = null, img = null, url = null;
    try {
      try {
        bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });   // EXIF の向きを反映
      } catch (e) {
        url = URL.createObjectURL(file);
        img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new PhotoError('decode_failed')); img.src = url; });
      }
      return await api.fromImage(bmp || img);
    } finally {
      if (bmp && bmp.close) bmp.close();
      if (url) URL.revokeObjectURL(url);
      if (img) { img.onload = img.onerror = null; img.removeAttribute('src'); }
      bmp = img = url = null;
    }
  };

  if (typeof module !== 'undefined') module.exports = api; else { window.OF = window.OF || {}; window.OF.photo = api; }
})();
