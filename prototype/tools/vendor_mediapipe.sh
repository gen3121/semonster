#!/usr/bin/env bash
# MediaPipe Face Mesh（旧 @mediapipe/face_mesh）を npm から取得し、prototype/vendor/mediapipe/ に実行時ファイルを置く。
# - この npm パッケージには顔検出・ランドマークのモデル（packed_assets.data / binarypb）と wasm が全部入っている。
#   （新しい @mediapipe/tasks-vision は face_landmarker.task を別途 Google のストレージから取る必要があり、npm には入っていない。）
# - 実行時に CDN も Google ストレージも使わない。vendor/ は .gitignore 済み。このスクリプトで再生成できる。
# 使い方: bash tools/vendor_mediapipe.sh
set -euo pipefail
VERSION="${MEDIAPIPE_FACE_MESH_VERSION:-0.4.1633559619}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/../vendor/mediapipe"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "npm pack @mediapipe/face_mesh@$VERSION ..."
( cd "$WORK" && npm pack "@mediapipe/face_mesh@$VERSION" --silent >/dev/null && mkdir x && tar xzf ./*.tgz -C x )
SRC="$WORK/x/package"

rm -rf "$DEST"; mkdir -p "$DEST"
FILES=(
  face_mesh.js
  face_mesh.binarypb
  face_mesh_solution_packed_assets.data
  face_mesh_solution_packed_assets_loader.js
  face_mesh_solution_simd_wasm_bin.js
  face_mesh_solution_simd_wasm_bin.wasm
  face_mesh_solution_wasm_bin.js
  face_mesh_solution_wasm_bin.wasm
)
for f in "${FILES[@]}"; do cp "$SRC/$f" "$DEST/$f"; done
# simd 版の .data は 0 バイトだが、ローダーが取りに行くので置いておく
cp "$SRC/face_mesh_solution_simd_wasm_bin.data" "$DEST/"
cp "$SRC/package.json" "$DEST/PACKAGE.json"
printf 'Apache-2.0 / @mediapipe/face_mesh %s (https://www.npmjs.com/package/@mediapipe/face_mesh)\n' "$VERSION" > "$DEST/LICENSE.txt"
chmod -R u+rw "$DEST"

echo "vendored to $DEST"
( cd "$DEST" && ls -l | awk 'NR>1 {printf "  %10d  %s\n", $5, $9}' && du -sh . | awk '{print "  total " $1}' )
