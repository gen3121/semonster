"""輪講② 2026/11/13 — Kay et al. (2016) When(ish) is My Bus? 日常の予測の不確かさをスマホでどう見せるか."""
import math
from statistics import NormalDist
from pptx.util import Inches, Emu
from oshideck import Deck, L, R, rgb

OUT = "輪講②_20261113_Kay2016_予測の不確かさの見せ方.pptx"
d = Deck("2026/11/13", title="輪講 2026/11/13")


def density(s, x0, y0, w, h, mu, sd, lo, hi, color="blue", fill="sky2"):
    """Native freeform density curve (area) inside the box (x0, y0, w, h)."""
    n = 60
    pk = NormalDist(mu, sd).pdf(mu)
    pts = []
    for i in range(n + 1):
        v = lo + (hi - lo) * i / n
        px = x0 + w * i / n
        py = y0 + h - h * 0.92 * NormalDist(mu, sd).pdf(v) / pk
        pts.append((Inches(px), Inches(py)))
    fb = s.shapes.build_freeform(Inches(x0), Inches(y0 + h), scale=1.0)
    fb.add_line_segments(pts + [(Inches(x0 + w), Inches(y0 + h))], close=True)
    shp = fb.convert_to_shape()
    shp.fill.solid()
    shp.fill.fore_color.rgb = rgb(fill)
    shp.line.color.rgb = rgb(color)
    shp.line.width = Emu(19050)
    shp.shadow.inherit = False
    return shp


def dotplot(s, x0, base, unit, mu, sd, lo, n=20, dot=0.24, binw=1.0, colors=None, thr=None):
    """Quantile dotplot: n quantiles, stacked per bin. Returns list of (value, x, y)."""
    qs = [NormalDist(mu, sd).inv_cdf((i + 0.5) / n) for i in range(n)]
    stacks = {}
    out = []
    for q in qs:
        b = math.floor((q - lo) / binw)
        k = stacks.get(b, 0)
        stacks[b] = k + 1
        cx = x0 + (b + 0.5) * binw * unit - dot / 2
        cy = base - (k + 1) * (dot + 0.03)
        col = colors[0] if (thr is None or q < thr) else colors[1]
        d.circle(s, cx, cy, dot, col)
        out.append((q, cx, cy))
    return out


def axis(s, x0, y, w, lo, hi, step, unit_label, unit):
    d.line(s, x0, y, x0 + w, y, color="8FA3B8", width=1.25)
    v = lo
    while v <= hi + 1e-9:
        x = x0 + (v - lo) * unit
        d.line(s, x, y, x, y + 0.06, color="8FA3B8", width=1)
        d.text(s, x - 0.3, y + 0.06, 0.6, 0.25, f"{v:g}", size=10, color="muted", align="c", margin=(0, 0, 0, 0))
        v += step
    d.text(s, x0 + w - 1.5, y + 0.3, 1.5, 0.25, unit_label, size=10, color="muted", align="r", margin=(0, 0, 0, 0))


# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　輪講", "輪講 2026/11/13", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=[dict(t="When(ish) is My Bus? User-centered Visualizations of Uncertainty in Everyday, Mobile Predictive Systems", size=16),
                            dict(t="Kay, Kola, Hullman & Munson, CHI 2016", size=13, bold=False)],
                  art="ghost_d7")
d.notes(s, "今回は、スマホでバスの到着予測の不確かさをどう見せるかを扱ったKayらのCHI 2016の論文を紹介します。"
           "OshiFitの予測の幅の見せ方、特にゆらぎアバターと「20人中何人」の表示の根拠として選びました。")

