# oshifit-thesis（修士論文の作業場所）

| 場所 | 中身 |
|---|---|
| `oshifit_spec.md` | 論文の指示書（唯一の正）。決定・未決事項・執筆のルール |
| `CLAUDE.md` | Claude Code がここで作業するときの約束 |
| `data/` | 研究者ページから書き出した CSV を置く（コミットしない） |
| `src/analyze.py` | 分析（前後比較・群B対C・見込みの精度）。`--demo` は合成データでの動作確認 |
| `overleaf/` | **修士論文の原本**（upLaTeX）。先生と共有している Overleaf のプロジェクトと同じファイル。`cd overleaf && latexmk` で `main.pdf` |
| `paper/` | 旧い下書き（LuaLaTeX）。**使わない**（2026-11-19 に overleaf/ へ一本化） |

準備：`pip install -r src/requirements.txt`、TeX Live（LuaLaTeX・日本語）、字体は `../research-materials/src/fonts/setup_font.sh`。

## Overleaf との受け渡し（論文は1つだけを直し続ける）

先生と共有している Overleaf のプロジェクトを作り直さず、同じプロジェクトのファイルを上書きしていく。

1. 原本は `overleaf/` だけ。Claude はここのファイルを直し、変更の記録は Git に残す
2. 直したら、変えたファイルの名前を伝える（`git diff --stat` で確認できる）
3. 今井が Overleaf の同じプロジェクトで「アップロード」→ 変えたファイルを選ぶ（同じ名前のファイルは置き換わる）。図は `figures/` フォルダに入れる
4. Overleaf 側で直接直した場合は、次に Claude に頼む前に「メニュー → ダウンロード → ソース」の ZIP を渡す（Overleaf の変更を取り込んでから直すため。取り込まないと、Overleaf 側の修正を上書きして消してしまう）
