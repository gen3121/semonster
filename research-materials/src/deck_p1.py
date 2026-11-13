"""進捗① 2026/10/16 — OshiFit v2 のシステム設計・倫理審査申請・予測モデル v1.0 固定."""
import math
from datetime import date
from oshideck import Deck, L, R
from common import roadmap, status_rows, architecture

OUT = "進捗報告①_20261016_OshiFit_v2設計.pptx"
d = Deck("2026/10/16", title="進捗報告 2026/10/16")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　進捗報告", "進捗報告 2026/10/16", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=["OshiFit v2", dict(t="「ゆらぎアバター」でシステムを再設計", size=18, bold=False),
                            dict(t="倫理審査の申請 ／ 予測モデル v1.0 の固定", size=14, bold=False)],
                  art="ghost_d14")
d.notes(s, "今回は、研究計画書（9/27版）を確定したあとの2週間の進捗を報告します。"
           "大きく、倫理審査の申請、予測モデルの版の固定、そしてシステムの再設計「OshiFit v2」の3点です。")

# 2 ---------------------------------------------------------------- summary
s = d.slide("前回からの進捗サマリー")
d.box(s, L, 1.55, 3.0, 4.6, fill="panel", radius=0.12)
d.text(s, L + 0.2, 1.68, 2.6, 0.4, "前回（9月）までの到達点", size=14, bold=True, color="muted", margin=(0, 0, 0, 0))
d.text(s, L + 0.2, 2.15, 2.65, 3.9, [
    dict(t="予備調査215名の再分析（回答の向きの確認・4タイプ分析）", bullet=True, bcolor="gray"),
    dict(t="研究計画書を改訂（9/27版）：RQ1〜3、3群の無作為化比較実験", bullet=True, bcolor="gray"),
    dict(t="Web版の試用版を作成", bullet=True, bcolor="gray"),
], size=13, color="muted", after=8, margin=(0, 0, 0, 0))
d.arrow(s, 3.58, 3.55, 0.32, 0.5, fill="blue")
status_rows(d, s, 4.05, 1.5, 5.5, [
    ("完了", "倫理審査の申請書を提出（10/9）", "顔写真の扱い・相談先の表示・撤回手続きを明記"),
    ("完了", "予測モデル v1.0 を固定", "10分割交差検証で精度を確認し、版番号をつけて凍結"),
    ("完了", "アプリの土台を実装（React Native / Expo）", "毎日の記録画面・TIPI-J・匿名IDでのデータ送信"),
    ("新規", "OshiFit v2 を設計：4つの新しい仕組み", "ベイズ個人ツイン／ゆらぎアバター／リバランス提案／疲れの中身キュー"),
    ("進行中", "CHIIR 2027 の原稿", "構成と図を作成中（締切 10/29）"),
], rowh=0.8, size=14, sub=12)
d.box(s, L, 6.27, R - L, 0.5, fill="sky", radius=0.1,
      text="今回の主張：予測の「不確かさ」を隠さずアバターで見せ、記録を続ける動機に変える",
      size=14, bold=True, color="navy", align="c")
d.notes(s, "左が前回までの到達点、右が今回の差分です。完了が3件、新規の設計が1件、進行中が1件です。"
           "今回いちばん相談したいのは、新しく設計したOshiFit v2の考え方です。")

