#!/bin/bash
# OshiFit スライド一式を再生成する。
#   1) npm install            （sharp, react-icons など）
#   2) node avatars.js / icons.js / mockups.js で assets/ を作成（mockups は Playwright + Chromium が必要）
#   3) 各 deck_*.py を実行（python-pptx が必要）
set -e
cd "$(dirname "$0")"
[ -f ~/.fonts/BIZUDPGothic-Regular.ttf ] || ./fonts/setup_font.sh   # 画像・PDF の確認用
mkdir -p assets
[ -d node_modules ] || npm install
node avatars.js
node icons.js
node mockups.js
for f in deck_p1 deck_r1 deck_p2 deck_r2 deck_p3 deck_p4 deck_t1 deck_t2; do python3 "$f.py"; done
