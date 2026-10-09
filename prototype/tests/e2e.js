// 実際のブラウザ（Chromium）で、file:// で開いて通しで操作する。使い方: PLAYWRIGHT_MODULE=<場所> node tests/e2e.js [スクリーンショットの出力先]
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
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.OF.app.state)));

// いま出ている質問に、ボタンで答える（値の指定がなければ 4／選択肢は2番目）。確認カードが出ていればOK
async function answerAll(page, until, pick = {}) {
  for (let i = 0; i < 200; i++) {
    if (await until()) return;
    if (await page.locator('#confirm-ok').count()) { await page.locator('#confirm-ok').click(); continue; }
    const chips = page.locator('.composer .chips .chip[data-v]');
    if (!(await chips.count())) return;
    const q = await page.locator('.bubble.bot').last().innerText();
    const id = (await page.evaluate((t) => { const I = window.OF.instrument.ITEMS; return Object.keys(I).find((k) => t.includes(I[k].text)); }, q));
    const want = pick[id];
    if (want != null) await page.locator(`.composer .chips .chip[data-v="${want}"]`).click();
    else await chips.nth((await page.locator('.composer .chips .chip[data-v="4"]').count()) ? 3 : 1).click();
  }
  throw new Error('終わらない');
}
const who5 = async (page, labels = ['いつも', 'ほとんどいつも', '半分以上の期間', '半分以上の期間', '半分以下の期間']) => {
  await page.getByText('気分を5つ聞かせてください').waitFor();
  for (const c of labels) await page.locator('.composer .chip', { hasText: new RegExp(`^${c}$`) }).click();
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // ---------- 同意 → アバター
  await page.goto(URL + '?dev=1');
  assert.equal(await page.locator('#ai-opt').isDisabled(), true, 'file:// ではAI読み取りは選べない');
  await shot(page, 'consent');
  await page.locator('#consent-yes').click();
  assert.equal(await page.locator('#photo-btn').count(), 0, 'file:// では写真ボタンを出さない');
  await page.locator('[data-opt=hairStyle] .chip', { hasText: 'ふたつ結び' }).click();
  await page.locator('[data-opt=glasses] .chip', { hasText: 'あり' }).click();
  await shot(page, 'avatar');
  await page.locator('#avatar-done').click();
  step('同意とアバターを通過');

  // ---------- 初回インタビュー：WHO-5 → 質問紙の全項目
  await who5(page);
  assert.equal((await state(page)).who5[0].raw, 17, 'WHO-5 素点 5+4+3+3+2');
  await page.getByText('(1/39)').waitFor();
  // 文章で答える → 確認 → 直す
  await page.locator('#inp').fill('やや当てはまる');
  await page.locator('#send').click();
  await page.locator('#confirm').waitFor();
  await shot(page, 'confirm');
  await page.locator('[data-item=av_empathy] .chip[data-v="5"]').click();
  await page.locator('#confirm-ok').click();
  let st = await state(page);
  assert.equal(st.survey.draft.answers.av_empathy, 5);
  assert.equal(st.survey.draft.src.av_empathy, 'rules+edit');
  // 読み取れない文 → ボタンへ誘導
  await page.locator('#inp').fill('うーん');
  await page.locator('#send').click();
  await page.getByText('うまく読み取れませんでした').waitFor();
  step('文章 → 確認カードで直して確定、読み取れない文はボタンへ誘導');

  // 途中で閉じて再開
  await page.reload();
  await page.getByText('前回の続きから始めます').waitFor();
  assert.equal((await state(page)).survey.draft.answers.av_empathy, 5);
  step('途中で閉じても続きから再開');

  // 残りをボタンで（お金の質問は文章でも）
  await answerAll(page, async () => (await page.locator('.bubble.bot').last().innerText()).includes('1か月の平均手取り'));
  await page.locator('#inp').fill('月12万円くらい');
  await page.locator('#send').click();
  await page.locator('[data-item=income] .chip[aria-pressed=true]').waitFor();
  assert.equal(await page.locator('[data-item=income] .chip[aria-pressed=true]').innerText(), '10〜15万円');
  await page.locator('#confirm-ok').click();
  await answerAll(page, async () => !!(await state(page)).survey.baseline);
  st = await state(page);
  assert.equal(Object.keys(st.survey.baseline.answers).length, 39);
  assert.equal(st.survey.baseline.src.income, 'rules');
  assert.equal(st.survey.draft, null);
  await shot(page, 'baseline-done');
  step('初回の39項目に回答（ボタン・文章の混在）→ 保存');
  assert.deepEqual(await page.locator('nav.tabs button').allInnerTexts(), ['会話', '設定'], '2週間は記録のみ（群Aと同じ画面）');

  // ---------- 開発用：2回分のチェックインを入れて、群Cの画面へ
  await page.locator('[data-tab=me]').click();
  await page.locator('#dev-demo').click();
  assert.deepEqual(await page.locator('nav.tabs button').allInnerTexts(), ['会話', '今週の提案', 'いまの状態', 'ミラー', '設定']);
  await page.locator('[data-tab=checkin]').click();
  await page.getByText('今日の会話はありません').waitFor();

  // 見送りの理由
  await page.locator('[data-tab=plan]').click();
  const nOpt = await page.locator('[data-opt]').count();
  assert.ok(nOpt >= 1 && nOpt <= 3, `提案は1〜3案（${nOpt}）`);
  assert.match(await page.locator('[data-opt="0"]').innerText(), /見込み（0〜100の点数での差）：推し疲れ/);
  await shot(page, 'plan');
  await page.locator('#skip').click();
  await page.locator('#skip-reasons').waitFor();
  await page.locator('[data-reason=busy]').click();
  st = await state(page);
  assert.equal(st.proposals[0].skipped, true); assert.equal(st.proposals[0].skipReason, 'busy');
  step('見送り＋理由コードを保存（見送ってもチェックインは続く）');

  // 作り直して、1案を選ぶ
  await page.locator('[data-tab=me]').click();
  await page.locator('#dev-demo').click();
  await page.locator('[data-tab=plan]').click();
  await page.locator('[data-opt="0"] button', { hasText: 'これを1週間ためす' }).click();
  st = await state(page);
  assert.equal(st.proposals[0].chosen, 0);
  assert.ok(st.proposals[0].forecast.B.BO.lo <= st.proposals[0].forecast.B.BO.hi);

  // ミラー
  await page.locator('[data-tab=mirror]').click();
  assert.equal(await page.locator('[data-path=A] .dots i').count(), 20);
  assert.equal(await page.locator('[data-path=B] .dots i').count(), 20);
  await shot(page, 'mirror');

  // いまの状態（数値は手計算：推し疲れ (3+3+4+4)/4=3.5 → 63、効果 (4+3+2+2)/4=2.75 → 44、費用 2÷(12.5−7.5)=40%）
  await page.locator('[data-tab=state]').click();
  assert.equal(await page.locator('#bo-num').innerText(), '63');
  assert.equal(await page.locator('#wb-num').innerText(), '44');
  assert.equal(await page.locator('#money-num').innerText(), '40');
  assert.equal(await page.locator('[data-section=bo] svg').count(), 1, 'レーダーチャート');
  assert.equal(await page.locator('#why-bo').isHidden(), true);
  await page.locator('[data-why=bo]').click();
  assert.equal(await page.locator('#why-bo').isVisible(), true);
  assert.match(await page.locator('#why-bo').innerText(), /計算式[\s\S]*予備調査215名/);
  await shot(page, 'state-open');
  await page.locator('[data-why=ax-b_sleep]').click();
  assert.match(await page.locator('#why-ax-b_sleep').innerText(), /あなたの回答：3/);
  step('いまの状態：数値が手計算と一致、根拠ボタンで計算式・入力値が開く');

  // ---------- 1週間進めて、チェックイン → 実行の確認 → 理由
  await page.locator('[data-tab=me]').click();
  await page.locator('#dev-d7').click();
  await page.locator('[data-tab=checkin]').click();
  await page.getByText('3回目のチェックインです').waitFor();
  await answerAll(page, async () => (await state(page)).survey.weekly.length === 3);
  await page.getByText('実行できましたか？').waitFor();
  await page.locator('.composer .chip', { hasText: 'できなかった' }).click();
  await page.locator('.composer .chip', { hasText: '時間がなかった' }).click();
  st = await state(page);
  assert.equal(st.proposals[0].exec, 0); assert.equal(st.proposals[0].execReason, 'time');
  await shot(page, 'exec');
  await page.locator('[data-tab=mirror]').click();
  await page.locator('[data-check]').first().waitFor();
  const exp = JSON.parse(await page.evaluate(() => window.OF.store.exportData(window.OF.app.state)));
  assert.equal(exp.weekly.length, 3); assert.equal(exp.proposals[0].execReason, 'time');
  assert.ok(!JSON.stringify(exp).includes('"text"'), '書き出しに本文はない');
  step('1週間後：チェックイン → 実行できなかった理由を保存 → 答え合わせ → 書き出し');

  // ---------- 安全層：強い言葉
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(URL);
  await p2.locator('#consent-yes').click();
  await p2.locator('#avatar-done').click();
  await who5(p2, ['まったくない', 'まったくない', 'まったくない', 'ほんのたまに', 'ほんのたまに']);
  await p2.locator('.res').waitFor();                                            // WHO-5 素点2 → 相談先
  await p2.locator('#inp').fill('もう消えたい');
  await p2.locator('#send').click();
  await p2.getByText('いま、話せる場所があります').waitFor();
  const s2 = await state(p2);
  assert.ok(s2.distress.some((d) => d.kind === 'who5-low') && s2.distress.some((d) => d.kind === 'text-severe'));
  assert.equal(await p2.locator('#inp').count(), 0, '強い言葉のあとは入力欄を閉じる');
  await shot(p2, 'safety');
  step('安全層：WHO-5低得点・強い言葉で相談先を表示し、会話を止める');

  assert.deepEqual(errors, [], 'コンソールエラーなし: ' + errors.join(' / '));
  await browser.close();
  console.log(`OK（スクリーンショット ${n} 枚 → ${OUT}）`);
})().catch((e) => { console.error(e); process.exit(1); });
