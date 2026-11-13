# 写真から似顔アバターを作る（端末内だけで処理）

参加者が自分の写真を選ぶと、**肌の色・髪の色・顔の比率・（強い証拠があれば）めがね** を取り出して、いまのパーツ式アバターに重ねる。
写真は端末の外へ出さず、保存もしない。残るのは、色コードと小さな数値だけ。

- 髪型（ボブ / ショート / ロング / ふたつ結び）は **写真から決めない**。パーツ選びで参加者が選ぶ。
- 取り出した値は、すべて従来のパーツ選びで直せる（アプリ側の作業。`avatar.fromPhotoParams` が返す値は普通のアバター値）。
- 自信のない項目は返さない（`null`）か、信頼度を低くして、アプリがパーツ選びに戻せるようにしてある。

## ファイル

| ファイル | 役割 |
|---|---|
| `js/photo.js` | `window.OF.photo` / `module.exports`。`deriveParams`（純粋関数）と、ブラウザ用の `fromImage` / `fromFile` |
| `js/avatar.js` | 比率パラメータ（任意）と `fromPhotoParams` を追加。パラメータが無いときの SVG は従来と 1 文字も違わない |
| `tools/vendor_mediapipe.sh` | MediaPipe を npm から取り込み、`vendor/mediapipe/` に置く（`vendor/` は `.gitignore` 済み。このスクリプトで再生成） |
| `tests/photo.test.js` | 純粋な部分の単体テスト（`node --test tests/photo.test.js`） |
| `tests/photo_e2e.js` + `tests/fixtures/photo_test.html` | 実ブラウザでの通し確認（`node tests/photo_e2e.js 顔写真.png`） |

## 使い方

```
bash tools/vendor_mediapipe.sh     # 初回だけ。npm が使える環境で（取り込み後は実行時に外部通信なし）
node server/proxy.js               # または任意の静的サーバー（prototype/ をルートにする）
```

index.html の読み込み順（`util.js` が `window.OF` を作る）:

```html
<script src="js/avatar.js"></script>
<script src="js/photo.js"></script>
```

`photo.js` は自分の URL を基準に `../vendor/mediapipe/` を探す（`/js/photo.js` なら `/vendor/mediapipe/`）。別の場所に置くときは `OF.photo.configure({ baseUrl: '/path/to/mediapipe/' })`。

**http(s) で配信すること。** `file://` では MediaPipe（wasm / モデル読み込み）が動かないので、`fromImage` は `engine_unavailable` を返す。

```js
try {
  const params = await OF.photo.fromFile(fileInput.files[0]);        // File → 数値と色だけ
  const av = OF.avatar.fromPhotoParams(params, setup.av);            // 髪型・シャツ・ピンは setup.av のまま
  // 保存するのは av だけ。photoApplied（どの項目を写真から反映したか）は表示用なので、保存前に消してよい。
} catch (e) {
  if (e instanceof OF.photo.PhotoError) showMessage(OF.photo.ERROR_MESSAGES_JA[e.code]);   // → パーツ選びへ
}
```

写真を選んでいる間に `OF.photo.preload()` を呼ぶと、エンジンの読み込み（約 17 MB、初回のみ）を先に済ませられる。画面を離れるときは `OF.photo.dispose()`（WebGL のエンジンを閉じる）。

スマホでカメラを使うなら `<input type="file" accept="image/*" capture="user">`。選んだ写真は `File` として渡されるだけで、`photo.js` は `getUserMedia` を使わない。

## API

### `OF.photo`

- `deriveParams(landmarks, sampler, { aspect }?)` → params（純粋。DOM 不要）
  - `landmarks`: `{x,y,z}[]`（0..1、Face Mesh の 468 点）。`sampler(x, y, r)` は画像の小さな円の平均色 `[r,g,b]`（0..255）か `null`。`r` は画像の幅に対する半径。`aspect` は画像の 幅/高さ（既定 1）。
  - 不正な入力は `PhotoError('bad_input')`。
- `fromImage(source)` → `Promise<params>`。`source` は `HTMLImageElement | HTMLCanvasElement | ImageBitmap`。source 自体は閉じない・書き換えない。
- `fromFile(file)` → `Promise<params>`。`createImageBitmap(file, {imageOrientation:'from-image'})`（EXIF の向きを反映）、だめなら `<img>` + object URL。使い終わりに `bitmap.close()` と `URL.revokeObjectURL`。
- `preload()` → `Promise<boolean>`、`dispose()`、`configure({baseUrl})`、`baseUrl()`、`ASSETS`（実行時に読むファイル一覧）。
- `PhotoError`（`.code`）、`ERROR_MESSAGES_JA`、`WARNING_MESSAGES_JA`（参加者向けの日本語文言）。`PRIORS`、`LANDMARK`（使うランドマーク番号）。

