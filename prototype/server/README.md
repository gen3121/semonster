# OshiFit 中継サーバー（server/）

チャットの「AI面接」で、参加者の自由記述を**質問紙の固定の選択肢に対応づけるだけ**の LLM 呼び出しを中継する小さなサーバーです。
ブラウザに API キーを持たせないために置いています。質問文は変えません。述べられていないことは推測せず `null` にします。

> **正直な制限**: このサーバーは、**偽のクライアント（fake client）でしかテストしていません**。開発環境に API キーがなく、**本物の Anthropic API には一度も接続していません**。
> 最初の本番利用の前に、`GET /api/health` と手動の `POST /api/read` を1回ずつ確認してください（下記）。
> 構造化出力のスキーマ（`anyOf: [integer, null]` など）や `effort` と `format` の併用が実 API で受理されるかは、実機で未確認です。

## 動かし方

```sh
cd prototype/server
npm install                       # @anthropic-ai/sdk を入れる（node_modules はコミットしない）
ANTHROPIC_API_KEY=sk-ant-... node proxy.js
# → http://127.0.0.1:8787/ で prototype/ の画面も配られる（カメラ・wasm 用に http(s) が必要なため）
```

リポジトリのルートから `node prototype/server/proxy.js` でも動きます。テストは `cd prototype/server && node --test`（Node 18 以上）。

### 最初の確認（本番キーでの初回）

```sh
curl -s localhost:8787/api/health
# → {"ok":true,"model":"claude-opus-5-5","llm":true}
curl -s -XPOST localhost:8787/api/read -H 'content-type: application/json' \
  -d '{"topic":"limits","text":"手取り月12万、家賃などが6万、推し活は月2万くらい"}'
# → income / expense / spend が埋まり、free_wd / free_hd は null になるはず
```

## 環境変数

| 名前 | 既定値 | 意味 |
|---|---|---|
| `ANTHROPIC_API_KEY` | （なし） | 必須。未設定だと `/api/read` は 503 `no_key`（クライアントは規則ベースに戻る）。コードには書かない |
| `OSHIFIT_MODEL` | `claude-opus-5-5` | 使うモデル。安く済ませるなら `claude-haiku-5-5` |
| `OSHIFIT_EFFORT` | `low` | `output_config.effort`。`none` で送らない（モデルが対応しない場合の逃げ道） |
| `PORT` | `8787` | 待ち受けポート |
| `OSHIFIT_HOST` | `127.0.0.1` | 待ち受けアドレス。既定はこの端末だけ。LAN に出すときだけ明示する |
| `OSHIFIT_STATIC_DIR` | `prototype/` | 静的配信のルート。`server/`・`node_modules/`・隠しファイルは配らない |
| `OSHIFIT_CORS_ORIGIN` | （なし） | 既定は同一オリジンのみ（CORS ヘッダなし）。別オリジンから呼ぶときだけ、そのオリジンを1つ指定 |
| `OSHIFIT_RATE_PER_MIN` / `OSHIFIT_MAX_INFLIGHT` | `120` / `8` | キーの使いすぎ防止（全体で1分あたりの回数 / 同時実行数）。超えると 429 |

## API

### `GET /api/health`

`{"ok":true,"model":"claude-opus-5-5","llm":true}`（`llm` はキーがあるか。API は呼ばない）

### `POST /api/read`

リクエスト（`Content-Type: application/json`、本文は約8KBまで）:

```json
{ "topic": "limits", "text": "手取り月12万、家賃などが6万、推し活は月2万くらい" }
```

- `topic`: `topics.js` の話題ID（`tipi` `avatar` `trigger` `ideal` `current` `burden` `effect` `limits`）。それ以外は 400。
- `text`: 1000文字まで。項目の定義（文言・選択肢）は**サーバーの `instrument.js` から作る**。クライアントが送ってきても無視する。

成功（200）:

```json
{
  "ok": true, "topic": "limits", "model": "claude-opus-5-5", "redacted": false,
  "answers": {
    "income":  { "value": 2, "evidence": "手取り月12万" },
    "expense": { "value": 2, "evidence": "家賃などが6万" },
    "spend":   { "value": 3, "evidence": "推し活は月2万" },
    "free_wd": { "value": null, "evidence": null },
    "free_hd": { "value": null, "evidence": null }
  }
}
```

