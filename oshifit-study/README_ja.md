# OshiFit 研究版（oshifit-study）

参加者向けアプリ（`public/index.html`）・開発者ページ（`public/admin.html`）・Firestore のルール・分析（`analysis/`）。
作業の決まりは `CLAUDE.md`、保存するデータと CSV の形は `DATA_SCHEMA_ja.md`、分析の手順は `analysis/ANALYSIS_ja.md`。

## モード（`public/config.js`）

| `OSHIFIT_MODE` | 使いみち | 保存 | 編集者モード・回答の自動補完 |
|---|---|---|---|
| `"demo"`（初期値） | 展示（学祭）・画面の確認 | しない（通信もしない） | あり |
| `"study"` | 本実験 | Firestore（東京）に保存 | なし（同意前・回答前の画面には入れない） |

## 公開の前にすること（今井が確認してから）

1. `public/config.js` の `OSHIFIT_FIREBASE` に、Firebase コンソール →「プロジェクトの設定」→ ウェブアプリの値（apiKey・messagingSenderId・appId）を貼り、`OSHIFIT_MODE = "study"` にする
2. Firebase コンソール（プロジェクト `oshifit-34941`）→ Authentication →「ログイン方法」で、参加者用に「メール / パスワード」、開発者用に「Google」と「メールリンク（パスワードなしでログイン）」を有効にする。「設定 → 承認済みドメイン」に公開する URL（例 `oshifit-34941.web.app`）があるか確認
   - Firestore を作るときの場所は「asia-northeast1（東京）」を選ぶ（あとから変えられない）
3. Firestore に `admins/{大学のメールアドレス}` の文書を作る（今井・大井先生の2件。中身は空でよい）。開発者ページはこの2人だけが全件を閲覧できる
4. プレ実験の参加者は、Firestore の `pilots/{参加ID}` に文書を作る（アプリの外で管理する案B）。CSV の `pilot` 列が 1 になる
5. 公開：`npx firebase-tools deploy --only "hosting,firestore:rules"`（PowerShell では引用符が必要）

## 試験（この環境で実行済み）

```bash
cd tests && npm install
npx firebase emulators:exec --project demo-oshifit --only auth,firestore,hosting --config ../firebase.json "node --test rules.test.js && node e2e_study.js"
node --test questionnaire_sync.test.js
node demo_check.js            # 展示用が通信せずに動くか
```
- `rules.test.js`：ルール8件（自分の記録だけ・群は変えられない・回答は確定後に変えられない・振り返りは一度だけ・開発者は閲覧のみ など）
- `e2e_study.js`：エミュレーター上で、同意 → 途中で閉じて再開 → 85項目 → アバター → 群B → 4日後の振り返り → CSV の書き出し → 参加をやめる（記録の削除）まで、実際のブラウザで確認
- Playwright は `PLAYWRIGHT_MODULE` で場所を指定する

## 分析（研究者側）

手順は `analysis/ANALYSIS_ja.md`。開発者ページの CSV を `data/`（コミットしない）に置いて：
```bash
pip install -r analysis/requirements.txt
python -m analysis.run --data data --out out        # 分析レポート.md と各手順の結果
python -m analysis.make_synthetic --out syn --n 120 # 動作確認用の合成データ（結果に使わない）
python -m pytest analysis/tests -q                   # 15件
```

## 変更の記録

| 日時 | 変更 | 影響する画面 |
|---|---|---|
| 2026-11-12 | Firebase（匿名認証・Firestore）への保存を追加（`store.js`）。研究版では、同意したときに匿名ログインし、開始時の回答（途中経過も）・アバター・群・見込み・振り返り・最後の調査を保存。参加をやめると記録を削除 | 同意・質問・アバター・分析・2つの未来・振り返り・最後の調査・参加をやめる |
| 2026-11-12 | 研究版では、編集者モードと「回答の自動補完」を使えないようにした（以前は、回答していない項目を真ん中の値で埋めて分析画面などを表示できた）。進めない画面に入ろうとすると、いま進むべき画面に戻す | すべて |
| 2026-11-12 | 開発者ページ `admin.html` を本物のデータで作成（大学アカウントでログイン、閲覧のみ、確認が必要な人、CSV 4種） | 開発者ページ |
| 2026-11-12 | `firestore.rules`・`firebase.json` を追加 | なし（サーバー側） |
| 2026-11-12 | 分析パイプライン `analysis/`（手順0〜7）を追加 | なし（研究者側） |
| 2026-11-12 | 新規登録・ログイン（メールアドレスとパスワード）を追加。登録の画面で性別と同意を聞き、続けて質問 → アバター → 分析 → 2つの未来へ進む。パスワードの再設定、ログアウト | はじめに・新規登録・ログイン・マイページ |
| 2026-11-12 | 質問の短縮版（初期値）：採点・提案・群の判定に使わない17項目（Q35〜Q38・Q40・Q41・Q43・Q52〜Q54・Q55〜Q61）を省き、性別は登録画面で聞く（86問 → 68問）。`config.js` の `OSHIFIT_QSET="full"` で元に戻せる | 質問 |
| 2026-11-12 | アバターを Mii を参考にしたパーツ式に作り直し（髪型21種を性別で出し分け、髪・服は別々に36色、顔・肌・まゆ・目・目の色・鼻・口・めがね・ひげ）。後ろ髪を首・服の後ろに描き、首を足した。「写真から作る」を削除 | アバター・分析・2つの未来・ホーム |
| 2026-11-12 | 幸福度・ストレスの棒グラフの説明の言葉（「高いほど良い・線は13点」など）を削除（回答への影響を避けるため） | 分析・2つの未来・結果 |
| 2026-11-12 | 参加をやめても記録は消さない（倫理審査の同意どおり）。「やめた」印と時刻を付け、以後は書き込めない。説明文も変更 | マイページ・参加をやめる |
| 2026-11-12 | Firebase のプロジェクトを `oshifit-34941` に変更 | なし |
| 2026-11-13 | Google・Microsoft でのログインを追加（参加者の新規登録・ログイン、開発者ページ）。開発者の判定で、Microsoft のアカウントも認めるようにルールを変更 | 新規登録・ログイン・開発者ページ |