エラーコード（`PhotoError.code`）:

| code | 意味 |
|---|---|
| `no_face` | 顔が検出できない（顔が小さすぎて検出器が拾えない場合も含む） |
| `multiple_faces` | 2 つ以上の顔 |
| `too_small` | 検出はできたが、顔の幅が 80px 未満（作業画像上）または画像幅の 12% 未満 |
| `too_dark` | 画像全体の平均輝度 < 28（0..255）、または肌の輝度 < 40 |
| `decode_failed` | 画像として読めない（形式・破損・30MB 超） |
| `engine_unavailable` | MediaPipe を読めない（`file://`、vendor 未配置、通信遮断など） |
| `engine_failed` | 実行時の失敗・60 秒でタイムアウト |
| `bad_input` | 引数が不正 |

### params の形

```js
{
  skin: '#DAB79E' | null,          // 頬・おでこ 5 か所の中央値（外れ値は除く）。明るさ・彩度の両端だけ丸める
  hairColor: '#A38E65' | null,    // おでこの上の帯。背景・肌・ばらつきが疑わしければ null
  faceW: -0.09, jaw: 0.41, eyeGap: 0.37, eyeY: -0.69,   // -1..1、0 が標準。+ は 顔が広い / エラが張る / 目が離れる / 目が低い
  glasses: true | null,           // true は強い証拠があるときだけ。false は返さない（「ない」とは言えないため）
  hairStyle: undefined,           // 意図的に未定
  confidence: { skin, hair, proportions, glasses },   // 0..1
  warnings: ['hairstyle_not_derived', ...],            // WARNING_MESSAGES_JA にある文言のコード
  measures: { faceRatio, jawRatio, eyeGapRatio, eyeYRatio, rollDeg, yaw, skinLuma, sharpness? }   // 確認用の生の測定値（保存は不要）
}
```

### `OF.avatar`（追加）

- `svg(av, expr)`: `av.faceW / jaw / eyeGap / eyeY`（任意、-1..1、範囲外は丸め、数値でなければ 0 扱い）を受ける。すべて 0 / 未指定なら従来と同じ文字列。変化は控えめ（顔の幅 ±6px、目の間隔 ±6px、目の高さ −4〜+8px、あごの丸みを少し）。
- `fromPhotoParams(params, base, { minConfidence = 0.5 }?)`: `base`（髪型・シャツ・ピン等）に、信頼度が足りる項目だけ上書きして返す。色は `#rrggbb` だけ受け付ける。返り値の `photoApplied`（反映した項目名の配列）は表示用。
- `GEOMETRY_KEYS`、`MIN_CONFIDENCE`。

## プライバシーの設計

1. **MediaPipe は npm から取り込んで自分のサーバーに置く**（`@mediapipe/face_mesh` 0.4.1633559619、Apache-2.0）。この npm パッケージには顔検出とランドマークのモデル（`face_mesh_solution_packed_assets.data`、`face_mesh.binarypb`）と wasm が全部入っている。実行時に CDN も Google のストレージも使わない。（新しい `@mediapipe/tasks-vision` はモデル `face_landmarker.task` が npm に入っておらず、Google のストレージから取る必要があるので採用しなかった。）
2. 写真は `File` → `ImageBitmap` → 縮小したキャンバス → 色と点の位置を読む、の順にメモリの中だけで通る。`localStorage` / `sessionStorage` / IndexedDB / Cache Storage / `fetch` / `XMLHttpRequest` / `toDataURL` / `toBlob` は使わない（`tests/photo.test.js` が photo.js のソースを検査）。
3. 終わったら（成功でも失敗でも `finally` で）キャンバスを消して 0×0 にし、ビットマップを `close()`、object URL を `revoke`。MediaPipe に渡す前に毎回 `reset()` して、前の写真の追跡状態を持ち越さない。MediaPipe の結果からは座標の数値だけを取り出し、入力画像（`results.image`）は持ち出さない。
4. 実ブラウザの確認（`tests/photo_e2e.js`）: 一連の操作中の通信は「ページ本体・`js/avatar.js`・`js/photo.js`・`vendor/mediapipe/` のファイル」への GET だけ。外部ホストへの通信は遮断したうえで、発生すれば失敗とみなす。POST など本文つきの通信なし。操作後の localStorage / sessionStorage / IndexedDB / Cache Storage は空。
5. 残る値は、色コード 2 つ、-1..1 の数値 4 つ（小数 2 桁）、めがね有無だけ（`av` の JSON で 300 バイト程度）。`measures`・信頼度・警告は画面表示の補助で、保存しなくてよい（保存するのは `av`）。顔の点（ランドマーク）は保存しない。
6. ブラウザは `vendor/mediapipe/` のファイルを通常の HTTP キャッシュに残すことがある。これは写真ではなく配布物なので、個人情報ではない。
7. 取り出した値（`skin` など）をサーバーへ送るかどうかは、アプリ側で別に決めること（この実装は何も送らない）。送るなら、同意書に「アバターの色と数値のみ」と書く。