# 3 ---------------------------------------------------------------- roadmap
s = d.slide("全体スケジュールと現在地")
yb = roadmap(d, s, date(2026, 10, 16))
d.box(s, L, 5.5, R - L, 1.25, fill="panel", radius=0.1)
d.icon(s, "clock", L + 0.2, 5.82, 0.6, bg="pink")
d.text(s, L + 1.0, 5.55, R - L - 1.2, 1.15, [
    dict(t="11月2日（月）に本実験を始めるには、残り約2週間で「ベータ版の完成」と「操作確認」を終える必要がある", size=13, bold=True, color="navy", after=2),
    dict(t="6週間の実験＋解析を修論提出（1/29）に間に合わせるための逆算。倫理審査が遅れた場合は群B・Cの2群に縮小", size=12, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "計画書のスケジュールを逆算すると、11月上旬に本実験を始める必要があります。"
           "ピンクの点線が現在地です。システム開発は全体の半分程度、倫理審査は審査待ちの状態です。")

# 4 ---------------------------------------------------------------- ethics
s = d.slide("倫理審査の申請内容（10/9 提出）")
cards = [
    ("顔写真の扱い", "camera", "pink", "端末の中だけで処理し、アバター生成後すぐに破棄。サーバーへは送らない。写真を使わない作成方法も用意"),
    ("同意と撤回", "sign", "blue", "参加は任意。いつでも撤回とデータ削除ができる。記録は匿名IDで管理し、氏名とは切り離す"),
    ("つらさへの配慮", "shield", "B", "WHO-5 素点が13点未満、または強い疲れの記録があれば相談先を表示し、利用の継続を求めない"),
    ("予測の説明", "eye", "purple", "予測値は「見込み」であることを常に表示。終了後に予測の精度を参加者へ説明する"),
]
cw, ch_ = 4.45, 1.95
for i, (t, ic, col, body) in enumerate(cards):
    x = L + (i % 2) * (cw + 0.2)
    y = 1.55 + (i // 2) * (ch_ + 0.2)
    d.card(s, x, y, cw, ch_, t, body, icon=ic, color=col, bsize=13)
# review timeline
ty = 5.95
steps = [("10/9", "申請書を提出", "B"), ("10/21", "審査会（予定）", "blue"), ("承認後", "募集を開始", "gray")]
for i, (dt, lab, col) in enumerate(steps):
    x = L + i * 3.1
    d.circle(s, x, ty, 0.78, col, text=dt, size=11, bold=True, color="white", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.88, ty + 0.08, 1.9, 0.62, lab, size=14, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
    if i < 2:
        d.line(s, x + 2.5, ty + 0.39, x + 3.0, ty + 0.39, color="gray", width=2, arrow=True)
d.notes(s, "倫理審査では、顔写真、同意と撤回、つらさへの配慮、予測の説明の4点を中心に記載しました。"
           "特に顔写真は個人を識別できる情報なので、端末内でのみ処理し、アバターを作ったら破棄する設計にしています。"
           "審査会は10月21日の予定です。")

# 5 ---------------------------------------------------------------- model v1.0
s = d.slide("予測モデル v1.0 を固定")
d.bar(s, L, 1.5, 4.4, 3.65, ["頻度→充実", "没入→充実", "頻度→推し疲れ", "没入→推し疲れ"],
      [("標準化係数", [0.43, 0.20, 0.29, 0.23])], ["B"], fmt="0.00", vmin=0, vmax=0.5, major=0.1,
      point_colors=["B", "B", "A", "A"], title="予備調査215名のパス係数", gap=55)
d.box(s, L, 5.25, 4.4, 1.5, fill="AL", radius=0.1)
d.text(s, L + 0.15, 5.32, 4.1, 1.38, [
    dict(t="同じ行動が「充実」と「推し疲れ」を両方押し上げる", size=13.5, bold=True, color="A", after=4),
    dict(t="→ 一律に「減らす」提案は楽しさまで削ってしまう。本人の希望と疲れの中身に合わせた提案が必要", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.table(s, 5.1, 1.55, 4.45, [
    ["出力", "説明率", "誤差（5段階）"],
    ["幸福度（充実）", "約27%", "±0.71"],
    ["推し疲れ", "約11%", "±0.92"],
], colw=[1.85, 1.1, 1.5], rowh=0.48, size=13, align=["l", "c", "c"], first_col_bold=True)
d.text(s, 5.1, 3.1, 4.45, 0.3, "10分割交差検証（入力：頻度・没入・きっかけ・TIPI-J）", size=11, color="muted",
       margin=(0, 0, 0, 0))
d.card(s, 5.1, 3.55, 4.45, 3.2, "v1.0 として凍結したもの", [
    dict(t="係数・前処理・欠測の扱い", bullet=True),
    dict(t="学習コードと乱数シード（Gitタグ model-v1.0）", bullet=True),
    dict(t="予測区間の計算方法（80%区間）", bullet=True),
    dict(t="本実験中はモデルを変えず、個人補正のみ行う", bullet=True, bcolor="pink"),
], icon="lock", color="navy", bsize=13)
d.notes(s, "予備調査のパス解析では、推し活の頻度と没入が、充実と推し疲れの両方に正の関連を示しました。"
           "予測精度は幸福度で説明率約27%、推し疲れで約11%と、十分に高いとはいえません。"
           "そこで本実験中に結果を見てモデルを変えることがないよう、v1.0として版を固定しました。")

# 6 ---------------------------------------------------------------- problem
s = d.slide("課題：精度の低い予測で「未来」をどう見せるか")
rows = [
    ("推し疲れの誤差は ±0.92（5段階）", "1人の未来として断定的に見せると、誤解や不安を招く", "dice",
     "不確かさをそのまま見せる", "② ゆらぎアバター"),
    ("性格や生活で個人差が大きい", "予備調査の平均的なモデルのままでは本人に当たらない", "user",
     "記録で個人ごとに更新する", "① ベイズ個人ツイン"),
    ("8割が「推しが生きがい」", "「増やしたい」人が「減らしたい」人より多い", "heart",
     "減らさずに組み替える", "③ リバランス提案"),
]
for i, (p1, p2, ic, s1, s2) in enumerate(rows):
    y = 1.6 + i * 1.72
    d.box(s, L, y, 4.3, 1.45, fill="panel", radius=0.1)
    d.text(s, L + 0.2, y + 0.1, 3.95, 1.25, [dict(t=p1, size=15, bold=True, color="navy", after=4),
                                             dict(t=p2, size=13, color="muted")], margin=(0, 0, 0, 0), anchor="m")
    d.arrow(s, 4.9, y + 0.5, 0.45, 0.45, fill="blue")
    d.box(s, 5.5, y, 4.05, 1.45, fill="white", line="B", lw=1.5, radius=0.1, shadow=True)
    d.icon(s, ic, 5.68, y + 0.42, 0.6, bg="B")
    d.text(s, 6.45, y + 0.1, 3.0, 1.25, [dict(t=s1, size=15, bold=True, color="B", after=4),
                                         dict(t=s2, size=13, bold=True, color="navy")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "予測精度が低い中で将来の見込みを見せることには、3つの課題があります。"
           "それぞれに対応する仕組みとして、ゆらぎアバター、ベイズ個人ツイン、リバランス提案を考えました。")

# 7 ---------------------------------------------------------------- architecture
s = d.slide("OshiFit v2 のシステム構成（提案）")
architecture(d, s, y0=1.5)
d.notes(s, "全体像です。入力は、初回のTIPI-J、毎日30秒の記録、本人の希望の3つです。"
           "①ベイズ個人ツインが毎晩予測を更新し、②リバランス提案エンジンが3つの案を作ります。"
           "③④のみらいミラーで「今のまま」と「提案どおり」を並べて見せます。"
           "選んだ案を1週間試し、実行チェックと記録がまたツインを更新するループになっています。"
           "強いつらさがうかがえる場合はセーフティ層が予測表示を止め、相談先を表示します。")

# 8 ---------------------------------------------------------------- twin
s = d.slide("新しい仕組み① ベイズ個人ツイン")
d.text(s, L, 1.55, 4.35, 2.9, [
    dict(t="予備調査215名の係数を「事前分布」として使う", bullet=True),
    dict(t="毎日の記録で、その人専用の係数（個人差）を毎晩更新する", bullet=True),
    dict(t="予測は1つの値ではなく分布 → 予測区間が自然に出る", bullet=True),
    dict(t="計画書の「2週間の記録で個人補正（混合モデル）」を、毎日少しずつ進む形にしたもの", bullet=True, bcolor="pink"),
], size=15, after=10, margin=(0, 0, 0, 0))
d.box(s, L, 4.6, 4.35, 1.05, fill="navy", radius=0.1)
d.text(s, L + 0.15, 4.62, 4.05, 1.0, [
    dict(t="予測 = (全体の傾向 + 個人差) × 行動", size=14, bold=True, color="white", align="c", after=2),
    dict(t="個人差は平均0の正規分布から。記録が増えるほど本人寄りに", size=11.5, color="sky2", align="c"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.8, 4.35, 0.95, fill="panel", radius=0.1)
d.text(s, L + 0.15, 5.83, 4.05, 0.9, "端末内で計算できる軽さ（正規分布の更新式のみ）。サーバーには記録の数値だけを送る",
       size=12, color="muted", anchor="m", margin=(0, 0, 0, 0))


def half_width(n, tau, sw, sd):
    post = 1 / (1 / tau ** 2 + n / sd ** 2)
    return 1.2816 * math.sqrt(sw ** 2 + post)


days = [0, 3, 7, 10, 14, 21, 28]
wb = [round(half_width(n, 0.55, 0.45, 0.9), 2) for n in days]
bo = [round(half_width(n, 0.70, 0.60, 1.0), 2) for n in days]
d.linechart(s, 5.0, 1.5, 4.55, 4.4, [f"{n}日" for n in days], [("推し疲れ", bo), ("充実", wb)], ["A", "B"],
            fmt="0.00", vmin=0.4, vmax=1.3, major=0.2, title="記録日数と80%予測区間の幅（±）", label_last=True)
d.text(s, 5.0, 5.95, 4.55, 0.8, [
    dict(t=f"14日の記録で幅が約{round((1 - bo[4] / bo[0]) * 100)}%縮む（試算）", size=13, bold=True, color="navy", after=2),
    dict(t="合成データによるシミュレーション。残る幅は週ごとの自然な揺れ", size=11, color="muted"),
], margin=(0, 0, 0, 0))
d.notes(s, "1つ目の仕組みはベイズ個人ツインです。予備調査の係数を出発点にして、毎日の記録でその人専用の予測へ少しずつ寄せていきます。"
           f"右のグラフは合成データでの試算で、推し疲れの80%予測区間は記録0日の±{bo[0]}から、14日で±{bo[4]}まで縮みます。"
           "これは計画書にある「最初の2週間で個人補正」を、より細かく毎日行う形にしたものです。数値は仮定に基づく試算なので、本実験で検証します。")

# 9 ---------------------------------------------------------------- yuragi avatar
s = d.slide("新しい仕組み② ゆらぎアバター")
imgs = [("ghost_d0", "記録0日", "未来はまだぼやけている"), ("ghost_d7", "記録7日", "少しずつ重なってくる"),
        ("ghost_d14", "記録14日", "未来の自分がくっきり")]
for i, (im, t1, t2) in enumerate(imgs):
    x = L + i * 3.07
    d.box(s, x, 1.55, 2.95, 2.55, fill="BL" if i == 2 else "panel", radius=0.12)
    d.pic(s, im, x + 0.18, 1.62, w=2.6)
    d.text(s, x, 3.42, 2.95, 0.32, t1, size=14, bold=True, color="B" if i == 2 else "navy", align="c",
           margin=(0, 0, 0, 0))
    d.text(s, x, 3.72, 2.95, 0.3, t2, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
    if i < 2:
        d.arrow(s, x + 2.97, 2.6, 0.08, 0.3, fill="blue")
cards = [
    ("しくみ", "sliders", "navy", "予測の分布から20通りの未来を引き、表情を3区分にして重ねて描く。濃さ＝その未来の起こりやすさ"),
    ("ねらい", "target", "pink", "不確かさを正直に見せる。「未来の解像度」を上げたくて記録を続けたくなる"),
    ("根拠", "book", "B", "仮想的な結果の提示（Hullman et al., 2015）、頻度での表現（Kay et al., 2016）、プロテウス効果"),
]
for i, (t, ic, col, body) in enumerate(cards):
    d.card(s, L + i * 3.07, 4.25, 2.95, 2.5, t, body, icon=ic, color=col, bsize=12.5)
d.notes(s, "2つ目の仕組みがゆらぎアバターで、今回いちばん独創的だと考えている部分です。"
           "予測の幅を数字だけでなく、ありうる自分たちの重なりとして見せます。記録が少ないうちは未来の自分がぼやけていて、"
           "記録が増えるとくっきりしていきます。不確かさを正直に見せることと、記録を続ける動機づけを1つの表現で両立させるのがねらいです。")

# 10 --------------------------------------------------------------- rebalance
s = d.slide("新しい仕組み③ リバランス提案エンジン")
d.text(s, L, 1.5, R - L, 0.45, "「減らす」のではなく「組み替える」— 本人の希望を守ったまま、疲れの少ない配分を探す",
       size=15, bold=True, color="navy", margin=(0, 0, 0, 0), anchor="m")
steps = [("候補をつくる", "7つの活動を\n−1／0／+1 段階変える\n（同時に2つまで）"),
         ("予測する", "ツインで充実と\n推し疲れを予測"),
         ("絞り込む", "「増やしたい」活動は\n減らさない"),
         ("3案を出す", "楽しさキープ／バランス\n／回復重視")]
sw = 2.2
for i, (t, b) in enumerate(steps):
    x = L + i * (sw + 0.1)
    d.box(s, x, 2.05, sw, 1.55, fill="navy" if i == 3 else "sky", radius=0.1, shape=None)
    d.text(s, x + 0.1, 2.1, sw - 0.2, 0.42, f"{i + 1}. {t}", size=14, bold=True,
           color="white" if i == 3 else "navy", align="c", margin=(0, 0, 0, 0), anchor="m")
    d.text(s, x + 0.1, 2.52, sw - 0.2, 1.0, b, size=12, color="white" if i == 3 else "text", align="c",
           margin=(0, 0, 0, 0), after=0)
d.text(s, L, 3.78, R - L, 0.35, "例：「ライブは増やしたい／SNSは減らしたい」大学生（睡眠と比較の疲れが高い）",
       size=13, bold=True, color="pink", margin=(0, 0, 0, 0))
d.table(s, L, 4.18, R - L, [
    ["案", "内容", "充実", "推し疲れ"],
    ["① 楽しさキープ型", "夜のSNSを1時間短くし、配信は週末にまとめて見る", "±0", "−0.4"],
    ["② バランス型", "グッズは月1回の「まとめ買い日」に。浮いた分をライブ遠征へ", "+0.2", "−0.2"],
    ["③ 回復重視型", "24時以降はSNSオフ、睡眠を1時間ふやす", "−0.2", "−0.7"],
], colw=[1.9, 5.0, 1.0, 1.2], rowh=0.5, size=12.5, align=["l", "l", "c", "c"], first_col_bold=True)
d.text(s, L, 6.25, R - L, 0.5, "3案はどれも「充実を大きく下げずに疲れを下げる」パレート最適な組み合わせから選ぶ。選ばない自由も残す",
       size=12, color="muted", margin=(0, 0, 0, 0))
d.assumed(s, "予測差は例示の値")
d.notes(s, "3つ目の仕組みはリバランス提案エンジンです。予備調査で増やしたい人の方が多かったことを受けて、減らすのではなく組み替える提案を作ります。"
           "7つの活動をそれぞれ1段階ずつ動かす候補を作り、ツインで予測し、本人が増やしたい活動は減らさない条件で絞り込みます。"
           "最後に、楽しさキープ型、バランス型、回復重視型の3案を出し、本人に選んでもらいます。表の数値は例示です。")

# 11 --------------------------------------------------------------- fatigue facets
s = d.slide("新しい仕組み④ 疲れの中身キュー")
facets = [("睡眠", "av_sleep", "くま・Zz", "配信は翌朝の\nアーカイブで見る", "purple"),
          ("出費", "av_money", "軽くなった財布", "月1回の\n「まとめ買い日」", "A"),
          ("義務感", "av_duty", "重いリュック", "「全部追う」を\nやめる棚卸し", "navy"),
          ("比較", "av_compare", "スマホの光", "ミュートワードを\n設定する", "blue")]
for i, (t, im, cue, prop, col) in enumerate(facets):
    x = L + i * 2.3
    d.box(s, x, 1.55, 2.15, 4.55, fill="white", line="line", radius=0.12, shadow=True)
    d.pill(s, x + 0.5, 1.7, 1.15, 0.36, t, fill=col, size=13)
    d.pic(s, im, x + 0.3, 2.15, w=1.55)
    d.text(s, x + 0.1, 3.98, 1.95, 0.3, "アバターの手がかり", size=10.5, color="muted", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.1, 4.25, 1.95, 0.35, cue, size=13, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.1, 4.7, 1.95, 0.3, "提案の例", size=10.5, color="muted", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.1, 4.98, 1.95, 0.85, prop, size=12.5, bold=True, color="B", align="c", margin=(0, 0, 0, 0),
           after=0)
d.box(s, L, 6.25, R - L, 0.5, fill="panel", radius=0.1,
      text="表現は予測の区分（3段階）にだけ連動させ、大げさな疲れの表現はしない（倫理審査の方針どおり）",
      size=12.5, color="navy", bold=True, align="c")
d.notes(s, "4つ目は疲れの中身キューです。予備調査で、推し疲れの中身は睡眠、出費、義務感、比較に分かれました。"
           "どの疲れが高いかをアバターの控えめな手がかりで示し、提案もその中身に合わせます。疲れた表現は誇張しません。")

# 12 --------------------------------------------------------------- fairness
s = d.slide("3群の画面のちがい（公平な比較のために）")
Y, N = "○", "—"
d.table(s, L, 1.55, R - L, [
    ["機能", "群A 記録のみ", "群B 提案（文章）", "群C 提案＋予測アバター"],
    ["毎日の記録・週1回の振り返り", Y, Y, Y],
    ["アバター作成", "○（プロフィールのみ）", "○（プロフィールのみ）", Y],
    ["週1回の提案（3案から選ぶ）", N, "○（予測値なし）", "○（同じ3案）"],
    ["みらいミラー（予測値＋ゆらぎアバター）", N, N, Y],
    ["疲れの中身キュー", N, N, Y],
    ["予測の答え合わせ", N, N, Y],
], colw=[3.4, 1.9, 1.9, 1.9], rowh=0.5, size=12.5, align=["l", "c", "c", "c"], first_col_bold=True,
    fills={(r, 3): "BL" for r in range(1, 7)})
d.box(s, L, 5.25, R - L, 1.5, fill="sky", radius=0.1)
d.icon(s, "scale", L + 0.2, 5.55, 0.7, bg="navy")
d.text(s, L + 1.1, 5.3, R - L - 1.3, 1.4, [
    dict(t="群Bと群Cの差は「予測の見せ方」だけにそろえる", size=15, bold=True, color="navy", after=4),
    dict(t="提案の中身・数・頻度は同一。群Bの提案カードには予測値を出さない → RQ2（アバターの効果）を純粋に比較できる",
         size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "v2の機能が増えても、群間比較が崩れないように整理しました。群Bと群Cの差は、予測値とゆらぎアバターの提示の有無だけです。"
           "そのため、群Bの提案カードには予測値を表示しない仕様にしています。")

# 13 --------------------------------------------------------------- next
s = d.slide("次回（10/30）までの予定と相談事項")
d.text(s, L, 1.5, 4.5, 0.4, "やること", size=16, bold=True, color="navy", margin=(0, 0, 0, 0))
todo = [("10/19", "アバター生成（端末内の顔特徴点 → パーツ合成）"), ("10/22", "ゆらぎアバターとみらいミラー画面"),
        ("10/24–26", "研究室内での操作確認（5〜8名）"), ("10/29", "CHIIR 2027 Short Paper を投稿"),
        ("10/30", "ベータ版を凍結（本実験用）")]
for i, (dt, t) in enumerate(todo):
    y = 1.98 + i * 0.68
    d.pill(s, L, y + 0.12, 1.05, 0.34, dt, fill="blue", size=11)
    d.text(s, L + 1.2, y, 3.35, 0.6, t, size=13.5, color="text", anchor="m", margin=(0, 0, 0, 0))
d.box(s, 5.15, 1.5, 4.4, 3.95, fill="pinkL", radius=0.12)
d.icon(s, "comments", 5.35, 1.65, 0.55, bg="pink")
d.text(s, 6.05, 1.65, 3.3, 0.55, "相談したいこと", size=16, bold=True, color="pink", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.35, 2.35, 4.05, 4.3, [
    dict(t="承認が10/30より遅れた場合の開始日", size=14, bold=True, color="navy", after=2),
    dict(t="11/9開始なら終了は12/20。解析期間が約1週間減る", size=12.5, color="text", after=10),
    dict(t="募集経路と謝礼", size=14, bold=True, color="navy", after=2),
    dict(t="学内メーリングリスト、X、推し活コミュニティ。謝礼の額と支払い方法", size=12.5, color="text", after=10),
    dict(t="CHIIR の投稿区分", size=14, bold=True, color="navy", after=2),
    dict(t="Short Paper（4ページ）とDemoのどちらにするか", size=12.5, color="text"),
], margin=(0, 0, 0, 0))
d.box(s, L, 5.65, R - L, 1.1, fill="panel", radius=0.1)
d.icon(s, "eye", L + 0.2, 5.9, 0.6, bg="blue")
d.text(s, L + 1.0, 5.68, R - L - 1.2, 1.04, [
    dict(t="次回（10/30）に見せるもの", size=14, bold=True, color="navy", after=3),
    dict(t="ベータ版の操作デモ（記録 → 提案 → みらいミラー）／操作確認の結果（SUS・つまずいた点）／CHIIR 投稿版の原稿", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "次回までに、アバター生成とみらいミラーを実装し、研究室内で操作確認を行ってからCHIIRに投稿します。"
           "相談したいのは3点で、承認が遅れた場合の開始日、募集経路と謝礼、CHIIRの投稿区分です。")

d.save(OUT)
print("saved", OUT, d.n, "slides")
