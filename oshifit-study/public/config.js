// OshiFit の設定。研究版で公開するときは OSHIFIT_MODE を "study" にする。
//   "study" … 研究版。回答を Firebase（Firestore、東京）に保存する。編集者モード・回答の自動補完は使えない
//   "demo"  … 展示（学祭）・確認用。何も保存しない。編集者モードあり
window.OSHIFIT_MODE = "demo";
window.OSHIFIT_APP_VERSION = "2026-11-12";
// 質問の数："short"＝短縮版（採点・提案に使わない17項目を省く）、"full"＝承認時の全項目
window.OSHIFIT_QSET = "short";
// Firebase コンソール →「プロジェクトの設定」→「マイアプリ」のウェブアプリの値を貼る（公開されても問題ない値。秘密鍵ではない）
window.OSHIFIT_FIREBASE = {
  apiKey: "【Firebase コンソールの値】",
  authDomain: "oshifit-34941.firebaseapp.com",
  projectId: "oshifit-34941",
  messagingSenderId: "【Firebase コンソールの値】",
  appId: "【Firebase コンソールの値】",
};
// テスト用：エミュレーターにつなぐ（本番では null のまま）
window.OSHIFIT_EMULATOR = null; // 例 { auth: "http://127.0.0.1:9099", firestore: ["127.0.0.1", 8080] }
