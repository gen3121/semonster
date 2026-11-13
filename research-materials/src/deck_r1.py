"""輪講① 2026/10/23 — Hershfield et al. (2011) 加齢させた「未来の自分」で貯蓄行動を増やす."""
from oshideck import Deck, L, R

OUT = "輪講①_20261023_Hershfield2011_未来の自分.pptx"
d = Deck("2026/10/23", title="輪講 2026/10/23")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　輪講", "輪講 2026/10/23", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=[dict(t="Increasing Saving Behavior Through Age-Progressed Renderings of the Future Self", size=17),
                            dict(t="Hershfield et al., Journal of Marketing Research, 2011", size=13, bold=False)],
                  art="old_good")
d.notes(s, "今回の輪講では、加齢させた未来の自分の姿を見せると貯蓄行動が増える、というHershfieldらの2011年の論文を紹介します。"
           "OshiFitで「将来の自分の見込み」をアバターで見せる設計の、いちばん直接的な根拠になる論文です。")

# 2 ---------------------------------------------------------------- bib
s = d.slide("論文情報と選んだ理由")
d.box(s, L, 1.55, 4.55, 5.2, fill="panel", radius=0.12)
d.icon(s, "book", L + 0.2, 1.72, 0.55, bg="navy")
d.text(s, L + 0.9, 1.72, 3.5, 0.55, "論文情報", size=16, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L + 0.22, 2.45, 4.15, 4.2, [
    dict(t="タイトル", size=11, color="muted", after=0),
    dict(t="Increasing Saving Behavior Through Age-Progressed Renderings of the Future Self", size=13, bold=True, after=8),
    dict(t="著者", size=11, color="muted", after=0),
    dict(t="H. E. Hershfield, D. G. Goldstein, W. F. Sharpe, J. Fox, L. Yeykelis, L. L. Carstensen, J. N. Bailenson", size=12, after=8),
    dict(t="掲載", size=11, color="muted", after=0),
    dict(t="Journal of Marketing Research, 48 (Special Issue), S23–S37, 2011", size=12, after=8),
    dict(t="DOI", size=11, color="muted", after=0),
    dict(t="10.1509/jmkr.48.SPL.S23", size=12),
], margin=(0, 0, 0, 0))
reasons = [
    ("OshiFit の設計の直接の根拠", "「将来の自分の見込みをアバターで見せる」発想の原点", "target", "pink"),
    ("構図が推し活と同じ", "自分に似た姿 × 将来 × お金や時間の配分", "scale", "blue"),
    ("手続きを詳しく知りたい", "計画書で引用済み。提示方法と測り方を実験に生かす", "flask", "B"),
]
for i, (t, b, ic, col) in enumerate(reasons):
    y = 1.55 + i * 1.75
    d.card(s, 5.2, y, 4.35, 1.6, t, b, icon=ic, color=col, bsize=13)
d.notes(s, "論文はJournal of Marketing Researchの2011年の特集号に掲載されたものです。著者にはVR研究のBailensonや、"
           "ノーベル経済学賞のSharpeも入っています。選んだ理由は3つで、OshiFitの設計の原点であること、"
           "自分に似た姿と将来とお金の配分という構図が推し活と同じであること、そして手続きを詳しく知りたいことです。")

# 3 ---------------------------------------------------------------- background
s = d.slide("背景：なぜ人は将来のために貯めないのか")
cards = [
    ("目先の報酬を重く見る", "時間割引：すぐ手に入るものほど価値を大きく感じ、将来の報酬を小さく見積もる", "hourglass", "A"),
    ("未来の自分は「他人」", "将来の自分を考えるときの脳の活動は、他人を考えるときに近い（Ersner-Hershfield et al., 2009）", "user", "purple"),
    ("従来の対策", "前もって約束させる（コミットメント）、将来の報酬の価値を強調する", "list", "gray"),
]
for i, (t, b, ic, col) in enumerate(cards):
    d.card(s, L + i * 3.07, 1.55, 2.95, 2.6, t, b, icon=ic, color=col, bsize=13)
