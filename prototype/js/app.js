// OshiFit 試作版の画面。依存のない素の JavaScript。
// 流れ: 同意 → アバター → 会話インタビュー（初回：質問紙の全項目／毎週：現状の頻度・推し疲れ・効果）→ 群に応じた画面
(function () {
  const { util: U, safety: S, model: M, proposals: P, who5: W, avatar: A, store: ST, resources: RES, state: SD, radar: RD, instrument: I, interview: IV, reader: R, tipi: TP } = window.OF;
  const root = document.getElementById('app');
  const DEV = new URLSearchParams(location.search).has('dev');
  let s = ST.load();
  let tab = 'checkin';
  let setup = null;
  let chat = null;
  let mirrorIdx = 0;
  let aiAvailable = false;
  // 「いまの状態」画面を見せる群。記録のみの群Aには見せない（比較を保つため）。研究者が変える。
  const STATE_GROUPS = ['C'];
  const open = {};

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
  const r0 = Math.round;

  // ------------------------------------------------------------ 相談先・つらさ
  function resourcesCard(title) {
    return h('div', { class: 'banner res' },
      h('b', {}, title || 'つらいときは、ひとりで抱えこまないでください'),
      h('div', { class: 'note' }, 'OshiFit を続けなくても大丈夫です。話せる場所があります。'),
      RES.items.filter((r) => r.tel).map((r) => h('div', {}, r.name, '：', h('a', { href: 'tel:' + r.tel.replace(/-/g, '') }, r.tel))),
      h('div', { class: 'note' }, '※ 所属大学の学生相談室もご利用ください。'));
  }
  const distressRecent = () => s.distress.some((d) => U.daysBetween(d.date, ST.today(s)) <= 3);
  function noteDistress(kind) { s.distress.push({ date: ST.today(s), kind }); save(); }

  // ------------------------------------------------------------ アバター（パーツ＋写真）
  function avatarEditor(av, onChange) {
    const pv = h('div', { class: 'pv', html: A.svg(av, 'neutral') });
    const body = h('div', { class: 'avbuild' }, pv, h('div', { style: 'flex:1' }));
    const opts = body.lastChild;
    const rebuild = () => { pv.innerHTML = A.svg(av, 'neutral'); if (onChange) onChange(); };
    const rows = {};
    for (const [key, label] of [['hairStyle', '髪型'], ['hairColor', '髪色'], ['skin', '肌'], ['shirt', '服'], ['glasses', 'めがね'], ['pin', '推し色のヘアピン']]) {
      const row = h('div', { class: 'chips', 'data-opt': key });
      rows[key] = row;
      for (const [v, l] of A.OPTIONS[key]) {
        const isColor = typeof v === 'string' && v.startsWith('#');
        const el = isColor
          ? h('button', { class: 'swatch', title: l, 'aria-label': l, style: `background:${v}`, 'aria-pressed': av[key] === v ? 'true' : 'false' })
          : h('button', { class: 'chip', 'aria-pressed': av[key] === v ? 'true' : 'false' }, l);
        el.dataset.v = String(v);
        el.addEventListener('click', () => { av[key] = v; row.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false')); el.setAttribute('aria-pressed', 'true'); rebuild(); });
        row.append(el);
      }
      opts.append(h('div', { class: 'opt' }, h('div', { class: 'ol' }, label), row));
    }
    const wrap = h('div', {}, body);
    const photo = photoSection(av, () => { // 写真から作った値を、パーツ選択の表示にも反映する
      pv.innerHTML = A.svg(av, 'neutral');
      for (const [key, row] of Object.entries(rows)) row.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(av[key]) ? 'true' : 'false'));
      if (onChange) onChange('photo');
    });
    if (photo) wrap.prepend(photo);
    return wrap;
  }
  const PHOTO_ERR = { no_face: '顔が見つかりませんでした。正面から、明るい場所で撮った写真でもう一度どうぞ。', multiple_faces: '複数の顔が写っています。ひとりだけの写真でお願いします。', too_small: '顔が小さすぎます。もう少し近づいて撮ってください。', too_dark: '暗すぎます。明るい場所で撮ってください。' };
  function photoSection(av, done) {
    const P2 = window.OF.photo;
    if (!P2 || !A.fromPhotoParams || location.protocol === 'file:') return null;
    const msg = h('div', { class: 'note', id: 'photo-msg' }, '写真は端末の中だけで処理し、保存も送信もしません。結果は下のパーツ選択で直せます。');
    const input = h('input', { type: 'file', accept: 'image/*', id: 'photo-input', hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      msg.textContent = '読み取っています…';
      try {
        const params = await P2.fromFile(f);
        Object.assign(av, A.fromPhotoParams(params, av));
        s.avatarSource = 'photo';
        msg.textContent = '写真から似顔絵を作りました（写真は破棄しました）。' + (params.warnings && params.warnings.length ? '※ ' + params.warnings.join(' ') : '') + ' 髪型などは、下のボタンで選んでください。';
        done();
      } catch (e) { msg.textContent = PHOTO_ERR[e && e.code] || '写真を読み取れませんでした。パーツ選択でお作りください。'; }
      input.value = '';
    });
    return h('div', { class: 'card', 'data-photo': '1' }, h('b', {}, '写真から作る（任意）'), h('div', { style: 'margin-top:6px' }, h('button', { class: 'btn small secondary', id: 'photo-btn', onclick: () => input.click() }, '写真をえらぶ／撮る'), input), msg);
  }

  // ------------------------------------------------------------ 初回設定
  function renderSetup() {
    if (!setup) setup = { step: s.consent ? 1 : 0, av: { ...A.DEFAULT, ...(s.avatar || {}) }, ai: s.aiReading };
    root.replaceChildren(h('header', { class: 'top' }, h('span', { class: 'logo' }, 'OshiFit'), h('span', { class: 'badge' }, '試作版')),
      h('main', {}, h('div', { class: 'proto' }, '試作版です。予測は予備調査215名の関連にもとづく見込みで、効果を保証するものではありません。'), [consentView, avatarView][setup.step]()));
  }
  function consentView() {
    const ai = h('input', { type: 'checkbox', id: 'ai-opt', disabled: !aiAvailable });
    ai.checked = !!setup.ai && aiAvailable;
    ai.addEventListener('change', () => { setup.ai = ai.checked; });
    return h('div', {},
      h('h1', {}, '研究へのご協力について'),
      h('p', { class: 'sub' }, '（倫理審査の承認を得た説明文書に差し替えて使います）'),
      h('div', { class: 'card' },
        h('ul', {}, h('li', {}, '最初に質問紙の項目を会話で答えます（約10分）。その後は週に1回、約3分の短い会話です（6週間）。'),
          h('li', {}, 'ボタンで答えても、自由な文で話してもかまいません。読み取った結果は、必ず画面で確かめてから確定します。'),
          h('li', {}, '参加は任意で、いつでもやめられます。データの削除も依頼できます。'),
          h('li', {}, '回答は匿名IDで管理します。自由な文章そのものは保存しません。'),
          h('li', {}, 'つらさが強く見えるときは、相談先を表示します。'),
          h('li', {}, '表示される予測は「見込み」で、効果を保証するものではありません。'))),
      h('label', { class: 'card ai-opt' }, ai, h('span', {}, h('b', {}, ' AIによる読み取りを使う（任意）'), h('div', { class: 'note' },
        aiAvailable ? '自由な文を、電話番号・メール・URLなどを伏せたうえで外部のAI（Claude）に送り、回答に直します。保存はしません。使わなくても、ボタンで全て答えられます。'
          : 'この環境ではAI読み取りは使えません（サーバーを起動していないか、キーが設定されていません）。ボタンと短い文で答えます。'))),
      h('button', { class: 'btn', id: 'consent-yes', onclick: () => { s.consent = true; s.aiReading = !!(setup.ai && aiAvailable); s.startDate = s.startDate || ST.today(s); save(); setup.step = 1; renderSetup(); } }, '同意して始める'),
      h('button', { class: 'btn secondary', onclick: () => { root.replaceChildren(h('main', {}, h('h1', {}, 'ご協力ありがとうございました'), h('p', {}, 'このページを閉じてください。'))); } }, '同意しない'));
  }
  function avatarView() {
    return h('div', {}, h('h1', {}, 'じぶんアバターをつくる'), h('p', { class: 'sub' }, 'あなたに似せたアバターです。あとで「いまのあなた」と「理想のあなた」を見るときに使います。'),
      avatarEditor(setup.av),
      h('button', { class: 'btn', id: 'avatar-done', onclick: () => { s.avatar = { ...setup.av }; save(); setup = null; tab = 'checkin'; render(); } }, 'はじめる'));
  }

  // ------------------------------------------------------------ 画面の骨組み
  function render() {
    if (!s.consent || !s.avatar) return renderSetup();
    const g = group();
    const tabs = [['checkin', '会話']];
    if (g === 'B' || g === 'C') tabs.push(['plan', '今週の提案']);
    if (STATE_GROUPS.includes(g) || s.showStateAll) tabs.push(['state', 'いまの状態']);
    if (g === 'C') tabs.push(['mirror', 'ミラー']);
    tabs.push(['me', '設定']);
    if (!tabs.some(([k]) => k === tab)) tab = 'checkin';
    const header = h('header', { class: 'top' }, h('div', { class: 'av', html: A.svg(s.avatar, 'neutral') }), h('span', { class: 'logo' }, 'OshiFit'),
      h('span', { class: 'badge' }, `${day() + 1}日目`));
    const nav = h('nav', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { 'aria-current': tab === k ? 'page' : 'false', 'data-tab': k, onclick: () => { tab = k; render(); } }, l)));
    const main = h('main', {});
    root.replaceChildren(header, main, nav);
    ({ checkin: viewCheckin, plan: viewPlan, state: viewState, mirror: viewMirror, me: viewMe })[tab](main);
  }

  // ------------------------------------------------------------ 会話（インタビュー）
  function viewCheckin(main) {
    main.style.padding = '10px 14px 0';
    main.style.display = 'flex'; main.style.flexDirection = 'column';
    const wrap = h('div', { class: 'chat' });
    const msgs = h('div', { class: 'msgs', id: 'msgs' });
    const composer = h('div', { class: 'composer' });
    wrap.append(msgs, composer);
    main.append(wrap);
    const key = ST.today(s) + '|' + s.survey.weekly.length + '|' + (s.survey.baseline ? 'b' : '-');
    if (!chat || chat.key !== key) chat = { key, phase: 'start', log: [], iv: null, kind: null, who5: null, exec: null };
    chat.ui = { msgs, composer };
    chat.log.forEach((m) => addBubble(m.who, m.text, m.warn, true));
    if (chat.phase === 'start') begin(); else showComposer();
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
    const due = ST.dueCheckin(s);
    const who = ST.whoDue(s);
    chat.kind = due;
    if (!due && who == null) {
      chat.phase = 'idle';
      const n = s.survey.weekly.length;
      if (n >= ST.MAX_WEEKLY) bot('6週間のチェックインはすべて終わりました。ご協力ありがとうございました。');
      else { const nd = 7 * (n + 1); bot(`今日の会話はありません。次のチェックインは ${nd + 1}日目（${U.addDays(s.startDate, nd)}）です。`); }
      return showComposer();
    }
    if (due === 'baseline' && who === 0 && !s.survey.draft) bot('はじめまして。質問紙と同じ項目を、会話で聞いていきます。ボタンで答えても、自由に話してもかまいません。いつでも中断でき、続きから再開できます。');
    if (who != null) {
      chat.phase = 'who5'; chat.who5 = { due: who, i: 0, a: [] };
      bot(`${who === 0 ? 'はじめに' : `${who / 7}週目の区切りに`}、この2週間の気分を5つ聞かせてください。`);
      return askWho5();
    }
    startInterview();
  }

  function startInterview() {
    const d = s.survey.draft && s.survey.draft.kind === chat.kind ? s.survey.draft : null;
    chat.iv = IV.create(chat.kind, { llm: s.aiReading && aiAvailable, answers: d ? d.answers : {}, src: d ? d.src : {} });
    chat.phase = 'interview';
    if (d && Object.keys(d.answers).length) bot('前回の続きから始めます。');
    else if (chat.kind === 'weekly') bot(`${s.survey.weekly.length + 1}回目のチェックインです。この1週間のことを聞かせてください。`);
    step();
  }

  const SCALE_HINT = { agree: '5＝とても当てはまる　〜　1＝全く当てはまらない', freq: '5＝とてもよくする　〜　1＝ほとんどしない' };
  function step() {
    const v = IV.view(chat.iv);
    if (v.kind === 'done') return finishInterview();
    if (v.kind === 'open') bot(`【${v.title}】\n${v.text}`);
    else if (v.kind === 'ask') {
      const p = IV.progress(chat.iv);
      const hint = v.item.type === 'likert' ? `\n（${SCALE_HINT[v.item.kind]}）` : '';
      bot(`${v.intro ? `【${v.title}】\n` : ''}(${p.done + 1}/${p.total}) ${v.item.text}${v.intro ? hint : ''}`);
    }
    showComposer();
  }

  function scaleChips(item, onPick) {
    const wrap = h('div', { class: 'chips' });
    if (item.type === 'choice') for (const o of item.options) wrap.append(h('button', { class: 'chip', 'data-v': o[0], onclick: () => onPick(o[0], o[0]) }, o[0]));
    else for (const [v, l] of item.kind === 'freq' ? I.FREQ : I.AGREE) wrap.append(h('button', { class: 'chip', 'data-v': v, onclick: () => onPick(v, `${v}　${l}`) }, `${v} ${l}`));
    return wrap;
  }

  function composerInput(c, placeholder, onSend) {
    const ta = h('textarea', { rows: 1, placeholder, 'aria-label': '入力欄', id: 'inp' });
    const send = h('button', { class: 'btn send', id: 'send', onclick: () => { const v = ta.value.trim(); if (v) { ta.value = ''; onSend(v); } } }, '送る');
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send.click(); } });
    c.append(h('div', { class: 'row' }, ta, send));
  }

  function showComposer() {
    const c = chat.ui.composer;
    c.replaceChildren();
    if (chat.phase === 'who5') {
      c.append(h('div', { class: 'chips' }, W.CHOICES.map(([l, v]) => h('button', { class: 'chip', onclick: () => answerWho5(l, v) }, l))));
      return;
    }
    if (chat.phase === 'exec') {
      c.append(h('div', { class: 'chips' }, [['できた', 1], ['一部できた', 0.5], ['できなかった', 0]].map(([l, v]) => h('button', { class: 'chip', onclick: () => answerExec(l, v) }, l))));
      return;
    }
    if (chat.phase === 'execReason') {
      c.append(h('div', { class: 'chips' }, EXEC_REASONS.map(([l, v]) => h('button', { class: 'chip', onclick: () => answerExecReason(l, v) }, l))));
      return;
    }
    if (chat.phase !== 'interview') return;
    const v = IV.view(chat.iv);
    if (v.kind === 'open') {
      c.append(h('div', { class: 'chips' }, h('button', { class: 'chip', id: 'one-by-one', onclick: () => { me('ひとつずつ答える'); IV.skipOpen(chat.iv); step(); } }, 'ひとつずつ答える')));
      composerInput(c, '自由に書いてください', handleText);
    } else if (v.kind === 'ask') {
      c.append(scaleChips(v.item, (val, label) => { me(label); IV.tap(chat.iv, v.item.id, val); persist(); step(); }));
      composerInput(c, '短い言葉でも書けます', handleText);
    } else if (v.kind === 'confirm') c.append(confirmUI(v));
  }

  function confirmUI(v) {
    const box = h('div', { class: 'confirm', id: 'confirm' }, h('div', { class: 'note', style: 'margin-top:0' }, `${chat.iv.via === 'llm' ? 'AI' : 'ルール'}で読み取った結果です。違うところは、押して直してください。`));
    for (const r of v.rows) {
      const row = h('div', { class: 'crow', 'data-item': r.id }, h('div', { class: 'ct' }, r.item.text), r.evidence ? h('div', { class: 'ev' }, `「${r.evidence}」`) : null);
      const chips = scaleChips(r.item, (val) => { IV.edit(chat.iv, r.id, val); showComposer(); });
      chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(r.value) ? 'true' : 'false'));
      row.append(chips);
      box.append(row);
    }
    box.append(h('div', { class: 'chips' },
      h('button', { class: 'btn small', id: 'confirm-ok', onclick: () => { me('この内容でOK'); IV.confirm(chat.iv); persist(); bot('確定しました。'); step(); } }, 'この内容でOK'),
      h('button', { class: 'btn small secondary', id: 'confirm-no', onclick: () => { me('読み取りをやめて、ひとつずつ答える'); IV.reject(chat.iv); step(); } }, 'ちがう。ひとつずつ答える')));
    return box;
  }

  function persist() {
    s.survey.draft = { kind: chat.kind, answers: chat.iv.answers, src: chat.iv.src };
    save();
  }

  const HINTS = { unread: 'ごめんなさい、うまく読み取れませんでした。下のボタンから選んでください。', unknown: 'この項目は、どれか近いものを選んでください。', fallback: 'AI読み取りが使えなかったので、ひとつずつ聞きますね。', confirm: '上の読み取り結果を確かめてください。' };
  async function handleText(text) {
    me(text);
    const dt = S.detectText(text);
    if (dt === 'severe') {
      noteDistress('text-severe');
      bot('話してくれてありがとう。とてもつらい気持ちが伝わってきました。今日の会話は、ここまでで大丈夫です。', true);
      chat.ui.msgs.append(resourcesCard('いま、話せる場所があります'));
      chat.phase = 'done'; return showComposer();
    }
    if (dt === 'heavy') { noteDistress('text-heavy'); bot('かなりしんどそうですね。無理に続けなくて大丈夫です。必要なら、下の相談先も使ってください。', true); chat.ui.msgs.append(resourcesCard()); }
    const wait = h('div', { class: 'bubble bot' }, '読み取っています…');
    chat.ui.msgs.append(wait);
    const res = await IV.text(chat.iv, text);
    wait.remove();
    if (res.ok) { bot('こう受け取りました。合っていますか？'); return showComposer(); }
    bot(HINTS[res.hint] || HINTS.unread);
    if (chat.iv.phase === 'items' && chat.iv.note === 'unread') chat.iv.note = null;
    step();
  }

  function finishInterview() {
    const iv = chat.iv, date = ST.today(s);
    const rec = { date, answers: { ...iv.answers }, src: { ...iv.src } };
    if (chat.kind === 'baseline') s.survey.baseline = rec; else s.survey.weekly.push(rec);
    s.survey.draft = null; save();
    const bo = M.checkins(s.survey).map((c) => c.obs.BO);
    if (S.detectBurden(bo)) { noteDistress('burden-high'); bot('推し活の負担が大きい状態が続いています。無理せず、休む日をつくってくださいね。', true); chat.ui.msgs.append(resourcesCard()); }
    bot(chat.kind === 'baseline' ? 'ありがとうございました。最初の質問は以上です。次のチェックインは7日後です。' : 'ありがとうございました。今週の会話は以上です。');
    renderNavOnly();
    if (chat.kind === 'weekly') {
      const prev = s.proposals.find((p) => p.week === s.survey.weekly.length - 3);
      if (prev && prev.chosen != null && prev.exec == null) {
        chat.exec = prev; chat.phase = 'exec';
        bot(`先週選んだ案：\n${prev.options[prev.chosen].texts.map((t) => '・' + t).join('\n')}\n実行できましたか？`);
        return showComposer();
      }
    }
    chat.phase = 'done'; showComposer();
  }
  const EXEC_REASONS = [['時間がなかった', 'time'], ['やる気が出なかった', 'motivation'], ['効果を感じなかった', 'no-effect'], ['忘れていた', 'forgot'], ['楽しさが減ると思った', 'less-fun'], ['その他', 'other']];
  function answerExec(label, v) {
    me(label); chat.exec.exec = v; save();
    if (v < 1) { chat.phase = 'execReason'; bot('差しつかえなければ、いちばん近い理由を教えてください。（責めるための質問ではありません）'); return showComposer(); }
    bot('ありがとうございます。'); chat.phase = 'done'; showComposer();
  }
  function answerExecReason(label, v) { me(label); chat.exec.execReason = v; save(); bot('教えてくれてありがとうございます。次の提案に活かします。'); chat.phase = 'done'; showComposer(); }
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
    chat.who5 = null;
    if (ST.dueCheckin(s)) { chat.kind = ST.dueCheckin(s); return startInterview(); }
    chat.phase = 'done'; showComposer();
  }

  // ------------------------------------------------------------ 今週の提案（群B・C）
  function currentProposal() {
    const w = ST.planWeek(s);
    if (w == null) return null;
    let p = s.proposals.find((x) => x.week === w);
    if (!p) {
      const r = P.generate(s.survey);
      p = { week: w, createdDate: ST.today(s), chosen: null, skipped: false, skipReason: null, exec: null, execReason: null,
        options: r.options.map((o) => ({ id: o.id, label: o.label, texts: o.texts, changes: o.changes, dWB: o.dWB, dBO: o.dBO, seWB: o.seWB, seBO: o.seBO })) };
      s.proposals.push(p); save();
    }
    return p;
  }
  const SKIP_REASONS = [['忙しい／余裕がない', 'busy'], ['楽しさが減りそう', 'less-fun'], ['自分には合わない', 'mismatch'], ['効果を信じられない', 'doubt'], ['もう実行している', 'already'], ['その他', 'other']];
  const pts = (d) => { const v = r0(d * 25); return v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '±0'; };

  function viewPlan(main) {
    main.style.padding = '14px';
    const w = ST.planWeek(s);
    if (w == null) {
      return main.append(h('h1', {}, '今週の提案'), h('p', {}, s.survey.weekly.length < ST.PLAN_FIRST ? '提案は、記録のみの2週間（チェックイン2回）が終わってから表示されます。' : '提案の期間は終わりました。'));
    }
    if (distressRecent()) return main.append(resourcesCard('いまは、提案よりも休むことを優先しましょう'));
    const p = currentProposal();
    main.append(h('h1', {}, '今週、どれを試す？'), h('p', { class: 'sub' }, `第${w + 1}週の提案。あなたの「理想の頻度」より少なくなる変え方は出さないようにしています。選ばなくてもかまいません。`));
    if (!p.options.length) main.append(h('div', { class: 'card' }, '今の回答からは、負担が下がる見込みの組み替え案が見つかりませんでした。今週はこのままで大丈夫です。'));
    p.options.forEach((o, i) => {
      const card = h('div', { class: 'card' + (p.chosen === i ? ' sel' : ''), 'data-opt': i }, h('b', {}, o.label), o.texts.map((t) => h('div', {}, '・', t)));
      if (group() === 'C') card.append(h('div', { class: 'note' }, `見込み（0〜100の点数での差）：推し疲れ ${pts(o.dBO)}（±${r0(o.seBO * 25)}）、幸福度 ${pts(o.dWB)}（±${r0(o.seWB * 25)}）`));
      if (p.chosen == null && !p.skipped) card.append(h('button', { class: 'btn small', onclick: () => choose(p, i) }, 'これを1週間ためす'));
      if (p.chosen === i) card.append(h('div', { class: 'note' }, '選択中。次のチェックインで、実行できたかを聞きます。'));
      if (group() === 'C') card.append(h('button', { class: 'btn small secondary', onclick: () => { mirrorIdx = i; tab = 'mirror'; render(); } }, 'ミラーで比べる'));
      main.append(card);
    });
    if (group() === 'C' && p.options.length) main.append(h('div', { class: 'note' }, '「見込み」は予備調査の関連から計算した値で、頻度を変えたときの効果ではありません。±は係数のずれの大きさです。'));
    if (p.chosen == null && !p.skipped) main.append(h('button', { class: 'btn secondary', id: 'skip', onclick: () => { p.skipping = true; render(); } }, '今週は見送る'));
    if (p.skipping && !p.skipped) {
      main.append(h('div', { class: 'card', id: 'skip-reasons' }, h('b', {}, '見送って大丈夫です。よければ理由を教えてください。'), h('div', { class: 'note' }, '責めるための質問ではなく、提案を良くするために使います。答えなくても見送れます。'),
        h('div', { class: 'chips' }, SKIP_REASONS.map(([l, v]) => h('button', { class: 'chip', 'data-reason': v, onclick: () => { p.skipped = true; p.skipReason = v; delete p.skipping; save(); render(); } }, l)),
          h('button', { class: 'chip', 'data-reason': 'none', onclick: () => { p.skipped = true; delete p.skipping; save(); render(); } }, '答えずに見送る'))));
    }
    if (p.skipped) main.append(h('div', { class: 'note' }, '今週は見送りました。次のチェックインは、いつも通りです。'));
  }
  const pickF = (f) => ({ WB: { mean: f.WB.mean, lo: f.WB.lo, hi: f.WB.hi }, BO: { mean: f.BO.mean, lo: f.BO.lo, hi: f.BO.hi } });
  function choose(p, i) {
    p.chosen = i;
    if (group() === 'C') {
      const x = M.inputs(s.survey);
      if (x) p.forecast = { A: pickF(M.forecast(s.survey, x)), B: pickF(M.forecast(s.survey, P.apply(x, p.options[i].changes))) };
    }
    save(); render();
  }

  // ------------------------------------------------------------ いまの状態（レーダーチャートと数値・根拠つき）
  function whyBox(id, d) {
    const box = h('div', { class: 'why', id: 'why-' + id, hidden: !open[id] },
      h('div', { class: 'why-row' }, h('b', {}, '計算式'), h('div', {}, d.formula)),
      h('div', { class: 'why-row' }, h('b', {}, 'あなたの入力値と計算'), h('ul', {}, d.inputs.map((t) => h('li', {}, t)))),
      h('div', { class: 'why-row' }, h('b', {}, '注意・限界'), h('div', {}, d.note)));
    const btn = h('button', { class: 'chip why-btn', 'data-why': id, 'aria-expanded': open[id] ? 'true' : 'false', 'aria-controls': 'why-' + id,
      onclick: () => { open[id] = !open[id]; box.hidden = !open[id]; btn.setAttribute('aria-expanded', open[id] ? 'true' : 'false'); btn.textContent = open[id] ? '根拠をとじる' : 'この数字の根拠'; } }, open[id] ? '根拠をとじる' : 'この数字の根拠');
    return [btn, box];
  }
  function meter(label, v, color, extra) {
    return h('div', { class: 'meter' }, h('div', { class: 'ml' }, h('span', {}, label), h('b', {}, v == null ? '—' : v, extra ? h('span', { class: 'pc' }, ` ${extra}`) : null)),
      h('div', { class: 'bar' }, h('i', { style: `width:${v == null ? 0 : v}%;background:${color}` })));
  }
  function indexCard(key, blk, color, first) {
    const card = h('div', { class: 'card', 'data-section': key }, h('h2', { style: 'margin-top:0' }, blk.title));
    if (blk.value == null) return card.append(h('div', { class: 'note' }, blk.inputs[0])), card;
    const dlt = first != null ? blk.value - first : null;
    card.append(h('div', { class: 'big' }, h('span', { class: 'num', id: key + '-num' }, blk.value), h('span', { class: 'of' }, ' / 100'), h('span', { class: 'band', 'data-band': blk.band }, blk.band)),
      h('div', { class: 'note', style: 'margin-top:0' }, `予備調査${SD.N()}名のうち、あなたと同じか低い人は ${blk.percentile}%。` + (dlt != null && dlt !== 0 ? `　初回から ${dlt > 0 ? '+' : '−'}${Math.abs(dlt)}点` : '')),
      h('div', { html: RD.svg(blk.axes.map((a) => ({ label: a.label, value: a.value })), { color }) }), ...whyBox(key, blk));
    return card;
  }
  function viewState(main) {
    main.style.padding = '14px';
    const r = SD.compute(s, ST.today(s));
    main.append(h('h1', {}, 'いまの状態'), h('p', { class: 'sub' }, '質問紙と同じ8項目の回答を、そのまま0〜100にしました。診断ではありません。'));
    if (!r.ready) return main.append(h('div', { class: 'card' }, '最初の会話が終わると表示されます。'));
    if (distressRecent()) main.append(resourcesCard('数字よりも、いまは休むことを優先しましょう'));
    const f = M.indices(s.survey.baseline.answers);
    main.append(indexCard('bo', r.bo, '#E8457C', f.BO != null ? r0(M.to100(f.BO)) : null));
    const ax = h('div', { class: 'card', 'data-section': 'axes' }, h('h2', { style: 'margin-top:0' }, '軸ごとの数値'));
    for (const a of [...r.bo.axes, ...r.wb.axes]) ax.append(h('div', { class: 'axrow', 'data-axis': a.key }, meter(a.label, a.value, I.BO_ITEMS.includes(a.key) ? '#E8457C' : '#12A38A', a.percentile != null ? `（同じか低い人 ${a.percentile}%）` : ''), a.value != null ? whyBox('ax-' + a.key, a) : null));
    ax.append(h('div', { class: 'note' }, SD.HELP.bo + ' ' + SD.HELP.wb));
    main.append(ax, indexCard('wb', r.wb, '#12A38A', f.WB != null ? r0(M.to100(f.WB)) : null));
    const mo = h('div', { class: 'card', 'data-section': 'money' }, h('h2', { style: 'margin-top:0' }, '推し活費用の負担'));
    if (r.money.value != null) mo.append(h('div', { class: 'big' }, h('span', { class: 'num', id: 'money-num' }, r.money.value), h('span', { class: 'of' }, ' %　（自由に使える額に対する推し活費用）')), ...whyBox('money', r.money));
    else mo.append(h('div', { class: 'note' }, r.money.inputs[0]));
    main.append(mo);
    const wb = r.who5;
    const wc = h('div', { class: 'card', 'data-section': 'who5' }, h('h2', { style: 'margin-top:0' }, '気分の目安（WHO-5）'));
    if (wb) wc.append(h('div', { class: 'big' }, h('span', { class: 'num', id: 'who5-num' }, wb.value), h('span', { class: 'of' }, ' / 100')), ...whyBox('who5', wb));
    else wc.append(h('div', { class: 'note' }, 'WHO-5 は、会話の中で答えると表示されます。'));
    main.append(wc);
  }

  // ------------------------------------------------------------ ミラー（群C）
  function dots(f, color, off) {
    const wrap = h('div', { class: 'dots', role: 'img', 'aria-label': `20人中${f.highCount}人が推し疲れ重め` });
    f.BO.dots.slice().sort((a, b) => a - b).forEach((d) => wrap.append(h('i', { style: `background:${d >= M.highBO() ? color : off}` })));
    return wrap;
  }
  function viewMirror(main) {
    main.style.padding = '14px';
    const p = currentProposal();
    if (p == null) return main.append(h('h1', {}, 'ミラー'), h('p', {}, 'ミラーは、記録のみの2週間が終わってから表示されます。'));
    if (distressRecent()) return main.append(resourcesCard('いまは、予測を見るよりも休むことを優先しましょう'));
    if (!p.options.length) return main.append(h('p', {}, '比べる提案がありません。'));
    mirrorIdx = Math.min(mirrorIdx, p.options.length - 1);
    const o = p.options[mirrorIdx];
    const x = M.inputs(s.survey);
    const fa = M.forecast(s.survey, x), fb = M.forecast(s.survey, P.apply(x, o.changes));
    main.append(h('h1', {}, 'あなたの推し活と、似顔アバター'), h('p', { class: 'sub' }, `いまの回答から見積もった「見込み」です。比べているのは：${o.label}`),
      h('div', { class: 'chips' }, p.options.map((q, i) => h('button', { class: 'chip', 'aria-pressed': i === mirrorIdx ? 'true' : 'false', onclick: () => { mirrorIdx = i; render(); } }, q.label.slice(0, 1) + ' ' + q.label.slice(2)))));
    const val = (name, e) => h('div', { class: 'val' }, name + ' ', h('b', {}, r0(M.to100(e.mean))), ` (${r0(M.to100(e.lo))}–${r0(M.to100(e.hi))})`);
    const col = (cls, title, f, color, off) => h('div', { class: 'col ' + cls, 'data-path': cls === 'a' ? 'A' : 'B' }, h('h3', {}, title),
      h('div', { html: A.svg(s.avatar, M.expressionFor(f.BO.mean)) }), val('幸福度', f.WB), val('推し疲れ', f.BO), dots(f, color, off),
      h('div', { class: 'note', style: 'text-align:center;margin:0' }, `20人中${f.highCount}人が推し疲れ重め`));
    main.append(h('div', { class: 'split' }, col('a', '今のまま', fa, '#E07A10', '#F9D9B8'), col('b', '提案どおり', fb, '#12A38A', '#BFE8DF')));
    main.append(h('div', { class: 'note' }, `数字は0〜100、カッコ内は80%の幅。チェックインが${fb.BO.n}回分あり、増えると個人差の見積もりが更新されます。見込みであって、効果を保証するものではありません。`));
    // 答え合わせ: 次のチェックインの推し疲れ
    for (const q of s.proposals) {
      if (q.chosen == null || !q.forecast) continue;
      const next = s.survey.weekly[q.week + 2];
      if (!next) continue;
      const bo = M.indices(next.answers).BO;
      if (bo == null) continue;
      const fc = q.forecast.B.BO, ok = bo >= fc.lo - 1e-9 && bo <= fc.hi + 1e-9;
      main.append(h('div', { class: 'card', 'data-check': q.week }, h('b', {}, `答え合わせ（第${q.week + 1}週）`), h('div', {}, `見込み（提案どおり）の推し疲れ：${r0(M.to100(fc.mean))}（${r0(M.to100(fc.lo))}–${r0(M.to100(fc.hi))}）`),
        h('div', {}, `次のチェックインの実際の値：${r0(M.to100(bo))} ${ok ? '→ 範囲内でした' : '→ 範囲の外でした'}`)));
    }
  }

  // ------------------------------------------------------------ 設定
  function viewMe(main) {
    main.style.padding = '14px';
    const sc = TP.fromAnswers(s.survey.baseline ? s.survey.baseline.answers : {});
    main.append(h('h1', {}, '設定'),
      h('div', { class: 'card' }, h('b', {}, `参加ID ${s.id}`), h('div', { class: 'note' }, `開始日 ${s.startDate}（${day() + 1}日目）`), h('div', { class: 'note' }, `いまの画面：群${group()}${day() < 14 ? '（記録のみの期間）' : ''}`),
        h('div', { class: 'note' }, `AI読み取り：${s.aiReading ? '使う' : '使わない'}`)),
      h('div', { class: 'card' }, h('b', {}, 'アバター'), avatarEditor(s.avatar, (why) => { save(); if (why === 'photo') save(); const hd = document.querySelector('header .av'); if (hd) hd.innerHTML = A.svg(s.avatar, 'neutral'); })),
      sc ? h('div', { class: 'card' }, h('b', {}, '性格（TIPI-J）'), h('div', { class: 'note' }, Object.entries(TP.LABELS).map(([k, l]) => `${l} ${sc[k].toFixed(1)}`).join('　'))) : null,
      h('div', { class: 'card' }, h('b', {}, '研究者コード（群の割り付け）'), h('div', { class: 'note' }, '記録のみの2週間のあと、この群の画面になります。実験では割り付けを研究者が行います。'),
        h('div', { class: 'chips' }, ['A', 'B', 'C'].map((g) => h('button', { class: 'chip', 'data-group': g, 'aria-pressed': s.group === g ? 'true' : 'false', onclick: () => { s.group = g; save(); render(); } }, `群${g}`)))),
      h('button', { class: 'btn secondary', onclick: exportJson }, '回答を書き出す（研究者へ渡す）'),
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
  function demoAnswers(week) {
    const a = {};
    I.BLOCKS.baseline.forEach((id) => { a[id] = 3; });
    Object.assign(a, { tipi_1: 4, tipi_2: 2, tipi_3: 4, tipi_4: 4, tipi_5: 4, tipi_6: 2, tipi_7: 4, tipi_8: 2, tipi_9: 2, tipi_10: 2,
      ideal_media: 4, ideal_live: 4, ideal_goods: 3, ideal_sns: 3, cur_media: 4, cur_live: 3, cur_goods: 3, cur_sns: 5,
      b_sleep: 4, b_money: 3, b_duty: 4, b_envy: 4, w_ikigai: 4, w_confidence: 3, w_schedule: 2, w_create: 2,
      income: '10〜15万円', expense: '5〜10万円', spend: '1万円〜3万円', free_wd: '2〜3時間', free_hd: '4〜5時間' });
    if (week) { a.b_sleep = Math.max(1, a.b_sleep - (week > 1 ? 1 : 0)); a.cur_sns = Math.max(1, 5 - week); }
    return a;
  }
  function devPanel() {
    const mk = (l, f, id) => h('button', { class: 'btn small secondary', id, onclick: () => { f(); save(); chat = null; render(); } }, l);
    return h('div', { class: 'dev', id: 'dev' }, h('b', {}, '開発用'),
      h('div', {}, mk(s.showStateAll ? '状態画面を群Cだけに戻す' : '状態画面を全群に表示', () => { s.showStateAll = !s.showStateAll; }), mk('+1日', () => { s.devOffsetDays++; }, 'dev-d1'), mk('+7日', () => { s.devOffsetDays += 7; }, 'dev-d7'),
        mk('デモ回答（初回＋2回）を入れる', () => {
          const t = ST.today(s); s.startDate = U.addDays(t, -14);
          const mkr = (d, w) => ({ date: U.addDays(s.startDate, d), answers: demoAnswers(w), src: {} });
          s.survey = { baseline: mkr(0, 0), weekly: [mkr(7, 1), mkr(14, 2)], draft: null };
          s.who5 = [{ due: 0, date: s.startDate, raw: 15, answers: [3, 3, 3, 3, 3] }, { due: 14, date: t, raw: 14, answers: [3, 3, 2, 3, 3] }]; s.proposals = []; s.distress = [];
        }, 'dev-demo')));
  }

  window.OF.app = { get state() { return s; }, render, demoAnswers };
  R.probe().then((ok) => { aiAvailable = ok; if (setup && setup.step === 0) renderSetup(); });
  render();
})();