## 限界（正直に）

- **髪型は写真から決められない。** ランドマークは顔の内側の点で、髪型の情報がない。参加者が選ぶ。
- **肌の色は撮影の光に左右される。** 同じ顔の画像を暗く・明るく・暖色・寒色にして試した結果は、それぞれ明確に別の色になった（暗くすると「より濃い肌」に見える）。暗さが光のせいか肌のせいかは、顔だけでは区別できない。色は補正しない（明るくも暗くもしない）ので、参加者に **色見本を見せて必ず確認・変更してもらう** こと。極端な色（白飛び・黒つぶれ・色かぶり）は警告と低い信頼度で返し、それ以外は警告を出さない。
- **髪の色は、頭の上が背景でないとき**にだけ拾う。髪が短い・帽子・ヒジャブ・白髪や明るい壁（低彩度で明るい）・肌色に近い壁・坊主・髪が画像から切れている場合は `null`（パーツ選びへ）。信頼度の上限は 0.75（背景が混ざっている可能性を消せないため）。染髪・ハイライト・逆光でも外れる。
- **めがねは弱い判定。** 「両目の下の暗い縁 + 鼻すじの暗い帯」の両方が強いときだけ `true`。細い縁・縁なし・薄い色の縁・サングラス・濃い化粧（下まぶたのライン）では当たらない／外れる。`false` は返さない。信頼度は 0.5 ちょうど（`fromPhotoParams` の既定で反映される最小値）。実物のめがね写真では確認していない。
- **顔の比率は目安。** ランドマークは写真ごとにゆれる（同じ顔の明るさ・色味だけ変えた画像で `eyeGap` が 0.25〜0.38、顔に合成のめがねを描いた画像では 0.02 までゆれた）。横向き・うつむき・笑顔・髪やめがねで輪郭が隠れる場合に外れる。横向きは信頼度を下げ、傾き（ロール）は補正する。基準値（`PRIORS`）は一般的な人体計測を参考に置いた **暫定値で、参加者集団での較正はしていない**（`eyeY` の基準は 1 枚のテスト画像でランドマークの位置関係を見てから決めたので、検証にはならない）。パイロットのデータで見直す。アバターへの影響は ±6px 程度に抑えてある。
- **顔の検出・ランドマークの精度は、肌の色・顔つき・年齢・照明・撮影角度で差が出ることが知られている。** この実装は、人種や民族などの属性を推定・分類しない（比率も肌の色も「描くための値」に留まる）が、誤差が一様でないことは前提にして、**参加者が必ず編集できる** ようにしておくこと。
- **小さい顔は検出できない。** 検出器の下限により、顔が写真の幅の約 15% 未満だと `no_face` になることが多い（`too_small` に届く前）。顔の幅が 80px（作業画像上）または画像幅の 12% 未満なら `too_small`。作業画像は長辺 800px に縮める。
- ピントの警告（`blurry`）の閾値は暫定。

## 倫理審査・同意書への文案（案）

> **アバターの作成について**
> 希望する方は、ご自身の顔写真からアバター（似顔絵）を作ることができます。写真はあなたのスマートフォンの中だけで処理し、**研究者・サーバー・第三者には送られず、保存もされません**（処理が終わるとすぐに破棄されます）。写真から取り出すのは、肌の色と髪の色、顔の大まかな比率を表す数値、めがねの有無の目安だけで、これらをもとにアバターの絵が作られます。取り出した結果は自由に修正でき、写真を使わずに、パーツを選んで作ることもできます。写真の利用は任意で、使わなくても研究への参加に影響はありません。

注意: この文案は研究チームの案で、法的な判断ではない。顔に関するデータの扱い（個人情報保護法上の位置づけ、研究倫理審査での扱い）は、所属機関の倫理委員会・個人情報の担当に確認すること。「取り出す数値は顔の識別に使えるものではない」とは言い切らず、「数値は数個で、顔の識別を目的としない」と記述するのが安全。

