#!/bin/bash
# BIZ UDPゴシック（SIL Open Font License）をこの環境に入れる。
# スライドの字体は BIZ UDPゴシック に固定しているため、PDF 書き出しや画像確認の前に実行する。
# PowerPoint で開くだけなら、Windows / Microsoft 365 に入っているのでこの手順は不要。
set -e
cd "$(dirname "$0")"
python3 -m venv .venv >/dev/null 2>&1
.venv/bin/pip install -q fonttools brotli
[ -d node_modules/@fontsource/biz-udpgothic ] || npm install --silent @fontsource/biz-udpgothic
mkdir -p out ~/.fonts
for w in "400 Regular" "700 Bold"; do
  set -- $w
  .venv/bin/python -I merge_font.py node_modules/@fontsource/biz-udpgothic/files "$1" "out/BIZUDPGothic-$2.ttf"
done
cp out/*.ttf ~/.fonts/ && fc-cache -f
fc-list | grep -i "BIZ UDP"
