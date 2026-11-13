# oshifit-thesis で作業するときの約束

- まず `oshifit_spec.md` を読む。ここが唯一の正。新しい決定や知見は、その都度 `oshifit_spec.md` に追記し、「変更履歴」に1行書く。
- 結果の数値は `data/` の実データから `src/` のスクリプトで出したものだけを書く。架空の数値・架空の文献は書かない（確認できない引用は `\todo{要出典}`）。
- 群は本人の選択によるので、因果を断定しない書き方にする（`oshifit_spec.md` 第2節）。
- `data/` の実データはコミットしない。
- 論文のビルドは `cd paper && latexmk`。PDF の字体は BIZ UDPゴシック（入っていなければ `../research-materials/src/fonts/setup_font.sh`）。
