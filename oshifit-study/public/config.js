// OshiFit の設定。研究版で公開するときは OSHIFIT_MODE を "study" にする。
//   "study" … 研究版。回答を Firebase（Firestore、東京）に保存する。編集者モード・回答の自動補完は使えない
//   "demo"  … 展示（学祭）・確認用。何も保存しない。編集者モードあり
// 研究で使う URL（/）は研究版。編集者用の URL（/editor）は保存しない確認用（編集者モードつき）
window.OSHIFIT_MODE = /^\/editor/.test(location.pathname) ? "demo" : "study";
window.OSHIFIT_APP_VERSION = "2026-11-12";
// 質問の数："short"＝短縮版（採点・提案に使わない17項目を省く）、"full"＝承認時の全項目
window.OSHIFIT_QSET = "short";
// Firebase コンソール →「プロジェクトの設定」→「マイアプリ」のウェブアプリの値を貼る（公開されても問題ない値。秘密鍵ではない）
window.OSHIFIT_FIREBASE = {
  apiKey: "AIzaSyBrpfg50tGkQf31yIFITNzV5ooKSJtjigQ",
  authDomain: "oshifit-34941.firebaseapp.com",
  projectId: "oshifit-34941",
  storageBucket: "oshifit-34941.firebasestorage.app",
  messagingSenderId: "48328396908",
  appId: "1:48328396908:web:e2164c0c82f5858607c849",
  // measurementId（Google アナリティクス）は使わない：参加者の操作を外部の分析に送らないため
};
// Microsoft でのログインに使う Azure のテナント（大阪工業大学）。Azure のアプリが「この組織ディレクトリのみ」のときに必要。
// 学外の人の Microsoft アカウントも使えるようにするなら、Azure のアプリを「任意の組織ディレクトリと個人の Microsoft アカウント」にして、ここを null にする
window.OSHIFIT_MS_TENANT = "636389c0-b95c-4828-b98f-f9fcb8d9383a";
// 提案文を推しに合わせる AI（ai.js）。Firebase AI Logic を通じて Gemini を使う
//   backend:"agent"＝Google Cloud の Vertex AI（Agent Platform API）。Blaze のお支払いで払う（1人あたり数円）。送った内容は学習に使われない
//     設定：Google Cloud コンソールで「Agent Platform API（aiplatform.googleapis.com）」を有効にする
//   backend:"google"＝Gemini Developer API（AI Studio。プロジェクトが有料枠のときは前払いのクレジットが要る）
//   appCheckKey：reCAPTCHA v3 のサイトキー（公開してよい値）。App Check に登録すると、このサイト以外から無料枠を使われない
//   使えないとき（設定前・上限・時間切れ）は、承認済みの固定の文を出す。enabled:false で AI を使わない
window.OSHIFIT_AI = { enabled: true, backend: "agent", location: "global", model: "gemini-3.8-flash", fallbackModels: ["gemini-4-hydrogen"], appCheckKey: "" };
// 参加の受付の最終日（日本時間でこの日の終わりまで）。過ぎると新規登録の画面に「受付は終了しました」と出る（登録済みの人は続けられる）
//   AI の提案文（App Check）が 2027-01-21 から使えなくなるため、全員が同じ条件になるようにここで区切る
window.OSHIFIT_SIGNUP_UNTIL = "2027-01-20";
// テスト用：エミュレーターにつなぐ（本番では null のまま）
window.OSHIFIT_EMULATOR = null; // 例 { auth: "http://127.0.0.1:9099", firestore: ["127.0.0.1", 8080] }
