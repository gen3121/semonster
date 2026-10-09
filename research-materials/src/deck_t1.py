"""発表① 2027/02/17 — 修士論文公聴会."""
from oshideck import Deck, L, R
from common import architecture
import projected as P

OUT = "発表①_20270217_修士論文公聴会.pptx"
d = Deck("2027/2/17", title="修士論文公聴会 2027/02/17")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("2026年度 修士論文公聴会", "OshiFit：個人の性格特性に適した推し活を提案し\nウェルビーイングを向上させるシステムの構築と検証",
                  "今井元", "大阪工業大学大学院\nメディアインタラクション研究室\n指導教員：大井 翔", art="ghost_d14", title_size=21,
                  subtitle=[dict(t="2027年2月17日", size=16, bold=False)])
d.notes(s, "メディアインタラクション研究室の今井元です。「OshiFit：個人の性格特性に適した推し活を提案しウェルビーイングを向上させるシステムの構築と検証」について発表します。")

# 2 ---------------------------------------------------------------- agenda
s = d.slide("発表の流れ")
items = [("背景", "推し活の広がりと「推し疲れ」", "heart"), ("予備調査", "215名の調査から分かったこと", "search"),
         ("目的と問い", "RQ1〜3", "target"), ("提案システム", "OshiFit（ツイン・提案・ゆらぎアバター）", "mobile"),
         ("実験", "6週間・3群の無作為化比較実験", "flask"), ("結果と考察", "RQ ごとの結果・限界・まとめ", "chart")]
