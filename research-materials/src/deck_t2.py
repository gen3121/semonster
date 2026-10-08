"""発表② 2027/03 — ACM CHIIR 2027 (English talk, ~12 min). Notes carry the English script and a Japanese translation."""
from pptx.enum.shapes import MSO_SHAPE
from oshideck import Deck, L, R
from common import architecture
import projected as P

OUT = "発表②_202703_CHIIR2027_英語発表.pptx"
d = Deck("2027/3/8", title="OshiFit — ACM CHIIR 2027", author="Gen Imai")
PROJ = "想定値 (projected) — 要差し替え"


def notes(s, en, ja):
    d.notes(s, "[Script]\n" + en + "\n\n[訳]\n" + ja)


# 1 ---------------------------------------------------------------- title
s = d.title_slide("ACM CHIIR 2027 · Short Paper", "OshiFit: Possible-Selves Avatars for\nUncertainty-Aware Behavior Change in Fan Activities",
                  "Gen Imai, Sho Ooi", "Osaka Institute of Technology\nMedia Interaction Laboratory", art="ghost_d14",
                  title_size=21, subtitle=[dict(t="Show the future honestly —", size=18),
                                           dict(t="and let people choose how to love what they love", size=15, bold=False)])
notes(s, "Hi, I'm Gen Imai from Osaka Institute of Technology. Today I'll present OshiFit, a system that shows people possible futures of their fan activities, honestly including uncertainty, to support behavior change without taking the joy away.",
      "大阪工業大学の今井元です。推し活の将来の見込みを、不確かさも含めて正直に見せることで、楽しさを奪わずに行動変容を支えるシステムOshiFitについて発表します。")

# 2 ---------------------------------------------------------------- oshi-katsu
s = d.slide("Oshi-katsu: a booming fan culture")
stats = [("¥3.8T", "estimated market for fan activities in Japan (NRI, 2025)", "pink"),
         ("1 in 3", "people in Japan engage in oshi-katsu", "blue"),
         ("Well-being", "fan activities can foster purpose and mental health", "B")]
for i, (v, lab, col) in enumerate(stats):
    x = L + i * 3.07
    d.box(s, x, 1.55, 2.95, 2.35, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x + 0.1, 1.68, 2.75, 1.0, v, size=32 if i < 2 else 26, bold=True, color=col, align="c", anchor="m",
           margin=(0, 0, 0, 0))
    d.text(s, x + 0.2, 2.75, 2.55, 1.05, lab, size=13, color="text", align="c", margin=(0, 0, 0, 0))
d.box(s, L, 4.1, R - L, 2.65, fill="navy", radius=0.12)
d.text(s, L + 0.3, 4.2, 4.6, 2.45, [
    dict(t="…but also “fandom fatigue”", size=18, bold=True, color="white", after=8),
    dict(t="Overspending money and time", bullet=True, bcolor="pink"),
    dict(t="Comparing yourself with other fans on social media", bullet=True, bcolor="pink"),
    dict(t="Burnout from a sense of obligation", bullet=True, bcolor="pink"),
], size=14, color="white", after=4, margin=(0, 0, 0, 0), anchor="m")
for i, im in enumerate(["av_money", "av_compare", "av_duty"]):
    d.pic(s, im, 5.2 + i * 1.45, 4.45, h=1.95)
notes(s, "Oshi-katsu means passionately supporting your favorite idol or character. It is now a huge culture in Japan: a market estimated at 3.8 trillion yen, with about one in three people involved. It can bring purpose and better mental health. But there is a dark side called fandom fatigue: overspending, comparing yourself with other fans, and burnout from obligation.",
      "推し活は、推しのアイドルやキャラクターを熱心に応援することです。市場規模は約3.8兆円、国民の約3人に1人が行う文化になり、生きがいや精神的健康にもつながります。一方で、使いすぎ、他のファンとの比較、義務感による燃え尽きといった「推し疲れ」が問題になっています。")

# 3 ---------------------------------------------------------------- survey
s = d.slide("Preliminary survey (N = 215)")
for i, (v, lab, col) in enumerate([("~80%", "oshi = reason to live", "B"), ("~40%", "worry about money", "A"), ("~30%", "lose sleep", "purple")]):
    x = L + i * 1.52
    d.box(s, x, 1.55, 1.42, 1.5, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x, 1.62, 1.42, 0.8, v, size=22, bold=True, color=col, align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, x + 0.05, 2.42, 1.32, 0.55, lab, size=11, color="text", align="c", margin=(0, 0, 0, 0))
