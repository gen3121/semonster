# semonster 研究資料のルール

## スライド・資料の字体
- 資料（PowerPoint・PDF・図）を作るときは、字体に **BIZ UDPゴシック** を必ず使う。日本語・英数字・記号のすべてが対象で、例外はつけない。
- PowerPoint は、すべての文字ラン・表・グラフ・箇条書きの記号に字体名「BIZ UDPゴシック」を明示する（`research-materials/src/oshideck.py` の `apply_font` が行う）。テーマの字体も同じにしてある。
- 図や画面モックを画像にするときも同じ字体を使う（`mockups.js`）。
- この字体にない文字（β・τ・下付き文字など）は、言葉に言い換えるか、字形を描いて使う。字体を混ぜない。
- 確認用の PDF・画像を作る前に `research-materials/src/fonts/setup_font.sh` で字体を入れる。入っていないと別の字体に置き換わり、レイアウトの確認が当てにならない。

## スライドの作り直し
- `research-materials/src/build_all.sh` で8本のスライドを作り直せる。仮の数値は `src/projected.py` にまとめてあり、実データが出たらここを書き換える。
