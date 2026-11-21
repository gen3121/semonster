// 質問項目。予備調査の質問紙の項目（回収データの列）に合わせてある。5件法。
// 向き: 画面でも保存でも「大きいほど高い／よく当てはまる」。回収データは逆向き（1＝よく当てはまる）だったので 6−x にそろえてある。
// 選択肢の文言は、フォームの原文が手元にないため仮。labelsConfirmed を true にする前に、フォームの文言と照合すること。
(function () {
  const api = {};
  api.labelsConfirmed = false;

  api.AGREE = [[5, 'とても当てはまる'], [4, 'やや当てはまる'], [3, 'どちらでもない'], [2, 'あまり当てはまらない'], [1, '全く当てはまらない']];
  api.FREQ = [[5, 'とてもよくする'], [4, 'よくする'], [3, 'たまにする'], [2, 'あまりしない'], [1, 'ほとんどしない']];

  const L = (id, kind, text, extra) => ({ id, type: 'likert', kind, text, ...extra });
  api.ACTIVITIES = [
    { key: 'media', label: '音楽・動画の視聴', cur: 'cur_media', ideal: 'ideal_media' },
    { key: 'live', label: 'ライブ・イベント参加', cur: 'cur_live', ideal: 'ideal_live' },
    { key: 'goods', label: 'グッズ購入', cur: 'cur_goods', ideal: 'ideal_goods' },
    { key: 'sns', label: 'SNSでの情報収集・交流', cur: 'cur_sns', ideal: 'ideal_sns' },
  ];
  api.ITEMS = {};
  const add = (it) => { api.ITEMS[it.id] = it; return it; };

  // 初回だけ聞く
  ['キャラ（推し）に強く感情移入する', 'アバターが変わると気分も変わる', '「なりたい自分」を可視化されると意欲が湧く'].forEach((t, i) => add(L(['av_empathy', 'av_mood', 'av_visual'][i], 'agree', t, { block: 'baseline', group: 'アバター・キャラへの意識' })));
  [['trg_escape', '嫌なことがあり、現実逃避をしたいとき'], ['trg_reward', '自分へのご褒美・テンションを上げたいとき'], ['trg_payday', '給料日など金銭的余裕があるとき'],
    ['trg_rebound', '仕事などの外せない予定がライブ等と重なり行けなかった反動'], ['trg_recover', 'ひどく疲れていても、推しを見ることで元気を取り戻したいと感じるとき']]
    .forEach(([id, t]) => add(L(id, 'agree', `推し活のスイッチが入るのは、${t}`, { block: 'baseline', group: '推し活のスイッチが入る時' })));
  api.ACTIVITIES.forEach((a) => add(L(a.ideal, 'freq', `あなたが「いちばん幸せ」と感じる頻度は？：${a.label}`, { block: 'baseline', group: '理想の頻度' })));
  // 初回と毎週
  api.ACTIVITIES.forEach((a) => add(L(a.cur, 'freq', `いまの頻度は？：${a.label}`, { block: 'weekly', group: '現状の頻度' })));
  const OUT = [['w_ikigai', '推しの存在が生きがい（活力）になっている'], ['w_confidence', '推し活で自分に自信が持てるようになった'], ['w_schedule', '推し活でスケジュール管理が上手くなった'], ['w_create', '推し活で創作スキルが向上した'],
    ['b_sleep', '推し活で睡眠時間を削り、支障が出ている'], ['b_money', '推し活で予算を超えてお金を使い、不安を感じる'], ['b_duty', '推し活を「しなければならない」という義務感がある'], ['b_envy', 'SNSで他のファンを見て、嫉妬・落胆する']];
  OUT.forEach(([id, t]) => add(L(id, 'agree', `この1週間（これまで）、${t}`, { block: 'weekly', group: id.startsWith('w_') ? '推し活の効果' : '推し疲れ' })));

  // 選択式（お金・時間の余裕と比べるため）。[ラベル, 換算値, 上限（この値未満）]。上限が null は上の端、回答しないは換算値 null。
  const C = (id, text, options, unit) => add({ id, type: 'choice', text, options, unit, block: 'baseline', group: '使える範囲' });
  C('income', '1か月の平均手取り収入（給料・仕送り等）は？', [['5万円未満', 3, 5], ['5〜10万円', 7.5, 10], ['10〜15万円', 12.5, 15], ['15〜20万円', 17.5, 20], ['20〜30万円', 25, 30], ['30万円以上', 35, null], ['回答しない', null]], 'man');
  C('expense', '1か月の平均必要経費（家賃・食費等）は？', [['負担なし', 0, 0.0001], ['5万円未満', 3, 5], ['5〜10万円', 7.5, 10], ['10〜15万円', 12.5, 15], ['15〜20万円', 17.5, 20], ['20万円以上', 25, null], ['回答しない', null]], 'man');
  C('spend', '1か月の平均の推し活費用は？', [['0円', 0, 0.0001], ['5,000円未満', 0.25, 0.5], ['5,000円〜1万円', 0.75, 1], ['1万円〜3万円', 2, 3], ['3万円〜5万円', 4, 5], ['5万円〜10万円', 7.5, 10], ['10万円以上', 12, null]], 'man');
  const HOURS = [['30分未満', 0.25, 0.5], ['1時間程度', 1, 1.5], ['2〜3時間', 2.5, 3.5], ['4〜5時間', 4.5, 5.5], ['6時間以上', 7, null]];
  C('free_wd', '平日、推し活に使える1日の平均自由時間は？', HOURS, 'hour');
  C('free_hd', '休日、推し活に使える1日の平均自由時間は？', HOURS, 'hour');

  // 性格（TIPI-J、5件法。予備調査と同じ形）。大きいほど「当てはまる」
  api.TIPI = ['活発で、外向的だと思う', '他人に不満を持ち、もめごとを起こしやすいと思う', 'しっかりしていて、自分に厳しいと思う', '心配性で、うろたえやすいと思う', '新しい経験に開かれていて、複雑だと思う',
    'ひかえめで、おとなしいと思う', '人に気をつかう、やさしい人間だと思う', 'だらしなく、うっかりしていると思う', '冷静で、気分が安定していると思う', '発想力に欠けた、平凡な人間だと思う'];
  api.TIPI.forEach((t, i) => add(L('tipi_' + (i + 1), 'agree', `自分は、${t}`, { block: 'baseline', group: '性格' })));

  // ブロック: 初回（baseline）＝ 全部、毎週（weekly）＝ 現状の頻度と推し疲れ・効果の8項目
  api.BLOCKS = {
    baseline: ['tipi_1', 'tipi_2', 'tipi_3', 'tipi_4', 'tipi_5', 'tipi_6', 'tipi_7', 'tipi_8', 'tipi_9', 'tipi_10', 'av_empathy', 'av_mood', 'av_visual', 'trg_escape', 'trg_reward', 'trg_payday', 'trg_rebound', 'trg_recover',
      'income', 'expense', 'spend', 'free_wd', 'free_hd', ...api.ACTIVITIES.map((a) => a.ideal), ...api.ACTIVITIES.map((a) => a.cur),
      'w_ikigai', 'w_confidence', 'w_schedule', 'w_create', 'b_sleep', 'b_money', 'b_duty', 'b_envy'],
    weekly: [...api.ACTIVITIES.map((a) => a.cur), 'w_ikigai', 'w_confidence', 'w_schedule', 'w_create', 'b_sleep', 'b_money', 'b_duty', 'b_envy'],
  };
  api.WB_ITEMS = ['w_ikigai', 'w_confidence', 'w_schedule', 'w_create'];
  api.BO_ITEMS = ['b_sleep', 'b_money', 'b_duty', 'b_envy'];
  api.SHORT = { w_ikigai: '生きがい', w_confidence: '自信', w_schedule: 'スケジュール', w_create: '創作スキル', b_sleep: '睡眠', b_money: '金銭の不安', b_duty: '義務感', b_envy: '嫉妬・落胆' };

  if (typeof module !== 'undefined') module.exports = api; else (window.OF = window.OF || {}).instrument = api;
})();
