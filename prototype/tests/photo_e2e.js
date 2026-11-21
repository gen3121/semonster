// 写真アバターの通し確認（実ブラウザ Chromium + MediaPipe）。
// 使い方: node tests/photo_e2e.js <顔写真.png> [スクリーンショットの出力先]
//   顔写真は repo に入れない。scikit-image のサンプル（宇宙飛行士）を使う場合:
//     python -c "from skimage import data; from PIL import Image; Image.fromarray(data.astronaut()).save('astronaut.png')"
//   環境変数: PHOTO_TEST_IMAGE（引数の代わり）、PLAYWRIGHT_MODULE（playwright の場所）。
//   事前に: bash tools/vendor_mediapipe.sh
// 確かめること: 顔写真 → 値が出る / 顔なし・暗い・複数・小さい・画像でないファイル → 決まったエラーコード /
//   通信は「ページ本体・js・vendor/mediapipe だけ」（外部への通信は遮断して、あれば失敗）/ 保存領域は空のまま /
//   使ったキャンバスとビットマップは空になっている / file:// では動かない（engine_unavailable）。
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean);
  try { tries.push(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); } catch (e) { /* なし */ }
  for (const t of tries) { try { return require(t); } catch (e) { /* 次へ */ } }
  throw new Error('playwright が見つかりません。PLAYWRIGHT_MODULE=/path/to/playwright を指定してください。');
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const IMG = process.argv[2] || process.env.PHOTO_TEST_IMAGE;
const OUT = process.argv[3] || path.join(os.tmpdir(), 'photo_e2e_shots');
if (!IMG || !fs.existsSync(IMG)) { console.error('使い方: node tests/photo_e2e.js <顔写真.png> [出力先]'); process.exit(2); }
if (!fs.existsSync(path.join(ROOT, 'vendor/mediapipe/face_mesh.js'))) { console.error('vendor/mediapipe がありません。先に bash tools/vendor_mediapipe.sh を実行してください。'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json' };
const served = [];   // サーバーが受けたリクエスト
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  served.push(req.method + ' ' + url);
  const f = path.join(ROOT, url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const step = (m) => console.log('•', m);
const fail = [];
const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log('  ok  ', name), (e) => { fail.push(name); console.log('  FAIL', name, '\n      ', e.message.split('\n')[0]); });

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const PAGE = origin + '/tests/fixtures/photo_test.html';
  // MediaPipe は WebGL を使う。ヘッドレスでは SwiftShader（ソフトウェア描画）で動く。--enable-unsafe-swiftshader は新しい Chromium での警告を避けるため。
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 980, height: 760 }, deviceScaleFactor: 1 });
  const requests = [];
  ctx.on('request', (r) => requests.push({ url: r.url(), method: r.method(), post: r.postData() }));
  await ctx.route('**/*', (route) => { const u = route.request().url(); (u.startsWith(origin + '/') || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file://' + ROOT + '/')) ? route.continue() : route.abort(); });
  // 使ったキャンバスとビットマップを後で調べられるようにする
  await ctx.addInitScript(() => {
    window.__canvases = []; window.__bitmaps = [];
    const ce = document.createElement.bind(document);
    document.createElement = (t, o) => { const e = ce(t, o); if (String(t).toLowerCase() === 'canvas') window.__canvases.push([e, /\/js\/photo\.js/.test(new Error().stack || '')]); return e; };
    const cib = window.createImageBitmap.bind(window);
    window.createImageBitmap = async (...a) => { const b = await cib(...a); window.__bitmaps.push(b); return b; };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE);

  // 負例の画像はブラウザのキャンバスで作る（顔写真 1 枚から）。
  const b64 = fs.readFileSync(IMG).toString('base64');
  const variants = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); return c; };
    const out = {};
    const png = (c) => new Promise((r) => c.toBlob((b) => b.arrayBuffer().then((ab) => { const a = new Uint8Array(ab); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); r(btoa(s)); }), 'image/png'));
    out.gray = await png(mk(W, H, (x) => { x.fillStyle = '#808080'; x.fillRect(0, 0, W, H); }));
    out.dark = await png(mk(W, H, (x) => { x.drawImage(img, 0, 0); x.fillStyle = 'rgba(0,0,0,0.96)'; x.fillRect(0, 0, W, H); }));
    // 同じ顔を 2 つ横に並べる（顔まわりを切り出して並べる = 顔が 2 つ検出できる大きさにする）
    const fx = Math.round(W * 0.25), fy = 0, fw = Math.round(W * 0.5), fh = Math.round(W * 0.5);
    out.two = await png(mk(fw * 2, fh, (x) => { x.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh); x.drawImage(img, fx, fy, fw, fh, fw, 0, fw, fh); }));
    // 顔が小さい（全体を 0.75 倍にして灰色の台紙に置く）
    out.small = await png(mk(Math.round(W * 1.25), Math.round(H * 1.25), (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, W * 0.8, H * 0.8); }));
    return out;
  }, b64);
  const file = (name, b64png) => ({ name, mimeType: 'image/png', buffer: Buffer.from(b64png, 'base64') });

  async function run(f) {
    await page.evaluate(() => { window.__result = null; });
    await page.setInputFiles('#file', f);
    await page.waitForFunction(() => window.__result, null, { timeout: 120000 });
    return page.evaluate(() => window.__result);
  }

  // ---------- 顔写真
  step('顔写真 → パラメータ');
  const t0 = Date.now();
  const ok = await run({ name: 'face.png', mimeType: 'image/png', buffer: fs.readFileSync(IMG) });
  const firstMs = Date.now() - t0;
  console.log(JSON.stringify(ok.params, null, 1));
  console.log('  所要時間（初回、エンジン読み込み込み）', firstMs, 'ms');
  await page.screenshot({ path: path.join(OUT, '01_face.png') });
  await check('顔写真: 成功し、肌の色・髪の色・比率が出る', () => {
    assert.equal(ok.ok, true, JSON.stringify(ok));
    const p = ok.params;
    assert.match(p.skin, /^#[0-9A-F]{6}$/); assert.match(p.hairColor, /^#[0-9A-F]{6}$/);
    for (const k of ['faceW', 'jaw', 'eyeGap', 'eyeY']) assert.ok(p[k] >= -1 && p[k] <= 1, k);
    assert.ok(p.confidence.skin >= 0.5 && p.confidence.proportions >= 0.5);
    assert.equal(p.hairStyle, undefined); assert.ok(p.warnings.includes('hairstyle_not_derived'));
  });
  await check('顔写真: アバターが描け、写真由来の項目だけ上書きされる', async () => {
    const av = ok.avatar;
    assert.equal(av.hairStyle, 'bob'); assert.equal(av.shirt, '#5B8DEF'); assert.equal(av.pin, '#E8457C');
    assert.ok(av.photoApplied.includes('skin'));
    assert.ok(await page.locator('#avPhoto svg').count() === 1);
  });
  await check('めがねなしの顔では glasses は null（true を出さない）', () => assert.equal(ok.params.glasses, null));

  step('同じエンジンでもう一度（再利用）');
  const t1 = Date.now();
  const again = await run({ name: 'face2.png', mimeType: 'image/png', buffer: fs.readFileSync(IMG) });
  console.log('  所要時間（2 回目）', Date.now() - t1, 'ms');
  await check('再実行で同じ結果（前の写真の追跡状態を持ち越さない）', () => {
    assert.equal(again.ok, true); assert.deepEqual(again.params, ok.params);
  });

  // ---------- 負例
  step('エラーになるべき入力');
  const neg = [
    ['灰色の画像', file('gray.png', variants.gray), 'no_face'],
    ['ほぼ真っ暗な画像', file('dark.png', variants.dark), 'too_dark'],
    ['顔が 2 つ', file('two.png', variants.two), 'multiple_faces'],
    ['顔が小さい（全体の約 15% 幅）', file('small.png', variants.small), null],
    ['画像でないファイル', { name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }, 'decode_failed'],
    ['壊れた PNG', { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a png at all') }, 'decode_failed'],
  ];
  const negResults = {};
  for (const [label, f, code] of neg) {
    const r = await run(f); negResults[label] = r;
    await check(`${label} → ${code || 'too_small か no_face（顔検出の下限による）'}`, () => {
      assert.equal(r.ok, false, JSON.stringify(r));
      if (code) assert.equal(r.code, code); else assert.ok(['too_small', 'no_face'].includes(r.code), r.code);
      assert.equal(r.name, 'PhotoError');
    });
  }
  await page.screenshot({ path: path.join(OUT, '02_error_screen.png') });
  const after = await run({ name: 'face4.png', mimeType: 'image/png', buffer: fs.readFileSync(IMG) });
  await check('エラーのあとでも、同じ顔写真で同じ結果', () => { assert.equal(after.ok, true); assert.deepEqual(after.params, ok.params); });

  // ---------- 通信・保存領域・後始末
  step('通信・保存・後始末');
  await check('通信は、ページ本体・js・vendor/mediapipe だけ（GET のみ、本文なし）', () => {
    const allowed = (u) => {
      if (u.startsWith('data:') || u.startsWith('blob:')) return true;
      if (!u.startsWith(origin + '/')) return false;
      const p = u.slice(origin.length).split('?')[0];
      return p === '/tests/fixtures/photo_test.html' || p === '/js/avatar.js' || p === '/js/photo.js' || p === '/favicon.ico' ||
        (p.startsWith('/vendor/mediapipe/') && ['face_mesh.js', 'face_mesh.binarypb', 'face_mesh_solution_packed_assets.data', 'face_mesh_solution_packed_assets_loader.js', 'face_mesh_solution_simd_wasm_bin.js', 'face_mesh_solution_simd_wasm_bin.wasm', 'face_mesh_solution_simd_wasm_bin.data', 'face_mesh_solution_wasm_bin.js', 'face_mesh_solution_wasm_bin.wasm'].includes(p.split('/').pop()));
    };
    const bad = requests.filter((r) => !allowed(r.url) || r.method !== 'GET' || r.post);
    assert.deepEqual(bad.map((r) => r.method + ' ' + r.url), []);
    assert.ok(requests.some((r) => r.url.endsWith('face_mesh_solution_packed_assets.data')), 'モデルを vendor から読んでいない');
    console.log('      リクエスト', requests.length, '件。サーバーが受けたパス:', [...new Set(served.map((s) => s.replace('GET ', '')))].join(' '));
  });
  await check('保存領域（localStorage / sessionStorage / IndexedDB / Cache Storage）は空', async () => {
    const st = await page.evaluate(async () => ({
      ls: localStorage.length, ss: sessionStorage.length,
      idb: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null,
      caches: window.caches ? await caches.keys() : null,
    }));
    assert.equal(st.ls, 0); assert.equal(st.ss, 0); assert.deepEqual(st.idb, []); assert.deepEqual(st.caches, []);
  });
  await check('使ったビットマップは close 済み、作業キャンバスは 0x0 に空にしてある', async () => {
    const r = await page.evaluate(() => ({
      bitmaps: window.__bitmaps.map((b) => [b.width, b.height]),
      mine: window.__canvases.filter(([, m]) => m).map(([c]) => [c.width, c.height]),
    }));
    assert.ok(r.bitmaps.length >= 6, 'bitmaps ' + r.bitmaps.length);
    assert.ok(r.bitmaps.every(([w, h]) => w === 0 && h === 0), JSON.stringify(r.bitmaps));
    // photo.js が作ったキャンバス（作業用・ピント確認用）は全部 0x0。（MediaPipe 自身が作るキャンバスは対象外）
    assert.ok(r.mine.length >= 8, 'photo.js canvases ' + r.mine.length);
    assert.ok(r.mine.every(([w, h]) => w === 0 && h === 0), JSON.stringify(r.mine.filter(([w, h]) => w || h)));
  });
  await check('dispose() で WebGL エンジンを閉じられる', async () => {
    await page.evaluate(() => window.OF.photo.dispose());
    const r = await run({ name: 'face3.png', mimeType: 'image/png', buffer: fs.readFileSync(IMG) });   // 閉じても再読み込みして動く
    assert.equal(r.ok, true, JSON.stringify(r));
  });
  await check('ページエラーなし', () => assert.deepEqual(errors, []));

  // ---------- file:// では動かない
  step('file:// で開いた場合');
  const fpage = await ctx.newPage();
  await fpage.goto('file://' + path.join(ROOT, 'tests/fixtures/photo_test.html'));
  await fpage.setInputFiles('#file', { name: 'face.png', mimeType: 'image/png', buffer: fs.readFileSync(IMG) });
  await fpage.waitForFunction(() => window.__result, null, { timeout: 30000 });
  const fr = await fpage.evaluate(() => window.__result);
  await check('file:// では engine_unavailable（日本語の案内あり）', () => { assert.equal(fr.ok, false); assert.equal(fr.code, 'engine_unavailable'); });

  await browser.close(); server.close();
  console.log(fail.length ? `\n失敗 ${fail.length} 件: ${fail.join(' / ')}` : '\n全部通りました');
  console.log('スクリーンショット:', OUT);
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (x) { /* なし */ } process.exit(1); });
