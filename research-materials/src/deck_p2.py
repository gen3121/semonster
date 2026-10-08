"""進捗② 2026/10/30 — β版の完成・研究室内の操作確認・倫理審査承認・CHIIR 2027 投稿・参加者募集."""
import random
from datetime import date
from oshideck import Deck, L, R
from common import roadmap

OUT = "進捗報告②_20261030_β版と操作確認.pptx"
d = Deck("2026/10/30", title="進捗報告 2026/10/30")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　進捗報告", "進捗報告 2026/10/30", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=["OshiFit β版の完成", dict(t="研究室内での操作確認と改善", size=18, bold=False),
                            dict(t="倫理審査の承認 ／ CHIIR 2027 投稿 ／ 参加者募集", size=14, bold=False)],
                  art="ghostB")
d.notes(s, "前回10/16からの2週間で、β版を完成させ、研究室内で操作確認を行いました。倫理審査の承認、CHIIRへの投稿、参加者の募集開始も報告します。")

# 2 ---------------------------------------------------------------- diff
s = d.slide("前回（10/16）からの差分")
d.table(s, L, 1.5, R - L, [
    ["項目", "前回 10/16", "今回 10/30", "状態"],
    ["倫理審査", "申請済み・審査待ち", "10/23 承認（指摘2点を修正）", "完了"],
    ["アプリ", "記録・TIPI-J のみ", "全機能のβ版（群A/B/C 切替）", "完了"],
    ["予測", "v1.0 を固定", "ツインの毎晩更新を端末内に実装", "完了"],
    ["評価", "未実施", "研究室内で操作確認（6名）", "完了"],
    ["対外発表", "原稿の構成を作成", "CHIIR 2027 に投稿（10/29）", "完了"],
    ["募集", "未着手", "10/24 開始：応募172名／目標240名", "進行中"],
], colw=[1.45, 2.55, 4.1, 1.0], rowh=0.58, size=13, align=["l", "l", "l", "c"], first_col_bold=True,
    fills={**{(r, 3): "BL" for r in range(1, 6)}, (6, 3): "sky", **{(r, 2): "FAFCFE" for r in range(1, 7)}})