## テスト

- `node --test tests/photo.test.js`（27 件）: 合成ランドマーク（468 点のうち使う番号だけ配置）と固定色のサンプラーで、肌の保持・丸め・外れ値、髪の `null` 条件、比率・ロール・縦横比・横向き、めがね、入力検査、出力の形、photo.js に保存・送信 API がないこと、avatar の既定出力が従来と同一（変更前の出力の SHA-256 を埋め込み）・丸め・`fromPhotoParams`。
- `node tests/photo_e2e.js 顔写真.png [出力先]`（Playwright + Chromium、ローカルの静的サーバー）: 顔写真の成功・再実行で同じ結果、顔なし / 暗い / 2 人 / 小さい / 画像でない / 壊れた PNG のエラーコード、通信の範囲、保存領域が空、キャンバスとビットマップの後始末、`dispose()` 後の再実行、`file://` での `engine_unavailable`。
  - ヘッドレス Chromium では **追加の設定なしで動く**（WebGL は SwiftShader のソフトウェア描画に自動で切り替わる）。`--enable-unsafe-swiftshader` を付けると新しい Chromium での警告が出ない（e2e は付けている）。初回 約 2 秒、2 回目以降 約 0.2〜1.7 秒。
  - 顔写真は repo に入れない。scikit-image のサンプルなら `python -c "from skimage import data; from PIL import Image; Image.fromarray(data.astronaut()).save('astronaut.png')"`。

## 確認していないこと

- **実機のカメラ・写真アプリで撮った写真**（スマホの EXIF の向き、HEIC、高解像度、前面カメラの鏡像、実際の照明）。テストは静止画（宇宙飛行士の写真と、それを加工した画像）だけ。
- **Chromium 以外**（iOS Safari / Firefox）と実機の GPU での WebGL 動作・速度・メモリ。
- 肌の色の濃い人、年配の人、子ども、ひげ・化粧・ヒジャブ・マスクなど、多様な顔での精度。テストの実顔は 1 枚（明るい肌の女性、スタジオ照明）だけで、基準値の較正にも使えない。
- 実物のめがねの写真（合成で線を描いた画像で動作を確かめただけ）。
- 通信が遅い環境での 17 MB の読み込み体験。SIMD 非対応の端末向け wasm（`face_mesh_solution_wasm_bin.*`）の実行。
- `server/proxy.js` からの配信（`python3 -m http.server` と、テスト用の node の静的サーバーでは動作を確認。`.wasm` は `application/wasm` で配信される）。


## 公開されている顔写真での試験（2026年10月）

ネットから顔写真を持ってきて似顔アバターを作れるかを試した。この環境のネットワーク制限で Wikimedia などの写真サイトには接続できなかったため、使えた公開レジストリ（npm・PyPI）のパッケージに入っている公開サンプルの肖像写真で行った（写真はリポジトリに入れていない）。集合写真は顔が小さすぎて `too_small` になり、使えなかった。

| 写真 | 結果 | 判定 |
|---|---|---|
| 公式肖像（男性・濃い肌・短い黒〜灰色の髪） | 肌色は近い。髪色は近いが、髪型（ボブ）は選び直しが必要 | ○ |
| 宇宙飛行士の公式写真（女性・明るい肌・薄茶の短髪） | 肌色・髪色とも近く、ボブはほぼ合う | ○ |
| 公式肖像（男性・明るい肌・白髪、暖色の室内光で暗め） | 肌が実際より濃い赤茶に、髪が白でなく茶に出た | × 照明の影響 |
| 同じ人の別写真（やや横向き・演説中） | 肌色は近いが、頭の上の色がばらついて髪色は出ず、警告が出る | △ |

- 肌の色は写真の画素をそのまま読むので、暖色の暗い照明では実際より濃く出る。照明と肌の色は区別できないため、補正していない。
- 白髪・灰色の髪が表せなかったので、髪色の選択肢に「グレー」「白」を足した。
- 肌の色の選択肢が明るい3色だけだったため、「やや濃い」〜「最も濃い」の4色を足した（写真から出した色が選択肢に近くないときの修正に使う）。
- 「似ている」の判定は、写真と並べて見た主観的な評価で、数値の指標ではない。似顔絵はあくまで記号的なアバターで、本人そっくりではない。
- 判定の結論：写真アバターは**採用**する（任意機能、結果は必ず直せる）。ただし、肌の色は照明で変わると画面に明記し、直しやすい選択肢を用意した。
