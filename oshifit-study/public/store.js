// OshiFit の保存（研究版のみ）。Firebase の匿名認証と Cloud Firestore を使う。
// ログイン：メールアドレスとパスワード（Firebase Authentication）。メールアドレスは Authentication だけにあり、Firestore には入れない。
// 保存先：participants/{uid}（開始時の回答・得点・群・見込み・最後の調査）と participants/{uid}/checkins/{回}（振り返り）。
// 写真と顔の特徴点は保存しない（アバターは色や形の番号だけ）。データの形は DATA_SCHEMA_ja.md。
(function () {
  "use strict";
  const V = "10.14.1";
  const CDN = (m) => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  let fb = null, uid = null, email = null, ref = null, debounceT = null, failed = 0;

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

  // 起動：ログイン済みなら、保存済みの記録を返す（なければ null）
  async function init() {
    const { auth, au } = await load();
    const user = au.currentUser || (await new Promise((res) => { const off = auth.onAuthStateChanged(au, (u) => { off(); res(u); }); }));
    if (!user || user.isAnonymous) return null;
    return loadMine(user);
  }
  async function loadMine(user) {
    const { fs, db } = fb;
    uid = user.uid; email = user.email; ref = fs.doc(db, "participants", uid);
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    const cks = await fs.getDocs(fs.query(fs.collection(ref, "checkins"), fs.orderBy("week")));
    return {
      id: d.pid, consented: true, answers: d.answers || {}, baselineDone: !!d.baselineDone, avatar: d.avatar || null, avatarDone: !!d.avatarDone,
      sc: d.scores || null, plans: d.plansOffered || null, group: d.group || null, decidedAt: ms(d.decidedAt),
      plan: d.group ? { id: (d.planIds && d.planIds[0]) || null, ids: d.group === "B" ? d.planIds || [] : [], accepted: d.group === "B" } : null,
      pred: d.pred || null, weekly: cks.docs.map((x) => { const w = x.data(); return { ...w, at: ms(w.at) }; }),
      final: d.final ? { sc: d.final.scores, day: d.final.day } : null, withdrawn: !!d.withdrawn,
    };
  }
  // 新規登録（メールアドレスとパスワード）。続けて begin() で記録を作る
  async function signup(mail, pw) {
    const { auth, au } = await load();
    const cred = await auth.createUserWithEmailAndPassword(au, mail, pw);
    uid = cred.user.uid; email = cred.user.email;
    auth.sendEmailVerification(cred.user).catch(() => {});        // 確認メール（届かなくても参加はできる）
  }
  async function login(mail, pw) {
    const { auth, au } = await load();
    const cred = await auth.signInWithEmailAndPassword(au, mail, pw);
    return loadMine(cred.user);
  }
  // Google・Microsoft でログイン（ポップアップ）。記録がまだなければ null を返す（登録画面で性別と同意を聞いてから begin）
  async function social(kind) {
    const { auth, au } = await load();
    const p = kind === "microsoft" ? new auth.OAuthProvider("microsoft.com") : new auth.GoogleAuthProvider();
    if (kind === "microsoft") p.setCustomParameters({ prompt: "select_account" });
    const cred = await auth.signInWithPopup(au, p);
    return loadMine(cred.user);
  }
  async function logout() { if (fb) await fb.auth.signOut(fb.au); uid = null; email = null; ref = null; }
  async function resetPassword(mail) { const { auth, au } = await load(); await auth.sendPasswordResetEmail(au, mail); }

  // 同意して始める：ログイン中のアカウントで、参加者の記録を作る（性別 Q2 は登録画面で聞く）
  async function begin(S) {
    const { fs, db, au } = await load();
    if (!au.currentUser) throw new Error("not_signed_in");
    uid = au.currentUser.uid; email = au.currentUser.email; ref = fs.doc(db, "participants", uid);
    await fs.setDoc(ref, { pid: S.id, mode: "study", appVersion: window.OSHIFIT_APP_VERSION || null, qset: window.OSHIFIT_QSET || "short", consentedAt: fs.serverTimestamp(), createdAt: fs.serverTimestamp(), answers: { Q2: S.answers.Q2 }, baselineDone: false });
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

  // 参加をやめる：記録は消さず（倫理審査の同意どおり研究に使う）、「やめた」印と時刻を付けてログアウトする。失敗したら例外を投げる
  async function withdraw() {
    if (!ref) await init();
    if (!ref) return true;
    await fb.fs.updateDoc(ref, { withdrawn: true, withdrawnAt: fb.fs.serverTimestamp() });
    await logout();
    return true;
  }

  window.OFStore = { init, signup, login, social, logout, resetPassword, begin, draft, baseline, avatar, decide, checkin, final, withdraw, get failed() { return failed; }, get uid() { return uid; }, get email() { return email; } };
})();