d.bar(s, L, 3.2, 4.45, 3.55, ["Frequency\n→ Fulfil", "Immersion\n→ Fulfil", "Frequency\n→ Fatigue", "Immersion\n→ Fatigue"],
      [("β", [0.43, 0.20, 0.29, 0.23])], ["B"], fmt="0.00", vmin=0, vmax=0.5, major=0.1,
      point_colors=["B", "B", "A", "A"], title="Path coefficients (personality |β| ≤ .21)", gap=55)
d.box(s, 5.15, 1.55, 4.4, 2.35, fill="AL", radius=0.12)
d.text(s, 5.35, 1.6, 4.0, 2.25, [
    dict(t="27%", size=34, bold=True, color="A", after=0),
    dict(t="are high in BOTH fulfilment and fatigue", size=14, bold=True, color="navy", after=3),
    dict(t="The same activities drive joy and exhaustion", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.bar(s, 5.15, 4.05, 4.4, 2.7, ["Want more live events", "Want more goods", "Want less social media"],
      [("share", [39, 36, 22])], ["B"], horizontal=True, fmt='0"%"', vmin=0, vmax=50, val_visible=False,
      point_colors=["B", "B", "A"], title="More people want MORE than less", gap=45)
notes(s, "We first surveyed 215 fans. About 80 percent said their oshi is their reason to live, yet 40 percent worried about money and 30 percent lost sleep. Activity frequency and immersion predicted both fulfilment and fatigue, and 27 percent were high in both. Also, more people wanted to do more, not less. So simply telling fans to cut back would take away the joy.",
      "215名の予備調査では、約8割が推しを生きがいと答える一方、約4割が出費に不安、約3割が睡眠に支障を感じていました。頻度と没入は充実と疲れの両方を予測し、両方高い人が27%いました。また、減らしたい人より増やしたい人が多く、「減らせ」という支援では楽しさを奪ってしまいます。")

# 4 ---------------------------------------------------------------- challenge
s = d.slide("The challenge: noisy forecasts")
d.box(s, L, 1.55, R - L, 1.3, fill="sky", radius=0.12)
d.text(s, L + 0.3, 1.6, R - L - 0.6, 1.2, [
    dict(t="Our forecast model explains R² = .27 of fulfilment and only R² = .11 of fatigue (±0.92 on a 5-point scale)",
         size=15, bold=True, color="navy", after=3),
    dict(t="Showing one confident “future you” would overclaim — and could cause needless anxiety", size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
moves = [("Personalize", "A Bayesian twin starts from the survey and learns from each person's daily logs", "user", "navy"),
         ("Show uncertainty", "A possible-selves avatar renders the forecast range as overlapping selves", "dice", "B"),
         ("Rebalance, not restrict", "Proposals re-allocate activities and never cut what people want more of", "scale", "pink")]
for i, (t, b, ic, col) in enumerate(moves):
    d.card(s, L + i * 3.07, 3.1, 2.95, 2.55, t, b, icon=ic, color=col, bsize=13.5)
d.box(s, L, 5.9, R - L, 0.85, fill="navy", radius=0.12,
      text="Goal: support behavior change without overclaiming — and without taking the joy away",
      size=14, bold=True, color="white", align="c")
notes(s, "This creates a design challenge. Our forecasts are noisy: R-squared is .27 for fulfilment and only .11 for fatigue. Showing a single confident future self would overclaim. We made three design moves: personalize the forecast, show the uncertainty, and rebalance rather than restrict.",
      "ここに設計上の課題があります。予測の説明率は充実で.27、疲れでは.11にとどまります。1つの確定した未来の自分を見せるのは言い過ぎです。そこで、予測の個人化、不確かさの提示、そして減らすのではなく組み替える提案、という3つの設計を行いました。")

# 5 ---------------------------------------------------------------- overview
s = d.slide("OshiFit at a glance")
architecture(d, s, y0=1.5, en=True)
notes(s, "Here is the system. Inputs are a 1-minute personality test, a 30-second daily log, and the user's own wishes. The Bayesian twin updates every night, the rebalance engine proposes three options, and the Future Mirror shows 'as is' next to 'with the proposal'. Strong distress signals pause the forecasts and show help resources.",
      "システムの全体像です。入力は1分の性格検査、毎日30秒の記録、本人の希望です。ベイズ個人ツインが毎晩更新され、リバランス提案エンジンが3案を出し、みらいミラーで「今のまま」と「提案どおり」を並べます。強いつらさが見られる場合は予測を止め、相談先を表示します。")

# 6 ---------------------------------------------------------------- possible selves
s = d.slide("Possible-selves avatar")
for i, (im, t, sub) in enumerate([("ghost_d0", "Day 0", "a blurry future"), ("ghost_d7", "Day 7", "selves converge"),
                                  ("ghost_d14", "Day 14", "a sharper you")]):
    x = L + i * 3.07
    d.box(s, x, 1.55, 2.95, 2.55, fill="BL" if i == 2 else "panel", radius=0.12)
    d.pic(s, im, x + 0.18, 1.62, w=2.6)
    d.text(s, x, 3.42, 2.95, 0.32, t, size=15, bold=True, color="B" if i == 2 else "navy", align="c", margin=(0, 0, 0, 0))
    d.text(s, x, 3.72, 2.95, 0.3, sub, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
cards = [("How", "sliders", "navy", "Draw 20 futures from the posterior, bin them into 3 states, overlay 5 selves. Opacity = likelihood"),
         ("Why", "target", "pink", "Uncertainty becomes visible, and “future-self resolution” rewards continued logging"),
         ("Grounded in", "book", "B", "Proteus effect, future-self renderings (Hershfield et al., 2011), quantile dotplots (Kay et al., 2016)")]
for i, (t, ic, col, b) in enumerate(cards):
    d.card(s, L + i * 3.07, 4.25, 2.95, 2.5, t, b, icon=ic, color=col, bsize=12.5)
notes(s, "Our key idea is the possible-selves avatar. Instead of one face, we draw 20 futures from the forecast distribution and overlay five versions of your look-alike avatar. With few logs, your future self is blurry; as you log, the selves converge and your future becomes sharper. The blur is honest about uncertainty, and the growing resolution gives a reason to keep logging.",
      "中心となるアイデアがゆらぎアバターです。1つの顔ではなく、予測分布から20通りの未来を引き、自分に似たアバターを5体重ねて描きます。記録が少ないうちは未来の自分がぼやけ、記録が増えると重なりが収束してくっきりします。ぼやけは不確かさに正直であり、解像度が上がることは記録を続ける理由になります。")

# 7 ---------------------------------------------------------------- rebalance
s = d.slide("Rebalance, not restrict")
pts = [("As is", 3.5, 3.6, "A", 15, "b"), ("① Keep-the-joy", 3.1, 3.6, "B", 13, "t"), ("② Balanced", 3.3, 3.8, "B", 13),
       ("③ Recovery-first", 2.8, 3.4, "B", 13)]
d.scatter(s, L, 1.45, 5.3, 5.3, pts, xr=(2.6, 3.8, 0.2), yr=(3.2, 4.0, 0.2), xtitle="Predicted fatigue (lower is better)",
          ytitle="Predicted fulfilment", title="Three Pareto-optimal options (example)")
d.card(s, 6.0, 1.5, 3.55, 3.2, "How options are made", [
    dict(t="98 candidates: change up to 2 of 7 activities by one step", bullet=True),
    dict(t="Drop options that cut what the user wants more of", bullet=True),
    dict(t="Keep the Pareto front; show 3 options", bullet=True),
], icon="sliders", color="navy", bsize=12.5)
d.box(s, 6.0, 4.9, 3.55, 1.85, fill="BL", radius=0.12)
d.text(s, 6.15, 4.95, 3.25, 1.75, [
    dict(t="The user chooses", size=15, bold=True, color="B", after=3),
    dict(t="…or skips the week. Autonomy is part of the design", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "予測値は例示 (example values)")
notes(s, "Proposals rebalance rather than restrict. We generate 98 candidates by nudging up to two of seven activities, drop any that cut what the user wants more of, and keep the Pareto front. The user picks one of three options, or skips the week.",
      "提案は「減らす」ではなく「組み替える」ものです。7つの活動のうち最大2つを1段階動かした98案を作り、本人が増やしたい活動を減らす案を除いて、パレート最適な案を残します。本人は3案から1つを選ぶか、その週は見送ることもできます。")

# 8 ---------------------------------------------------------------- walkthrough
s = d.slide("A week with OshiFit")
phones = [("mk_en_log", "Every day", "Log in ~30 s"), ("mk_en_propose", "Weekly", "Pick a proposal"),
          ("mk_en_mirror", "Weekly (Group C)", "Compare futures")]
for i, (im, when, t) in enumerate(phones):
    x = L + 0.1 + i * 3.1
    d.pill(s, x + 0.45, 1.5, 1.8, 0.32, when, fill="pink" if i else "blue", size=11)
    d.pic(s, im, x + 0.18, 1.9, h=3.95)
    d.text(s, x - 0.1, 5.95, 2.9, 0.4, t, size=15, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    if i < 2:
        d.arrow(s, x + 2.65, 3.7, 0.3, 0.4, fill="blue")
notes(s, "Here is a week with OshiFit. Every day you log your fan activities in about 30 seconds. Once a week you pick a proposal. In the avatar condition, you also see the Future Mirror, comparing 'as is' with 'with the proposal', including how many of 20 possible futures end up highly fatigued.",
      "OshiFitの1週間です。毎日約30秒で推し活を記録し、週に1回提案を選びます。アバター群では、みらいミラーで「今のまま」と「提案どおり」を比べ、20通りの未来のうち何通りが疲れ高めになるかも確認できます。")

# 9 ---------------------------------------------------------------- study
s = d.slide("Study: 6-week, three-arm RCT")
x0, wk = 2.3, 1.2
for w in range(6):
    d.text(s, x0 + w * wk, 1.5, wk, 0.32, f"Week {w + 1}", size=12, bold=True, color="muted", align="c", margin=(0, 0, 0, 0))
groups = [("A: Log only", "Log only", "gray", "panel", "8FA3B8"), ("B: Text proposals", "Proposals (text) + log", "blue", "sky", "blue"),
          ("C: + Avatar", "Proposals + possible-selves avatar + log", "B", "BL", "B")]
for i, (g, t, col, fill, ln) in enumerate(groups):
    y = 1.95 + i * 0.78
    d.text(s, L, y, x0 - L - 0.1, 0.62, g, size=13, bold=True, color=col, anchor="m", margin=(0, 0, 0, 0))
    d.box(s, x0, y + 0.06, 2 * wk - 0.05, 0.5, fill="E3E8EF", radius=0.08, text="Log only", size=11, bold=True,
          color="muted", align="c")
    d.box(s, x0 + 2 * wk, y + 0.06, 4 * wk, 0.5, fill=fill, line=ln, lw=1, radius=0.08, text=t, size=12, bold=True,
          color="navy", align="c")
d.line(s, x0 + 2 * wk - 0.02, 1.85, x0 + 2 * wk - 0.02, 4.35, color="pink", width=2.25, dash=True)
d.pill(s, x0 + 2 * wk - 1.1, 4.4, 2.2, 0.3, "Stratified randomization", fill="pink", size=10)
for w in (0, 2, 4, 6):
    d.box(s, x0 + w * wk - 0.1, 4.85, 0.2, 0.2, fill="navy", radius=None, shape=MSO_SHAPE.DIAMOND)
d.text(s, L, 4.78, x0 - L - 0.1, 0.35, "WHO-5", size=12, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.line(s, x0, 4.95, x0 + 6 * wk, 4.95, color="B8C2CE", width=1)
d.table(s, L, 5.35, R - L, [
    ["Measure", "Analysis"],
    ["RQ3 (primary)", "WHO-5 at week 6, ANCOVA adjusting for week 2; C vs B and B vs A with Holm correction"],
    ["RQ2 · RQ1", "Weekly follow-through (logistic mixed model) · forecast error at week 6"],
], colw=[1.7, 7.4], rowh=0.45, size=12, align=["l", "l"], first_col_bold=True)
notes(s, "We ran a six-week randomized controlled trial with three arms. Everyone logged for two weeks, then we randomized, stratified by WHO-5. Groups B and C received identical proposals; only group C saw the forecasts and the possible-selves avatar. The primary outcome was WHO-5 well-being at week six.",
      "6週間・3群の無作為化比較実験を行いました。全員が2週間記録したあと、WHO-5で層別して割り付けました。群Bと群Cの提案は同じで、群Cだけが予測とゆらぎアバターを見ます。主要評価は6週時点のWHO-5です。")

# 10 --------------------------------------------------------------- results: follow-through + forecasts
s = d.slide("Results: avatars boosted follow-through")
d.linechart(s, L, 1.45, 5.5, 4.4, ["Wk 3", "Wk 4", "Wk 5", "Wk 6"],
            [("B: Text", P.EXEC["B"]), ("C: + Avatar", P.EXEC["C"])], ["blue", "B"], fmt="0", vmin=30, vmax=70,
            major=10, title="Followed through on the chosen proposal (%)", labels=True)
d.text(s, L, 5.9, 5.5, 0.85, f"N = {sum(P.FLOW['completed'])} completed (after the paper was submitted). Same proposals in B and C.",
       size=11.5, color="muted", margin=(0, 0, 0, 0))
d.box(s, 6.15, 1.5, 3.4, 2.15, fill="BL", radius=0.12)
d.text(s, 6.3, 1.55, 3.1, 2.05, [
    dict(t=f"OR = {P.EXEC_OR['or_']}", size=28, bold=True, color="B", after=2),
    dict(t=f"95% CI {P.EXEC_OR['lo']}–{P.EXEC_OR['hi']}, p = {P.EXEC_OR['p']}", size=12.5, color="text", after=2),
    dict(t="RQ2 · C vs B", size=11, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, 6.15, 3.85, 3.4, 2.9, fill="white", line="line", radius=0.12, shadow=True)
d.text(s, 6.3, 3.9, 3.1, 2.8, [
    dict(t="Forecasts got better and stayed honest (RQ1)", size=13.5, bold=True, color="navy", after=6),
    dict(t=f"Fatigue error {P.MAE['bo'][0]} → {P.MAE['bo'][1]} after personalization", bullet=True),
    dict(t=f"{P.COVER['bo']}% of outcomes fell inside the 80% interval", bullet=True),
], size=12.5, margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, PROJ)
notes(s, f"Since submitting the paper, we completed the study with {sum(P.FLOW['completed'])} participants. Group C followed through on proposals more often than group B in every week, with an odds ratio of {P.EXEC_OR['or_']}. The proposals were identical, so the difference comes from how the future was shown. Personalization also reduced forecast error, and the 80 percent intervals were roughly honest.",
      f"論文投稿後、{sum(P.FLOW['completed'])}名で実験を完了しました。群Cはすべての週で群Bより提案を多く実行し、オッズ比は{P.EXEC_OR['or_']}でした。提案は同じなので、差は未来の見せ方によるものです。個人補正で予測誤差も減り、80%区間もおおむね正直でした。")

# 11 --------------------------------------------------------------- results: well-being
s = d.slide("Results: well-being, joy, and logging")
d.linechart(s, L, 1.45, 4.5, 4.0, ["Wk 0", "Wk 2", "Wk 4", "Wk 6"],
            [("A", P.WHO5["A"]), ("B", P.WHO5["B"]), ("C", P.WHO5["C"])], ["8FA3B8", "blue", "B"], fmt="0.0",
            vmin=12, vmax=15.5, major=0.5, title="WHO-5 (raw 0–25)", label_last=True)
d.linechart(s, 5.05, 1.45, 4.5, 4.0, ["1", "2", "3", "4", "5", "6"],
            [("A", P.LOG_WEEK["A"]), ("B", P.LOG_WEEK["B"]), ("C", P.LOG_WEEK["C"])], ["8FA3B8", "blue", "B"],
            fmt="0", vmin=60, vmax=100, major=10, title="Weekly logging rate (%)", label_last=True)
facts = [("RQ3: small effect", "C − B = +0.9 (n.s. after Holm); C − A = +1.7 (exploratory)", "A"),
         ("Joy was kept", "Enjoyment stayed at 3.8–3.9 in all groups", "B"),
         ("People kept logging", "Group C: 83% in week 6 (exploratory)", "navy")]
for i, (t, b, col) in enumerate(facts):
    x = L + i * 3.07
    d.box(s, x, 5.6, 2.95, 1.15, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x + 0.15, 5.63, 2.65, 1.1, [dict(t=t, size=13, bold=True, color=col, after=2),
                                          dict(t=b, size=11, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, PROJ)
notes(s, "For well-being, the effect was small. WHO-5 rose most in group C, but the primary comparisons were not significant after Holm correction. Importantly, enjoyment did not drop in any group, and group C kept logging at higher rates, which suggests that future-self resolution works as a motivator, although this is exploratory.",
      "ウェルビーイングへの効果は小さいものでした。WHO-5は群Cで最も上がりましたが、主要な比較はHolm補正後に有意ではありませんでした。重要なのは、どの群でも楽しさが下がらなかったこと、そして群Cの記録率が高く保たれたことです。未来の解像度が動機になった可能性がありますが、探索的な結果です。")

# 12 --------------------------------------------------------------- implications
s = d.slide("Design implications")
imp = [("Make uncertainty a feature", "Render forecast ranges as possible selves; let resolution grow with the user's own data", "dice", "B"),
       ("Rebalance, don't restrict", "In domains without one right answer, keep what people love and move the rest", "scale", "pink"),
       ("Same advice, better framing", "How a future is shown can change follow-through even when the advice is identical", "mirror", "navy")]
for i, (t, b, ic, col) in enumerate(imp):
    y = 1.55 + i * 1.72
    d.box(s, L, y, R - L, 1.55, fill="white", line="line", radius=0.12, shadow=True)
    d.icon(s, ic, L + 0.25, y + 0.38, 0.8, bg=col)
    d.text(s, L + 1.3, y + 0.1, R - L - 1.5, 1.35, [dict(t=t, size=17, bold=True, color="navy", after=4),
                                                    dict(t=b, size=13.5, color="text")], margin=(0, 0, 0, 0), anchor="m")
notes(s, "Three implications for designers. First, make uncertainty a feature, not a footnote. Second, in domains without one right answer, rebalance rather than restrict. Third, the same advice framed through a possible future self can change what people actually do.",
      "設計者への示唆は3つです。1つ目は、不確かさを注釈ではなく機能にすること。2つ目は、正解が1つではない領域では、制限ではなく組み替えること。3つ目は、同じ助言でも未来の自分を通して見せると実際の行動が変わることです。")

# 13 --------------------------------------------------------------- limitations
s = d.slide("Limitations and next steps")
lims = [("Short and small", "6 weeks, ~65 per arm; habits take longer (median 66 days; Lally et al., 2010)", "hourglass"),
        ("Bundled features", "Group C saw both avatars and dot counts; we cannot yet separate them", "layers"),
        ("Self-report", "Logs and WHO-5 are self-reported; physiological signals could complement them", "pen"),
        ("Sample", "Mostly university students and women in Japan", "globe")]
for i, (t, b, ic) in enumerate(lims):
    x = L + (i % 2) * 4.65
    y = 1.55 + (i // 2) * 1.85
    d.card(s, x, y, 4.45, 1.7, t, b, icon=ic, color="A", bsize=12.5)
d.box(s, L, 5.35, R - L, 1.4, fill="sky", radius=0.12)
d.text(s, L + 0.3, 5.4, R - L - 0.6, 1.3, [
    dict(t="Next: longer follow-up, factorial study of avatar vs. dots, and other domains (social media, gaming)", size=14.5, bold=True, color="navy", after=3),
    dict(t="Toward a sustainable fan economy with platform partners", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
notes(s, "There are limitations: the study was short and modest in size, the avatar and dot displays were bundled, outcomes were self-reported, and the sample was mostly students. Next, we plan a longer follow-up and a factorial study that separates avatars from dot counts.",
      "限界として、期間と規模が小さいこと、アバターと点の表示を同時に見せたこと、自己報告であること、参加者が学生中心であることが挙げられます。今後は長期の追跡と、アバターと点の表示を切り分ける実験を計画しています。")

# 14 --------------------------------------------------------------- thanks
s = d.slide("Thank you!")
d.box(s, L, 1.55, R - L, 5.2, fill="navy", radius=0.14)
d.pic(s, "ghost_d14", L + 0.2, 2.0, w=4.0)
d.text(s, L + 4.4, 1.8, R - L - 4.7, 4.7, [
    dict(t="OshiFit", size=30, bold=True, color="white", after=4),
    dict(t="Possible-selves avatars for uncertainty-aware behavior change", size=14, color="sky2", after=14),
    dict(t="Show the future honestly", bullet=True, bcolor="pink"),
    dict(t="Rebalance, don't restrict", bullet=True, bcolor="pink"),
    dict(t="Let people choose", bullet=True, bcolor="pink", after=14),
    dict(t="Gen Imai · Osaka Institute of Technology", size=12.5, color="sky2"),
], size=15, color="white", after=6, margin=(0, 0, 0, 0), anchor="m")
notes(s, "To summarize: show the future honestly, rebalance rather than restrict, and let people choose. Thank you, and I'm happy to take questions.",
      "まとめると、未来を正直に見せること、制限ではなく組み替えること、そして本人に選んでもらうことです。ご清聴ありがとうございました。質問をお受けします。")

d.save(OUT)
print("saved", OUT, d.n, "slides")
