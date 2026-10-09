// 写真アバターとAI読み取りの入口を、http（server/proxy.js と同じ静的配信）で確かめる。偽のAIクライアントを使う。
// 使い方: PLAYWRIGHT_MODULE=<場所> node tests/e2e_http.js <顔写真.png> [スクリーンショットの出力先]（顔写真はリポジトリに置かない）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createApp } = require('../server/proxy.js');
const assert = require('node:assert/strict');
(async () => {
  const fake = { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ answers: { b_sleep: { value: 5, evidence: '徹夜' }, b_money: { value: null, evidence: null }, b_duty: { value: null, evidence: null }, b_envy: { value: null, evidence: null } } }) }] }) } };
  const srv = createApp({ client: fake, logger: false, staticDir: require('path').resolve(__dirname, '..') }); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(base);
  await page.waitForFunction(() => !document.querySelector('#ai-opt').disabled);
  await page.locator('#ai-opt').check();
  await page.locator('#consent-yes').click();
  const before = await page.locator('.pv svg').innerHTML();
  await page.locator('#photo-input').setInputFiles(process.argv[2]);
  await page.waitForFunction(() => document.querySelector('#photo-msg').textContent.includes('似顔絵を作りました'), null, { timeout: 30000 });
  assert.notEqual(await page.locator('.pv svg').innerHTML(), before);
  console.log(await page.locator('#photo-msg').innerText());
  await page.screenshot({ path: (process.argv[3] || '.') + '/http_photo_avatar.png' });
  await page.locator('#avatar-done').click();
  const av = await page.evaluate(() => window.OF.app.state.avatar);
  assert.ok(!('photoApplied' in av)); console.log(JSON.stringify(av));
  // WHO-5 → AI open question on 'avatar' topic? first topic is avatar (openFree) with llm on
  for (const c of ['いつも','いつも','いつも','いつも','いつも']) await page.locator('.composer .chip', { hasText: new RegExp(`^${c}$`) }).click();
  assert.ok(await page.locator('#one-by-one').count(), 'AI on → open question first');
  await page.screenshot({ path: (process.argv[3] || '.') + '/http_ai_open.png' });
  await b.close(); srv.close();
  assert.deepEqual(errs, []); console.log('OK（写真アバター → AI読み取りの入口）');
})().catch((e) => { console.error(e); process.exit(1); });