d.box(s, L, 4.4, R - L, 2.35, fill="navy", radius=0.12)
d.pic(s, "av_neutral", L + 0.3, 4.55, h=2.05)
d.arrow(s, L + 2.15, 5.37, 0.5, 0.42, fill="pink")
d.pic(s, "old_good", L + 2.8, 4.55, h=2.05)
d.text(s, L + 4.7, 4.5, 4.3, 2.15, [
    dict(t="本論文の「第3の道」", size=13, color="sky2", after=2),
    dict(t="報酬ではなく「未来の自分」を身近にする", size=17, bold=True, color="white", after=4),
    dict(t="加齢させた自分の姿と向き合うと、将来に向けた選択が増えるのでは？", size=13, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "人が将来のために貯めない理由として、時間割引と、未来の自分を他人のように感じてしまうことが挙げられています。"
           "従来の対策は報酬の側を変えるものでしたが、この論文は、未来の自分そのものを身近にするという第3の道を提案しています。")

# 4 ---------------------------------------------------------------- question
s = d.slide("研究の問いと仮説")
d.box(s, L, 1.55, R - L, 1.35, fill="sky", radius=0.12)
d.icon(s, "question", L + 0.25, 1.88, 0.7, bg="navy")
d.text(s, L + 1.2, 1.6, R - L - 1.4, 1.25, [
    dict(t="問い", size=12, color="muted", after=0),
    dict(t="加齢させた「未来の自分」の姿と対話すると、人は将来に向けてお金を回すようになるか？", size=17, bold=True, color="navy"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 3.1, R - L, 1.35, fill="pinkL", radius=0.12)
d.icon(s, "bulb", L + 0.25, 3.43, 0.7, bg="pink")
d.text(s, L + 1.2, 3.15, R - L - 1.4, 1.25, [
    dict(t="仮説", size=12, color="muted", after=0),
    dict(t="未来の自分を見た人は、すぐの報酬より後の報酬を選びやすくなり、退職後のための貯蓄への配分が増える", size=16, bold=True, color="pink"),
], margin=(0, 0, 0, 0), anchor="m")
d.text(s, L, 4.7, R - L, 0.35, "考え方の筋道", size=14, bold=True, color="navy", margin=(0, 0, 0, 0))
chain = [("加齢させた自分の姿", "sky"), ("未来の自分が\n「自分」に感じられる", "sky"), ("将来への配分が増える", "BL")]
for i, (t, col) in enumerate(chain):
    x = L + i * 3.15
    d.box(s, x, 5.15, 2.75, 1.25, fill=col, radius=0.12, text=t, size=14, bold=True, color="navy", align="c")
    if i < 2:
        d.arrow(s, x + 2.8, 5.55, 0.3, 0.45, fill="blue")
d.notes(s, "問いは、加齢させた未来の自分の姿と対話すると将来に向けてお金を回すようになるか、です。"
           "未来の自分が自分らしく感じられることで、将来への配分が増えるという筋道を想定しています。")

# 5 ---------------------------------------------------------------- design overview
s = d.slide("実験の構成（4つの研究）")
items = [
    ("参加者", "users", "主に大学生。働く世代を対象にしたオンライン実験も含む"),
    ("操作", "mirror", "「今の自分」と「加齢させた自分」のどちらを見るか（顔写真を加齢処理）"),
    ("見せ方", "eye", "① 没入型VRの「仮想の鏡」  ② 画面上の意思決定ツール（貯蓄額を動かすと、加齢した自分の表情が変わる）"),
    ("測り方", "chart", "架空の臨時収入 $1,000 の配分（退職口座を含む）、すぐの報酬と後の報酬の選択、給与からの積立の割合"),
]
for i, (t, ic, b) in enumerate(items):
    y = 1.55 + i * 1.12
    d.box(s, L, y, R - L, 0.98, fill="white", line="line", radius=0.1, shadow=True)
    d.icon(s, ic, L + 0.2, y + 0.19, 0.6, bg="navy")
    d.text(s, L + 1.0, y, 1.3, 0.98, t, size=15, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, L + 2.3, y, R - L - 2.5, 0.98, b, size=13.5, color="text", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L, 6.08, R - L, 0.6, "※ 各研究の参加者数・条件・統計値は、発表前に原著の Method / Results で確認して差し替えること",
       size=11, color="pink", margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "論文は4つの研究で構成されています。共通しているのは、今の自分と加齢させた自分のどちらを見るかを操作している点です。"
           "見せ方は、没入型VRの仮想の鏡と、画面上の意思決定ツールの2種類があり、測り方も配分課題や時間割引の課題など複数です。"
           "各研究の細かい人数や統計値は原著で確認した値を入れてください。")

# 6 ---------------------------------------------------------------- VR mirror procedure
s = d.slide("代表的な手続き：VR の「仮想の鏡」")
steps = [("1", "顔写真から\nアバターを作る", "camera"), ("2", "VRの鏡で\n自分の姿を見る", "mirror"),
         ("3", "研究者のアバター\nと短く会話", "comments"), ("4", "架空の $1,000 を\n配分する", "wallet")]
for i, (n, t, ic) in enumerate(steps):
    x = L + i * 2.32
    d.box(s, x, 1.55, 2.12, 1.75, fill="sky", radius=0.12)
    d.icon(s, ic, x + 0.76, 1.68, 0.6, bg="navy")
    d.text(s, x + 0.1, 2.35, 1.92, 0.85, t, size=13, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    if i < 3:
        d.arrow(s, x + 2.14, 2.2, 0.16, 0.36, fill="blue")
# two conditions
for i, (lab, im, col, fill) in enumerate([("今の自分を見る群", "av_neutral", "gray", "panel"),
                                         ("加齢させた自分を見る群", "old_neutral", "pink", "pinkL")]):
    x = L + i * 4.65
    d.box(s, x, 3.5, 4.45, 3.25, fill=fill, radius=0.12)
    d.text(s, x + 0.2, 3.6, 4.05, 0.42, lab, size=15, bold=True, color=col, margin=(0, 0, 0, 0))
    d.box(s, x + 0.3, 4.1, 1.85, 2.45, fill="white", line="B8C2CE", lw=3, radius=0.9)
    d.pic(s, im, x + 0.42, 4.35, h=1.9)
    d.text(s, x + 2.35, 4.15, 1.95, 2.4,
           ["鏡に映るのは", dict(t="現在の自分の顔" if i == 0 else "高齢に加齢処理した自分の顔", bold=True, color="navy")],
           size=13, color="text", anchor="m", margin=(0, 0, 0, 0))
d.notes(s, "代表的な手続きを紹介します。参加者の顔写真からアバターを作り、VRの中の鏡で自分の姿を見ます。"
           "片方の群は今の自分、もう片方の群は加齢させた自分が鏡に映ります。そのあと研究者のアバターと短く会話し、"
           "架空の臨時収入1000ドルをいくつかの使い道に配分します。")

# 7 ---------------------------------------------------------------- results
s = d.slide("主な結果")
d.bar(s, L, 1.5, 4.6, 4.35, ["今の自分", "加齢させた自分"], [("退職口座への配分（$）", [80, 172])], ["gray"],
      fmt='"$"0', vmin=0, vmax=200, major=50, point_colors=["8FA3B8", "pink"], gap=70,
      title="退職口座への配分（架空の$1,000のうち）")
d.text(s, L, 5.95, 4.6, 0.8, "※ 二次資料で報告されている値（$172 vs $80）。原著の数値で要確認",
       size=11, color="pink", margin=(0, 0, 0, 0))
d.box(s, 5.3, 1.55, 4.25, 1.75, fill="pinkL", radius=0.12)
d.text(s, 5.5, 1.6, 3.9, 1.65, [
    dict(t="約2倍", size=40, bold=True, color="pink", after=0),
    dict(t="加齢させた自分を見た群は、退職口座へ多く配分した", size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.card(s, 5.3, 3.5, 4.25, 3.25, "4つの研究に共通する傾向", [
    dict(t="未来の自分と対話した人ほど、すぐの報酬より後の報酬を選びやすい", bullet=True),
    dict(t="没入型VRでも、画面上のツールでも同じ方向の効果", bullet=True),
    dict(t="働く世代のオンライン実験でも、給与からの積立が増える方向", bullet=True),
], icon="chart", color="B", bsize=13)
d.notes(s, "VRの研究では、加齢させた自分を見た群が、退職口座に約2倍の額を配分したと報告されています。"
           "この172ドルと80ドルという値は二次資料からの引用なので、発表前に原著で確認します。"
           "4つの研究を通して、未来の自分と対話した人ほど後の報酬を選びやすいという同じ方向の結果が得られています。")

# 8 ---------------------------------------------------------------- decision aid
s = d.slide("意思決定ツール：表情が選択に連動する")
d.box(s, L, 1.55, 5.0, 5.2, fill="panel", radius=0.12)
d.text(s, L + 0.2, 1.65, 4.6, 0.4, "貯蓄の割合を動かすと…", size=14, bold=True, color="navy", margin=(0, 0, 0, 0))
faces = [("old_sad", "少ない"), ("old_neutral", "ふつう"), ("old_good", "多い")]
for i, (im, lab) in enumerate(faces):
    x = L + 0.25 + i * 1.6
    d.pic(s, im, x, 2.2, h=1.75)
    d.text(s, x, 4.0, 1.5, 0.35, lab, size=13, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
# slider
d.box(s, L + 0.45, 4.6, 4.1, 0.16, fill="sky2", radius=0.08)
d.box(s, L + 0.45, 4.6, 3.0, 0.16, fill="blue", radius=0.08)
d.circle(s, L + 3.3, 4.5, 0.36, "white", line="blue")
d.text(s, L + 0.3, 4.9, 4.4, 1.7, [
    dict(t="貯蓄に回す額をスライダーで選ぶ", bullet=True),
    dict(t="少ないと加齢した自分が悲しそうに、多いと嬉しそうになる", bullet=True),
], size=13, color="text", after=6, margin=(0, 0, 0, 0))
d.box(s, 5.7, 1.55, 3.85, 5.2, fill="white", line="B", lw=1.5, radius=0.12, shadow=True)
d.icon(s, "bulb", 5.9, 1.75, 0.6, bg="B")
d.text(s, 6.65, 1.75, 2.8, 0.6, "OshiFit との対応", size=15, bold=True, color="B", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.9, 2.55, 3.5, 4.1, [
    dict(t="「選択 → 未来の自分の表情」の即時フィードバック", size=14, bold=True, color="navy", after=8),
    dict(t="OshiFit でも、提案を選ぶと Path B のアバターの表情が変わる", bullet=True),
    dict(t="ただし表情は予測の区分（3段階）にのみ連動させ、誇張しない", bullet=True, bcolor="pink"),
], size=13, after=6, margin=(0, 0, 0, 0))
d.notes(s, "もう1つの見せ方が、画面上の意思決定ツールです。スライダーで貯蓄の割合を動かすと、加齢した自分の表情が変わります。"
           "これはOshiFitで提案を選ぶとPath Bのアバターの表情が変わる設計とほぼ同じ構図です。"
           "ただし、OshiFitでは表情を予測の区分にだけ連動させ、誇張しないようにしています。")

# 9 ---------------------------------------------------------------- authors' conclusion
s = d.slide("著者らの結論と貢献")
pts = [("未来の自分を「見える化」する介入", "報酬を変えるのではなく、未来の自分との結びつきを強めるという新しい道を示した", "sparkles", "pink"),
       ("VR から日常のツールへ", "没入型VRだけでなく、画面上の意思決定支援でも使えることを示した", "mobile", "blue"),
       ("実務への広がり", "退職貯蓄のサービスで「加齢した自分」を見せる取り組みにつながった", "rocket", "B")]
for i, (t, b, ic, col) in enumerate(pts):
    y = 1.55 + i * 1.75
    d.box(s, L, y, R - L, 1.55, fill="white", line="line", radius=0.12, shadow=True)
    d.icon(s, ic, L + 0.25, y + 0.38, 0.8, bg=col)
    d.text(s, L + 1.3, y + 0.1, R - L - 1.5, 1.35, [dict(t=t, size=17, bold=True, color="navy", after=4),
                                                    dict(t=b, size=13.5, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "著者らの貢献は、未来の自分を見える化するという介入の道を示したこと、VRだけでなく画面上のツールでも使えることを示したこと、"
           "そして実際の金融サービスにも応用が広がったことです。")

# 10 --------------------------------------------------------------- critique
s = d.slide("批判的に読む：限界と疑問")
crit = [
    ("架空の配分で測っている", "実際の口座への入金ではない。行動として続くかは分からない", "wallet"),
    ("効果の持続が不明", "見た直後に測っている。数週間後にも効果が残るかは未検証", "hourglass"),
    ("「老い」のイメージの影響", "加齢した顔への感情（不安・嫌悪）が混ざっている可能性", "warn"),
    ("参加者の偏り", "主に大学生。年齢・文化が違う集団でも同じか", "users"),
]
for i, (t, b, ic) in enumerate(crit):
    x = L + (i % 2) * 4.65
    y = 1.55 + (i // 2) * 1.95
    d.card(s, x, y, 4.45, 1.8, t, b, icon=ic, color="A", bsize=13)
d.box(s, L, 5.5, R - L, 1.25, fill="sky", radius=0.12)
d.text(s, L + 0.25, 5.55, R - L - 0.5, 1.15, [
    dict(t="→ OshiFit は「実際の行動を6週間追跡する」点でこの限界を補える", size=15, bold=True, color="navy", after=3),
    dict(t="後続の追試やレビュー（例：Grekin et al., 2025）で、効果の大きさと一般化も確認しておきたい", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "批判的に読むと、架空の配分で測っていること、効果が続くかが分からないこと、老いのイメージ自体の影響、参加者の偏りが気になります。"
           "OshiFitは、実際の行動を6週間追跡する点でこの限界を補うことができます。"
           "また、後続の追試やレビュー論文で効果の大きさがどの程度再現されているかも確認しておきたいと考えています。")

# 11 --------------------------------------------------------------- mapping
s = d.slide("OshiFit への示唆：何を引き継ぎ、何を変えるか")
d.table(s, L, 1.55, R - L, [
    ["観点", "Hershfield et al. (2011)", "OshiFit"],
    ["見せる未来", "数十年後の自分（加齢）", "6週間後の自分（近い未来）"],
    ["未来の数", "1つの未来像", "2つを並べる（今のまま｜提案どおり）"],
    ["表情の変化", "貯蓄の割合に連動", "選んだ提案の予測区分に連動（3段階）"],
    ["不確かさ", "確定した画像", "予測の幅をゆらぎで表示"],
    ["測るもの", "直後の架空の配分", "実際の実行率を毎週・6週間"],
    ["比較の相手", "今の自分の姿", "同じ提案を文章で受ける群（群B）"],
], colw=[1.7, 3.5, 3.9], rowh=0.6, size=13, align=["l", "l", "l"], first_col_bold=True,
    fills={(r, 2): "BL" for r in range(1, 7)})
d.box(s, L, 5.95, R - L, 0.8, fill="navy", radius=0.12,
      text=["引き継ぐ：自分に似た姿・未来・選択への即時フィードバック", "変える：近い未来・2つの未来・不確かさの表示・実際の行動"],
      size=12.5, bold=True, color="white", align="c")
d.notes(s, "OshiFitに引き継ぐのは、自分に似た姿で未来を見せ、選択に表情が即時に反応するという構図です。"
           "変えるのは、近い未来であること、2つの未来を並べること、不確かさを見せること、そして実際の行動を測ることです。")

# 12 --------------------------------------------------------------- reflect into study
s = d.slide("本実験への反映（具体案）")
acts = [
    ("事後アンケートに「未来の自分とのつながり」を追加", "2つの円の重なりで答える尺度（Ersner-Hershfield et al., 2009）を6週時点で測る", "clip", "B"),
    ("Path A の表情を弱めに設定", "見た目への否定的な感情が混ざる可能性を踏まえ、疲れの表現は3段階の中で最も弱い段階から始める", "smile", "A"),
    ("「選ぶ → 表情が変わる」を提案画面に入れる", "群Cのみ。提案カードを選ぶと Path B のアバターが即座に更新される", "sliders", "blue"),
]
for i, (t, b, ic, col) in enumerate(acts):
    y = 1.55 + i * 1.72
    d.box(s, L, y, R - L, 1.55, fill="white", line="line", radius=0.12, shadow=True)
    d.circle(s, L + 0.25, y + 0.4, 0.75, col, text=str(i + 1), size=22, bold=True, color="white", align="c")
    d.text(s, L + 1.25, y + 0.1, R - L - 1.45, 1.35, [dict(t=t, size=16, bold=True, color="navy", after=4),
                                                      dict(t=b, size=13, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "本実験への反映として3点考えています。1つ目は、未来の自分とのつながりを円の重なりの尺度で測ること。"
           "2つ目は、Path Aの疲れの表現を最も弱い段階から始めること。3つ目は、提案を選ぶとPath Bのアバターが即座に変わる仕組みを群Cに入れることです。")

# 13 --------------------------------------------------------------- discussion
s = d.slide("議論したいこと")
qs = [("6週間という「近い未来」でも効くか", "数十年後の自分と違い、6週間後の自分はもともと「自分」に近い。効果は小さくなる？"),
      ("「今のまま」の自分を見せることの是非", "Path A を見て不安が高まりすぎないか。見せない選択肢を用意すべきか"),
      ("似ている度合いはどこまで必要か", "写真から作る場合とパーツで作る場合で、効果に差が出るか（共変量にするか）")]
for i, (q, sub) in enumerate(qs):
    y = 1.55 + i * 1.72
    d.box(s, L, y, R - L, 1.55, fill="pinkL" if i == 0 else "panel", radius=0.12)
    d.icon(s, "question", L + 0.25, y + 0.42, 0.7, bg="pink")
    d.text(s, L + 1.2, y + 0.1, R - L - 1.4, 1.35, [dict(t=q, size=16, bold=True, color="navy", after=4),
                                                    dict(t=sub, size=13, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "皆さんと議論したい点は3つです。近い未来でも効果があるか、今のままの自分を見せることの是非、そしてアバターがどの程度似ている必要があるかです。")

# 14 --------------------------------------------------------------- refs
s = d.slide("参考文献")
d.text(s, L, 1.55, R - L, 5.2, [
    dict(t="Hershfield, H. E., Goldstein, D. G., Sharpe, W. F., Fox, J., Yeykelis, L., Carstensen, L. L., & Bailenson, J. N. (2011). Increasing saving behavior through age-progressed renderings of the future self. Journal of Marketing Research, 48(SPL), S23–S37.", after=10),
    dict(t="Ersner-Hershfield, H., Wimmer, G. E., & Knutson, B. (2009). Saving for the future self: Neural measures of future self-continuity predict temporal discounting. Social Cognitive and Affective Neuroscience, 4(1), 85–92.", after=10),
    dict(t="Parfit, D. (1971). Personal identity. The Philosophical Review, 80(1), 3–27.", after=10),
    dict(t="Yee, N., & Bailenson, J. (2007). The Proteus Effect: The effect of transformed self-representation on behavior. Human Communication Research, 33(3), 271–290.", after=10),
    dict(t="Fox, J., & Bailenson, J. N. (2009). Virtual self-modeling: The effects of vicarious reinforcement and identification on exercise behaviors. Media Psychology, 12(1), 1–25.", after=10),
    dict(t="Grekin, E. R., Thomas, H. A., Souweidane, M. A., & Stidham, J. L. (2025). The effects of future self-continuity interventions on behavioral outcomes in adults: A systematic review of the literature. https://doi.org/10.1177/27000710251391610", after=10),
    dict(t="Imai, G., & Ooi, S. (2026). OshiFit: Study on proposal system with “Oshi-katsu” based on individual characteristics predicted by one’s own avatar. IEVC 2026."),
], size=12, color="text", margin=(0, 0, 0, 0))

d.save(OUT)
print("saved", OUT, d.n, "slides")
