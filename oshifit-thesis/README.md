# oshifit-thesis（修士論文の作業場所）

| 場所 | 中身 |
|---|---|
| `oshifit_spec.md` | 論文の指示書（唯一の正）。決定・未決事項・執筆のルール |
| `CLAUDE.md` | Claude Code がここで作業するときの約束 |
| `data/` | 研究者ページから書き出した CSV を置く（コミットしない） |
| `src/analyze.py` | 分析（前後比較・群B対C・見込みの精度）。`--demo` は合成データでの動作確認 |
| `paper/` | LaTeX（LuaLaTeX、BIZ UDPゴシック）。`cd paper && latexmk` で `main.pdf` |

準備：`pip install -r src/requirements.txt`、TeX Live（LuaLaTeX・日本語）、字体は `../research-materials/src/fonts/setup_font.sh`。
