"""進捗④ 2026/12/18 — 本実験の完了と主要な解析の速報."""
from datetime import date
from oshideck import Deck, L, R
from common import roadmap
import projected as P

OUT = "進捗報告④_20261218_本実験の結果速報.pptx"
d = Deck("2026/12/18", title="進捗報告 2026/12/18")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　進捗報告", "進捗報告 2026/12/18", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=["本実験が完了", dict(t="RQ1〜3 の主要な結果（速報）", size=18, bold=False),
                            dict(t="修士論文の章立てと執筆スケジュール", size=14, bold=False)],
                  art="ghost_d14")
d.notes(s, "12/13に6週間の本実験が完了しました。今日は、事前に決めた解析計画どおりに行った主要な解析の速報と、修士論文の執筆計画を報告します。"
           "数値はすべて速報値で、修論までに再確認します。")

# 2 ---------------------------------------------------------------- summary of results
s = d.slide("結果のまとめ（速報）")
res = [("RQ1", "予測の精度", "○", "B", f"個人補正で予測の誤差が約{round((1 - P.MAE['bo'][1] / P.MAE['bo'][0]) * 100)}%減った（推し疲れ）",
        f"80%区間に入った割合は {P.COVER['bo']}%（目標 80%）"),
       ("RQ2", "アバターで実行は増えるか", "○", "B", f"群Cの実行率が群Bより高い（オッズ比 {P.EXEC_OR['or_']}）",
        f"4週間を通して群Cが約{round(sum(P.EXEC['C']) / 4 - sum(P.EXEC['B']) / 4)}ポイント上回った"),
       ("RQ3", "ウェルビーイングは上がるか", "△", "A", "WHO-5 は群Cで上がったが、主要な比較は有意差なし",
        "群C−群B +0.9（Holm 補正後 p = .16）。群C−群A は +1.7（探索的）")]
for i, (rq, q, mark, col, main, sub) in enumerate(res):
    y = 1.5 + i * 1.62
    d.box(s, L, y, R - L, 1.45, fill="white", line="line", radius=0.12, shadow=True)
    d.circle(s, L + 0.2, y + 0.3, 0.85, col, text=mark, size=26, bold=True, color="white", align="c", margin=(0, 0, 0, 0))
    d.text(s, L + 1.25, y + 0.1, 1.9, 1.25, [dict(t=rq, size=18, bold=True, color="navy", after=0),
                                             dict(t=q, size=11.5, color="muted")], margin=(0, 0, 0, 0), anchor="m")
    d.text(s, L + 3.2, y + 0.1, R - L - 3.4, 1.25, [dict(t=main, size=15, bold=True, color="text", after=3),
                                                    dict(t=sub, size=12, color="muted")], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 6.4, R - L, 0.4, fill="panel", radius=0.08,
      text=f"前回からの差分：実験完了（12/13）→ 事後アンケート回収（{sum(P.FLOW['completed'])}名）→ 事前に決めた解析を実施（12/17）",
      size=12, bold=True, color="navy", align="c")
d.assumed(s)
d.notes(s, "結果のまとめです。RQ1は、個人補正で予測の誤差が減り、予測区間の当たり方もほぼ目標どおりでした。"
           "RQ2は、アバターで将来の見込みを見た群Cの実行率が、文章だけの群Bより高くなりました。"
           "RQ3は、WHO-5が群Cで上がったものの、事前に決めた主要な比較では有意差が出ませんでした。")