# 2 ---------------------------------------------------------------- bib
s = d.slide("論文情報と選んだ理由")
d.box(s, L, 1.55, 4.55, 5.2, fill="panel", radius=0.12)
d.icon(s, "book", L + 0.2, 1.72, 0.55, bg="navy")
d.text(s, L + 0.9, 1.72, 3.5, 0.55, "論文情報", size=16, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L + 0.22, 2.45, 4.15, 4.2, [
    dict(t="タイトル", size=11, color="muted", after=0),
    dict(t="When(ish) is My Bus? User-centered Visualizations of Uncertainty in Everyday, Mobile Predictive Systems", size=13, bold=True, after=8),
    dict(t="著者", size=11, color="muted", after=0),
    dict(t="Matthew Kay, Tara Kola, Jessica R. Hullman, Sean A. Munson", size=12, after=8),
    dict(t="掲載", size=11, color="muted", after=0),
    dict(t="Proceedings of CHI 2016, pp. 5092–5103", size=12, after=8),
    dict(t="DOI", size=11, color="muted", after=0),
    dict(t="10.1145/2858036.2858558", size=12),
], margin=(0, 0, 0, 0))
reasons = [
    ("OshiFit の予測は誤差が大きい", "推し疲れは ±0.92（5段階）。幅をどう見せるかが設計の中心", "dice", "pink"),
    ("問題設定がほぼ同じ", "スマホ × 一般の利用者 × 日常の予測", "mobile", "blue"),
    ("操作確認で出た課題", "「ぼやけの意味が分からない」(2/6名) を解くヒント", "warn", "A"),
]
for i, (t, b, ic, col) in enumerate(reasons):
    d.card(s, 5.2, 1.55 + i * 1.75, 4.35, 1.6, t, b, icon=ic, color=col, bsize=13)
d.notes(s, "論文はCHI 2016のものです。選んだ理由は、OshiFitの予測は誤差が大きく幅の見せ方が重要であること、"
           "スマホで一般の人に日常の予測を見せるという問題設定が同じであること、そして操作確認で出た「ぼやけの意味が分からない」という課題を解くヒントになるからです。")

