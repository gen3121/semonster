// firestore.rules の試験（エミュレーター上）。npm test で実行。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, setDoc, updateDoc, getDoc, getDocs, deleteDoc, collection, collectionGroup, serverTimestamp } = require("firebase/firestore");

let env;
const base = { pid: "AB12-CD34", mode: "study", appVersion: "t", answers: {}, baselineDone: false };
test.before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-oshifit", firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8080 } });
});
test.after(async () => { await env.cleanup(); });
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "admins", "oi@oit.ac.jp"), { name: "admin" }); });
});
const me = () => env.authenticatedContext("u1").firestore();
const other = () => env.authenticatedContext("u2").firestore();
const admin = () => env.authenticatedContext("adm", { email: "oi@oit.ac.jp", email_verified: true }).firestore();
const fake = () => env.authenticatedContext("adm2", { email: "x@gmail.com", email_verified: true }).firestore();

test("参加者は自分の記録だけ作れて読める。他人の記録は読めない", async () => {
  await assertSucceeds(setDoc(doc(me(), "participants", "u1"), base));
  await assertSucceeds(getDoc(doc(me(), "participants", "u1")));
  await assertFails(getDoc(doc(other(), "participants", "u1")));
  await assertFails(setDoc(doc(other(), "participants", "u1"), base));
  await assertFails(getDocs(collection(me(), "participants")));
});
test("作るときに群や最後の調査は入れられない。参加IDの形も確かめる", async () => {
  await assertFails(setDoc(doc(me(), "participants", "u1"), { ...base, group: "B" }));
  await assertFails(setDoc(doc(me(), "participants", "u1"), { ...base, pid: "x" }));
  await assertFails(setDoc(doc(me(), "participants", "u1"), { ...base, mode: "demo" }));
});
test("群は一度決めたら変えられない。決めた時刻はサーバーの時刻", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertFails(updateDoc(r, { group: "B", planIds: ["sns23"], decidedAt: new Date() }));  // 端末の時刻は不可
  await assertSucceeds(updateDoc(r, { group: "B", planIds: ["sns23"], decidedAt: serverTimestamp(), pred: { hw: 15 } }));
  await assertFails(updateDoc(r, { group: "C" }));
  await assertFails(updateDoc(r, { planIds: ["mute"] }));
  await assertFails(updateDoc(r, { pred: { hw: 1 } }));
  await assertFails(updateDoc(r, { group: "Z" }));
});
test("群が決まるまでは開始時の回答を見直せる。群が決まったら回答と示した提案は書き換えられない", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertSucceeds(updateDoc(r, { answers: { Q1: 21 } }));          // 途中は書き換えてよい
  await assertSucceeds(updateDoc(r, { answers: { Q1: 22 }, baselineDone: true, baselineAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(r, { plansOffered: [{ id: "sns23" }] }));
  await assertSucceeds(updateDoc(r, { baselineDone: false }));           // アバターの画面から質問に戻る
  await assertSucceeds(updateDoc(r, { answers: { Q1: 30 }, baselineDone: true, baselineAt: serverTimestamp(), plansOffered: [{ id: "mute" }] }));
  await updateDoc(r, { group: "B", planIds: ["mute"], decidedAt: serverTimestamp() });
  await assertFails(updateDoc(r, { answers: { Q1: 31 } }));
  await assertFails(updateDoc(r, { baselineDone: false }));
  await assertFails(updateDoc(r, { plansOffered: [{ id: "sns23" }] }));
});
test("振り返りは群B・Cだけ、1〜6回目を一度だけ。書き換え不可", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertFails(setDoc(doc(r, "checkins", "1"), { week: 1, day: 4 }));     // 群が決まる前は不可
  await updateDoc(r, { group: "B", planIds: ["sns23"], decidedAt: serverTimestamp() });
  await assertSucceeds(setDoc(doc(r, "checkins", "1"), { week: 1, day: 4, at: serverTimestamp() }));
  await assertFails(setDoc(doc(r, "checkins", "1"), { week: 1, day: 5 }));
  await assertFails(setDoc(doc(r, "checkins", "7"), { week: 7, day: 30 }));
  await assertFails(setDoc(doc(r, "checkins", "2"), { week: 3, day: 9 }));
  await assertFails(setDoc(doc(doc(other(), "participants", "u1"), "checkins", "2"), { week: 2, day: 9 }));
});
test("毎日のアンケート：群が決まったあと、1日1回だけ。値の範囲を確かめる", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  const ok = { date: "2026-11-24", day: 1, mood: 5, yen: 1500, minutes: 90, joy: 6 };
  await assertFails(setDoc(doc(r, "daily", "2026-11-24"), ok));                           // 群が決まる前は不可
  await updateDoc(r, { group: "A", planIds: [], decidedAt: serverTimestamp() });
  await assertSucceeds(setDoc(doc(r, "daily", "2026-11-24"), ok));                        // 群Aも答える
  await assertFails(setDoc(doc(r, "daily", "2026-11-24"), { ...ok, mood: 4 }));           // 同じ日は書き換えない
  await assertFails(setDoc(doc(r, "daily", "2026-11-25"), { ...ok, date: "2026-11-25", mood: 9 }));
  await assertFails(setDoc(doc(r, "daily", "2026-11-25"), { ...ok, date: "2026-11-25", yen: -1 }));
  await assertFails(setDoc(doc(r, "daily", "2026-11-25"), { ...ok, date: "2026-11-26" }));  // 文書IDと日付が違う
  await assertFails(setDoc(doc(doc(other(), "participants", "u1"), "daily", "2026-11-25"), { ...ok, date: "2026-11-25" }));
  await assertSucceeds(getDocs(collectionGroup(admin(), "daily")));
});
test("群Aは振り返りを書けない。最後の調査は一度だけ", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertFails(updateDoc(r, { final: { day: 28 } }));                  // 群が決まる前は不可
  await updateDoc(r, { group: "A", planIds: [], decidedAt: serverTimestamp() });
  await assertFails(setDoc(doc(r, "checkins", "1"), { week: 1, day: 4 }));
  await assertSucceeds(updateDoc(r, { final: { day: 28, scores: { wb: 60 } } }));
  await assertFails(updateDoc(r, { final: { day: 29, scores: { wb: 90 } } }));
});
test("参加をやめる：記録は消せない。「やめた」印を付けたあとは書き込めない", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await updateDoc(r, { group: "C", planIds: ["mute"], decidedAt: serverTimestamp() });
  await setDoc(doc(r, "checkins", "1"), { week: 1, day: 4 });
  await assertFails(deleteDoc(doc(r, "checkins", "1")));
  await assertFails(deleteDoc(r));
  await assertSucceeds(updateDoc(r, { withdrawn: true, withdrawnAt: serverTimestamp() }));
  await assertFails(updateDoc(r, { withdrawn: false }));
  await assertFails(updateDoc(r, { avatar: { hair: "bob" } }));
  await assertFails(setDoc(doc(r, "checkins", "2"), { week: 2, day: 9 }));
  await assertSucceeds(getDoc(r));                                   // 自分の記録は読める
});
test("開発者（admins に登録・メール確認済み）だけが全件を読める。書き換えはできない", async () => {
  await setDoc(doc(me(), "participants", "u1"), base);
  await assertSucceeds(getDocs(collection(admin(), "participants")));
  await assertSucceeds(getDocs(collectionGroup(admin(), "checkins")));
  await assertFails(getDocs(collection(fake(), "participants")));
  await assertFails(updateDoc(doc(admin(), "participants", "u1"), { group: "A" }));
  await assertFails(deleteDoc(doc(admin(), "participants", "u1")));
  await assertFails(setDoc(doc(admin(), "admins", "y@oit.ac.jp"), {}));
  const unverified = env.authenticatedContext("adm3", { email: "oi@oit.ac.jp", email_verified: false }).firestore();
  await assertFails(getDocs(collection(unverified, "participants")));
  const ms = env.authenticatedContext("adm4", { email: "oi@oit.ac.jp", email_verified: false, firebase: { sign_in_provider: "microsoft.com" } }).firestore();
  await assertSucceeds(getDocs(collection(ms, "participants")));                 // 大学の Microsoft アカウント
  const pw = env.authenticatedContext("adm5", { email: "oi@oit.ac.jp", email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
  await assertFails(getDocs(collection(pw, "participants")));                    // パスワード登録・未確認では見られない
});
test("実験の条件：作るときと変えるときは、版を上げて同じ書き込みで履歴を残す。固定中は変えられない", async () => {
  const { writeBatch } = require("firebase/firestore");
  const ad = admin(), mi = me();
  const anon = env.unauthenticatedContext().firestore();
  const P = (db) => doc(db, "study", "protocol"), H = (db, v) => doc(db, "study", "protocol", "history", String(v));
  await assertFails(setDoc(P(ad), { version: 1, gapDays: 4 }));                                    // 履歴なしでは作れない
  let b = writeBatch(ad); b.set(P(ad), { version: 1, gapDays: 4, locked: false }); b.set(H(ad, 1), { version: 1, reason: "初期値", after: { gapDays: 4 } });
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(P(anon)));                                                                  // 誰でも読める（アプリが使う）
  await assertFails(getDoc(H(mi, 1)));                                                                  // 履歴は開発者だけ
  await assertFails(updateDoc(P(ad), { gapDays: 5 }));                                               // 版を上げないと変えられない
  b = writeBatch(ad); b.update(P(ad), { version: 2, gapDays: 5 }); b.set(H(ad, 2), { version: 2, reason: "" });
  await assertFails(b.commit());                                                                          // 理由のない履歴は不可
  b = writeBatch(ad); b.update(P(ad), { version: 2, gapDays: 5 }); b.set(H(ad, 2), { version: 2, reason: "先生と相談して5日に" });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(H(ad, 2), { reason: "書き換え" }));                                    // 履歴は書き換えられない
  await assertFails(setDoc(P(mi), { version: 3 }));
  await assertSucceeds(updateDoc(P(ad), { locked: true, lockedAt: serverTimestamp(), lockedBy: "oi@oit.ac.jp" }));   // 固定
  b = writeBatch(ad); b.update(P(ad), { version: 3, gapDays: 6 }); b.set(H(ad, 3), { version: 3, reason: "x" });
  await assertFails(b.commit());                                                                          // 固定中は変えられない
  await assertFails(updateDoc(P(ad), { locked: false }));                                            // 外すには理由が要る
  await assertSucceeds(updateDoc(P(ad), { locked: false, lockReason: "誤りの修正" }));
});
test("提案は固定中は出す・出さないだけ。運用とお知らせとメモは開発者だけが書ける", async () => {
  const { writeBatch } = require("firebase/firestore");
  const ad = admin(), mi = me();
  await assertSucceeds(setDoc(doc(ad, "plans", "walk"), { title: "散歩", how: "歩く", axis: "wb", eff: 8, active: true }));
  await assertSucceeds(getDocs(collection(env.unauthenticatedContext().firestore(), "plans")));
  await assertFails(setDoc(doc(mi, "plans", "walk2"), { title: "x" }));
  const b = writeBatch(ad); b.set(doc(ad, "study", "protocol"), { version: 1, locked: false }); b.set(doc(ad, "study", "protocol", "history", "1"), { version: 1, reason: "初期値" }); await b.commit();
  await updateDoc(doc(ad, "study", "protocol"), { locked: true });
  await assertFails(updateDoc(doc(ad, "plans", "walk"), { eff: 20 }));                               // 固定中は効果の値を変えない
  await assertSucceeds(updateDoc(doc(ad, "plans", "walk"), { active: false, updatedBy: "oi@oit.ac.jp" }));
  await assertFails(setDoc(doc(ad, "plans", "walk3"), { title: "新しい提案" }));                     // 固定中は足せない
  await assertSucceeds(setDoc(doc(ad, "ops", "alerts"), { noCheckDays: 8 }));
  await assertFails(getDoc(doc(mi, "ops", "alerts")));
  await assertSucceeds(setDoc(doc(ad, "notices", "n1"), { text: "お知らせ", active: true }));
  await assertSucceeds(getDocs(collection(env.unauthenticatedContext().firestore(), "notices")));
  await assertFails(setDoc(doc(mi, "notices", "n2"), { text: "x" }));
  await assertFails(getDoc(doc(mi, "notes", "AB12-CD34")));
  await assertSucceeds(setDoc(doc(ad, "notes", "AB12-CD34"), { text: "問い合わせあり", exclude: false }));
  await assertFails(setDoc(doc(fake(), "ops", "alerts"), { noCheckDays: 1 }));
});
test("群を決めたときの設定の版と値は、あとから変えられない", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertSucceeds(updateDoc(r, { group: "B", planIds: ["sns23"], decidedAt: serverTimestamp(), cfgVersion: 2, cfgUsed: { gapDays: 4 } }));
  await assertFails(updateDoc(r, { cfgVersion: 3 }));
  await assertFails(updateDoc(r, { cfgUsed: { gapDays: 2 } }));
});
test("参加コード：ops/join があると、同じコードでないと参加者の記録を作れない。コードは研究者だけが読み書きできる", async () => {
  await assertSucceeds(setDoc(doc(other(), "participants", "u2"), base));              // 設定前は誰でも
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "ops", "join"), { code: "OSHI42" }); });
  await assertFails(setDoc(doc(me(), "participants", "u1"), base));
  await assertFails(setDoc(doc(me(), "participants", "u1"), { ...base, joinCode: "WRONG" }));
  await assertSucceeds(setDoc(doc(me(), "participants", "u1"), { ...base, joinCode: "OSHI42" }));
  await assertFails(getDoc(doc(me(), "ops", "join")));                                  // 参加者はコードを読めない
  await assertSucceeds(getDoc(doc(admin(), "ops", "join")));
  await assertSucceeds(setDoc(doc(admin(), "ops", "join"), { code: "NEW123" }));
});
