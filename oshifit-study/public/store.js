// OshiFit の保存（研究版のみ）。Firebase の匿名認証と Cloud Firestore を使う。
// 保存先：participants/{uid}（開始時の回答・得点・群・見込み・最後の調査）と participants/{uid}/checkins/{回}（振り返り）。
// 写真と顔の特徴点は保存しない（アバターは色や形の番号だけ）。データの形は DATA_SCHEMA_ja.md。
(function () {
  "use strict";
  const V = "10.14.1";
  const CDN = (m) => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  let fb = null, uid = null, ref = null, debounceT = null, failed = 0;

  async function load() {
    if (fb) return fb;
    const [app, auth, fs] = await Promise.all([import(CDN("app")), import(CDN("auth")), import(CDN("firestore"))]);
    const a = app.initializeApp(window.OSHIFIT_FIREBASE);
    const em = window.OSHIFIT_EMULATOR;
    const db = em ? fs.getFirestore(a) : fs.initializeFirestore(a, { localCache: fs.persistentLocalCache() }); // 圏外でも書き込みを貯めて、つながったら送る
    const au = auth.getAuth(a);
    if (em) { auth.connectAuthEmulator(au, em.auth, { disableWarnings: true }); fs.connectFirestoreEmulator(db, ...em.firestore); }
    fb = { app: a, auth, fs, db, au };
    return fb;
  }
  const report = (e) => { failed++; console.error("[OshiFit 保存]", e); if (window.OSHIFIT_ON_SAVE_ERROR) window.OSHIFIT_ON_SAVE_ERROR(e); };
  const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : typeof t === "number" ? t : null);

  // 起動：匿名でログインし、保存済みの記録があれば返す（なければ null）
  async function init() {
    const { auth, fs, db, au } = await load();
    const user = au.currentUser || (await new Promise((res) => { const off = auth.onAuthStateChanged(au, (u) => { off(); res(u); }); }));
    if (!user) return null;                                         // まだ同意していない（同意したときに匿名ログインする）
    uid = user.uid; ref = fs.doc(db, "participants", uid);
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    const cks = await fs.getDocs(fs.query(fs.collection(ref, "checkins"), fs.orderBy("week")));
    return {
      id: d.pid, consented: true, answers: d.answers || {}, baselineDone: !!d.baselineDone, avatar: d.avatar || null, avatarDone: !!d.avatarDone,
      sc: d.scores || null, plans: d.plansOffered || null, group: d.group || null, decidedAt: ms(d.decidedAt),
      plan: d.group ? { id: (d.planIds && d.planIds[0]) || null, ids: d.group === "B" ? d.planIds || [] : [], accepted: d.group === "B" } : null,
      pred: d.pred || null, weekly: cks.docs.map((x) => { const w = x.data(); return { ...w, at: ms(w.at) }; }),
      final: d.final ? { sc: d.final.scores, day: d.final.day } : null,
    };
  }

  // 同意して始める：匿名ログインして、参加者の記録を作る
  async function begin(S) {
    const { auth, fs, db, au } = await load();
    const cred = au.currentUser ? { user: au.currentUser } : await auth.signInAnonymously(au);
    uid = cred.user.uid; ref = fs.doc(db, "participants", uid);
    await fs.setDoc(ref, { pid: S.id, mode: "study", appVersion: window.OSHIFIT_APP_VERSION || null, consentedAt: fs.serverTimestamp(), createdAt: fs.serverTimestamp(), answers: {}, baselineDone: false });
  }
  const upd = (data) => { if (!ref) return Promise.reject(new Error("not_started")); return fb.fs.updateDoc(ref, data).catch(report); };

  // 質問の途中経過（数秒まとめて送る）。開始時の質問が終わるまでだけ
  function draft(S) { clearTimeout(debounceT); debounceT = setTimeout(() => upd({ answers: { ...S.answers }, draftAt: fb.fs.serverTimestamp() }), 1500); }
  function baseline(S) { clearTimeout(debounceT); return upd({ answers: { ...S.answers }, scores: S.sc, baselineDone: true, baselineAt: fb.fs.serverTimestamp() }); }
  function avatar(S) { return upd({ avatar: { ...S.avatar }, avatarDone: true }); }
  // 群を決める（一度だけ。ルールで変更を禁止）。decidedAt はサーバーの時刻
  function decide(S, pred) {
    const data = { group: S.group, planIds: S.group === "A" ? [] : S.group === "B" ? S.plan.ids : [S.plan.id], plansOffered: S.plans || [], scores: S.sc, decidedAt: fb.fs.serverTimestamp() };
    if (pred) data.pred = pred;
    return upd(data);
  }
  function checkin(S, rec) {
    const { fs } = fb;
    return fs.setDoc(fs.doc(ref, "checkins", String(rec.week)), { ...rec, at: fs.serverTimestamp() }).catch(report);
  }
  function final(S, answers, day) { return upd({ final: { answers: { ...answers }, scores: S.final.sc, day, at: fb.fs.serverTimestamp() } }); }

  // 参加をやめる：振り返り → 本体の順に消し、匿名アカウントも消す。失敗したら例外を投げる（画面は「削除しました」と言わない）
  async function withdraw() {
    if (!ref) { const r = await init(); if (!ref) return true; }
    const { fs, au } = fb;
    const cks = await fs.getDocs(fs.collection(ref, "checkins"));
    for (const c of cks.docs) await fs.deleteDoc(c.ref);
    await fs.deleteDoc(ref);
    try { if (au.currentUser) await au.currentUser.delete(); } catch (e) { await fb.auth.signOut(au); }
    ref = null; uid = null;
    return true;
  }

  window.OFStore = { init, begin, draft, baseline, avatar, decide, checkin, final, withdraw, get failed() { return failed; }, get uid() { return uid; } };
})();