# 3 ---------------------------------------------------------------- background
s = d.slide("背景：日常の予測は「外れる」もの")
d.box(s, L, 1.55, 4.4, 2.6, fill="white", line="line", radius=0.12, shadow=True)
d.icon(s, "bus", L + 0.2, 1.72, 0.6, bg="navy")
d.text(s, L + 0.95, 1.72, 3.3, 0.6, "「あと5分」の表示", size=15, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L + 0.2, 2.45, 4.0, 1.6, [
    dict(t="実際には3分で来ることも、9分かかることもある", bullet=True),
    dict(t="点の予測だけだと、外れたときに「当てにならない」と感じる", bullet=True),
], size=13, after=6, margin=(0, 0, 0, 0))
d.box(s, 5.15, 1.55, 4.4, 2.6, fill="white", line="line", radius=0.12, shadow=True)
d.icon(s, "chart", 5.35, 1.72, 0.6, bg="A")
d.text(s, 6.1, 1.72, 3.3, 0.6, "分布の図は読みにくい", size=15, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.35, 2.45, 4.0, 1.6, [
    dict(t="密度の山から「◯分以内に来る確率」を読むのは難しい", bullet=True),
    dict(t="スマホの小さな画面では、なおさら", bullet=True),
], size=13, after=6, margin=(0, 0, 0, 0))
d.box(s, L, 4.4, R - L, 2.35, fill="navy", radius=0.12)
d.text(s, L + 0.3, 4.5, 5.3, 2.15, [
    dict(t="手がかり：頻度での表現", size=13, color="sky2", after=2),
    dict(t="「30%」より「10回中3回」の方が分かりやすい", size=18, bold=True, color="white", after=6),
    dict(t="確率を頻度で示すと推論が正確になる（Gigerenzer & Hoffrage, 1995）", size=12.5, color="white"),
], margin=(0, 0, 0, 0), anchor="m")
for i in range(10):
    d.circle(s, 6.05 + (i % 5) * 0.62, 4.85 + (i // 5) * 0.75, 0.5, "pink" if i < 3 else "4F6E8E")
d.notes(s, "バスの到着予測のような日常の予測は外れるものです。点の予測だけを見せると、外れたときに信頼を失います。"
           "一方で、分布の図は一般の人には読みにくい。手がかりになるのが、確率を頻度で示すと分かりやすいという知見です。")

# 4 ---------------------------------------------------------------- approach
s = d.slide("研究の進め方")
steps = [("文献調査", "不確かさの可視化と\n確率の理解の研究", "book"),
         ("利用者アンケート", "乗換アプリ OneBusAway の\n利用者が予測をどう使うか", "users"),
         ("反復的なデザイン", "スマホ向けの候補を\n複数つくって改良", "pen"),
         ("統制実験", "候補の表示で\n確率を読み取ってもらう", "flask")]
for i, (t, b, ic) in enumerate(steps):
    x = L + i * 2.32
    d.box(s, x, 1.6, 2.12, 2.9, fill="sky" if i < 3 else "navy", radius=0.12)
    d.icon(s, ic, x + 0.71, 1.8, 0.7, bg="navy" if i < 3 else "pink")
    d.text(s, x + 0.1, 2.65, 1.92, 0.45, f"{i + 1}. {t}", size=14, bold=True, color="navy" if i < 3 else "white",
           align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.1, 3.15, 1.92, 1.2, b, size=11.5, color="text" if i < 3 else "white", align="c",
           margin=(0, 0, 0, 0))
    if i < 3:
        d.arrow(s, x + 2.14, 2.85, 0.16, 0.36, fill="blue")
d.card(s, L, 4.75, R - L, 2.0, "アンケートから見えた利用の仕方（要点）", [
    dict(t="利用者は予測を「判断」に使う：もう出発したか？ 走るべきか？ 家を出るのはいつか？", bullet=True),
    dict(t="→ 判断に直結する確率（◯分までに来る確率）が、一目で読み取れる表示が必要", bullet=True, bcolor="pink"),
], icon="search", color="blue", bsize=13)
d.notes(s, "研究は4段階で進められています。文献調査、人気の乗換アプリOneBusAwayの利用者へのアンケート、反復的なデザイン、そして統制実験です。"
           "アンケートからは、利用者が予測を走るべきか、いつ家を出るかといった判断に使っていることが見えてきました。"
           "具体的な人数や質問項目は原著のSurveyの節で確認してください。")

# 5 ---------------------------------------------------------------- quantile dotplot
s = d.slide("提案：quantile dotplot（分位点ドット図）")
mu, sd, lo, hi = 7.0, 2.2, 0, 14
unit = 0.3
x0 = L + 0.2
d.text(s, L, 1.5, 4.4, 0.4, "従来：密度の図", size=14, bold=True, color="muted", margin=(0, 0, 0, 0))
density(s, x0, 2.05, (hi - lo) * unit, 2.2, mu, sd, lo, hi, color="8FA3B8", fill="EEF2F6")
axis(s, x0, 4.25, (hi - lo) * unit, lo, hi, 2, "到着までの分", unit)
x1 = 5.3
d.text(s, x1 - 0.2, 1.5, 4.4, 0.4, "提案：20個の点で示す", size=14, bold=True, color="B", margin=(0, 0, 0, 0))
dotplot(s, x1, 4.25, unit, mu, sd, lo, n=20, dot=0.24, colors=["B", "B"])
axis(s, x1, 4.25, (hi - lo) * unit, lo, hi, 2, "到着までの分", unit)
howto = [("1", "予測分布から20個の分位点をとる"), ("2", "1点＝5%の確率として描く"), ("3", "同じ区間の点を積み上げる")]
for i, (n, t) in enumerate(howto):
    x = L + i * 3.07
    d.circle(s, x, 4.95, 0.5, "navy", text=n, size=14, bold=True, color="white", align="c", margin=(0, 0, 0, 0))
    d.text(s, x + 0.6, 4.9, 2.4, 0.6, t, size=13, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.box(s, L, 5.75, R - L, 1.0, fill="BL", radius=0.12)
d.text(s, L + 0.25, 5.78, R - L - 0.5, 0.95, [
    dict(t="「5分以内に来る確率は？」→ 左から点を数えるだけ（例：4個 × 5% ＝ 20%）", size=15, bold=True, color="B", after=2),
    dict(t="連続した分布を「数えられる結果」に変える。小さな画面でも一目で読める", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "提案されたのがquantile dotplotです。予測分布から20個の分位点をとり、1点を5%の確率として、同じ区間の点を積み上げます。"
           "すると、5分以内に来る確率を知りたいときは、左から点を数えるだけで済みます。連続した分布を数えられる結果に変えるのがポイントです。")

# 6 ---------------------------------------------------------------- experiment
s = d.slide("統制実験の設計")
rows = [("比べた表示", "eye", "密度の図などの従来の表示と、quantile dotplot（点の数を変えた条件を含む）"),
        ("課題", "clip", "バスの到着予測の表示を見て「◯分までに来る確率」などを答える"),
        ("測ったもの", "chart", "確率の推定のばらつき（正解からのずれの分散）と、答えへの自信"),
        ("参加者", "users", "オンラインで募集した参加者（人数と条件の割り当ては原著で確認）")]
for i, (t, ic, b) in enumerate(rows):
    y = 1.55 + i * 1.12
    d.box(s, L, y, R - L, 0.98, fill="white", line="line", radius=0.1, shadow=True)
    d.icon(s, ic, L + 0.2, y + 0.19, 0.6, bg="navy")
    d.text(s, L + 1.0, y, 1.6, 0.98, t, size=15, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, L + 2.6, y, R - L - 2.8, 0.98, b, size=13.5, color="text", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L, 6.08, R - L, 0.6, "※ 条件の数・参加者数・統計値は、発表前に原著の Experiment の節で確認して差し替えること",
       size=11, color="pink", margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "統制実験では、密度の図などの従来の表示とquantile dotplotを比べ、表示を見て「何分までに来る確率」を答えてもらっています。"
           "測ったのは、推定のばらつきと答えへの自信です。細かい条件や人数は原著で確認した値を入れてください。")

# 7 ---------------------------------------------------------------- results
s = d.slide("主な結果")
d.box(s, L, 1.55, 4.45, 2.65, fill="BL", radius=0.12)
d.text(s, L + 0.25, 1.6, 4.0, 2.55, [
    dict(t="約1.15倍", size=40, bold=True, color="B", after=2),
    dict(t="密度の図と比べて、quantile dotplot は確率の推定の分散を約1.15分の1に（約13%小さい）", size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.box(s, 5.1, 1.55, 4.45, 2.65, fill="sky", radius=0.12)
d.text(s, 5.35, 1.6, 4.0, 2.55, [
    dict(t="より自信をもって", size=28, bold=True, color="navy", after=2),
    dict(t="点を数えて答えられるため、利用者は推定に自信をもちやすかった", size=13, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.card(s, L, 4.4, R - L, 2.35, "後続研究：判断の質も上がるか（Fernandes et al., CHI 2018）", [
    dict(t="バスに間に合うかを判断するゲーム形式の実験で、quantile dotplot や累積分布の表示が、文章だけの表示や不確かさなしの表示より良い判断につながった", bullet=True),
    dict(t="→ 「読み取りやすい」だけでなく「行動の判断」にも効く可能性", bullet=True, bcolor="pink"),
], icon="route", color="B", bsize=13)
d.notes(s, "主な結果は、quantile dotplotが密度の図に比べて確率の推定の分散を約1.15分の1にしたこと、そして利用者がより自信をもって推定できたことです。"
           "後続のFernandesらの2018年の研究では、実際の判断の質も上がることが示されています。")

# 8 ---------------------------------------------------------------- critique
s = d.slide("批判的に読む：限界と疑問")
crit = [("シナリオ上の推定課題", "実際の乗車の判断ではない（2018年の後続研究で一部補われた）", "clip"),
        ("効果量は小さめ", "分散で約1.15倍。実際の使い勝手でどれほど差が出るか", "chart"),
        ("予測の更新は扱っていない", "時間とともに予測が変わる場面での見え方は未検討", "loop"),
        ("客観的な予測が対象", "気分や疲れのような主観的な予測に当てはまるかは不明", "heart")]
for i, (t, b, ic) in enumerate(crit):
    x = L + (i % 2) * 4.65
    y = 1.55 + (i // 2) * 1.95
    d.card(s, x, y, 4.45, 1.8, t, b, icon=ic, color="A", bsize=13)
d.box(s, L, 5.5, R - L, 1.25, fill="sky", radius=0.12)
d.text(s, L + 0.25, 5.55, R - L - 0.5, 1.15, [
    dict(t="→ OshiFit は「主観的な予測 × 毎週の更新 × 実際の行動」で、この論文の外側を検証できる", size=15, bold=True, color="navy", after=3),
    dict(t="ただし、ドット表示とアバター表示の効果は本実験では切り分けられない（群Cは両方を見る）", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "限界としては、シナリオ上の課題であること、効果量が小さめであること、予測の更新を扱っていないこと、"
           "そして客観的な予測が対象であることが挙げられます。OshiFitは主観的な予測を毎週更新し、実際の行動を測る点で、この論文の外側を検証できます。"
           "ただし、群Cはドットとアバターの両方を見るので、どちらが効いたかは切り分けられません。")

# 9 ---------------------------------------------------------------- mapping
s = d.slide("OshiFit への対応づけ")
d.table(s, L, 1.55, R - L, [
    ["観点", "Kay et al. (2016)", "OshiFit"],
    ["予測するもの", "バスの到着時刻", "6週間後の推し疲れ・充実"],
    ["利用者の判断", "走るべきか・いつ家を出るか", "提案を試すか・どれを選ぶか"],
    ["判断の境目", "◯分までに来るか", "「疲れ高め」（3.5以上）になるか"],
    ["表示", "20個の点（1点＝5%）", "「20人中◯人のあなた」の点＋重なったアバター"],
    ["更新", "（扱わない）", "毎晩更新・毎週の答え合わせ"],
], colw=[1.9, 3.4, 3.8], rowh=0.6, size=13, align=["l", "l", "l"], first_col_bold=True,
    fills={(r, 2): "BL" for r in range(1, 6)})
d.box(s, L, 5.4, R - L, 1.35, fill="navy", radius=0.12)
d.text(s, L + 0.3, 5.45, R - L - 0.6, 1.25, [
    dict(t="進捗②で追加した「20人中◯人」の点表示は、この論文の quantile dotplot と同じ考え方", size=15, bold=True, color="white", after=3),
    dict(t="点の数（20）と、アバターの重なり（5体）の意味をそろえるとさらに読みやすくなるはず", size=12.5, color="sky2"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "OshiFitに対応づけると、バスの到着時刻が6週間後の推し疲れに、走るべきかという判断が提案を試すかという判断に当たります。"
           "進捗②で追加した「20人中何人」の点表示は、まさにこの論文のquantile dotplotと同じ考え方です。")

# 10 --------------------------------------------------------------- applied design
s = d.slide("ゆらぎアバターへの応用案")
mu2, sd2, lo2 = 3.3, 0.546, 1.5
unit2 = 1.25
xa = L + 0.3
d.text(s, L, 1.5, 5.0, 0.4, "6週間後の推し疲れの予測（提案どおり・20点）", size=13, bold=True, color="navy", margin=(0, 0, 0, 0))
res = dotplot(s, xa, 4.2, unit2, mu2, sd2, lo2, n=20, dot=0.26, binw=0.25, colors=["B", "A"], thr=3.5)
n_hi = sum(1 for q, _, _ in res if q >= 3.5)
axis(s, xa, 4.2, 3.5 * unit2, 1.5, 5.0, 0.5, "推し疲れ（5段階）", unit2)
xt = xa + (3.5 - lo2) * unit2
d.line(s, xt, 1.95, xt, 4.2, color="pink", width=2, dash=True)
d.pill(s, xt - 0.75, 1.95, 1.5, 0.3, "疲れ高め 3.5〜", fill="pink", size=10)
d.text(s, L, 4.75, 5.0, 0.4, f"→ 境目より右の点を数える：20人中{n_hi}人", size=14, bold=True, color="A", margin=(0, 0, 0, 0))
d.pic(s, "ghostB", L + 0.3, 5.25, h=1.45)
d.text(s, L + 2.6, 5.3, 2.55, 1.4, "5体のアバター＝4点ずつ。点とアバターの意味をそろえる", size=12.5, color="text",
       anchor="m", margin=(0, 0, 0, 0))
ideas = [("境目の線を引く", "「疲れ高め」の点を数えやすくする", "target", "pink"),
         ("1体＝4点に対応づけ", "重なりの意味を点の数と一致させる", "layers", "B"),
         ("初回だけ30秒の説明", "「ぼやけ＝ありうる未来の数」と伝える", "play", "blue")]
for i, (t, b, ic, col) in enumerate(ideas):
    d.card(s, 5.6, 1.5 + i * 1.78, 3.95, 1.63, t, b, icon=ic, color=col, bsize=12.5)
d.notes(s, "ゆらぎアバターへの応用案です。予測の20点に、疲れ高めの境目の線を引くと、境目より右の点を数えるだけで、20人中7人が疲れ高めと読めます。"
           "さらに、5体のアバターを4点ずつに対応づけて、点の数と重なりの意味をそろえます。初回だけ30秒の説明も入れます。"
           "ただし本実験は11/2に開始済みでベータ版を凍結しているので、これらは事後アンケートでの理解度の確認と、次の版で対応します。")
d.assumed(s, "予測分布は例示")

# 11 --------------------------------------------------------------- what to do now
s = d.slide("いまの実験でできること・次の版でやること")
d.box(s, L, 1.55, 4.45, 3.75, fill="BL", radius=0.12)
d.icon(s, "check", L + 0.2, 1.72, 0.6, bg="B")
d.text(s, L + 0.95, 1.72, 3.3, 0.6, "本実験中（ベータ版は凍結）", size=15, bold=True, color="B", anchor="m", margin=(0, 0, 0, 0))
d.text(s, L + 0.25, 2.5, 4.0, 2.7, [
    dict(t="事後アンケートに「点の読み取り」問題を2問追加（例：疲れ高めは何人？）", bullet=True),
    dict(t="予測の理解度と、提案の実行率・予測への信頼との関係を探索的に分析", bullet=True),
    dict(t="アプリの画面は変えない（全群の条件を保つ）", bullet=True, bcolor="pink"),
], size=13.5, after=10, margin=(0, 0, 0, 0))
d.box(s, 5.1, 1.55, 4.45, 3.75, fill="panel", radius=0.12)
d.icon(s, "rocket", 5.3, 1.72, 0.6, bg="navy")
d.text(s, 6.05, 1.72, 3.3, 0.6, "次の版（修論後）", size=15, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.35, 2.5, 4.0, 2.7, [
    dict(t="境目の線と「1体＝4点」の対応づけ", bullet=True),
    dict(t="点の数（20 / 10）を比べる小さな実験", bullet=True),
    dict(t="ドットのみ・アバターのみ・両方の3条件で、どちらが行動に効くかを切り分ける", bullet=True),
], size=13.5, after=10, margin=(0, 0, 0, 0))
d.box(s, L, 5.5, R - L, 1.25, fill="pinkL", radius=0.12)
d.icon(s, "warn", L + 0.2, 5.8, 0.65, bg="pink")
d.text(s, L + 1.1, 5.55, R - L - 1.3, 1.15, [
    dict(t="注意：事後アンケートへの項目追加は、倫理審査の変更申請が必要かを確認する", size=14, bold=True, color="pink", after=3),
    dict(t="軽微な変更として届け出で済むかを 11/20 までに事務へ確認。必要なら追加しない", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "本実験中はベータ版を凍結しているので、画面は変えずに、事後アンケートに点の読み取り問題を2問追加することを提案します。"
           "画面の改良は修論の後の次の版で行い、ドットとアバターのどちらが行動に効くかを切り分ける実験につなげたいと考えています。")

# 12 --------------------------------------------------------------- discussion
s = d.slide("議論したいこと")
qs = [("点の数は20でよいか", "推し活の利用者にとって、20点と10点のどちらが読みやすいか"),
      ("感情に訴える表示と、数で示す表示", "アバターの重なりと点の表示は、それぞれ行動のどこに効くのか"),
      ("予測が外れたときの信頼", "毎週の「答え合わせ」で外れが続いたとき、どう見せれば信頼を保てるか")]
for i, (q, sub) in enumerate(qs):
    y = 1.55 + i * 1.72
    d.box(s, L, y, R - L, 1.55, fill="pinkL" if i == 1 else "panel", radius=0.12)
    d.icon(s, "question", L + 0.25, y + 0.42, 0.7, bg="pink")
    d.text(s, L + 1.2, y + 0.1, R - L - 1.4, 1.35, [dict(t=q, size=16, bold=True, color="navy", after=4),
                                                    dict(t=sub, size=13, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "議論したい点は3つです。点の数は20でよいか、感情に訴えるアバターと数で示す点はそれぞれ行動のどこに効くのか、"
           "そして予測が外れたときの信頼をどう保つかです。")

# 13 --------------------------------------------------------------- refs
s = d.slide("参考文献")
d.text(s, L, 1.55, R - L, 5.2, [
    dict(t="Kay, M., Kola, T., Hullman, J. R., & Munson, S. A. (2016). When (ish) is my bus? User-centered visualizations of uncertainty in everyday, mobile predictive systems. Proceedings of CHI 2016, pp. 5092–5103.", after=10),
    dict(t="Fernandes, M., Walls, L., Munson, S., Hullman, J., & Kay, M. (2018). Uncertainty displays using quantile dotplots or CDFs improve transit decision-making. Proceedings of CHI 2018.", after=10),
    dict(t="Hullman, J., Resnick, P., & Adar, E. (2015). Hypothetical outcome plots outperform error bars and violin plots for inferences about reliability of variable ordering. PLOS ONE, 10(11), e0142444.", after=10),
    dict(t="Gigerenzer, G., & Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: Frequency formats. Psychological Review, 102(4), 684–704.", after=10),
    dict(t="Wilkinson, L. (1999). Dot plots. The American Statistician, 53(3), 276–281.", after=10),
    dict(t="Hershfield, H. E., et al. (2011). Increasing saving behavior through age-progressed renderings of the future self. Journal of Marketing Research, 48(SPL), S23–S37."),
], size=12, color="text", margin=(0, 0, 0, 0))

d.save(OUT)
print("saved", OUT, d.n, "slides")