d.box(s, L, 5.75, R - L, 1.0, fill="navy", radius=0.12)
d.text(s, L + 0.3, 5.78, R - L - 0.6, 0.95, [
    dict(t="予定どおり 11/2（月）に本実験を開始できる見込み", size=17, bold=True, color="white", after=2),
    dict(t="残る課題は参加者の確保（あと68名）。11/1 まで募集を続ける", size=13, color="sky2"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(d.prs.slides[-1], "応募数などは想定値")
d.notes(s, "前回からの差分です。予定していた5項目はすべて完了し、募集だけが進行中です。"
           "応募は現在172名で、目標の240名まであと68名です。このまま11/2に本実験を開始する予定です。")

# 3 ---------------------------------------------------------------- roadmap
s = d.slide("全体スケジュールと現在地")
roadmap(d, s, date(2026, 10, 30))
d.box(s, L, 5.5, R - L, 1.25, fill="panel", radius=0.1)
d.icon(s, "check", L + 0.2, 5.82, 0.6, bg="B")
d.text(s, L + 1.0, 5.55, R - L - 1.2, 1.15, [
    dict(t="システム開発と倫理審査が完了。次の山場は 11/2 の本実験開始と 11/15 の割付", size=14, bold=True, color="navy", after=2),
    dict(t="前回（10/16）からシステム開発のバーが完了に、倫理審査が承認に進んだ", size=12, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "スケジュール上は、システム開発と倫理審査が完了しました。次の山場は11/2の本実験開始と、11/15の割付です。")

# 4 ---------------------------------------------------------------- implementation status
s = d.slide("β版の実装状況")
feats = ["毎日の記録・TIPI-J", "データ送信（匿名ID）", "アバター生成", "ベイズ個人ツイン", "リバランス提案",
         "みらいミラー（ゆらぎ）", "疲れの中身キュー", "通知（1日1回）"]
pct = [100, 100, 100, 100, 100, 95, 90, 100]
d.bar(s, L, 1.45, 5.3, 5.3, feats, [("完成度（%）", pct)], ["B"], horizontal=True, fmt='0"%"', vmin=0, vmax=110,
      gap=45, point_colors=["B" if p == 100 else "blue" for p in pct], val_visible=False,
      title="機能ごとの完成度")
d.card(s, 5.95, 1.5, 3.6, 3.3, "使っている技術", [
    dict(t="React Native（Expo）", bullet=True),
    dict(t="MediaPipe Face Landmarker（端末内）", bullet=True),
    dict(t="アバター：SVG パーツ合成", bullet=True),
    dict(t="予測：TypeScript で正規分布の更新式", bullet=True),
    dict(t="Firebase（匿名認証・Firestore）", bullet=True),
], icon="code", color="navy", bsize=12.5, body_after=4)
d.card(s, 5.95, 5.0, 3.6, 1.75, "残っている作業", [
    dict(t="ミラーの描画速度（古い Android で 0.8 秒）", bullet=True, bcolor="A"),
    dict(t="キューの文言の最終確認", bullet=True, bcolor="A"),
], icon="warn", color="A", bsize=12)
d.notes(s, "機能ごとの完成度です。8つの機能のうち6つが完成し、みらいミラーの描画速度と疲れの中身キューの文言だけが残っています。"
           "どちらも11/15の介入開始までに直せば間に合います。")

# 5 ---------------------------------------------------------------- screen flow
s = d.slide("画面の流れ：毎日30秒 ＋ 週1回")
phones = [("mk_ja_log", "毎日", "今日の推し活を記録", "約30秒。疲れの中身も1つ選ぶ"),
          ("mk_ja_propose", "週1回", "提案を3案から選ぶ", "本人の希望を先頭に表示"),
          ("mk_ja_mirror", "週1回（群C）", "みらいミラーで比べる", "今のまま｜提案どおり")]
for i, (im, when, t, sub) in enumerate(phones):
    x = L + 0.1 + i * 3.1
    d.pill(s, x + 0.55, 1.5, 1.6, 0.32, when, fill="pink" if i else "blue", size=11)
    d.pic(s, im, x + 0.18, 1.9, h=3.75)
    d.text(s, x - 0.1, 5.75, 2.9, 0.4, t, size=14, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    d.text(s, x - 0.1, 6.15, 2.9, 0.35, sub, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
    if i < 2:
        d.arrow(s, x + 2.65, 3.6, 0.3, 0.4, fill="blue")
d.notes(s, "画面の流れです。毎日は30秒の記録だけで、週に1回、3つの提案から1つを選びます。"
           "群Cだけは、選んだ提案についてみらいミラーで今のままと提案どおりを比べられます。")

# 6 ---------------------------------------------------------------- avatar pipeline
s = d.slide("アバター生成：写真は端末の外に出さない")
d.pic(s, "mk_ja_avatar", L, 1.5, h=5.25)
steps = [("1", "写真を撮る", "端末内のメモリだけで扱う", "camera"),
         ("2", "顔の特徴点を検出", "MediaPipe で478点（端末内）", "search"),
         ("3", "12のパラメータへ", "髪型・髪色・顔型・目・眉・眼鏡など", "sliders"),
         ("4", "SVG パーツを合成", "推し色のヘアピンも選べる", "layers"),
         ("5", "写真を即時に破棄", "保存も送信もしない", "shield")]
for i, (n, t, sub, ic) in enumerate(steps):
    y = 1.5 + i * 0.83
    d.icon(s, ic, 3.75, y + 0.06, 0.58, bg="pink" if n == "5" else "navy")
    d.text(s, 4.45, y, 2.6, 0.72, [dict(t=f"{n}. {t}", size=14, bold=True, color="navy", after=0),
                                   dict(t=sub, size=11.5, color="muted")], margin=(0, 0, 0, 0), anchor="m")
stats = [("1.4秒", "生成時間（平均）"), ("3.8 / 5", "似ている度"), ("2 / 6名", "写真なしを選択")]
for i, (v, lab) in enumerate(stats):
    y = 1.5 + i * 1.47
    d.box(s, 7.25, y, 2.3, 1.3, fill="sky", radius=0.12)
    d.text(s, 7.25, y + 0.08, 2.3, 0.7, v, size=24, bold=True, color="navy", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 7.25, y + 0.78, 2.3, 0.4, lab, size=11.5, color="muted", align="c", margin=(0, 0, 0, 0))
d.text(s, 3.75, 5.75, 5.8, 0.95, "写真を使わない作成でも、同じパーツから選べるので見た目の質は変わらない。"
       "全群でアバターを作る（群A・Bはプロフィールにだけ表示）", size=12, color="text", margin=(0, 0, 0, 0))
d.assumed(s, "生成時間・評価は操作確認の想定値")
d.notes(s, "アバターの生成は5つの段階です。写真は端末のメモリの中だけで扱い、特徴点を検出して12のパラメータに変換し、"
           "SVGのパーツを合成したら写真はすぐに破棄します。生成時間は平均1.4秒、操作確認での似ている度は5段階で3.8でした。")

# 7 ---------------------------------------------------------------- yuragi implementation
s = d.slide("ゆらぎアバターの実装")
d.pic(s, "mk_ja_mirror", L, 1.5, h=5.25)
algo = [("事後分布から20通りの未来を引く", "ツインが出す予測分布からサンプリング"),
        ("20通りを3区分に分ける", "良好／ふつう／お疲れ（予測値の区分）"),
        ("5体のアバターを重ねて描く", "表情は区分の割合、濃さは起こりやすさ"),
        ("「20人中◯人」をドットで示す", "数字が苦手でも割合が読める"),
        ("記録が増えると重なりが収束", "未来の解像度＝1 − 区間の幅／最初の幅")]
for i, (t, sub) in enumerate(algo):
    y = 1.5 + i * 0.86
    d.circle(s, 3.75, y + 0.1, 0.5, "B", text=str(i + 1), size=14, bold=True, color="white", align="c",
             margin=(0, 0, 0, 0))
    d.text(s, 4.4, y, 5.15, 0.75, [dict(t=t, size=14, bold=True, color="navy", after=0),
                                   dict(t=sub, size=12, color="muted")], margin=(0, 0, 0, 0), anchor="m")
d.box(s, 3.75, 5.9, 5.8, 0.85, fill="BL", radius=0.1,
      text="予測の答え合わせ：先週の見込みと実際の記録を毎週並べて表示し、予測への信頼を調整してもらう",
      size=12.5, bold=True, color="B", align="l", margin=(0.15, 0.03, 0.1, 0.03))
d.notes(s, "ゆらぎアバターの実装です。ツインの予測分布から20通りの未来を引き、良好、ふつう、お疲れの3区分に分けて、"
           "5体のアバターを重ねて描きます。20人中何人という点の表示も加えました。記録が増えると重なりが収束し、"
           "その度合いを未来の解像度として表示しています。また、先週の見込みと実際の記録を毎週並べる答え合わせの機能も入れました。")

# 8 ---------------------------------------------------------------- rebalance output
s = d.slide("リバランス提案の出力例")
random.seed(7)
pts = []
for _ in range(16):
    bx = round(random.uniform(2.75, 3.75), 2)
    by = round(random.uniform(3.2, 3.85), 2)
    pts.append(("_", bx, by, "C9D3DE", 7))
pts += [("現状（今のまま）", 3.5, 3.6, "A", 15, "b"), ("① 楽しさキープ", 3.1, 3.6, "B", 13, "t"),
        ("② バランス", 3.3, 3.8, "B", 13), ("③ 回復重視", 2.8, 3.4, "B", 13)]
d.scatter(s, L, 1.45, 5.6, 5.3, pts, xr=(2.6, 4.0, 0.2), yr=(3.1, 4.0, 0.1), xtitle="推し疲れの予測（低いほど良い）",
          ytitle="充実の予測（高いほど良い）", title="候補98案の予測（灰色）と選ばれた3案")
d.card(s, 6.25, 1.5, 3.3, 3.05, "絞り込みの流れ", [
    dict(t="候補：98案", bullet=True),
    dict(t="7活動から最大2つを ±1段階", size=11.5, color="muted", after=5),
    dict(t="希望に反する案を除外：61案", bullet=True),
    dict(t="「増やしたい」を減らす案は出さない", size=11.5, color="muted", after=5),
    dict(t="パレート最適な案から3つ", bullet=True),
], icon="sliders", color="navy", bsize=13, body_after=1)
d.box(s, 6.25, 4.75, 3.3, 2.0, fill="pinkL", radius=0.12)
d.text(s, 6.4, 4.8, 3.0, 1.9, [
    dict(t="計算は端末内で約20ミリ秒", size=13, bold=True, color="pink", after=4),
    dict(t="群Bにも同じ3案を出す。群Bは予測値を表示せず、文章だけを見せる", size=12, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "予測値は例示")
d.notes(s, "提案エンジンの出力例です。灰色の点が候補で、7つの活動から最大2つを1段階ずつ動かした98案です。"
           "本人の希望に反する案を除いた61案のうち、充実を大きく下げずに疲れを下げる、パレート最適な3案を選びます。"
           "計算は端末内で20ミリ秒程度です。群Bにも同じ3案を出しますが、予測値は表示しません。")

# 9 ---------------------------------------------------------------- usability
s = d.slide("研究室内の操作確認（10/24–26、6名）")
for i, (v, lab, col) in enumerate([("77.9", "SUS 平均（65〜90）", "B"), ("28秒", "毎日の記録（平均）", "blue"),
                                   ("4分10秒", "初回設定（平均）", "navy")]):
    x = L + i * 3.07
    d.box(s, x, 1.5, 2.95, 1.55, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, x, 1.58, 2.95, 0.9, v, size=32, bold=True, color=col, align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, x, 2.5, 2.95, 0.4, lab, size=12.5, color="muted", align="c", margin=(0, 0, 0, 0))
d.bar(s, L, 3.25, 5.0, 3.5, ["P1", "P2", "P3", "P4", "P5", "P6"], [("SUS", [82.5, 75.0, 90.0, 65.0, 77.5, 77.5])],
      ["B"], fmt="0.0", vmin=0, vmax=100, major=25, title="参加者ごとの SUS（68 が平均的な目安）", gap=60,
      point_colors=["B", "B", "B", "A", "B", "B"])
d.card(s, 5.6, 3.3, 3.95, 3.45, "課題の達成", [
    dict(t="記録 → 提案の選択：6/6名", bullet=True),
    dict(t="みらいミラーの読み取り：4/6名", bullet=True, bcolor="A"),
    dict(t="「ぼやけ」の意味が分からない人が2名", size=11.5, color="muted", after=6),
    dict(t="写真なしの作成：2/6名が選択", bullet=True),
    dict(t="写真を撮ることへの抵抗感", size=11.5, color="muted"),
], icon="clip", color="navy", bsize=13, body_after=2)
d.assumed(s, "操作確認の結果は想定値")
d.notes(s, "研究室内の6名で操作確認を行いました。SUSの平均は77.9で、一般的な目安の68を上回りました。"
           "毎日の記録は平均28秒で、目標の30秒以内に収まっています。一方で、みらいミラーの読み取りができたのは6名中4名で、"
           "ぼやけの意味が分からないという声がありました。")

# 10 --------------------------------------------------------------- fixes
s = d.slide("見つかった問題と改善")
d.table(s, L, 1.5, R - L, [
    ["見つかった問題", "人数", "改善"],
    ["「今のまま」の顔が少し怖い", "3/6", "疲れの表情を1段階弱くした。配色は変えない"],
    ["ぼやけ（予測の幅）の意味が分からない", "2/6", "「20人中◯人」のドット表示と、初回だけの説明を追加"],
    ["提案の文が説教っぽい", "2/6", "「〜してみる？」の口調に。本人の希望を先頭に表示"],
    ["夜に記録を忘れる", "3/6", "21時に1日1回だけ通知（過干渉を避ける）"],
    ["写真を撮るのに抵抗がある", "2/6", "「パーツで作る」を同じ大きさのボタンにした"],
], colw=[3.6, 0.9, 4.6], rowh=0.62, size=13, align=["l", "c", "l"], first_col_bold=True,
    fills={(r, 2): "BL" for r in range(1, 6)})
d.box(s, L, 5.4, R - L, 1.35, fill="sky", radius=0.12)
d.icon(s, "lock", L + 0.25, 5.75, 0.65, bg="navy")
d.text(s, L + 1.15, 5.45, R - L - 1.35, 1.25, [
    dict(t="10/30 に β版を凍結 → 本実験中は全群共通の不具合修正だけを許可", size=15, bold=True, color="navy", after=3),
    dict(t="修正はすべて日時・内容・影響する群を記録し、プロトコルからの逸脱として修論に書く", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "操作確認で見つかった問題と、その改善です。特に、今のままの顔が怖いという声が半数あったので、疲れの表情を1段階弱くしました。"
           "β版は今日凍結し、本実験中は全群共通の不具合修正だけを許可します。修正は記録して、修論に逸脱として書きます。")

# 11 --------------------------------------------------------------- ethics + recruiting
s = d.slide("倫理審査の承認と参加者の募集")
steps = [("10/9", "申請", "B"), ("10/21", "条件付き承認", "A"), ("10/23", "修正して承認", "B")]
for i, (dt, lab, col) in enumerate(steps):
    x = L + i * 1.55
    d.circle(s, x + 0.25, 1.55, 0.8, col, text=dt, size=11, bold=True, color="white", align="c", margin=(0, 0, 0, 0))
    d.text(s, x - 0.05, 2.4, 1.4, 0.35, lab, size=12, bold=True, color="navy", align="c", margin=(0, 0, 0, 0))
    if i < 2:
        d.line(s, x + 1.1, 1.95, x + 1.75, 1.95, color="gray", width=2, arrow=True)
d.card(s, L, 2.95, 4.5, 3.8, "審査会での指摘と対応", [
    dict(t="学外の相談窓口も載せること", bullet=True, size=13.5, bold=True, color="navy"),
    dict(t="→ 大学の学生相談室に加え、公的な電話・SNS相談の窓口を追加", size=12.5, after=8),
    dict(t="データの保存期間を明記すること", bullet=True, size=13.5, bold=True, color="navy"),
    dict(t="→ 匿名化データを5年保存し、その後に削除すると追記", size=12.5),
], icon="sign", color="pink", bsize=13, body_after=2)
d.text(s, 5.2, 1.5, 4.35, 0.4, "募集状況（10/24 開始）", size=15, bold=True, color="navy", margin=(0, 0, 0, 0))
d.box(s, 5.2, 2.0, 4.35, 0.42, fill="sky", radius=0.21)
d.box(s, 5.2, 2.0, 4.35 * 172 / 240, 0.42, fill="blue", radius=0.21)
d.text(s, 5.2, 2.0, 4.35, 0.42, "172 / 240名（72%）", size=13, bold=True, color="white", align="l", anchor="m",
       margin=(0.15, 0, 0, 0))
d.bar(s, 5.2, 2.6, 4.35, 4.15, ["学内メーリングリスト", "X（旧Twitter）", "推し活コミュニティ", "知人の紹介"],
      [("応募数", [68, 61, 29, 14])], ["blue"], horizontal=True, fmt="0", vmin=0, vmax=80, gap=50,
      val_visible=False, title="募集経路ごとの応募数")
d.assumed(s, "応募数は想定値")
d.notes(s, "倫理審査は10/21に条件付き承認となり、学外の相談窓口の追加と、データの保存期間の明記という2点を修正して、10/23に承認されました。"
           "募集は10/24から始め、現在172名です。学内メーリングリストとXからの応募が多くなっています。")

# 12 --------------------------------------------------------------- CHIIR
s = d.slide("CHIIR 2027 に投稿（10/29）")
d.box(s, L, 1.5, R - L, 1.45, fill="navy", radius=0.12)
d.text(s, L + 0.3, 1.55, R - L - 0.6, 1.35, [
    dict(t="OshiFit: Possible-Selves Avatars for Uncertainty-Aware Behavior Change in Fan Activities", size=16, bold=True, color="white", after=4),
    dict(t="Short Paper（4ページ＋参考文献）／ ACM CHIIR 2027 ／ 採否通知は12月中旬の予定", size=12.5, color="sky2"),
], margin=(0, 0, 0, 0), anchor="m")
secs = [("1. Introduction", "推し活の広がりと推し疲れ。正解が人によって違う領域"),
        ("2. Preliminary Survey", "215名：同じ行動が充実と疲れを両方上げる"),
        ("3. OshiFit Design", "ベイズ個人ツイン／リバランス提案／ゆらぎアバター"),
        ("4. Planned Study", "6週間・3群の無作為化比較実験と評価指標")]
for i, (t, b) in enumerate(secs):
    y = 3.15 + i * 0.9
    d.box(s, L, y, 5.2, 0.78, fill="panel", radius=0.1)
    d.text(s, L + 0.2, y, 4.9, 0.78, [dict(t=t, size=13.5, bold=True, color="navy", after=0),
                                      dict(t=b, size=11.5, color="muted")], margin=(0, 0, 0, 0), anchor="m")
d.card(s, 5.85, 3.15, 3.7, 3.6, "主張した貢献", [
    dict(t="予測の不確かさを「ありうる自分」の重なりとして見せる表現", bullet=True),
    dict(t="「減らす」でなく「組み替える」提案の作り方", bullet=True),
    dict(t="正解が人によって違う領域へのアバター介入", bullet=True),
], icon="star", color="pink", bsize=13)
d.notes(s, "CHIIR 2027にShort Paperとして投稿しました。タイトルはOshiFit: Possible-Selves Avatars for Uncertainty-Aware Behavior Change in Fan Activitiesです。"
           "予備調査、システムの設計、実験計画の3つを中心に書きました。主張した貢献は、不確かさを重なりで見せる表現、組み替える提案、"
           "正解が人によって違う領域へのアバター介入の3点です。")

# 13 --------------------------------------------------------------- next
s = d.slide("次回までの予定と相談事項")
todo = [("11/1", "募集締め切り・同意の取得"), ("11/2", "本実験開始（全群：記録のみ）"),
        ("11/2–15", "記録率を毎日確認（ダッシュボード）"), ("11/14", "解析計画書を版固定"),
        ("11/15", "WHO-5 で層別して3群に割付"), ("11/16", "介入開始（提案・ミラー）")]
d.text(s, L, 1.5, 4.5, 0.4, "やること", size=16, bold=True, color="navy", margin=(0, 0, 0, 0))
for i, (dt, t) in enumerate(todo):
    y = 1.95 + i * 0.58
    d.pill(s, L, y + 0.1, 1.1, 0.34, dt, fill="blue" if i not in (1, 4) else "pink", size=11)
    d.text(s, L + 1.25, y, 3.3, 0.54, t, size=13.5, color="text", anchor="m", margin=(0, 0, 0, 0))
d.box(s, 5.15, 1.5, 4.4, 3.95, fill="pinkL", radius=0.12)
d.icon(s, "comments", 5.35, 1.65, 0.55, bg="pink")
d.text(s, 6.05, 1.65, 3.3, 0.55, "相談したいこと", size=16, bold=True, color="pink", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.35, 2.35, 4.05, 4.3, [
    dict(t="応募が200名に届かない場合", size=14, bold=True, color="navy", after=2),
    dict(t="3群のまま進めるか、計画書どおり群B・Cの2群に絞るか。判断の基準を決めたい", size=12.5, color="text", after=10),
    dict(t="謝礼を分けて払うか", size=14, bold=True, color="navy", after=2),
    dict(t="2週・6週の2回に分けると脱落を減らせるが、事務手続きが増える", size=12.5, color="text", after=10),
    dict(t="実験中の不具合修正のルール", size=14, bold=True, color="navy", after=2),
    dict(t="全群共通の修正だけ許可し、記録する案でよいか", size=12.5, color="text"),
], margin=(0, 0, 0, 0))
d.box(s, L, 5.65, R - L, 1.1, fill="panel", radius=0.1)
d.icon(s, "eye", L + 0.2, 5.9, 0.6, bg="blue")
d.text(s, L + 1.0, 5.68, R - L - 1.2, 1.04, [
    dict(t="次回（11/27）に見せるもの", size=14, bold=True, color="navy", after=3),
    dict(t="記録期間2週間の結果（記録率・ベースライン）／割付のバランス／介入1週目の提案の選ばれ方", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "11/2に本実験を開始し、2週間の記録期間のあと、11/15にWHO-5で層別して割り付けます。"
           "相談したいのは、応募が200名に届かない場合の判断基準、謝礼の分割払い、そして実験中の不具合修正のルールの3点です。")

d.save(OUT)
print("saved", OUT, d.n, "slides")
