// 会話の進め方。質問紙の項目を「話題」にまとめ、1つの話題を自由な1文で答えてもらえるようにする。
// 質問の文言は instrument.js で固定（測定の同等性）。AI（LLM）や規則は、自由な文を「項目ごとの1〜5」に直すだけで、質問文は変えない。
(function () {
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const api = {};
  const ids = (p) => Object.keys(I.ITEMS).filter((k) => k.startsWith(p));

  api.TOPICS = {
    tipi: { title: '性格', items: ids('tipi_'), open: 'ご自身の性格について、10個の文に当てはまるかを聞きます。ひとつずつ、1〜5で（5＝とても当てはまる）。', openFree: false },
    avatar: { title: 'キャラ・アバターへの気持ち', items: ['av_empathy', 'av_mood', 'av_visual'], open: '推し（キャラ）やアバターへの気持ちを教えてください。推しに感情移入するほうですか？ アバターが変わると気分も変わりますか？ 「なりたい自分」を見せられるとやる気が出ますか？', openFree: true },
    trigger: { title: '推し活のスイッチが入る時', items: ids('trg_'), open: '推し活のスイッチが入るのは、どんな時が多いですか？（嫌なことがあった時、ご褒美にしたい時、給料日、予定と重なって行けなかった反動、疲れている時に元気を取り戻したい時）', openFree: true },
    ideal: { title: '理想の頻度', items: ids('ideal_'), open: '「これくらいが、いちばん幸せ」と感じる頻度を教えてください。音楽・動画の視聴、ライブ・イベント、グッズ購入、SNSでの交流のそれぞれについて。', openFree: true },
    current: { title: 'いまの頻度', items: ids('cur_'), open: '最近の推し活の頻度を教えてください。音楽・動画の視聴、ライブ・イベント、グッズ購入、SNSでの交流のそれぞれについて。', openFree: true },
    burden: { title: '推し疲れ', items: I.BO_ITEMS, open: 'この1週間、推し活で「しんどい」「負担」と感じたことはありますか？ 睡眠、お金、義務感、SNSで他のファンを見た時の気持ち、などを自由に話してください。', openFree: true },
    effect: { title: '推し活の効果', items: I.WB_ITEMS, open: 'この1週間、推し活でよかったことはありますか？ 生きがい、自信、スケジュール管理、創作などについて、自由に話してください。', openFree: true },
    limits: { title: '使える範囲', items: ['income', 'expense', 'spend', 'free_wd', 'free_hd'], open: '最後に、お金と時間の目安を聞きます。「手取り月12万、家賃などが6万、推し活は月2万くらい」のように、まとめて話してもらってもかまいません。', openFree: true },
  };
  api.SEQ = {
    baseline: ['avatar', 'trigger', 'ideal', 'current', 'burden', 'effect', 'limits', 'tipi'],
    weekly: ['current', 'burden', 'effect'],
  };
  api.itemsOf = (topic) => api.TOPICS[topic].items;
  // 質問紙の各項目が、どの話題に属するか
  api.topicOf = (id) => Object.keys(api.TOPICS).find((k) => api.TOPICS[k].items.includes(id));

  if (typeof module !== 'undefined') module.exports = api; else window.OF.topics = api;
})();