for i, (t, b, ic) in enumerate(items):
    x = L + (i % 2) * 4.65
    y = 1.6 + (i // 2) * 1.7
    d.box(s, x, y, 4.45, 1.5, fill="white", line="line", radius=0.12, shadow=True)
    d.circle(s, x + 0.2, y + 0.35, 0.8, "navy", text=str(i + 1), size=20, bold=True, color="white", align="c",
             margin=(0, 0, 0, 0))
    d.text(s, x + 1.2, y + 0.1, 3.1, 1.3, [dict(t=t, size=17, bold=True, color="navy", after=2),
                                           dict(t=b, size=12.5, color="muted")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "発表の流れです。背景、予備調査、目的と問い、提案システム、実験、そして結果と考察の順にお話しします。")

# 3 ---------------------------------------------------------------- background 1
s = d.slide("背景①：推し活は社会現象に")
stats = [("約3.8兆円", "広義の推し活市場（野村総合研究所, 2025）", "pink"), ("3割超", "国民のうち推し活をしている人", "blue"),
         ("前向きな効果", "生きがい・活力・精神的健康の改善（中林・水口, 2020; 西川・渋谷, 2011）", "B")]
for i, (v, lab, col) in enumerate(stats):
    x = L + i * 3.07
    d.box(s, x, 1.55, 2.95, 2.6, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x + 0.1, 1.7, 2.75, 1.1, v, size=30 if i < 2 else 24, bold=True, color=col, align="c", anchor="m",
           margin=(0, 0, 0, 0))
    d.text(s, x + 0.2, 2.85, 2.55, 1.2, lab, size=12.5, color="text", align="c", margin=(0, 0, 0, 0))
d.box(s, L, 4.4, R - L, 2.35, fill="navy", radius=0.12)
d.pic(s, "av_good", L + 0.35, 4.55, h=2.05)
d.text(s, L + 2.4, 4.5, R - L - 2.7, 2.15, [
    dict(t="推し活とは", size=13, color="sky2", after=2),
    dict(t="アイドルやキャラクターなど「推し」を熱心に応援する活動", size=17, bold=True, color="white", after=6),
    dict(t="単なる趣味を超えて、アイデンティティや日々の活力の源になっている", size=13, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "推し活は、広義の市場規模が約3.8兆円、国民の3割超が行う社会現象になっています。"
           "ファン心理が人生への前向きな気持ちを高めることや、コンサートへの参加が精神的健康を改善することも報告されています。")

# 4 ---------------------------------------------------------------- background 2
s = d.slide("背景②：「推し疲れ」というパラドックス")
causes = [("お金と時間の使いすぎ", "グッズ購入・遠征", "wallet", "A"), ("SNS での比較", "他のファンと比べて落ち込む", "users", "blue"),
          ("義務感による燃え尽き", "「追わなければ」という負担", "battery", "purple")]
for i, (t, b, ic, col) in enumerate(causes):
    d.card(s, L + i * 3.07, 1.55, 2.95, 1.95, t, b, icon=ic, color=col, bsize=13)
d.box(s, L, 3.7, R - L, 1.5, fill="AL", radius=0.12)
d.text(s, L + 0.3, 3.75, R - L - 0.6, 1.4, [
    dict(t="ウェルビーイングのパラドックス", size=18, bold=True, color="A", after=4),
    dict(t="幸せになるための活動が、キャパシティを超えるとストレスに変わる。理想と現実の推し活の乖離は精神的健康を損なう（谷口・神田, 2025）",
         size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.4, R - L, 1.35, fill="panel", radius=0.12)
d.icon(s, "warn", L + 0.25, 5.72, 0.7, bg="pink")
d.text(s, L + 1.2, 5.45, R - L - 1.4, 1.25, [
    dict(t="精神疾患の患者数は 2017年 約389万人 → 2020年 約586万人", size=15, bold=True, color="navy", after=3),
    dict(t="日常的なストレスへの対処は若い世代で特に課題（厚生労働省；山岸, 2009）", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "しかし、この熱狂の裏で「推し疲れ」が問題になっています。お金と時間の使いすぎ、SNSでの比較、義務感による燃え尽きが主な要因です。"
           "幸せになるための活動が、キャパシティを超えるとストレスに変わってしまう、ウェルビーイングのパラドックスが起きています。")

# 5 ---------------------------------------------------------------- background 3
s = d.slide("背景③：これまでの支援の限界")
lim = [("一律の自己管理", "「お金を使いすぎない」「SNSから離れる」。何が喜びで何が負担かは人によって違う", "list"),
       ("データを見せるだけ", "家計簿やスクリーンタイムは記録を見せるが、行動は変わりにくい（Choe et al., 2014）", "chart"),
       ("専門的なケアの壁", "カウンセリングの利用率はわずか6%。「支援のギャップ」（OECD, 2022）", "lock")]
for i, (t, b, ic) in enumerate(lim):
    y = 1.55 + i * 1.32
    d.box(s, L, y, R - L, 1.18, fill="white", line="line", radius=0.12, shadow=True)
    d.icon(s, ic, L + 0.22, y + 0.24, 0.7, bg="gray")
    d.text(s, L + 1.15, y + 0.06, R - L - 1.35, 1.06, [dict(t=t, size=15.5, bold=True, color="navy", after=2),
                                                       dict(t=b, size=12.5, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.65, R - L, 1.1, fill="B", radius=0.12)
d.text(s, L + 0.3, 5.7, R - L - 0.6, 1.0, [
    dict(t="→ 個人に合わせて、本人が気づきにくい「将来の見込み」を見せる支援が必要", size=16, bold=True, color="white", after=2),
    dict(t="手がかり：自分に似たアバターで行動が変わる（プロテウス効果・未来の自分の提示）", size=12.5, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "これまでの対処は一律の自己管理や、データを見せるだけのものが中心でした。専門的なケアの利用には壁もあります。"
           "そこで本研究では、個人に合わせて、本人が気づきにくい将来の見込みを、自分に似たアバターで見せる支援に注目しました。")

# 6 ---------------------------------------------------------------- preliminary survey
s = d.slide("予備調査（2026年5〜6月・215名）")
for i, (v, lab, col) in enumerate([("約8割", "推しが生きがい", "B"), ("約4割", "出費に不安", "A"), ("約3割", "睡眠に支障", "purple")]):
    x = L + i * 1.52
    d.box(s, x, 1.55, 1.42, 1.5, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x, 1.62, 1.42, 0.8, v, size=22, bold=True, color=col, align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, x, 2.45, 1.42, 0.5, lab, size=11.5, color="text", align="c", margin=(0, 0, 0, 0))
d.bar(s, L, 3.2, 4.45, 3.55, ["頻度→充実", "没入→充実", "頻度→推し疲れ", "没入→推し疲れ"],
      [("係数", [0.43, 0.20, 0.29, 0.23])], ["B"], fmt="0.00", vmin=0, vmax=0.5, major=0.1,
      point_colors=["B", "B", "A", "A"], title="パス係数（性格特性は .21 以下）", gap=55)
d.box(s, 5.15, 1.55, 4.4, 2.35, fill="AL", radius=0.12)
d.text(s, 5.35, 1.6, 4.0, 2.25, [
    dict(t="27%", size=34, bold=True, color="A", after=0),
    dict(t="「充実も疲れも高い」人がいる", size=14, bold=True, color="navy", after=3),
    dict(t="同じ行動が、充実と推し疲れの両方を押し上げる", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.bar(s, 5.15, 4.05, 4.4, 2.7, ["ライブを増やしたい", "グッズを増やしたい", "SNSを減らしたい"], [("割合", [39, 36, 22])],
      ["B"], horizontal=True, fmt='0"%"', vmin=0, vmax=50, val_visible=False, point_colors=["B", "B", "A"],
      title="理想の頻度：増やしたい ＞ 減らしたい", gap=45)
d.notes(s, "予備調査では215名を分析しました。約8割が推しを生きがいと答える一方、約4割が出費に不安、約3割が睡眠に支障を感じていました。"
           "パス解析では、推し活の頻度と没入が、充実と推し疲れの両方に正の関連を示しました。充実も疲れも高い人が27%おり、"
           "理想の頻度では増やしたい人が減らしたい人を上回りました。つまり、一律に減らす支援では楽しさまで損なう恐れがあります。")

# 7 ---------------------------------------------------------------- purpose & RQ
s = d.slide("研究目的と研究課題")
d.box(s, L, 1.55, R - L, 1.35, fill="navy", radius=0.12)
d.text(s, L + 0.3, 1.6, R - L - 0.6, 1.25, [
    dict(t="目的", size=12.5, color="sky2", after=0),
    dict(t="個人の記録にもとづく予測と、自分に似たアバターによる将来像の提示を統合し、推し活の行動変容とウェルビーイングの向上を促せるかを、無作為化比較実験で検証する",
         size=14.5, bold=True, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
rqs = [("RQ1", "性格特性と推し活の行動から、充実と推し疲れを個人ごとにどの程度の精度で予測できるか", "brain", "navy"),
       ("RQ2", "自分に似たアバターで将来の見込みを見せると、同じ提案を文章で見せる場合より実行が増えるか", "mirror", "B"),
       ("RQ3", "6週間の利用で、推し活に伴うストレスが減り、ウェルビーイングが上がるか", "heart", "pink")]
for i, (rq, q, ic, col) in enumerate(rqs):
    y = 3.1 + i * 1.22
    d.box(s, L, y, R - L, 1.08, fill="white", line="line", radius=0.12, shadow=True)
    d.pill(s, L + 0.2, y + 0.32, 1.0, 0.44, rq, fill=col, size=15)
    d.text(s, L + 1.4, y, R - L - 1.6, 1.08, q, size=14, color="text", anchor="m", margin=(0, 0, 0, 0))
d.notes(s, "本研究の目的は、個人の記録にもとづく予測と、自分に似たアバターによる将来像の提示を統合し、行動変容とウェルビーイングの向上を促せるかを、無作為化比較実験で検証することです。"
           "研究課題は3つで、RQ1は予測の精度、RQ2はアバターによる実行の増加、RQ3は6週間でのウェルビーイングの向上です。")

# 8 ---------------------------------------------------------------- related work
s = d.slide("関連研究と本研究の位置づけ")
cols = [("個人情報学", "self-tracking", "記録の可視化。見せるだけでは行動が変わりにくい（Choe et al., 2014）", "chart", "blue"),
        ("行動変容とアバター", "persuasive tech", "自分に似たアバターで運動・貯蓄が増える（Fox & Bailenson, 2009; Hershfield et al., 2011）", "mirror", "B"),
        ("推し活の研究", "fandom", "充実感・精神的健康との関係。いずれも横断調査（中林・水口, 2020; 谷口・神田, 2025）", "heart", "pink")]
for i, (t, en, b, ic, col) in enumerate(cols):
    x = L + i * 3.07
    d.box(s, x, 1.55, 2.95, 3.15, fill="white", line="line", radius=0.12, shadow=True)
    d.icon(s, ic, x + 1.12, 1.7, 0.7, bg=col)
    d.text(s, x + 0.1, 2.5, 2.75, 0.4, t, size=15, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.1, 2.88, 2.75, 0.3, en, size=10.5, color="muted", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.2, 3.25, 2.55, 1.4, b, size=12, color="text", margin=(0, 0, 0, 0))
d.box(s, L, 4.9, R - L, 1.85, fill="navy", radius=0.12)
d.text(s, L + 0.3, 4.95, R - L - 0.6, 1.75, [
    dict(t="本研究の新しさ", size=13, color="sky2", after=3),
    dict(t="① 正解が人によって違う「推し活」にアバター介入を適用", size=14.5, bold=True, color="white", after=2),
    dict(t="② 予測の不確かさそのものを「ありうる自分」の重なりとして見せる", size=14.5, bold=True, color="white", after=2),
    dict(t="③ 提案を行ったあとの変化を、無作為化比較実験で追跡", size=14.5, bold=True, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "関連研究は3つの流れに分けられます。記録を見せる個人情報学、アバターを使った行動変容、そして推し活とウェルビーイングの研究です。"
           "本研究の新しさは、正解が人によって違う推し活にアバター介入を適用したこと、予測の不確かさを「ありうる自分」の重なりとして見せること、"
           "そして提案後の変化を無作為化比較実験で追跡したことの3点です。")

# 9 ---------------------------------------------------------------- system overview
s = d.slide("提案システム OshiFit の全体像")
architecture(d, s, y0=1.5)
d.notes(s, "提案システムOshiFitの全体像です。入力はTIPI-J、毎日30秒の記録、本人の希望です。"
           "ベイズ個人ツインが毎晩予測を更新し、リバランス提案エンジンが3つの案を作り、みらいミラーで今のままと提案どおりの見込みを並べて見せます。")

# 10 --------------------------------------------------------------- twin
s = d.slide("① ベイズ個人ツイン")
d.text(s, L, 1.55, 4.4, 2.8, [
    dict(t="予備調査215名の係数を出発点（事前分布）にする", bullet=True),
    dict(t="毎日の記録で、その人の個人差を毎晩更新する", bullet=True),
    dict(t="予測は分布として出るので、予測区間が自然に得られる", bullet=True),
    dict(t="端末内で計算でき、サーバーには記録の数値だけを送る", bullet=True),
], size=14.5, after=10, margin=(0, 0, 0, 0))
d.box(s, L, 4.55, 4.4, 1.0, fill="navy", radius=0.1)
d.text(s, L + 0.15, 4.57, 4.1, 0.96, [
    dict(t="予測 = (全体の傾向 + 個人差) × 行動", size=14, bold=True, color="white", align="c", after=2),
    dict(t="個人差は平均0の正規分布から。記録が増えるほど本人寄りに", size=11.5, color="sky2", align="c"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.7, 4.4, 1.05, fill="panel", radius=0.1,
      text=f"14日の記録で、推し疲れの80%予測区間は ±{P.PI['bo'][0]} → ±{P.PI['bo'][1]}", size=13, bold=True,
      color="navy", align="c")
d.bar(s, 5.1, 1.45, 4.45, 5.3, ["充実", "推し疲れ"],
      [("記録0日", [P.PI["wb"][0], P.PI["bo"][0]]), ("記録14日", [P.PI["wb"][1], P.PI["bo"][1]])],
      ["8FA3B8", "B"], fmt="0.00", vmin=0, vmax=1.4, major=0.2, title="80%予測区間の幅（±・参加者平均）", gap=80, overlap=-10)
d.assumed(s)
d.notes(s, "1つ目の要素、ベイズ個人ツインです。予備調査の係数を出発点にして、毎日の記録でその人の個人差を毎晩更新します。"
           "実験では、14日の記録で推し疲れの予測区間が約3割縮みました。")

# 11 --------------------------------------------------------------- rebalance
s = d.slide("② リバランス提案：減らさずに組み替える")
pts = [("現状（今のまま）", 3.5, 3.6, "A", 15, "b"), ("① 楽しさキープ", 3.1, 3.6, "B", 13, "t"),
       ("② バランス", 3.3, 3.8, "B", 13), ("③ 回復重視", 2.8, 3.4, "B", 13)]
d.scatter(s, L, 1.45, 5.0, 4.6, pts, xr=(2.6, 3.8, 0.2), yr=(3.2, 4.0, 0.2), xtitle="推し疲れの予測（低いほど良い）",
          ytitle="充実の予測", title="提案3案の予測（例）")
d.text(s, L, 6.1, 5.0, 0.6, "7つの活動を最大2つまで±1段階動かした98案から、本人の希望を守るパレート最適な3案を選ぶ",
       size=11.5, color="muted", margin=(0, 0, 0, 0))
d.table(s, 5.65, 1.55, 3.9, [
    ["案", "内容"],
    ["① 楽しさキープ", "夜のSNSを1時間短く、配信は週末にまとめて"],
    ["② バランス", "グッズは月1回のまとめ買い。浮いた分をライブへ"],
    ["③ 回復重視", "24時以降はSNSオフ、睡眠を1時間ふやす"],
], colw=[1.45, 2.45], rowh=0.78, size=12, align=["l", "l"], first_col_bold=True)
d.box(s, 5.65, 4.85, 3.9, 1.9, fill="BL", radius=0.12)
d.text(s, 5.8, 4.9, 3.6, 1.8, [
    dict(t="選ぶのは本人", size=14, bold=True, color="B", after=3),
    dict(t="「増やしたい」活動は減らさない。どの案も選ばない自由も残す", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "2つ目の要素、リバランス提案です。予備調査で増やしたい人が多かったことを受けて、減らすのではなく組み替える提案を作ります。"
           "98の候補から、本人の希望を守るパレート最適な3案を選び、本人に選んでもらいます。")

# 12 --------------------------------------------------------------- mirror
s = d.slide("③ ゆらぎアバター（みらいミラー）")
d.pic(s, "mk_ja_mirror", L, 1.5, h=5.25)
for i, (im, t) in enumerate([("ghost_d0", "記録0日"), ("ghost_d7", "7日"), ("ghost_d14", "14日")]):
    x = 3.75 + i * 1.95
    d.box(s, x, 1.55, 1.85, 1.6, fill="BL" if i == 2 else "panel", radius=0.1)
    d.pic(s, im, x + 0.1, 1.62, w=1.65)
    d.text(s, x, 2.75, 1.85, 0.32, t, size=12, bold=True, color="B" if i == 2 else "navy", align="c", margin=(0, 0, 0, 0))
d.text(s, 3.75, 3.3, 5.8, 3.4, [
    dict(t="今のまま（Path A）と提案どおり（Path B）を並べて表示", bullet=True),
    dict(t="予測分布から20通りの未来を引き、5体のアバターを重ねて描く。濃さ＝起こりやすさ", bullet=True),
    dict(t="「20人中◯人が疲れ高め」の点の表示（Kay et al., 2016）", bullet=True),
    dict(t="記録が増えると重なりが収束：「未来の解像度」が上がる", bullet=True, bcolor="pink"),
    dict(t="表情は予測の区分（3段階）にだけ連動させ、誇張しない", bullet=True),
], size=13.5, after=8, margin=(0, 0, 0, 0))
d.notes(s, "3つ目の要素、ゆらぎアバターです。今のままと提案どおりの見込みを、自分に似たアバターで並べて見せます。"
           "予測の幅は、5体のアバターの重なりとして表し、記録が増えると重なりが収束して未来の自分がくっきりしていきます。"
           "不確かさを正直に見せることと、記録を続ける動機づけを1つの表現で両立させています。")

# 13 --------------------------------------------------------------- method
s = d.slide("実験：6週間・3群の無作為化比較実験")
x0, wk = 2.3, 1.2
for w in range(6):
    d.text(s, x0 + w * wk, 1.5, wk, 0.32, f"{w + 1}週", size=12, bold=True, color="muted", align="c", margin=(0, 0, 0, 0))
groups = [("群A 記録のみ", "記録のみ", "8FA3B8", "panel"), ("群B 提案（文章）", "提案（文章）＋記録", "blue", "sky"),
          ("群C 提案＋アバター", "提案＋予測アバター＋記録", "B", "BL")]
for i, (g, t, col, fill) in enumerate(groups):
    y = 1.95 + i * 0.78
    d.text(s, L, y, x0 - L - 0.1, 0.62, g, size=13, bold=True, color=col if col != "8FA3B8" else "gray", anchor="m",
           margin=(0, 0, 0, 0))
    d.box(s, x0, y + 0.06, 2 * wk - 0.05, 0.5, fill="E3E8EF", radius=0.08, text="記録のみ", size=11, bold=True,
          color="muted", align="c")
    d.box(s, x0 + 2 * wk, y + 0.06, 4 * wk, 0.5, fill=fill, line=col, lw=1, radius=0.08, text=t, size=12, bold=True,
          color="navy", align="c")
d.line(s, x0 + 2 * wk - 0.02, 1.85, x0 + 2 * wk - 0.02, 4.35, color="pink", width=2.25, dash=True)
d.pill(s, x0 + 2 * wk - 1.0, 4.4, 2.0, 0.3, "2週の終わりに層別割付", fill="pink", size=10)
for w in (0, 2, 4, 6):
    x = x0 + w * wk
    d.box(s, x - 0.1, 4.85, 0.2, 0.2, fill="navy", radius=None, shape=__import__("pptx").enum.shapes.MSO_SHAPE.DIAMOND)
d.text(s, L, 4.78, x0 - L - 0.1, 0.35, "WHO-5", size=12, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.line(s, x0, 4.95, x0 + 6 * wk, 4.95, color="B8C2CE", width=1)
d.table(s, L, 5.35, R - L, [
    ["評価", "内容"],
    ["主要（RQ3）", "6週時点の WHO-5（2週の得点を共変量とする共分散分析、Holm 法）"],
    ["RQ2・RQ1", "毎週の提案の実行（ロジスティック混合モデル）／6週時点の予測と実測のずれ"],
], colw=[1.6, 7.5], rowh=0.45, size=12, align=["l", "l"], first_col_bold=True)
d.notes(s, "実験は6週間の無作為化比較実験です。全員が最初の2週間は記録のみを行い、2週の終わりにWHO-5で層別して3群に割り付けました。"
           "群Bと群Cの提案は同じで、違いは予測アバターの有無だけです。主要評価は6週時点のWHO-5です。")

# 14 --------------------------------------------------------------- participants
s = d.slide("参加者")
F = P.FLOW
flow = [("応募", F["applied"]), ("開始", F["started"]), ("割付", F["week2"]), ("6週完了", sum(F["completed"]))]
for i, (t, n) in enumerate(flow):
    x = L + i * 2.32
    d.box(s, x, 1.6, 2.08, 1.5, fill="navy" if i == 3 else "sky", radius=0.12)
    d.text(s, x, 1.68, 2.08, 0.45, t, size=14, bold=True, color="white" if i == 3 else "navy", align="c",
           margin=(0, 0, 0, 0), anchor="m")
    d.text(s, x, 2.15, 2.08, 0.8, f"{n}名", size=28, bold=True, color="white" if i == 3 else "navy", align="c",
           margin=(0, 0, 0, 0), anchor="m")
    if i < 3:
        d.arrow(s, x + 2.1, 2.15, 0.2, 0.4, fill="blue")
for i, (g, n, col, fill) in enumerate([("群A 記録のみ", F["completed"][0], "gray", "panel"),
                                       ("群B 提案（文章）", F["completed"][1], "blue", "sky"),
                                       ("群C 提案＋アバター", F["completed"][2], "B", "BL")]):
    x = L + i * 3.07
    d.box(s, x, 3.35, 2.95, 1.65, fill=fill, radius=0.12)
    d.text(s, x, 3.45, 2.95, 0.4, g, size=14, bold=True, color=col, align="c", margin=(0, 0, 0, 0))
    d.text(s, x, 3.85, 2.95, 0.75, f"{n}名", size=28, bold=True, color="navy", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, x, 4.6, 2.95, 0.3, f"割付 71名 → 完了 {n}名", size=11.5, color="muted", align="c", margin=(0, 0, 0, 0))
d.box(s, L, 5.25, R - L, 1.5, fill="panel", radius=0.12)
d.text(s, L + 0.3, 5.3, R - L - 0.6, 1.4, [
    dict(t="平均年齢 22.6歳、女性 約7割。推し活をしている成人（大学生が中心）", size=14, bold=True, color="navy", after=3),
    dict(t="各群とも必要人数（1群64名：d = 0.5、検出力80%）を確保。割付時の WHO-5 などに群間の偏りなし", size=12.5,
         color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, f"参加者は応募{F['applied']}名、開始{F['started']}名、割付{F['week2']}名で、6週間を完了したのは{sum(F['completed'])}名でした。"
           "各群とも必要人数の64名を確保しています。")

# 15 --------------------------------------------------------------- RQ1
s = d.slide("結果 RQ1：個人補正で予測の誤差が減った")
d.bar(s, L, 1.45, 5.3, 4.6, ["充実", "推し疲れ"],
      [("全体の傾向のみ", [P.MAE["wb"][0], P.MAE["bo"][0]]), ("個人補正後", [P.MAE["wb"][1], P.MAE["bo"][1]])],
      ["8FA3B8", "B"], fmt="0.00", vmin=0, vmax=1.0, major=0.2, title="6週時点の平均絶対誤差（5段階）", gap=80, overlap=-10)
d.text(s, L, 6.15, 5.3, 0.55, "予測は2週時点の記録までで作成し、6週時点の実測と比べた", size=11.5, color="muted",
       margin=(0, 0, 0, 0))
for i, (v, lab) in enumerate([(f"−{round((1 - P.MAE['bo'][1] / P.MAE['bo'][0]) * 100)}%", "推し疲れの誤差の減少"),
                              (f"{P.COVER['bo']}%", "80%区間に入った割合（推し疲れ）")]):
    y = 1.5 + i * 1.55
    d.box(s, 6.0, y, 3.55, 1.4, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, 6.0, y + 0.05, 3.55, 0.85, v, size=30, bold=True, color="B", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 6.0, y + 0.9, 3.55, 0.4, lab, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
d.box(s, 6.0, 4.65, 3.55, 2.1, fill="sky", radius=0.12)
d.text(s, 6.15, 4.7, 3.25, 2.0, [
    dict(t="予測区間はおおむね正直", size=14, bold=True, color="navy", after=3),
    dict(t="ゆらぎアバターが示す幅は、実際の外れ方とほぼ一致した", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "RQ1の結果です。個人補正によって、6週時点の予測の誤差は充実で0.68から0.49、推し疲れで0.84から0.62に減りました。"
           "80%予測区間に実測が入った割合は76%と、区間はおおむね正直でした。")

# 16 --------------------------------------------------------------- RQ2
s = d.slide("結果 RQ2：提案の実行が増えた")
d.linechart(s, L, 1.45, 5.6, 4.7, ["3週", "4週", "5週", "6週"],
            [("群B 提案（文章）", P.EXEC["B"]), ("群C 提案＋アバター", P.EXEC["C"])], ["blue", "B"], fmt="0",
            vmin=30, vmax=70, major=10, title="選んだ提案を実行できた割合（%）", labels=True)
d.box(s, 6.25, 1.5, 3.3, 2.3, fill="BL", radius=0.12)
d.text(s, 6.4, 1.55, 3.0, 2.2, [
    dict(t=f"OR = {P.EXEC_OR['or_']}", size=28, bold=True, color="B", after=2),
    dict(t=f"95%CI {P.EXEC_OR['lo']}〜{P.EXEC_OR['hi']}", size=13, color="text", after=0),
    dict(t=f"p = {P.EXEC_OR['p']}", size=13, color="text", after=2),
    dict(t="ロジスティック混合モデル", size=11, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, 6.25, 4.0, 3.3, 2.75, fill="panel", radius=0.12)
d.text(s, 6.4, 4.05, 3.0, 2.65, [
    dict(t="同じ提案でも、見せ方で実行が変わる", size=14, bold=True, color="navy", after=4),
    dict(t="群Cは週を追っても下がり方がゆるやかで、6週でも57%が実行", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, f"RQ2の結果です。選んだ提案を実行できた割合は、4週間を通して群Cが群Bを上回り、オッズ比は{P.EXEC_OR['or_']}で有意でした。"
           "提案の中身は同じなので、自分に似たアバターで将来の見込みを見せたことが実行を後押ししたと考えられます。")

# 17 --------------------------------------------------------------- RQ3
s = d.slide("結果 RQ3：WHO-5 の変化")
d.linechart(s, L, 1.45, 4.35, 4.7, ["開始", "2週", "4週", "6週"],
            [("群A", P.WHO5["A"]), ("群B", P.WHO5["B"]), ("群C", P.WHO5["C"])], ["8FA3B8", "blue", "B"], fmt="0.0",
            vmin=12, vmax=15.5, major=0.5, title="WHO-5 の平均（素点 0〜25）", label_last=True)
d.table(s, 4.95, 1.5, 4.6, P.ANCOVA, colw=[1.35, 0.95, 1.3, 1.0], rowh=0.55, size=10.5, hsize=10,
        align=["l", "c", "c", "c"], first_col_bold=True)
d.text(s, 4.95, 3.75, 4.6, 0.3, "共分散分析（2週の WHO-5 を共変量）", size=10.5, color="muted", margin=(0, 0, 0, 0))
d.box(s, 4.95, 4.15, 4.6, 2.6, fill="AL", radius=0.12)
d.text(s, 5.1, 4.2, 4.3, 2.5, [
    dict(t="主要な比較では有意差なし", size=14.5, bold=True, color="A", after=4),
    dict(t="群Cは記録のみの群Aより +1.7 点（探索的）", bullet=True, bcolor="A"),
    dict(t="群C−群B は d ≈ 0.2。中程度の差を想定した人数では検出力が不足", bullet=True, bcolor="A"),
], size=12.5, margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "RQ3の結果です。WHO-5は群Cで6週にかけて上がりましたが、事前に決めた主要な比較、群C対群Bと群B対群Aは、Holm法で補正すると有意差はありませんでした。"
           "群Cと群Aの差は1.7点ありましたが、これは探索的な比較です。群C対群Bの効果量は0.2程度で、中程度の差を想定した人数では検出力が足りなかったと考えられます。")

# 18 --------------------------------------------------------------- secondary
s = d.slide("副次的な結果：疲れの中身・楽しさ・記録")
d.bar(s, L, 1.45, 4.6, 3.9, P.FACETS,
      [("群A", P.FACET_CHANGE["A"]), ("群B", P.FACET_CHANGE["B"]), ("群C", P.FACET_CHANGE["C"])],
      ["8FA3B8", "blue", "B"], fmt="0.00", vmin=-0.4, vmax=0.1, major=0.1, title="疲れの中身の変化（2→6週）", gap=60,
      overlap=-5, labels=False, cat_low=True)
d.linechart(s, 5.15, 1.45, 4.4, 3.9, ["1週", "2週", "3週", "4週", "5週", "6週"],
            [("群A", P.LOG_WEEK["A"]), ("群B", P.LOG_WEEK["B"]), ("群C", P.LOG_WEEK["C"])], ["8FA3B8", "blue", "B"],
            fmt="0", vmin=60, vmax=100, major=10, title="週ごとの記録率（%）", label_last=True)
facts = [("睡眠・出費の疲れが減少", "群Cで最も大きい。比較の疲れは変化なし", "B"),
         ("楽しさは維持", "3群とも 3.8〜3.9 のまま", "blue"),
         ("記録が続く", "群Cは6週でも83%（探索的）", "navy")]
for i, (t, b, col) in enumerate(facts):
    x = L + i * 3.07
    d.box(s, x, 5.5, 2.95, 1.25, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x + 0.15, 5.55, 2.65, 1.15, [dict(t=t, size=13.5, bold=True, color=col, after=2),
                                           dict(t=b, size=11.5, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "副次的な結果です。推し疲れの中身では睡眠と出費の疲れが群Cで最も減り、楽しさは3群とも維持されていました。"
           "また、群Cは介入期間に入ってからも記録率が高く保たれていました。")

# 19 --------------------------------------------------------------- discussion
s = d.slide("考察")
pts = [("見せ方が行動を変えた", "提案の中身は同じでも、自分に似たアバターで将来を見ると実行が増えた。未来の自分とのつながり感も群Cで高い", "B", "mirror"),
       ("「組み替え」は楽しさを損なわない", "疲れは減り、楽しさは保たれた。一律に減らす支援とは異なる支え方", "blue", "scale"),
       ("ウェルビーイングへの効果は小さい", "6週間は習慣の定着（中央値66日：Lally et al., 2010）より短い。効果量 d ≈ 0.2 を前提にした規模が必要", "A", "hourglass"),
       ("不確かさの提示は安全に使える", "区間はおおむね正直で、予測を見た後の不安は群Bと同程度", "navy", "shield")]
for i, (t, b, col, ic) in enumerate(pts):
    x = L + (i % 2) * 4.65
    y = 1.55 + (i // 2) * 2.3
    d.card(s, x, y, 4.45, 2.15, t, b, icon=ic, color=col, bsize=12.5)
d.box(s, L, 6.2, R - L, 0.55, fill="navy", radius=0.1,
      text="貢献：同じ提案でも「見せ方」で実行を高められること、不確かさを見せても安全なことを示した",
      size=13, bold=True, color="white", align="c")
d.notes(s, "考察です。見せ方が行動を変えたこと、組み替えの提案が楽しさを損なわなかったこと、ウェルビーイングへの効果は小さく期間が短かった可能性があること、"
           "そして不確かさの提示が不安を高めず安全に使えたことの4点が主な考察です。")

# 20 --------------------------------------------------------------- limitations
s = d.slide("限界と今後の課題")
lims = [("期間と規模", "6週間・1群約65名。d ≈ 0.2 の差を検出するには、共変量を入れても1群250名以上が必要", "users"),
        ("要素の切り分け", "群Cはアバターと点の表示の両方を見た。どちらが効いたかは分からない", "layers"),
        ("自己報告", "記録とWHO-5は自己報告。心拍などの生理指標との組み合わせ（今井・大井, 2025）", "pen"),
        ("参加者の偏り", "大学生・女性が中心。年齢や推しのジャンルが違う集団での検証", "globe")]
for i, (t, b, ic) in enumerate(lims):
    x = L + (i % 2) * 4.65
    y = 1.55 + (i // 2) * 1.85
    d.card(s, x, y, 4.45, 1.7, t, b, icon=ic, color="A", bsize=12.5)
d.box(s, L, 5.35, R - L, 1.4, fill="sky", radius=0.12)
d.text(s, L + 0.3, 5.4, R - L - 0.6, 1.3, [
    dict(t="今後：長期（3か月以上）の追跡、表示要素を切り分ける実験、他の領域（SNS依存・ゲーム）への応用", size=14, bold=True, color="navy", after=3),
    dict(t="プラットフォーム事業者と連携した「持続可能なファン経済」への展開", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "限界は4点です。期間と規模、表示要素の切り分け、自己報告であること、参加者の偏りです。"
           "今後は長期の追跡や要素を切り分ける実験を行い、SNS依存やゲームなど他の領域への応用も考えています。")

# 21 --------------------------------------------------------------- conclusion
s = d.slide("結論")
d.box(s, L, 1.55, R - L, 3.6, fill="navy", radius=0.12)
d.pic(s, "ghost_d14", L + 0.1, 1.95, w=2.9)
d.text(s, L + 3.15, 1.65, R - L - 3.4, 3.4, [
    dict(t="記録にもとづく予測と、自分に似たアバターによる将来像を統合したシステム OshiFit を構築した", bullet=True, bcolor="sky2"),
    dict(t="RQ1：個人補正で予測の誤差が約26%減少", bullet=True, bcolor="sky2"),
    dict(t="RQ2：アバターで見込みを見ると、提案の実行が増えた（OR 1.71）", bullet=True, bcolor="sky2"),
    dict(t="RQ3：ウェルビーイングの向上は主要な比較では確認できず", bullet=True, bcolor="sky2"),
], size=14, color="white", after=8, margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.35, R - L, 1.4, fill="BL", radius=0.12)
d.text(s, L + 0.3, 5.4, R - L - 0.6, 1.3, [
    dict(t="「減らす」ではなく「組み替える」、そして不確かさを隠さず見せる", size=16, bold=True, color="B", after=3),
    dict(t="推し活のように正解が人によって違う領域で、本人が自分で選べる行動変容の支援の形を示した", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "結果の数値は想定値")
d.notes(s, "結論です。本研究では、記録にもとづく予測と自分に似たアバターによる将来像を統合したOshiFitを構築し、6週間の無作為化比較実験で検証しました。"
           "予測の精度は個人補正で向上し、アバターで見込みを見ると提案の実行が増えました。一方、ウェルビーイングの向上は主要な比較では確認できませんでした。"
           "推し活のように正解が人によって違う領域で、減らすのではなく組み替える、そして不確かさを隠さず見せるという支援の形を示しました。ご清聴ありがとうございました。")

# 22 --------------------------------------------------------------- publications
s = d.slide("研究業績")
d.text(s, L, 1.55, R - L, 5.2, [
    dict(t="国際会議", size=14, bold=True, color="navy", after=4),
    dict(t="G. Imai, S. Ooi: OshiFit: Possible-Selves Avatars for Uncertainty-Aware Behavior Change in Fan Activities, ACM CHIIR 2027 (Short Paper), 2027.（採択）", bullet=True, after=6),
    dict(t="G. Imai, S. Ooi: OshiFit: Study on Proposal System with “Oshi-katsu” based on Individual Characteristics Predicted by One’s Own Avatar, IEVC 2026, 2026.", bullet=True, after=12),
    dict(t="国内発表", size=14, bold=True, color="navy", after=4),
    dict(t="今井元, 大井翔: 推し活中の心拍数とストレスの関係性に関する検討, 第3回ウェルビーイング学会年次大会, 2025.", bullet=True, after=6),
    dict(t="今井元, 大井翔: 推し活の充実と推し疲れに関する調査（仮題）, AIxMHC Summer Edition, 2026.", bullet=True, after=6),
    dict(t="今井元, 大井翔: （題目）, 情報処理学会関西支部大会 G-43, 2026.", bullet=True, after=12),
    dict(t="投稿準備中", size=14, bold=True, color="navy", after=4),
    dict(t="IEEE Access（本実験の結果をまとめた論文）", bullet=True),
], size=12.5, color="text", margin=(0, 0, 0, 0))
d.assumed(s, "題目・採否は要確認")
d.notes(s, "研究業績です。題目が仮のものと採否は、提出前に正式なものに差し替えてください。")

# 23 --------------------------------------------------------------- references
s = d.slide("主な参考文献")
d.text(s, L, 1.55, R - L, 5.2, [
    dict(t="Choe, E. K., et al. (2014). Understanding quantified-selfers' practices in collecting and exploring personal data. CHI '14, 1143–1152.", after=5),
    dict(t="Fox, J., & Bailenson, J. N. (2009). Virtual self-modeling. Media Psychology, 12(1), 1–25.", after=5),
    dict(t="Hershfield, H. E., et al. (2011). Increasing saving behavior through age-progressed renderings of the future self. JMR, 48(SPL), S23–S37.", after=5),
    dict(t="Kay, M., Kola, T., Hullman, J. R., & Munson, S. A. (2016). When (ish) is my bus? CHI '16, 5092–5103.", after=5),
    dict(t="Lally, P., et al. (2010). How are habits formed. European Journal of Social Psychology, 40(6), 998–1009.", after=5),
    dict(t="Topp, C. W., et al. (2015). The WHO-5 Well-Being Index. Psychotherapy and Psychosomatics, 84(3), 167–176.", after=5),
    dict(t="Yee, N., & Bailenson, J. (2007). The Proteus Effect. Human Communication Research, 33(3), 271–290.", after=5),
    dict(t="小塩真司, 阿部晋吾, カトローニピノ (2012). 日本語版 TIPI-J 作成の試み. パーソナリティ研究, 21(1), 40–52.", after=5),
    dict(t="谷口友梨, 神田朋果 (2025). 推し活の理想と現実の乖離が充実感・精神的健康に及ぼす影響. 人間文化, 58, 2–13.", after=5),
    dict(t="中林春海, 水口崇 (2020). ファン心理やその活動と大学生の心理的健康の関係. 信州心理臨床紀要, 19, 33–55.", after=5),
    dict(t="野村総合研究所 (2025). 拡大する「推し活」市場のポテンシャルとビジネスの可能性."),
], size=11, color="text", margin=(0, 0, 0, 0))

d.save(OUT)
print("saved", OUT, d.n, "slides")
