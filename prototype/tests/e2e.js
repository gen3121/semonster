// 実際のブラウザ（Chromium）で、file:// で開いて通しで操作する。使い方: node tests/e2e.js [スクリーンショットの出力先]
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const OUT = process.argv[2] || path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let n = 0;
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${String(++n).padStart(2, '0')}_${name}.png`) }); };
const step = (m) => console.log('•', m);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // ---------- 初回設定
  await page.goto(URL);
  await page.getByRole('button', { name: '同意して始める' }).click();
  for (let i = 1; i <= 10; i++) await page.locator('.q').nth(i - 1).locator('.scale button').nth(i % 7).click();
  await shot(page, 'tipi');
  await page.getByRole('button', { name: 'つぎへ' }).click();
  await page.locator('.q', { hasText: 'ライブ・イベント' }).getByRole('button', { name: '増やしたい' }).click();
  await page.locator('.q', { hasText: 'SNS' }).first().getByRole('button', { name: '減らしたい' }).click();
  assert.equal(await page.getByRole('button', { name: 'つぎへ' }).isDisabled(), true, '金額・時間が未入力ならつぎへ進めない');
  await page.locator('[data-lim=budgetYenMonth]').nth(2).click();
  await page.locator('[data-lim=hoursPerDay]').nth(2).click();
  await shot(page, 'wishes');
  await page.getByRole('button', { name: 'つぎへ' }).click();
  await page.getByRole('button', { name: 'ふたつ結び' }).click();
  await page.getByRole('button', { name: 'あり' }).click();
  await shot(page, 'avatar');
  await page.getByRole('button', { name: 'はじめる' }).click();
  step('初回設定を通過');

  // ---------- 1日目は最初に WHO-5（会話の中で5問）
  await page.getByText('気分を5つ聞かせてください').waitFor();
  for (const c of ['いつも', 'ほとんどいつも', '半分以上の期間', '半分以上の期間', '半分以下の期間']) await page.locator('.chips .chip', { hasText: new RegExp('^' + c + '$') }).click();
  await page.getByText('こんばんは。今日の推し活').waitFor();
  assert.equal((await page.evaluate(() => window.OF.app.state)).who5[0].raw, 17, 'WHO-5 素点 5+4+3+3+2');
  step('WHO-5（開始時）を会話で回答 → 素点17');

  // ---------- 会話での記録（1日目）
  const send = async (t) => { await page.locator('#inp').fill(t); await page.locator('#send').click(); };
  await send('夜に配信を2時間くらい見て、そのあとXもだらだら1時間。グッズは買ってない。寝るの遅くなった。');
  // 取れなかった「ライブ」だけ聞かれ、続けて評価を聞かれる
  await page.getByText('ライブや現場には、行った？').waitFor();
  await page.getByRole('button', { name: '行ってない' }).click();
  await page.getByText('楽しさと疲れを、1〜5で教えてください').waitFor();
  await send('うーん');
  await page.getByText('うまく読み取れませんでした').waitFor();
  await page.getByRole('button', { name: '4と2' }).click();
  await page.getByText('こう受け取りました').waitFor();
  const sumText = await page.locator('[data-summary]').last().innerText();
  assert.match(sumText, /配信・動画\s+2時間/); assert.match(sumText, /SNS\s+1時間/); assert.match(sumText, /楽しさ \/ 疲れ\s+4 \/ 2/);
  await shot(page, 'chat_confirm');
  // 直す: 睡眠
  await send('睡眠は少し');
  await page.getByText('直しました').waitFor();
  await page.locator('#ok').click();
  await page.getByText('記録しました（1日目）').waitFor();
  const st = await page.evaluate(() => window.OF.app.state);
  assert.equal(st.logs.length, 1);
  const l = st.logs[0];
  assert.deepEqual([l.live, l.goodsYen, l.streamMin, l.snsMin, l.sleepImpact, l.joy, l.fatigue], [0, 0, 120, 60, 1, 4, 2]);
  await shot(page, 'chat_done');
  step('会話で記録 → 聞き返し → 確認 → 修正 → 保存');

  // 群Aの期間は「記録」と「設定」だけ
  const tabs = await page.locator('nav.tabs button').allInnerTexts();
  assert.deepEqual(tabs, ['記録', '設定']);

  // ---------- 安全層
  await page.evaluate(() => { window.OF.store.save(window.OF.app.state); });
  await page.evaluate(() => { const s = window.OF.app.state; s.devOffsetDays = 1; window.OF.store.save(s); });
  await page.reload();
  await send('今日は何もしたくない、もう消えたい');
  await page.getByText('今日の記録は、ここまでで大丈夫です').waitFor();
  assert.ok(await page.getByText('0120-279-338').isVisible());
  assert.equal(await page.locator('#inp').count(), 0, '強いつらさのあとは入力欄を出さない');
  await shot(page, 'safety');
  const st2 = await page.evaluate(() => window.OF.app.state);
  assert.equal(st2.logs.length, 1, '強い言葉のときは記録を保存しない');
  assert.equal(st2.distress.length, 1);
  step('安全層：相談先を表示し、記録は保存しない');

  // ---------- デモデータ（開発モード）で 群C の画面
  await page.goto(URL + '?dev=1');
  await page.locator('nav.tabs button[data-tab=me]').click();
  await page.locator('[data-group=C]').click();
  await page.getByRole('button', { name: 'デモ14日分を入れる' }).click();
  const tabs2 = await page.locator('nav.tabs button').allInnerTexts();
  assert.deepEqual(tabs2, ['記録', '今週の提案', 'いまの状態', 'ミラー', '設定']);

  await page.locator('nav.tabs button[data-tab=plan]').click();
  await page.locator('[data-opt]').first().waitFor();
  const nOpts = await page.locator('[data-opt]').count();
  assert.ok(nOpts >= 1 && nOpts <= 3);
  await shot(page, 'plan');
  await page.locator('[data-opt]').first().getByRole('button', { name: 'これを1週間ためす' }).click();
  await page.locator('[data-opt].sel').waitFor();

  await page.locator('nav.tabs button[data-tab=mirror]').click();
  await page.locator('.col.a').waitFor();
  const aTxt = await page.locator('.col.a').innerText(), bTxt = await page.locator('.col.b').innerText();
  assert.match(aTxt, /今のまま/); assert.match(bTxt, /提案どおり/); assert.match(aTxt + bTxt, /20人中\d+人が疲れ高め/);
  const fa = +(/推し疲れ\s*([\d.]+)/.exec(aTxt)[1]), fb = +(/推し疲れ\s*([\d.]+)/.exec(bTxt)[1]);
  assert.ok(fb < fa, '提案どおりの方が疲れの見込みが低い');
  await shot(page, 'mirror');
  step(`みらいミラー：疲れの見込み 今のまま ${fa} → 提案どおり ${fb}`);

  // ---------- いまの状態（レーダーと数値・根拠）
  await page.locator('nav.tabs button[data-tab=state]').click();
  await page.locator('[data-section=stress] svg').waitFor();
  const stress = +(await page.locator('#stress-num').innerText());
  const who5 = +(await page.locator('#who5-num').innerText());
  assert.ok(stress >= 0 && stress <= 100); assert.equal(who5, 56, 'WHO-5 素点14 × 4');
  assert.equal(await page.locator('[data-section=stress] svg text').count() >= 10, true, 'レーダーの軸ラベルと値');
  await shot(page, 'state_top');
  // 根拠は最初は閉じていて、ボタンで開く
  const why = page.locator('#why-stress');
  assert.equal(await why.isHidden(), true);
  await page.locator('[data-why=stress]').click();
  assert.equal(await why.isVisible(), true);
  const whyText = await why.innerText();
  assert.match(whyText, /計算式/); assert.match(whyText, /あなたの入力値と計算/); assert.match(whyText, /注意・限界/);
  await page.locator('[data-why=stress]').scrollIntoViewIfNeeded();
  await shot(page, 'state_why_stress');
  await page.locator('[data-why=ax-money]').click();
  const mt = await page.locator('#why-ax-money').innerText();
  assert.match(mt, /使ってよい額：月 30,000円/);
  await page.locator('[data-why=who5]').click();
  assert.match(await page.locator('#why-who5').innerText(), /3 ＋ 3 ＋ 2 ＋ 3 ＋ 3 ＝ 14（素点）[\s\S]*14 × 4 ＝ 56/);
  await page.locator('[data-why=who5]').scrollIntoViewIfNeeded();
  await shot(page, 'state_why_who5');
  // 表示された数字と、根拠の中の計算結果が一致する
  const stressWhy = await page.locator('#why-stress').innerText();
  assert.ok(stressWhy.includes(`＝ ${stress}`), '総合値が根拠の計算結果と一致');
  step(`いまの状態：ストレス ${stress}/100、WHO-5 ${who5}/100、根拠ボタンで計算式・入力値・限界が開く`);

  // 群A・Bの画面には「いまの状態」を出さない
  await page.locator('nav.tabs button[data-tab=me]').click();
  await page.locator('[data-group=B]').click();
  assert.deepEqual(await page.locator('nav.tabs button').allInnerTexts(), ['記録', '今週の提案', '設定']);
  await page.locator('nav.tabs button[data-tab=plan]').click();
  const planB = await page.locator('main').innerText();
  assert.ok(!/充実\s*\d\.\d|20人中/.test(planB), '群Bの提案には予測値を出さない');
  step('群Bの画面：提案の文章だけで、予測値・状態画面は出ない');

  assert.deepEqual(errors, [], 'ブラウザのエラーなし: ' + errors.join(' | '));
  console.log('\nE2E OK  スクリーンショット →', OUT);
  await browser.close();
})().catch((e) => { console.error('\nE2E FAILED:', e.message); process.exit(1); });
