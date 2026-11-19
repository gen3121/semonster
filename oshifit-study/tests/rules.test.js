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
test("開始時の質問を終えたら、回答は書き換えられない", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertSucceeds(updateDoc(r, { answers: { Q1: 21 } }));          // 途中は書き換えてよい
  await assertSucceeds(updateDoc(r, { answers: { Q1: 22 }, baselineDone: true, baselineAt: serverTimestamp() }));
  await assertFails(updateDoc(r, { answers: { Q1: 30 } }));
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
test("設定・提案・お知らせは誰でも読めて、開発者だけが書ける。メモは開発者だけ", async () => {
  const anon = env.unauthenticatedContext().firestore();
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "config", "app"), { version: 1, gapDays: 4 }); });
  await assertSucceeds(getDoc(doc(anon, "config", "app")));
  await assertSucceeds(getDocs(collection(me(), "plans")));
  await assertSucceeds(getDocs(collection(anon, "notices")));
  await assertFails(setDoc(doc(me(), "config", "app"), { version: 2 }));
  await assertFails(setDoc(doc(me(), "plans", "walk"), { title: "x" }));
  await assertFails(setDoc(doc(me(), "notices", "n1"), { text: "x", active: true }));
  await assertSucceeds(setDoc(doc(admin(), "config", "app"), { version: 2, gapDays: 5 }));
  await assertSucceeds(setDoc(doc(admin(), "plans", "walk"), { title: "散歩", how: "歩く", axis: "wb", eff: 8 }));
  await assertSucceeds(setDoc(doc(admin(), "notices", "n1"), { text: "メンテナンスのお知らせ", active: true }));
  await assertFails(getDoc(doc(me(), "notes", "AB12-CD34")));
  await assertFails(setDoc(doc(me(), "notes", "AB12-CD34"), { exclude: true }));
  await assertSucceeds(setDoc(doc(admin(), "notes", "AB12-CD34"), { text: "問い合わせあり", exclude: false }));
  await assertSucceeds(getDoc(doc(admin(), "notes", "AB12-CD34")));
  await assertFails(setDoc(doc(fake(), "config", "app"), { version: 3 }));
});
test("群を決めたときの設定の版と値は、あとから変えられない", async () => {
  const r = doc(me(), "participants", "u1");
  await setDoc(r, base);
  await assertSucceeds(updateDoc(r, { group: "B", planIds: ["sns23"], decidedAt: serverTimestamp(), cfgVersion: 2, cfgUsed: { gapDays: 4 } }));
  await assertFails(updateDoc(r, { cfgVersion: 3 }));
  await assertFails(updateDoc(r, { cfgUsed: { gapDays: 2 } }));
});