# 3 ---------------------------------------------------------------- roadmap
s = d.slide("全体スケジュールと現在地")
roadmap(d, s, date(2026, 12, 18))
d.box(s, L, 5.5, R - L, 1.25, fill="panel", radius=0.1)
d.icon(s, "pen", L + 0.2, 5.82, 0.6, bg="navy")
d.text(s, L + 1.0, 5.55, R - L - 1.2, 1.15, [
    dict(t="本実験が完了し、解析と修論執筆の段階へ。提出（1/29）まで約6週間", size=14, bold=True, color="navy", after=2),
    dict(t="前回（11/27）から：介入期間の後半 → 終了 → 事後アンケート → 主要解析", size=12, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "本実験が完了し、解析と修論執筆の段階に入りました。提出まで約6週間です。")

# 4 ---------------------------------------------------------------- completion
s = d.slide("参加者：最後まで続いた割合")
comp = P.FLOW["completed"]
alloc = P.FLOW["alloc"]
d.bar(s, L, 1.45, 5.3, 4.3, ["群A 記録のみ", "群B 提案（文章）", "群C 提案＋アバター"],
      [("完了率（%）", [round(c / a * 100) for c, a in zip(comp, alloc)])], ["gray"], fmt='0"%"', vmin=0, vmax=100,
      major=20, point_colors=["8FA3B8", "blue", "B"], title="割付から6週完了までの継続率", gap=60)
for i, (v, lab) in enumerate([(f"{sum(comp)}名", "6週間を完了"), (f"{round((1 - sum(comp) / sum(alloc)) * 100, 1)}%", "割付後の脱落率"),
                              ("64名", "1群あたりの必要人数")]):
    y = 1.5 + i * 1.45
    d.box(s, 6.0, y, 3.55, 1.3, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, 6.0, y + 0.05, 3.55, 0.8, v, size=28, bold=True, color="navy", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 6.0, y + 0.85, 3.55, 0.35, lab, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
d.box(s, L, 5.95, R - L, 0.8, fill="BL", radius=0.1,
      text=f"各群とも必要人数（64名）を確保：群A {comp[0]}名・群B {comp[1]}名・群C {comp[2]}名。脱落は群Aでやや多い",
      size=12.5, bold=True, color="B", align="l", margin=(0.2, 0.03, 0.15, 0.03))
d.assumed(s)
d.notes(s, f"6週間を完了したのは{sum(comp)}名で、割付後の脱落率は約{round((1 - sum(comp) / sum(alloc)) * 100)}%でした。"
           "各群とも、計画書で必要とした1群64名を確保できています。")

# 5 ---------------------------------------------------------------- RQ3
s = d.slide("RQ3：WHO-5（精神的な健康）の変化")
d.linechart(s, L, 1.45, 5.0, 4.45, ["開始", "2週", "4週", "6週"],
            [("群A 記録のみ", P.WHO5["A"]), ("群B 提案（文章）", P.WHO5["B"]), ("群C 提案＋アバター", P.WHO5["C"])],
            ["8FA3B8", "blue", "B"], fmt="0.0", vmin=12, vmax=15.5, major=0.5, title="WHO-5 の平均（素点 0〜25）",
            label_last=True)
d.text(s, L, 5.95, 5.0, 0.75, "2週までは全群が記録のみ。2週の終わりに割付し、3週目から介入", size=11, color="muted",
       margin=(0, 0, 0, 0))
d.table(s, 5.65, 1.5, 3.9, [[r[0], r[1], r[3]] for r in P.ANCOVA], colw=[1.55, 1.05, 1.3], rowh=0.55, size=11.5,
        align=["l", "c", "c"], first_col_bold=True, fills={(1, 0): "BL", (1, 1): "BL", (1, 2): "BL"})
d.text(s, 5.65, 4.05, 3.9, 0.3, "共分散分析（2週の WHO-5 を共変量）", size=10.5, color="muted", margin=(0, 0, 0, 0))
d.box(s, 5.65, 4.45, 3.9, 2.3, fill="AL", radius=0.12)
d.text(s, 5.8, 4.5, 3.6, 2.2, [
    dict(t="主要な比較は有意差なし", size=14, bold=True, color="A", after=4),
    dict(t="群Cは記録のみの群Aより +1.7 点（探索的）", bullet=True, bcolor="A"),
    dict(t="群C−群B の差 +0.9 は効果量 d ≈ 0.2（小）。検出力が足りなかった可能性", bullet=True, bcolor="A"),
], size=12, margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "RQ3の主要な結果です。WHO-5は群Cで開始時の13.1から6週の14.7へ上がりました。"
           "ただし、事前に決めた主要な比較、群C対群Bと群B対群Aは、Holm法で補正すると有意差はありませんでした。"
           "探索的に見ると群Cは群Aより1.7点高く、群C対群Bの差は効果量で0.2程度と小さいため、検出力が足りなかった可能性があります。")

# 6 ---------------------------------------------------------------- RQ2
s = d.slide("RQ2：選んだ提案を実行できた割合")
d.linechart(s, L, 1.45, 5.6, 4.45, ["3週", "4週", "5週", "6週"],
            [("群B 提案（文章）", P.EXEC["B"]), ("群C 提案＋アバター", P.EXEC["C"])], ["blue", "B"], fmt="0",
            vmin=30, vmax=70, major=10, title="週ごとの実行率（%）", labels=True)
d.box(s, 6.25, 1.5, 3.3, 2.15, fill="BL", radius=0.12)
d.text(s, 6.4, 1.55, 3.0, 2.05, [
    dict(t=f"オッズ比 {P.EXEC_OR['or_']}", size=26, bold=True, color="B", after=2),
    dict(t=f"95%信頼区間 {P.EXEC_OR['lo']}〜{P.EXEC_OR['hi']}、p = {P.EXEC_OR['p']}", size=12, color="text", after=2),
    dict(t="ロジスティック混合モデル（群×週）", size=11, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.card(s, 6.25, 3.85, 3.3, 2.9, "読み取れること", [
    dict(t="両群とも週を追うごとに下がる（交互作用は有意でない）", bullet=True),
    dict(t="群Cは下がり方がゆるやかで、6週でも半分以上が実行", bullet=True),
    dict(t="同じ提案でも、見せ方で実行が変わる", bullet=True, bcolor="pink"),
], icon="chart", color="navy", bsize=12.5)
d.assumed(s)
d.notes(s, f"RQ2の結果です。選んだ提案を実行できた割合は、4週間を通して群Cが群Bを上回り、オッズ比は{P.EXEC_OR['or_']}でした。"
           "両群とも週を追うごとに下がりますが、群Cは下がり方がゆるやかでした。同じ提案でも、見せ方で実行が変わることが示されました。")

# 7 ---------------------------------------------------------------- RQ1
s = d.slide("RQ1：個人補正で予測はどれだけ当たったか")
d.bar(s, L, 1.45, 5.3, 4.4, ["充実", "推し疲れ"],
      [("全体の傾向のみ", [P.MAE["wb"][0], P.MAE["bo"][0]]), ("個人補正後（ツイン）", [P.MAE["wb"][1], P.MAE["bo"][1]])],
      ["8FA3B8", "B"], fmt="0.00", vmin=0, vmax=1.0, major=0.2, title="6週時点の平均絶対誤差（5段階）", gap=80, overlap=-10)
for i, (v, lab) in enumerate([(f"{P.COVER['wb']}%", "充実：80%区間に入った割合"), (f"{P.COVER['bo']}%", "推し疲れ：80%区間に入った割合")]):
    y = 1.5 + i * 1.45
    d.box(s, 6.0, y, 3.55, 1.3, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, 6.0, y + 0.05, 3.55, 0.8, v, size=28, bold=True, color="navy", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 6.0, y + 0.85, 3.55, 0.35, lab, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
d.box(s, 6.0, 4.45, 3.55, 2.3, fill="sky", radius=0.12)
d.text(s, 6.15, 4.5, 3.25, 2.2, [
    dict(t="区間はほぼ「正直」", size=14, bold=True, color="navy", after=4),
    dict(t="80%区間に入った割合が80%に近い → ゆらぎアバターが示す幅は、実際の外れ方とおおむね一致", size=12, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "RQ1の結果です。6週時点の予測と実測のずれは、個人補正によって充実で0.68から0.49、推し疲れで0.84から0.62に減りました。"
           "また、80%予測区間に実測が入った割合は76〜78%で、区間がおおむね正直だったといえます。")

# 8 ---------------------------------------------------------------- secondary
s = d.slide("副次評価：疲れの中身と楽しさ")
d.bar(s, L, 1.45, 6.0, 4.4, P.FACETS,
      [("群A", P.FACET_CHANGE["A"]), ("群B", P.FACET_CHANGE["B"]), ("群C", P.FACET_CHANGE["C"])],
      ["8FA3B8", "blue", "B"], fmt="+0.00;-0.00;0.00", vmin=-0.4, vmax=0.1, major=0.1,
      title="2週 → 6週の変化（マイナス＝疲れが減った）", gap=60, overlap=-5, labels=False, cat_low=True)
d.text(s, L, 5.9, 6.0, 0.8, "睡眠と出費の疲れが群Cで大きく減った。比較（SNS での他のファンとの比較）はどの群も変わらない",
       size=12, color="text", margin=(0, 0, 0, 0))
d.box(s, 6.7, 1.5, 2.85, 2.6, fill="BL", radius=0.12)
d.text(s, 6.85, 1.55, 2.55, 2.5, [
    dict(t="楽しさは下がらなかった", size=15, bold=True, color="B", after=6),
    dict(t=f"群A {P.JOY['A'][0]} → {P.JOY['A'][1]}", size=13, after=2),
    dict(t=f"群B {P.JOY['B'][0]} → {P.JOY['B'][1]}", size=13, after=2),
    dict(t=f"群C {P.JOY['C'][0]} → {P.JOY['C'][1]}", size=13, bold=True, color="B"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, 6.7, 4.3, 2.85, 2.45, fill="panel", radius=0.12)
d.text(s, 6.85, 4.35, 2.55, 2.35, [
    dict(t="「組み替える」提案の手応え", size=13.5, bold=True, color="navy", after=4),
    dict(t="疲れは減り、楽しさは保たれた。一律に減らす支援では得にくい結果", size=12, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "副次評価です。推し疲れの中身では、睡眠と出費の疲れが群Cで大きく減りました。一方で、他のファンとの比較による疲れはどの群も変わりませんでした。"
           "推し活の楽しさは3群とも下がっておらず、組み替える提案のねらいどおりの結果です。")

# 9 ---------------------------------------------------------------- logging + avatar evaluation
s = d.slide("記録の続き方とアバターの評価")
d.linechart(s, L, 1.45, 5.3, 4.45, ["1週", "2週", "3週", "4週", "5週", "6週"],
            [("群A", P.LOG_WEEK["A"]), ("群B", P.LOG_WEEK["B"]), ("群C", P.LOG_WEEK["C"])], ["8FA3B8", "blue", "B"],
            fmt="0", vmin=60, vmax=100, major=10, title="週ごとの記録率（%）", label_last=True)
d.text(s, L, 5.95, 5.3, 0.75, "3週目（介入開始）から差が開く。群Cは「未来の解像度」が記録の動機になった可能性（探索的）",
       size=11.5, color="muted", margin=(0, 0, 0, 0))
E = P.AVATAR_EVAL
evals = [(f"{E['similar']}", "似ている度（群C・5段階）"), (f"{E['continuity_C']} vs {E['continuity_B']}", "未来の自分とのつながり（C vs B・7段階）"),
         (f"{E['anxiety_C']} vs {E['anxiety_B']}", "予測を見た後の不安（C vs B・5段階）"), (f"{E['sus']['C']}", "SUS（群C）")]
for i, (v, lab) in enumerate(evals):
    y = 1.5 + i * 1.32
    d.box(s, 6.0, y, 3.55, 1.18, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, 6.0, y + 0.03, 3.55, 0.72, v, size=22, bold=True, color="B" if i != 2 else "navy", align="c", anchor="m",
           margin=(0, 0, 0, 0))
    d.text(s, 6.0, y + 0.75, 3.55, 0.35, lab, size=11, color="muted", align="c", margin=(0, 0, 0, 0))
d.assumed(s)
d.notes(s, "記録の続き方を見ると、介入が始まった3週目から群Cの記録率が高く保たれていました。未来の解像度が記録の動機になった可能性がありますが、探索的な結果です。"
           "アバターの評価では、似ている度が3.7、未来の自分とのつながりは群Cが群Bより高く、予測を見た後の不安は群Bと同程度で、不安を高めてはいませんでした。")

# 10 --------------------------------------------------------------- quotes
s = d.slide("自由記述から")
for i, (g, q) in enumerate(P.QUOTES):
    x = L + (i % 2) * 4.65
    y = 1.5 + (i // 2) * 2.0
    neg = i == 3
    d.box(s, x, y, 4.45, 1.8, fill="AL" if neg else ("BL" if g == "群C" else "sky"), radius=0.14)
    d.pill(s, x + 0.2, y + 0.18, 0.8, 0.3, g, fill="A" if neg else ("B" if g == "群C" else "blue"), size=11)
    d.text(s, x + 0.2, y + 0.58, 4.05, 1.12, f"「{q}」", size=13.5, color="text", margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.6, R - L, 1.15, fill="panel", radius=0.12)
d.icon(s, "comments", L + 0.2, 5.85, 0.65, bg="navy")
d.text(s, L + 1.1, 5.65, R - L - 1.3, 1.05, [
    dict(t="「減らせと言われない」安心感と、「未来がくっきりする」楽しさが続ける理由に", size=14, bold=True, color="navy", after=3),
    dict(t="一方で、予測が外れ続けると信頼が下がる → 答え合わせの見せ方は今後の課題", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "記述は想定例")
d.notes(s, "自由記述からは、減らせと言われない安心感と、未来がくっきりしていく楽しさが続ける理由になっていたことがうかがえます。"
           "一方で、予測が外れ続けると信頼が下がるという声もあり、答え合わせの見せ方は今後の課題です。")

# 11 --------------------------------------------------------------- discussion
s = d.slide("考察（暫定）")
pts = [("見せ方で行動は変わる（RQ2）", "同じ提案でも、自分に似たアバターで将来の見込みを見ると実行が増えた", "B", "check"),
       ("幸福度への効果は小さい（RQ3）", "6週間は習慣が定着する前（Lally et al., 2010：中央値66日）。効果が出るには期間が短い可能性", "A", "hourglass"),
       ("不確かさを見せても不安は増えない", "区間がおおむね正直で、不安も群Bと同程度。「ゆらぎ」は安全に使える見込み", "blue", "shield")]
for i, (t, b, col, ic) in enumerate(pts):
    y = 1.5 + i * 1.5
    d.box(s, L, y, R - L, 1.35, fill="white", line="line", radius=0.12, shadow=True)
    d.icon(s, ic, L + 0.25, y + 0.3, 0.75, bg=col)
    d.text(s, L + 1.25, y + 0.08, R - L - 1.45, 1.2, [dict(t=t, size=15.5, bold=True, color="navy", after=3),
                                                      dict(t=b, size=12.5, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 6.05, R - L, 0.7, fill="pinkL", radius=0.1,
      text="注意：実行した人ほど WHO-5 が高いかは、実行を本人が選ぶため偏りがある。主な結論は無作為割付の比較から導く",
      size=12, bold=True, color="pink", align="l", margin=(0.2, 0.03, 0.15, 0.03))
d.notes(s, "暫定的な考察です。1つ目は、同じ提案でも見せ方で行動が変わったこと。2つ目は、幸福度への効果は小さく、6週間は習慣の定着には短い可能性があること。"
           "3つ目は、不確かさを見せても不安は増えなかったことです。実行した人ほど幸福度が高いかという分析は偏りがあるので、主な結論には使いません。")

# 12 --------------------------------------------------------------- thesis plan
s = d.slide("修士論文の章立てと執筆スケジュール")
chap = [("1章 序論", "背景・目的・RQ", "12/21–12/25"), ("2章 関連研究", "PI・行動変容・アバター・推し活", "12/26–12/30"),
        ("3章 予備調査", "215名の調査とパス解析", "1/4–1/7"), ("4章 システム", "OshiFit（ツイン・提案・ゆらぎ）", "1/8–1/12"),
        ("5章 実験", "6週間・3群の比較実験と結果", "1/13–1/18"), ("6章 考察", "RQごとの考察・限界", "1/19–1/22"),
        ("7章 結論", "まとめと展望", "1/23")]
d.table(s, L, 1.5, 5.6, [["章", "内容", "執筆期間"]] + [list(c) for c in chap], colw=[1.6, 2.6, 1.4], rowh=0.55,
        size=12, align=["l", "l", "c"], first_col_bold=True)
mil = [("12/25", "1章を先生に提出"), ("1/12", "4章まで提出"), ("1/24–27", "全体の確認・修正"), ("1/29", "修論提出"),
       ("2/17", "公聴会")]
d.text(s, 6.3, 1.5, 3.25, 0.4, "節目", size=15, bold=True, color="navy", margin=(0, 0, 0, 0))
for i, (dt, t) in enumerate(mil):
    y = 1.95 + i * 0.72
    d.pill(s, 6.3, y + 0.1, 1.05, 0.34, dt, fill="pink" if dt in ("1/29", "2/17") else "blue", size=11)
    d.text(s, 7.45, y, 2.1, 0.56, t, size=13, color="text", anchor="m", margin=(0, 0, 0, 0))
d.box(s, 6.3, 5.65, 3.25, 1.1, fill="panel", radius=0.1,
      text="3章は IEVC・関西支部大会の原稿を、4章は CHIIR の原稿を下敷きにする", size=11.5, color="navy", bold=True,
      align="l", margin=(0.15, 0.03, 0.1, 0.03))
d.notes(s, "修論は7章構成の予定です。3章の予備調査はIEVCと関西支部大会の原稿を、4章のシステムはCHIIRの原稿を下敷きにして、執筆を早めます。"
           "1/12までに4章まで、1/24から全体の確認をして、1/29に提出します。")

# 13 --------------------------------------------------------------- consult
s = d.slide("相談事項と次の予定")
d.box(s, L, 1.5, R - L, 3.9, fill="pinkL", radius=0.12)
d.icon(s, "comments", L + 0.2, 1.65, 0.55, bg="pink")
d.text(s, L + 0.9, 1.65, 6.0, 0.55, "相談したいこと", size=16, bold=True, color="pink", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L + 0.25, 2.35, R - L - 0.5, 3.0, [
    dict(t="主要な比較で有意差が出なかった RQ3 の書き方", size=14, bold=True, color="navy", after=2),
    dict(t="「傾向あり」とは書かず、効果量と信頼区間で報告し、必要人数の再計算を今後の課題にする案でよいか", size=12.5, color="text", after=9),
    dict(t="記録率の群差（群C 86% / 群A 81%）による欠測の偏り", size=14, bold=True, color="navy", after=2),
    dict(t="多重代入の感度分析を本文の表に並べ、結論が変わらないことを示す", size=12.5, color="text", after=9),
    dict(t="CHIIR 2027 採択（12/15 通知）後の作業と IEEE Access への投稿時期", size=14, bold=True, color="navy", after=2),
    dict(t="カメラレディは1月中旬。修論提出後の2月に IEEE Access の原稿をまとめる", size=12.5, color="text"),
], margin=(0, 0, 0, 0))
d.box(s, L, 5.6, R - L, 1.15, fill="panel", radius=0.1)
d.icon(s, "eye", L + 0.2, 5.87, 0.6, bg="blue")
d.text(s, L + 1.0, 5.63, R - L - 1.2, 1.1, [
    dict(t="次回（1月）に見せるもの", size=14, bold=True, color="navy", after=3),
    dict(t="感度分析を含めた確定値／修論の1〜4章の草稿／公聴会スライドの骨子", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "採否・数値は想定")
d.notes(s, "相談したいのは3点です。有意差が出なかったRQ3の書き方、記録率の群差による欠測の偏りの扱い、そしてCHIIR採択後の作業とIEEE Accessへの投稿時期です。"
           "次回は確定値と修論の草稿を見せる予定です。")

d.save(OUT)
print("saved", OUT, d.n, "slides")
