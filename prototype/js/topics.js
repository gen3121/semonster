// 会話の進め方。質問紙の項目を「話題」にまとめ、1つの話題を自由な1文で答えてもらえるようにする。
// 質問の文言は instrument.js で固定（測定の同等性）。AI（LLM）や規則は、自由な文を「項目ごとの1〜5」に直すだけで、質問文は変えない。
(function () {
  const I = typeof module !== 'undefined' ? require('./instrument.js') : window.OF.instrument;
  const api = {};
  const ids = (p) => Object.keys(I.ITEMS).filter((k) => k.startsWith(p));

  api.TOPICS = {
    tipi: { title: '性格', items: ids('tipi_'), open: 'ご自身の性格について、10個の文に当てはまるかを聞きます。ひとつずつ、1〜5で（5＝とても当てはまる）。', openFree: false },
    avatar: { title: 'キャラ・アバターへの気持ち', items: ['av_empathy', 'av_mood', 'av_visual'], openFree: true },
    trigger: { title: '推し活のスイッチが入る時', items: ids('trg_'), openFree: true },
    ideal: { title: '理想の頻度', items: ids('ideal_'), openFree: true },
    current: { title: 'いまの頻度', items: ids('cur_'), openFree: true },
    burden: { title: '推し疲れ', items: I.BO_ITEMS, openFree: true },
    effect: { title: '推し活の効果', items: I.WB_ITEMS, openFree: true },
    limits: { title: '使える範囲', items: ['income', 'expense', 'spend', 'free_wd', 'free_hd'], openFree: true },
  };
  // AIインタビューの問いかけは、質問紙の項目の文そのものから作る（言い換えない）。
  const strip = (t) => t.replace(/^この1週間（これまで）、/, '');
  api.openText = function (topic) {
    const t = api.TOPICS[topic];
    if (t.open) return t.open;
    const its = t.items.map((id) => I.ITEMS[id]);
    const hint = its[0].type === 'choice' ? 'まとめて話してかまいません。' : its[0].kind === 'freq' ? '頻度を、言葉や数字（5＝とてもよくする 〜 1＝ほとんどしない）で。' : 'どれくらい当てはまるかを、言葉や数字（5＝とても当てはまる 〜 1＝全く当てはまらない）で。';
    const when = its.some((it) => /^この1週間（これまで）、/.test(it.text)) ? 'この1週間（これまで）のことで、' : '';
    return `${when}次の${its.length}つについて、自由に話してください。${hint}\n${its.map((it) => '・' + strip(it.text)).join('\n')}`;
  };
  Object.keys(api.TOPICS).forEach((k) => { api.TOPICS[k].open = api.openText(k); });

  api.SEQ = {
    baseline: ['avatar', 'trigger', 'ideal', 'current', 'burden', 'effect', 'limits', 'tipi'],
    weekly: ['current', 'burden', 'effect'],
  };
  api.itemsOf = (topic) => api.TOPICS[topic].items;
  // 質問紙の各項目が、どの話題に属するか
  api.topicOf = (id) => Object.keys(api.TOPICS).find((k) => api.TOPICS[k].items.includes(id));

  if (typeof module !== 'undefined') module.exports = api; else window.OF.topics = api;
})();
