// OshiFit 試作版の画面。依存のない素の JavaScript。
(function () {
  const { util: U, extract: X, safety: S, model: M, proposals: P, tipi: T, who5: W, avatar: A, store: ST, resources: RES, state: SD, radar: RD } = window.OF;
  const root = document.getElementById('app');
  const DEV = new URLSearchParams(location.search).has('dev');
  let s = ST.load();
  let tab = 'log';
  let setup = null;      // 初回設定の途中の状態
  let chat = null;       // 会話の状態
  let mirrorIdx = 0;
  // 「いまの状態」画面を見せる群。記録のみの群Aには見せない（比較を保つため）。研究者が変える。
  const STATE_GROUPS = ['C'];
  const open = {};       // 「この数字の根拠」の開閉

  const save = () => ST.save(s);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const group = () => ST.effectiveGroup(s);
  const day = () => ST.dayIndex(s);
  const FACET = { sleep: '睡眠', money: '出費', duty: '義務感', compare: '比較' };

  // ------------------------------------------------------------ 相談先・つらさ
  function resourcesCard(title) {
    return h('div', { class: 'banner res' },
      h('b', {}, title || 'つらいときは、ひとりで抱えこまないでください'),
      h('div', { class: 'note' }, 'OshiFit を続けなくても大丈夫です。話せる場所があります。'),
      RES.items.filter((r) => r.tel).map((r) => h('div', {}, r.name, '：', h('a', { href: 'tel:' + r.tel.replace(/-/g, '') }, r.tel))),
      h('div', { class: 'note' }, '※ 所属大学の学生相談室もご利用ください。'));
  }
  function distressRecent() {
    const t = ST.today(s);
    return s.distress.some((d) => U.daysBetween(d.date, t) <= 3);
  }
  function noteDistress(kind) {
    s.distress.push({ date: ST.today(s), kind });
    save();
  }

  // ------------------------------------------------------------ 初回設定
  function renderSetup() {
    if (!setup) setup = { step: s.consent ? (s.tipi ? (Object.keys(s.wishes).length ? 3 : 2) : 1) : 0, tipi: Array(10).fill(null), wishes: { ...s.wishes }, av: { ...A.DEFAULT } };
    const steps = [consentView, tipiView, wishesView, avatarView];
    root.replaceChildren(h('header', { class: 'top' }, h('span', { class: 'logo' }, 'OshiFit'), h('span', { class: 'badge' }, '試作版')),
      h('main', {}, h('div', { class: 'proto' }, '試作版です。予測の係数は仮の値で、研究で使う値ではありません。'), steps[setup.step]()));
  }
  function consentView() {
    return h('div', {},
      h('h1', {}, '研究へのご協力について'),
      h('p', { class: 'sub' }, '（倫理審査の承認を得た説明文書に差し替えて使います）'),
      h('div', { class: 'card' },
        h('ul', {}, h('li', {}, '毎日、推し活のことを約30秒で記録します（6週間）。'),
          h('li', {}, '参加は任意で、いつでもやめられます。データの削除も依頼できます。'),
          h('li', {}, '記録は匿名IDで管理します。本文は端末内にだけ残ります。'),
          h('li', {}, 'つらさが強く見えるときは、相談先を表示します。'),
          h('li', {}, '表示される予測は「見込み」で、効果を保証するものではありません。'))),
      h('button', { class: 'btn', onclick: () => { s.consent = true; s.startDate = s.startDate || ST.today(s); save(); setup.step = 1; renderSetup(); } }, '同意して始める'),
      h('button', { class: 'btn secondary', onclick: () => { root.replaceChildren(h('main', {}, h('h1', {}, 'ご協力ありがとうございました'), h('p', {}, 'このページを閉じてください。'))); } }, '同意しない'));
  }
  function tipiView() {
    const body = h('div', {}, h('h1', {}, 'あなたについて'), h('p', { class: 'sub' }, '自分にどれくらい当てはまりますか（TIPI-J・10問・約1分）'));
    T.ITEMS.forEach((t, i) => {
      const sc = h('div', { class: 'scale' });
      for (let v = 1; v <= 7; v++) sc.append(h('button', { 'aria-pressed': setup.tipi[i] === v ? 'true' : 'false', onclick: () => { setup.tipi[i] = v; renderSetup(); } }, v));
      body.append(h('div', { class: 'q' }, h('div', { class: 't' }, `${i + 1}. ${t}`), sc, h('div', { class: 'lbl' }, h('span', {}, '全く違う'), h('span', {}, '強くそう思う'))));
    });
    body.append(h('button', { class: 'btn', disabled: setup.tipi.some((v) => v == null), onclick: () => { s.tipi = { answers: setup.tipi.slice(), scores: T.score(setup.tipi) }; save(); setup.step = 2; renderSetup(); } }, 'つぎへ'));
    return body;
  }
  function wishesView() {
    setup.limits = setup.limits || { ...(s.limits || {}) };
    const body = h('div', {}, h('h1', {}, '増やしたい・減らしたいこと'), h('p', { class: 'sub' }, '提案は、ここで「増やしたい」と選んだ活動を減らさないように作られます。'));
    for (const a of M.ACTIVITIES) {
      const cur = setup.wishes[a.key] || 'same';
      const chips = h('div', { class: 'chips' });
      for (const [v, l] of [['more', '増やしたい'], ['same', 'そのまま'], ['less', '減らしたい']]) chips.append(h('button', { class: 'chip', 'aria-pressed': cur === v ? 'true' : 'false', onclick: () => { setup.wishes[a.key] = v; renderSetup(); } }, l));
      body.append(h('div', { class: 'q' }, h('div', { class: 't' }, a.wish), chips));
    }
    body.append(h('h2', {}, '推し活に使える範囲'), h('p', { class: 'sub' }, '「いまの状態」で、出費と時間の負担を計算するのに使います。目安でかまいません。'));
    const mk = (title, list, key) => {
      const chips = h('div', { class: 'chips' });
      for (const [v, l] of list) chips.append(h('button', { class: 'chip', 'data-lim': key, 'aria-pressed': setup.limits[key] === v ? 'true' : 'false', onclick: () => { setup.limits[key] = v; renderSetup(); } }, l));
      return h('div', { class: 'q' }, h('div', { class: 't' }, title), chips);
    };
    body.append(mk('1か月に、推し活に使ってよい金額', SD.MONTH_BUDGETS, 'budgetYenMonth'), mk('1日に、推し活に使える時間（配信・動画・SNS）', SD.HOURS, 'hoursPerDay'));
    body.append(h('button', { class: 'btn', disabled: !(setup.limits.budgetYenMonth && setup.limits.hoursPerDay), onclick: () => { for (const a of M.ACTIVITIES) setup.wishes[a.key] = setup.wishes[a.key] || 'same'; s.wishes = { ...setup.wishes }; s.limits = { ...setup.limits }; save(); setup.step = 3; renderSetup(); } }, 'つぎへ'));
    return body;
  }
  function avatarView() {
    const pv = h('div', { class: 'pv', html: A.svg(setup.av, 'neutral') });
    const body = h('div', {}, h('h1', {}, 'じぶんアバターをつくる'), h('p', { class: 'sub' }, '写真は使いません。パーツを選んで、あなたに似せてください。'));
    const builder = h('div', { class: 'avbuild' }, pv, h('div', { style: 'flex:1' }));
    const opts = builder.lastChild;
    const rebuild = () => { pv.innerHTML = A.svg(setup.av, 'neutral'); };
    for (const [key, label] of [['hairStyle', '髪型'], ['hairColor', '髪色'], ['skin', '肌'], ['shirt', '服'], ['glasses', 'めがね'], ['pin', '推し色のヘアピン']]) {
      const row = h('div', { class: 'chips' });
      for (const [v, l] of A.OPTIONS[key]) {
        const isColor = typeof v === 'string' && v.startsWith('#');
        const el = isColor
          ? h('button', { class: 'swatch', title: l, 'aria-label': l, style: `background:${v}`, 'aria-pressed': setup.av[key] === v ? 'true' : 'false' })
          : h('button', { class: 'chip', 'aria-pressed': setup.av[key] === v ? 'true' : 'false' }, l);
        el.addEventListener('click', () => { setup.av[key] = v; row.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false')); el.setAttribute('aria-pressed', 'true'); rebuild(); });
        row.append(el);
      }
      opts.append(h('div', { class: 'opt' }, h('div', { class: 'ol' }, label), row));
    }
    body.append(builder, h('button', { class: 'btn', onclick: () => { s.avatar = { ...setup.av }; save(); setup = null; tab = 'log'; render(); } }, 'はじめる'));
    return body;
  }

  // ------------------------------------------------------------ 画面の骨組み
  function render() {
    if (!s.consent || !s.tipi || !s.avatar || !Object.keys(s.wishes).length) return renderSetup();
    const g = group();
    const tabs = [['log', '記録']];
    if (g === 'B' || g === 'C') tabs.push(['plan', '今週の提案']);
    if (STATE_GROUPS.includes(g) || s.showStateAll) tabs.push(['state', 'いまの状態']);
    if (g === 'C') tabs.push(['mirror', 'ミラー']);
    tabs.push(['me', '設定']);
    if (!tabs.some(([k]) => k === tab)) tab = 'log';
    const header = h('header', { class: 'top' }, h('div', { class: 'av', html: A.svg(s.avatar, 'neutral') }), h('span', { class: 'logo' }, 'OshiFit'),
      h('span', { class: 'badge' }, `${day() + 1}日目`));
    const nav = h('nav', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { 'aria-current': tab === k ? 'page' : 'false', 'data-tab': k, onclick: () => { tab = k; render(); } }, l)));
    const main = h('main', {});
    root.replaceChildren(header, main, nav);
    ({ log: viewLog, plan: viewPlan, state: viewState, mirror: viewMirror, me: viewMe })[tab](main);
  }

  // ------------------------------------------------------------ 会話での記録
  const NEEDS_WHO5 = () => W.DUE_DAYS.filter((d) => day() >= d && !s.who5.some((w) => w.due === d)).slice(-1)[0];

  function viewLog(main) {
    main.style.padding = '10px 14px 0';
    main.style.display = 'flex'; main.style.flexDirection = 'column';
    const wrap = h('div', { class: 'chat' });
    const msgs = h('div', { class: 'msgs', id: 'msgs' });
    const composer = h('div', { class: 'composer' });
    wrap.append(msgs, composer);
    main.append(wrap);
    if (!chat || chat.date !== ST.today(s)) chat = { date: ST.today(s), phase: 'start', draft: null, queue: [], pending: null, who5: null, log: [] };
    chat.ui = { msgs, composer };
    // 以前の会話を再描画
    chat.log.forEach((m) => addBubble(m.who, m.text, m.warn, true));
    if (chat.phase === 'start') begin();
    else showComposer();
  }

  function addBubble(who, text, warn, replay) {
    const b = h('div', { class: `bubble ${who}${warn ? ' warn' : ''}` }, text);
    chat.ui.msgs.append(b);
    chat.ui.msgs.scrollTop = chat.ui.msgs.scrollHeight;
    if (!replay) chat.log.push({ who, text, warn });
    return b;
  }
  const bot = (t, warn) => addBubble('bot', t, warn);
  const me = (t) => addBubble('me', t);

  function begin() {
    const due = NEEDS_WHO5();
    if (due != null) {
      chat.phase = 'who5'; chat.who5 = { due, i: 0, a: [] };
      bot(`${due === 0 ? 'はじめに' : `${due / 7}週目の区切りに`}、この2週間（1週間）の気分を5つ聞かせてください。`);
      return askWho5();
    }
    const today = ST.logToday(s);
    if (today) {
      chat.phase = 'logged';
      bot(`今日（${ST.today(s)}）の記録は済んでいます。\n「${today.text || '（ひとことなし）'}」`);
      bot('直したいところがあれば、そのまま書いてください。');
      chat.draft = { ...today };
      chat.phase = 'confirm-edit';
    } else {
      chat.phase = 'free';
      bot('こんばんは。今日の推し活、ひとこと聞かせてください。\n例：「夜に配信を2時間見て、Xを1時間。グッズは買ってない。寝るのが遅くなった」');
    }
    showComposer();
  }

  function chipsFor(field) {
    return ({
      live: [['行った', '行った'], ['行ってない', '行ってない']],
      goods: [['0円', '買ってない'], ['千円くらい', '1000円'], ['5千円くらい', '5000円'], ['1万円くらい', '10000円']],
      time: [['どっちも見てない', 'どっちも見てない']],
      sleep: [['なし', 'なし'], ['少し', '少し'], ['かなり', 'かなり']],
      rating: [['4と2', '4と2'], ['3と3', '3と3'], ['2と4', '2と4']],
      facet: [['睡眠', '睡眠'], ['出費', '出費'], ['義務感', '義務感'], ['比較', '比較']],
    })[field] || [];
  }
  const QUESTION = {
    sleep: '睡眠への影響は、なし／少し／かなり、のどれ？',
    time: '配信・動画と、SNSは、それぞれ何時間くらい？\n例：「配信2時間、SNS1時間」',
    goods: '今日のグッズや課金は、いくらくらい？（0円でもOK）',
    live: 'ライブや現場には、行った？',
    rating: '楽しさと疲れを、1〜5で教えてください。（5が一番）\n例：「4と2」＝楽しさ4・疲れ2',
    facet: 'いちばんの疲れは、どれに近い？\n睡眠／出費／義務感／比較',
  };

  function showComposer() {
    const c = chat.ui.composer;
    c.replaceChildren();
    const chips = h('div', { class: 'chips' });
    if (chat.phase === 'who5') {
      for (const [l, v] of W.CHOICES) chips.append(h('button', { class: 'chip', onclick: () => answerWho5(l, v) }, l));
      c.append(chips);
      return;
    }
    if (chat.phase === 'done') return;
    if (chat.phase === 'confirm' || chat.phase === 'confirm-edit') {
      chips.append(h('button', { class: 'chip', id: 'ok', onclick: () => finish() }, chat.phase === 'confirm' ? 'OK、これで記録する' : '変更なし'));
    } else if (chat.phase === 'ask') {
      for (const [send, label] of chipsFor(chat.pending)) chips.append(h('button', { class: 'chip', onclick: () => handle(send) }, label));
      chips.append(h('button', { class: 'chip', onclick: () => handle('わからない') }, 'わからない'));
    }
    const ta = h('textarea', { rows: 1, placeholder: chat.phase === 'free' ? '今日のことを、ひとこと' : 'ここに書く', 'aria-label': '入力欄', id: 'inp' });
    const send = h('button', { class: 'btn send', id: 'send', onclick: () => { const v = ta.value.trim(); if (v) { ta.value = ''; handle(v); } } }, '送る');
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send.click(); } });
    c.append(chips, h('div', { class: 'row' }, ta, send));
  }

  function handle(text) {
    me(text);
    // つらさの検知（本文は保存しない）
    const dt = S.detectText(text);
    if (dt === 'severe') {
      noteDistress('text-severe');
      bot('話してくれてありがとう。とてもつらい気持ちが伝わってきました。今日の記録は、ここまでで大丈夫です。', true);
      chat.ui.msgs.append(resourcesCard('いま、話せる場所があります'));
      chat.phase = 'done'; return showComposer();
    }
    if (dt === 'heavy') { noteDistress('text-heavy'); bot('かなりしんどそうですね。無理に続けなくて大丈夫です。必要なら、下の相談先も使ってください。', true); chat.ui.msgs.append(resourcesCard()); }

    switch (chat.phase) {
      case 'free': {
        const rec = X.extractLog(text);
        rec.text = text;
        chat.draft = rec;
        chat.queue = X.missingFields(rec).slice(0, 3);   // 聞き返しは最大3問（残りは欠測のまま）
        if (rec.joy == null || rec.fatigue == null) chat.queue.push('rating');
        return next();
      }
      case 'ask': {
        const ans = X.parseAnswer(chat.pending, text);
        if (!ans) { bot('ごめんなさい、うまく読み取れませんでした。もう一度、ボタンか短い言葉でお願いします。'); return showComposer(); }
        applyAnswer(chat.pending, ans);
        chat.queue.shift();
        return next();
      }
      case 'confirm':
      case 'confirm-edit': {
        if (/^(ok|おけ|いいよ|大丈夫|はい|これで)/i.test(text.trim())) return finish();
        const fix = X.extractLog(text);
        const d = chat.draft;
        for (const k of ['live', 'goodsYen', 'streamMin', 'snsMin', 'sleepImpact', 'joy', 'fatigue']) if (fix[k] != null) d[k] = fix[k];
        const ans = ['rating', 'time', 'sleep', 'goods', 'live'].map((f) => [f, X.parseAnswer(f, text)]).filter(([, a]) => a && !a.unknown);
        let changed = Object.keys(fix).some((k) => k[0] !== '_' && fix[k] != null && k !== 'mainFatigue');
        if (!changed && ans.length === 1) { applyAnswer(ans[0][0], ans[0][1]); changed = true; }
        d.text = (d.text ? d.text + ' / ' : '') + text;
        bot(changed ? '直しました。これでどうですか？' : 'うまく読み取れませんでした。「ライブは行ってない」「睡眠は少し」のように書いてください。');
        showSummary(d);
        return showComposer();
      }
      default: return showComposer();
    }
  }

  function applyAnswer(field, ans) {
    const d = chat.draft;
    if (ans.unknown) return;
    const v = ans.value;
    if (field === 'time') { if (v.stream != null) d.streamMin = v.stream; if (v.sns != null) d.snsMin = v.sns; if (d.streamMin == null) d.streamMin = 0; if (d.snsMin == null) d.snsMin = 0; }
    else if (field === 'live') d.live = v;
    else if (field === 'goods') d.goodsYen = v;
    else if (field === 'sleep') d.sleepImpact = v;
    else if (field === 'rating') { d.joy = v.joy; d.fatigue = v.fatigue; }
    else if (field === 'facet') d.mainFatigue = v;
  }

  function next() {
    const d = chat.draft;
    // 疲れ 3 以上で、疲れの中身が一つに決まらないときだけ聞く
    if (!chat.queue.length && d.fatigue != null && d.fatigue >= 3 && !d.mainFatigue) {
      if (d._facets && d._facets.length === 1) d.mainFatigue = d._facets[0];
      else if (!chat.askedFacet) { chat.askedFacet = true; chat.queue.push('facet'); }
    }
    if (chat.queue.length) {
      chat.phase = 'ask'; chat.pending = chat.queue[0];
      bot(QUESTION[chat.pending]);
      return showComposer();
    }
    chat.phase = 'confirm';
    bot('ありがとう。こう受け取りました。合っていますか？');
    showSummary(d);
    showComposer();
  }

  function fmt(d) {
    const t = (m) => (m == null ? '—（聞いていません）' : m === 0 ? 'なし' : m >= 60 ? `${Math.round(m / 6) / 10}時間` : `${m}分`);
    return [
      ['ライブ・現場', d.live == null ? '—（聞いていません）' : d.live ? '行った' : 'なし'],
      ['グッズ・課金', d.goodsYen == null ? '—（聞いていません）' : `${d.goodsYen.toLocaleString()}円`],
      ['配信・動画', t(d.streamMin)], ['SNS', t(d.snsMin)],
      ['睡眠への影響', d.sleepImpact == null ? '—（聞いていません）' : ['なし', '少し', 'かなり'][d.sleepImpact]],
      ['楽しさ / 疲れ', d.joy == null ? '—' : `${d.joy} / ${d.fatigue}`],
      ['疲れの中身', d.mainFatigue ? FACET[d.mainFatigue] : '—'],
    ];
  }
  function showSummary(d) {
    const dl = h('dl', {}); for (const [k, v] of fmt(d)) dl.append(h('dt', {}, k), h('dd', {}, v));
    chat.ui.msgs.append(h('div', { class: 'summary', 'data-summary': '1' }, dl));
    chat.ui.msgs.scrollTop = chat.ui.msgs.scrollHeight;
  }

  function finish() {
    const d = chat.draft;
    const rec = { date: ST.today(s), live: d.live, goodsYen: d.goodsYen, streamMin: d.streamMin, snsMin: d.snsMin, sleepImpact: d.sleepImpact, joy: d.joy, fatigue: d.fatigue, mainFatigue: d.mainFatigue || null, text: d.text || '' };
    ST.upsertLog(s, rec); save();
    bot(`記録しました（${day() + 1}日目）。おつかれさま。`);
    if (S.detectStreak(s.logs)) { noteDistress('fatigue-streak'); bot('疲れが強い日が続いています。無理せず、休む日をつくってくださいね。', true); chat.ui.msgs.append(resourcesCard()); }
    chat.phase = 'done'; showComposer(); renderNavOnly();
  }
  const renderNavOnly = () => { const b = document.querySelector('header .badge'); if (b) b.textContent = `${day() + 1}日目`; };

  // WHO-5（会話の中で）
  function askWho5() { const w = chat.who5; bot(`（${w.i + 1}/5）この期間、${W.ITEMS[w.i]}`); showComposer(); }
  function answerWho5(label, v) {
    const w = chat.who5; me(label); w.a.push(v); w.i++;
    if (w.i < 5) return askWho5();
    const raw = W.raw(w.a);
    s.who5.push({ due: w.due, date: ST.today(s), raw, answers: w.a }); save();
    bot('ありがとうございました。');
    if (S.detectWho5(raw)) { noteDistress('who5-low'); bot('最近、気持ちの余裕があまりないようです。話せる場所があるので、よければ使ってください。', true); chat.ui.msgs.append(resourcesCard()); }
    chat.phase = 'free'; chat.who5 = null; begin();
  }

  // ------------------------------------------------------------ 今週の提案（群B・C）
  const weekIndex = () => Math.min(3, Math.max(0, Math.floor((day() - 14) / 7)));
  function currentProposal() {
    const w = weekIndex();
    let p = s.proposals.find((x) => x.week === w);
    if (!p) {
      const r = P.generate(s.logs, ST.today(s), s.wishes);
      p = { week: w, createdDate: ST.today(s), chosen: null, skipped: false, exec: null, options: r.options.map((o) => ({ id: o.id, label: o.label, texts: o.texts, changes: o.changes, dJoy: o.dJoy, dFatigue: o.dFatigue })), baseLevels: r.habit.levels };
      s.proposals.push(p); save();
    }
    return p;
  }
  function viewPlan(main) {
    main.style.padding = '14px';
    if (day() < 14) return main.append(h('p', {}, '提案は、記録のみの2週間が終わってから表示されます。'));
    if (distressRecent()) return main.append(resourcesCard('いまは、提案よりも休むことを優先しましょう'));
    const w = weekIndex();
    const prev = s.proposals.find((x) => x.week === w - 1);
    if (prev && prev.chosen != null && prev.exec == null) {
      return main.append(h('h1', {}, '先週の振り返り'), h('div', { class: 'card' }, h('p', {}, '先週選んだ案：'), prev.options[prev.chosen].texts.map((t) => h('div', {}, '・', t)), h('p', {}, '実行できましたか？'),
        [['できた', 1], ['一部できた', 0.5], ['できなかった', 0]].map(([l, v]) => h('button', { class: 'btn small secondary', onclick: () => { prev.exec = v; save(); render(); } }, l))));
    }
    const p = currentProposal();
    const hint = h('p', { class: 'sub' }, `第${w + 1}週の提案（${p.createdDate}）。あなたの「増やしたい」は減らさないようにしています。`);
    main.append(h('h1', {}, '今週、どれを試す？'), hint);
    if (!p.options.length) main.append(h('div', { class: 'card' }, '今の記録からは、疲れを下げる組み替え案が見つかりませんでした。今週はこのままで大丈夫です。'));
    p.options.forEach((o, i) => {
      const card = h('div', { class: 'card' + (p.chosen === i ? ' sel' : ''), 'data-opt': i }, h('b', {}, o.label), o.texts.map((t) => h('div', {}, '・', t)));
      if (p.chosen == null && !p.skipped) card.append(h('button', { class: 'btn small', onclick: () => { choose(p, i); } }, 'これを1週間ためす'));
      if (p.chosen === i) card.append(h('div', { class: 'note' }, '選択中。1週間後に、実行できたかを聞きます。'));
      if (group() === 'C') card.append(h('button', { class: 'btn small secondary', onclick: () => { mirrorIdx = i; tab = 'mirror'; render(); } }, 'みらいミラーで比べる'));
      main.append(card);
    });
    if (p.chosen == null && !p.skipped) main.append(h('button', { class: 'btn secondary', onclick: () => { p.skipped = true; save(); render(); } }, '今週は見送る'));
    if (p.skipped) main.append(h('div', { class: 'note' }, '今週は見送りました。'));
  }
  function choose(p, i) {
    p.chosen = i;
    if (group() === 'C') {
      const lv = M.habitFromLogs(s.logs, ST.today(s), 14);
      p.forecast = { A: pickF(M.forecast(s.logs, ST.today(s), lv.levels)), B: pickF(M.forecast(s.logs, ST.today(s), P.apply(lv, p.options[i].changes))) };
    }
    save(); render();
  }
  const pickF = (f) => ({ fatigue: { mean: f.fatigue.mean, lo: f.fatigue.lo, hi: f.fatigue.hi }, joy: { mean: f.joy.mean } });

  // ------------------------------------------------------------ いまの状態（レーダーチャートと数値・根拠つき）
  function whyBox(id, title, d) {
    const box = h('div', { class: 'why', id: 'why-' + id, hidden: !open[id] },
      h('div', { class: 'why-row' }, h('b', {}, '計算式'), h('div', {}, d.formula)),
      h('div', { class: 'why-row' }, h('b', {}, 'あなたの入力値と計算'), h('ul', {}, d.inputs.map((t) => h('li', {}, t)))),
      h('div', { class: 'why-row' }, h('b', {}, '注意・限界'), h('div', {}, d.note)));
    const btn = h('button', { class: 'chip why-btn', 'data-why': id, 'aria-expanded': open[id] ? 'true' : 'false', 'aria-controls': 'why-' + id,
      onclick: () => { open[id] = !open[id]; box.hidden = !open[id]; btn.setAttribute('aria-expanded', open[id] ? 'true' : 'false'); btn.textContent = open[id] ? '根拠をとじる' : 'この数字の根拠'; } }, open[id] ? '根拠をとじる' : 'この数字の根拠');
    return [btn, box];
  }
  function meter(label, v, color) {
    return h('div', { class: 'meter' }, h('div', { class: 'ml' }, h('span', {}, label), h('b', {}, v == null ? '—' : v)),
      h('div', { class: 'bar' }, h('i', { style: `width:${v == null ? 0 : v}%;background:${color}` })));
  }
  function viewState(main) {
    main.style.padding = '14px';
    const t = ST.today(s);
    if (!s.limits) return main.append(h('p', {}, '設定で「使ってよい金額・使える時間」を入力すると表示されます。'));
    const r = SD.compute(s, t);
    main.append(h('h1', {}, 'いまの状態'), h('p', { class: 'sub' }, `推し活による負担と気分を、直近${r.window}日の記録から数値にしました（記録のある日：${r.days}日）。診断ではありません。`));
    if (!r.ready) return main.append(h('div', { class: 'card' }, '記録が3日分たまると表示されます。'));
    if (distressRecent()) main.append(resourcesCard('数字よりも、いまは休むことを優先しましょう'));

    // ストレス
    const st = r.stress;
    const stCard = h('div', { class: 'card', 'data-section': 'stress' },
      h('h2', { style: 'margin-top:0' }, 'ストレス（推し疲れ）'),
      h('div', { class: 'big' }, h('span', { class: 'num', id: 'stress-num' }, st.value == null ? '—' : st.value), h('span', { class: 'of' }, ' / 100'), st.value != null ? h('span', { class: 'band', 'data-band': SD.band(st.value) }, SD.band(st.value)) : null),
      h('p', { class: 'note', style: 'margin-top:0' }, SD.SECTION_HELP.stress),
      h('div', { html: RD.svg(r.axes.map((a) => ({ label: a.label, value: a.value })), { color: '#E8457C' }) }),
      whyBox('stress', '総合', st));
    main.append(stCard);
    const axCard = h('div', { class: 'card', 'data-section': 'axes' }, h('h2', { style: 'margin-top:0' }, '軸ごとの数値'));
    for (const a of r.axes) axCard.append(h('div', { class: 'axrow', 'data-axis': a.key }, meter(a.label, a.value, '#E8457C'), whyBox('ax-' + a.key, a.label, a)));
    axCard.append(h('div', { class: 'note' }, SD.BAND_NOTE));
    main.append(axCard);

    // 幸福度
    const wb = r.who5;
    const wbCard = h('div', { class: 'card', 'data-section': 'wellbeing' }, h('h2', { style: 'margin-top:0' }, '幸福度（ウェルビーイング）'));
    if (wb) {
      wbCard.append(h('div', { class: 'big' }, h('span', { class: 'num', id: 'who5-num' }, wb.value), h('span', { class: 'of' }, ' / 100'), h('span', { class: 'band', 'data-band': wb.raw < 13 ? '重め' : 'ゆとりあり' }, wb.raw < 13 ? '低め（要ケア）' : '保たれている')),
        h('p', { class: 'note', style: 'margin-top:0' }, SD.SECTION_HELP.wellbeing),
        h('div', { html: RD.svg(W.ITEMS.map((it, i) => ({ label: ['気分', '落ち着き', '意欲', '休息', '興味'][i], value: wb.answers[i] })), { max: 5, color: '#12A38A', rings: [0.2, 0.4, 0.6, 0.8, 1], fmt: (v) => `${v}/5` }) }),
        ...whyBox('who5', 'WHO-5', wb));
    } else wbCard.append(h('p', { class: 'note' }, 'WHO-5 は、2週ごとの記録の会話で答えると表示されます。'));
    wbCard.append(h('div', { class: 'axrow' }, meter('毎日の楽しさ', r.joy.value, '#12A38A'), whyBox('joy', '楽しさ', r.joy)));
    main.append(wbCard);
  }

  // ------------------------------------------------------------ みらいミラー（群C）
  function dots(f, color, off) {
    const wrap = h('div', { class: 'dots', role: 'img', 'aria-label': `20人中${f.highCount}人が疲れ高め` });
    f.fatigue.dots.slice().sort((a, b) => a - b).forEach((d) => wrap.append(h('i', { style: `background:${d >= M.PARAMS.highFatigue ? color : off}` })));
    return wrap;
  }
  function viewMirror(main) {
    main.style.padding = '14px';
    if (day() < 14) return main.append(h('p', {}, 'みらいミラーは、記録のみの2週間が終わってから表示されます。'));
    if (distressRecent()) return main.append(resourcesCard('いまは、予測を見るよりも休むことを優先しましょう'));
    const p = currentProposal();
    if (!p.options.length) return main.append(h('p', {}, '比べる提案がありません。'));
    mirrorIdx = Math.min(mirrorIdx, p.options.length - 1);
    const o = p.options[mirrorIdx];
    const today = ST.today(s);
    const lv = M.habitFromLogs(s.logs, today, 14);
    const fa = M.forecast(s.logs, today, lv.levels), fb = M.forecast(s.logs, today, P.apply(lv, o.changes));
    main.append(h('h1', {}, '6週間後のあなた'), h('p', { class: 'sub' }, `いまの記録から予測した「見込み」です。比べているのは：${o.label}`),
      h('div', { class: 'chips' }, p.options.map((q, i) => h('button', { class: 'chip', 'aria-pressed': i === mirrorIdx ? 'true' : 'false', onclick: () => { mirrorIdx = i; render(); } }, q.label.slice(0, 1) + ' ' + q.label.slice(2)))));
    const col = (cls, title, f, color, off) => h('div', { class: 'col ' + cls, 'data-path': cls === 'a' ? 'A' : 'B' }, h('h3', {}, title),
      h('div', { html: A.svg(s.avatar, M.expressionFor(f.fatigue.mean)) }),
      h('div', { class: 'val' }, '充実 ', h('b', {}, f.joy.mean.toFixed(1)), ` (${f.joy.lo.toFixed(1)}–${f.joy.hi.toFixed(1)})`),
      h('div', { class: 'val' }, '推し疲れ ', h('b', {}, f.fatigue.mean.toFixed(1)), ` (${f.fatigue.lo.toFixed(1)}–${f.fatigue.hi.toFixed(1)})`),
      dots(f, color, off), h('div', { class: 'note', style: 'text-align:center;margin:0' }, `20人中${f.highCount}人が疲れ高め`));
    main.append(h('div', { class: 'split' }, col('a', '今のまま', fa, '#E07A10', '#F9D9B8'), col('b', '提案どおり', fb, '#12A38A', '#BFE8DF')));
    main.append(h('div', { class: 'note' }, `カッコ内は80%の幅。記録が${fb.fatigue.n}日分あり、記録が増えると幅はせまくなります。見込みであって、効果を保証するものではありません。`),
      h('div', { class: 'proto' }, '試作版：予測の係数は仮の値です。'));
    // 答え合わせ
    const prev = s.proposals.find((x) => x.week === weekIndex() - 1);
    if (prev && prev.chosen != null && prev.forecast) {
      const from = prev.createdDate, to = U.addDays(from, 6);
      const act = U.mean(s.logs.filter((l) => l.date >= from && l.date <= to).map((l) => l.fatigue));
      if (act != null) {
        const f = prev.forecast.B.fatigue; const ok = act >= f.lo - 1e-9 && act <= f.hi + 1e-9;
        main.append(h('div', { class: 'card', 'data-check': '1' }, h('b', {}, '答え合わせ'), h('div', {}, `先週の見込み（提案どおり）：疲れ ${f.mean.toFixed(1)}（${f.lo.toFixed(1)}–${f.hi.toFixed(1)}）`),
          h('div', {}, `実際の先週の平均：${act.toFixed(1)} ${ok ? '→ 範囲内でした' : '→ 範囲の外でした'}`)));
      }
    }
  }

  // ------------------------------------------------------------ 設定
  function viewMe(main) {
    main.style.padding = '14px';
    const sc = s.tipi.scores;
    main.append(h('h1', {}, '設定'),
      h('div', { class: 'card' }, h('div', { class: 'avbuild' }, h('div', { class: 'pv', html: A.svg(s.avatar, 'neutral') }),
        h('div', {}, h('b', {}, `参加ID ${s.id}`), h('div', { class: 'note' }, `開始日 ${s.startDate}（${day() + 1}日目）`), h('div', { class: 'note' }, `いまの画面：群${group()}${day() < 14 ? '（記録のみの期間）' : ''}`)))),
      h('div', { class: 'card' }, h('b', {}, '性格（TIPI-J）'), h('div', { class: 'note' }, Object.entries(T.LABELS).map(([k, l]) => `${l} ${sc[k].toFixed(1)}`).join('　'))),
      h('div', { class: 'card' }, h('b', {}, '研究者コード（群の割り付け）'), h('div', { class: 'note' }, '記録のみの2週間のあと、この群の画面になります。実験では割り付けを研究者が行います。'),
        h('div', { class: 'chips' }, ['A', 'B', 'C'].map((g) => h('button', { class: 'chip', 'data-group': g, 'aria-pressed': s.group === g ? 'true' : 'false', onclick: () => { s.group = g; save(); render(); } }, `群${g}`)))),
      h('button', { class: 'btn secondary', onclick: exportJson }, '記録を書き出す（研究者へ渡す）'),
      resourcesCard('相談先'),
      h('button', { class: 'btn secondary', onclick: () => { if (confirm('端末内の記録をすべて消します。よろしいですか？')) { ST.reset(); s = ST.load(); setup = null; chat = null; render(); } } }, '参加をやめて、記録を消す'));
    if (DEV) main.append(devPanel());
  }
  function exportJson() {
    const blob = new Blob([ST.exportData(s)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `oshifit_${s.id}.json` });
    document.body.append(a); a.click(); a.remove();
  }

  // ------------------------------------------------------------ 開発用（?dev=1）
  function demoLogs() {
    // 夜更かし・SNS 多めの人の14日分（疑似乱数・固定）
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = [];
    for (let i = 0; i < 14; i++) {
      const date = U.addDays(s.startDate, i); const weekend = i % 7 >= 5;
      out.push({ date, live: weekend && rnd() > 0.4 ? 1 : 0, goodsYen: weekend ? 6000 : 500, streamMin: 120 + Math.round(rnd() * 60), snsMin: 150 + Math.round(rnd() * 60),
        sleepImpact: weekend ? 0 : 1, joy: 4, fatigue: Math.min(5, Math.round((3.4 + rnd() * 1.2) * 10) / 10), mainFatigue: weekend ? 'money' : 'sleep', text: '（デモデータ）' });
    }
    return out;
  }
  function devPanel() {
    const mk = (l, f) => h('button', { class: 'btn small secondary', onclick: () => { f(); save(); chat = null; render(); } }, l);
    return h('div', { class: 'dev', id: 'dev' }, h('b', {}, '開発用'),
      h('div', {}, mk(s.showStateAll ? '状態画面を群Cだけに戻す' : '状態画面を全群に表示', () => { s.showStateAll = !s.showStateAll; }), mk('+1日', () => { s.devOffsetDays++; }), mk('+7日', () => { s.devOffsetDays += 7; }),
        mk('デモ14日分を入れる', () => { const t = ST.today(s); s.startDate = U.addDays(t, -14); s.logs = demoLogs(); s.limits = s.limits || { budgetYenMonth: 30000, hoursPerDay: 4 }; s.who5 = [{ due: 0, date: s.startDate, raw: 15, answers: [3, 3, 3, 3, 3] }, { due: 14, date: t, raw: 14, answers: [3, 3, 2, 3, 3] }]; s.proposals = []; s.distress = []; })));
  }

  window.OF.app = { get state() { return s; }, render };
  render();
})();