- 話題の全項目が必ず入る。述べられていない・検査を通らなかった項目は `{ "value": null, "evidence": null }`。
- `value`: 5段階の項目は 1〜5（5＝とても当てはまる／とてもよくする）。選択式（`limits`）は `options` の **0始まりの番号**。
- `evidence`: 参加者の文章からそのまま写した根拠（80文字以内）。画面で「あなたの回答: ○○」と見せてよい。
- `redacted`: 送る前に伏せ字にした箇所があったか。

失敗（`{"ok":false,"error":"..."}`）。クライアントは**どれでも規則ベースに戻す**:

| status | error | 意味 |
|---|---|---|
| 400 | `unknown_topic` `bad_json` `bad_request` `text_too_long` `empty_text` | 入力不正 |
| 413 | `payload_too_large` | 本文が大きすぎる |
| 415 | `unsupported_media_type` | JSON ではない |
| 429 | `rate_limited` | 回数・同時実行の上限 |
| 502 | `refused` | モデルが拒否した（`stop_reason: refusal`） |
| 502 | `truncated` | 出力が途中で切れた（`max_tokens`） |
| 502 | `bad_output` | JSON として読めない・構造が違う |
| 502 | `llm_error` | API エラー（理由の詳細は返さない・記録しない） |
| 503 | `no_key` | キーが設定されていない |

## プライバシー設計

- **保存しない**: DB・ファイル・キャッシュに何も書かない。
- **ログに出さない**: 記録するのは「メソッド・パス（クエリ抜き）・ステータス・所要ms・話題ID」だけ。参加者の文章・LLM の応答・API エラーのメッセージは出さない（テストで確認）。
- **送る前に伏せ字**: 電話番号（日本の各形式・`+81`）、メールアドレス、URL、〒郵便番号、7桁以上の数字列、`@ID` を `[伏せ字]` に置き換える。「月12万」「3,000円」「1000000円」「毎日2時間」「18時」など、データそのものである数値は残す。**伏せ字は完全ではない**（氏名・住所の文章・推しの名前などは検出しない）。
- **LLM に出ていくもの**: 伏せ字後の参加者の文章（最大1000文字）と、固定の質問項目の文言。個人を識別する情報（ID・端末・IP）は付けない。
- **出力を信用しない**: 返ってきた値は `validate()` で再検査する。範囲外の値、参加者の文章（伏せ字後・NFKC 正規化）に見つからない根拠、根拠なしの「回答しない」は `null` に落とす。
- **攻撃面**: 参加者の文章は「データ」として枠で囲み、指示には従わない設定にしている。項目定義はサーバー側のみ。CORS は既定で無効。静的配信はパストラバーサル・隠しファイル・シンボリックリンクで外へ出る経路を塞ぐ。

## 研究倫理についての注意

- 伏せ字後でも、参加者の自由記述を**外部の LLM API に送る**ことになる。倫理審査の申請書には、データの処理者（Anthropic）、送る内容（伏せ字後の文章と質問文）、保存の有無・期間・学習利用の扱い（契約・設定で確認した内容）を書くこと。
- 同意説明の文面にも、「回答の文章は個人情報を伏せたうえで外部の AI サービスに送って整理に使う」ことを明記する。拒否した人には規則ベースの経路（外部送信なし）を用意する。
- 推し活費用・睡眠・金銭の不安など機微に近い内容を含むため、研究倫理の担当者と、利用する API の保持期間の設定を確認してから本番で使うこと。
- プロンプトの頻度の目安（「週に数回＝4」など。`proxy.js` の system プロンプト）は研究者が決めるべき対応づけなので、本番前に確認・修正すること。

## 構成

- `proxy.js` … サーバー本体。`createApp({ client, model, staticDir })` と `redact` `buildRequest` `validate` を export。
- `test/proxy.test.js` … 偽クライアントによるテスト（`node --test`）。
- LLM 呼び出しは公式 SDK `@anthropic-ai/sdk`。`output_config: { effort: 'low', format: { type: 'json_schema', schema } }` を使い、`thinking`・`budget_tokens`・`temperature`・アシスタントのプレフィルは送らない（Opus 5.5 は思考が常にオンで、思考トークンも `max_tokens` に含まれるので `max_tokens` は 4096）。
