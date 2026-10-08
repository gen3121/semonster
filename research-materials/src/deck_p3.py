"""進捗③ 2026/11/27 — 本実験の開始・最初の2週間（記録のみ）・割付・介入1週目."""
from datetime import date
from oshideck import Deck, L, R
from common import roadmap, status_rows
import projected as P

OUT = "進捗報告③_20261127_本実験の開始.pptx"
d = Deck("2026/11/27", title="進捗報告 2026/11/27")

# 1 ---------------------------------------------------------------- title
s = d.title_slide("メディアインタラクション研究室　進捗報告", "進捗報告 2026/11/27", "今井元",
                  "大阪工業大学\nメディアインタラクション研究室",
                  subtitle=["本実験がスタート", dict(t="最初の2週間の記録と3群への割付", size=18, bold=False),
                            dict(t="介入1週目の提案の選ばれ方 ／ 実験中に起きたこと", size=14, bold=False)],
                  art="ghost_d7")
d.notes(s, "11/2に本実験を開始しました。今日は実験4週目で、最初の2週間の記録期間の結果、11/15の割付、介入1週目の様子を報告します。"
           "途中経過なので、群間の検定は行っていません。")

# 2 ---------------------------------------------------------------- summary
s = d.slide("前回（10/30）からの進捗サマリー")
status_rows(d, s, L, 1.5, R - L, [
    ("完了", f"本実験を開始（11/2・{P.FLOW['started']}名）", f"応募{P.FLOW['applied']}名のうち同意{P.FLOW['consented']}名。目標240名にはわずかに届かず"),
    ("完了", "2週間の記録期間（全群：記録のみ）", f"平均記録率 {round(sum(P.BASE_LOG) / len(P.BASE_LOG))}%、1回の記録は平均{P.BASE_LOG_SEC}秒"),
    ("完了", "解析計画書を版固定（11/14）", "割付の前日に固定。主要な解析・補正方法・欠測の扱いを明記"),
    ("完了", f"WHO-5 で層別して3群に割付（11/15・{P.FLOW['week2']}名）", "各群71名。年齢・WHO-5 などのバランスは良好"),
    ("進行中", "介入期間（11/16〜12/13）", "現在2週目。提案は毎週日曜21時に配信"),
    ("継続", "全群共通の不具合を1件修正（11/18）", "Android で通知が遅れる問題。逸脱として記録済み"),
], rowh=0.78, size=14, sub=12)
d.assumed(s, "人数・割合は想定値")
d.notes(s, "前回からの進捗です。11/2に228名で本実験を開始し、2週間の記録期間を経て、11/15に213名を3群に割り付けました。"
           "現在は介入期間の2週目です。全群共通の不具合を1件修正し、逸脱として記録しています。")

# 3 ---------------------------------------------------------------- roadmap
s = d.slide("全体スケジュールと現在地")
roadmap(d, s, date(2026, 11, 27))
d.box(s, L, 5.5, R - L, 1.25, fill="panel", radius=0.1)
d.icon(s, "flask", L + 0.2, 5.82, 0.6, bg="B")
d.text(s, L + 1.0, 5.55, R - L - 1.2, 1.15, [
    dict(t="本実験は6週間のうち4週目。予定どおり 12/13 に終了する見込み", size=14, bold=True, color="navy", after=2),
    dict(t="前回（10/30）から：募集 → 記録のみ期間 → 割付 → 介入開始まで進んだ", size=12, color="muted"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "スケジュール上は本実験の4週目にいます。予定どおり12/13に終了する見込みです。")

# 4 ---------------------------------------------------------------- flow
s = d.slide("参加者の流れ")
F = P.FLOW
flow = [("応募", F["applied"]), ("同意・適格", F["consented"]), ("開始（11/2）", F["started"]), ("2週継続（11/15）", F["week2"])]
for i, (t, n) in enumerate(flow):
    x = L + i * 2.32
    d.box(s, x, 1.55, 2.08, 1.15, fill="navy" if i == 3 else "sky", radius=0.12)
    d.text(s, x, 1.6, 2.08, 0.45, t, size=12.5, bold=True, color="white" if i == 3 else "navy", align="c",
           margin=(0, 0, 0, 0), anchor="m")
    d.text(s, x, 2.0, 2.08, 0.62, f"{n}名", size=22, bold=True, color="white" if i == 3 else "navy", align="c",
           margin=(0, 0, 0, 0), anchor="m")
    if i < 3:
        d.arrow(s, x + 2.1, 1.95, 0.2, 0.36, fill="blue")
notes_x = [("除外 8名", "推し活なし3・未成年2・撤回3"), ("未開始 5名", "初回設定せず"), ("脱落 15名", "記録が7日以上途絶")]
for i, (t, b) in enumerate(notes_x):
    x = L + 1.2 + i * 2.32
    d.box(s, x, 2.9, 1.95, 0.85, fill="panel", radius=0.08)
    d.text(s, x + 0.08, 2.92, 1.8, 0.8, [dict(t=t, size=12, bold=True, color="A", after=0),
                                         dict(t=b, size=10.5, color="muted")], margin=(0, 0, 0, 0), anchor="m")
d.line(s, L + 7.43, 2.7, L + 7.43, 4.05, color="navy", width=2)
d.line(s, L + 1.3, 4.05, L + 7.9, 4.05, color="navy", width=2)
groups = [("群A 記録のみ", "gray", "panel"), ("群B 提案（文章）", "blue", "sky"), ("群C 提案＋アバター", "B", "BL")]
for i, (t, col, fill) in enumerate(groups):
    x = L + 0.35 + i * 3.0
    d.line(s, x + 1.25, 4.05, x + 1.25, 4.35, color="navy", width=2, arrow=True)
    d.box(s, x, 4.4, 2.5, 2.3, fill=fill, radius=0.12)
    d.text(s, x, 4.48, 2.5, 0.4, t, size=13.5, bold=True, color=col, align="c", margin=(0, 0, 0, 0))
    d.text(s, x, 4.9, 2.5, 0.75, f"{F['alloc'][i]}名", size=28, bold=True, color="navy", align="c", anchor="m",
           margin=(0, 0, 0, 0))
    d.text(s, x, 5.7, 2.5, 0.35, "割付（11/15）", size=11, color="muted", align="c", margin=(0, 0, 0, 0))
    d.text(s, x, 6.05, 2.5, 0.45, f"現在の継続：{F['week4'][i]}名", size=13, bold=True, color="text", align="c",
           margin=(0, 0, 0, 0))
d.assumed(s, "人数は想定値")
d.notes(s, "参加者の流れです。応募241名のうち、適格で同意した233名、開始した228名、2週間継続した213名を3群に割り付けました。"
           "現在の継続は群Aが69名、群Bと群Cが70名です。必要人数の1群64名は上回っています。")

# 5 ---------------------------------------------------------------- baseline logging
s = d.slide("最初の2週間：記録は続いたか")
d.linechart(s, L, 1.45, 5.9, 4.1, [f"{i + 1}" for i in range(14)], [("記録率（%）", P.BASE_LOG)], ["blue"],
            fmt="0", vmin=70, vmax=100, major=10, legend=False, title="日ごとの記録率（全参加者・%）", label_last=True)
d.text(s, L, 5.55, 5.9, 0.3, "記録開始からの日数", size=11, color="muted", align="c", margin=(0, 0, 0, 0))
stats = [(f"{round(sum(P.BASE_LOG) / 14)}%", "平均の記録率"), (f"{P.BASE_LOG_SEC}秒", "1回の記録の平均時間"),
         (f"{P.NOTIF_SHARE}%", "21時の通知の直後の記録")]
for i, (v, lab) in enumerate(stats):
    y = 1.5 + i * 1.45
    d.box(s, 6.6, y, 2.95, 1.3, fill="white", line="line", radius=0.12, shadow=True)
    d.text(s, 6.6, y + 0.05, 2.95, 0.8, v, size=28, bold=True, color="navy", align="c", anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 6.6, y + 0.85, 2.95, 0.35, lab, size=12, color="muted", align="c", margin=(0, 0, 0, 0))
d.box(s, L, 5.95, R - L, 0.8, fill="AL", radius=0.1,
      text="記録率は1日目97% → 14日目84%。週末（6・13日目）にやや下がる。介入期間に向けて通知の時刻は変えない",
      size=12.5, bold=True, color="A", align="l", margin=(0.2, 0.03, 0.15, 0.03))
d.assumed(s)
d.notes(s, "最初の2週間は全群が記録だけを行いました。記録率は1日目の97%から14日目の84%へゆるやかに下がりましたが、平均は89%でした。"
           "1回の記録は平均31秒で、目標の30秒程度に収まっています。")

# 6 ---------------------------------------------------------------- balance
s = d.slide("割付のバランス（11/15）")
d.table(s, L, 1.5, R - L, P.BALANCE, colw=[2.8, 2.1, 2.1, 2.1], rowh=0.5, size=13, align=["l", "c", "c", "c"],
        first_col_bold=True, fills={(r, 3): "BL" for r in range(1, 8)})
d.box(s, L, 5.65, R - L, 1.1, fill="sky", radius=0.12)
d.icon(s, "scale", L + 0.2, 5.87, 0.65, bg="navy")
d.text(s, L + 1.1, 5.68, R - L - 1.3, 1.04, [
    dict(t="2週時点の WHO-5 で層別して割り付けたため、主要な指標の差は小さい", size=14, bold=True, color="navy", after=2),
    dict(t="主要解析では2週時点の WHO-5 を共変量に入れる（解析計画書どおり）", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "割付のバランスです。2週時点のWHO-5で層別したので、主要な指標の差は小さくなっています。")

# 7 ---------------------------------------------------------------- twin early result
s = d.slide("ベイズ個人ツイン：2週間の初期結果")
d.bar(s, L, 1.45, 5.4, 4.3, ["充実", "推し疲れ"],
      [("記録0日（全体の傾向のみ）", [P.PI["wb"][0], P.PI["bo"][0]]), ("記録14日（個人補正後）", [P.PI["wb"][1], P.PI["bo"][1]])],
      ["8FA3B8", "B"], fmt="0.00", vmin=0, vmax=1.4, major=0.2, title="80%予測区間の幅（±）", gap=80, overlap=-10)
red_wb = round((1 - P.PI["wb"][1] / P.PI["wb"][0]) * 100)
red_bo = round((1 - P.PI["bo"][1] / P.PI["bo"][0]) * 100)
d.box(s, 6.1, 1.5, 3.45, 2.0, fill="BL", radius=0.12)
d.text(s, 6.25, 1.55, 3.15, 1.9, [
    dict(t=f"約{red_bo}%", size=36, bold=True, color="B", after=0),
    dict(t=f"推し疲れの予測の幅が縮んだ（充実は約{red_wb}%）", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.card(s, 6.1, 3.7, 3.45, 3.05, "進捗①の試算との比較", [
    dict(t=f"試算では推し疲れ ±{P.PI_SIM['bo']}、実際は ±{P.PI['bo'][1]}", bullet=True),
    dict(t="記録が途切れた日がある人ほど縮みが小さい", bullet=True),
    dict(t="6週時点での実測との一致は、終了後に評価（RQ1）", bullet=True, bcolor="pink"),
], icon="chart", color="navy", bsize=12.5)
d.text(s, L, 5.85, 5.4, 0.85, "※ 区間の幅は「記録0日時点の母集団モデル」と「14日の記録で更新したツイン」の参加者平均",
       size=11, color="muted", margin=(0, 0, 0, 0))
d.assumed(s)
d.notes(s, f"ベイズ個人ツインの初期結果です。2週間の記録で、推し疲れの80%予測区間は±{P.PI['bo'][0]}から±{P.PI['bo'][1]}へ、約{red_bo}%縮みました。"
           "進捗①の試算よりは少し縮みが小さく、記録が途切れた日がある人ほど縮みが小さい傾向でした。")

# 8 ---------------------------------------------------------------- facets
s = d.slide("いちばんの疲れの中身（記録期間）")
d.bar(s, L, 1.45, 5.0, 4.4, P.FACETS, [("割合（%）", P.FACET_SHARE)], ["purple"], fmt='0"%"', vmin=0, vmax=45,
      major=10, point_colors=["purple", "A", "navy", "blue"], title="最も多く選ばれた疲れの中身（参加者ごと）", gap=55)
for i, (im, t, b) in enumerate([("av_sleep", "睡眠がいちばん多い", "深夜の配信・SNS が中心。平日に集中"),
                                 ("av_money", "出費は月末と発売日に集中", "グッズの発売・予約のタイミングと一致")]):
    y = 1.5 + i * 2.2
    d.box(s, 5.7, y, 3.85, 2.0, fill="white", line="line", radius=0.12, shadow=True)
    d.pic(s, im, 5.8, y + 0.15, h=1.7)
    d.text(s, 7.35, y + 0.1, 2.1, 1.8, [dict(t=t, size=13.5, bold=True, color="navy", after=4),
                                        dict(t=b, size=12, color="text")], margin=(0, 0, 0, 0), anchor="m")
d.box(s, L, 5.95, R - L, 0.8, fill="purpleL", radius=0.1,
      text="予備調査（睡眠への支障 約3割）と同じく、睡眠の疲れが最も多い。提案も睡眠に関わる案が選ばれやすい",
      size=12.5, bold=True, color="purple", align="l", margin=(0.2, 0.03, 0.15, 0.03))
d.assumed(s)
d.notes(s, "記録期間中に、いちばんの疲れとして選ばれた中身の割合です。睡眠が38%で最も多く、予備調査で約3割が睡眠への支障を感じていたことと一致しています。")

# 9 ---------------------------------------------------------------- week-1 intervention
s = d.slide("介入1週目：どの提案が選ばれ、実行されたか")
cats = ["群B（文章）", "群C（アバター）"]
d.bar(s, L, 1.45, 5.6, 3.2, cats,
      [("楽しさキープ", [P.CHOICE["B"][0], P.CHOICE["C"][0]]), ("バランス", [P.CHOICE["B"][1], P.CHOICE["C"][1]]),
       ("回復重視", [P.CHOICE["B"][2], P.CHOICE["C"][2]]), ("見送り", [P.CHOICE["B"][3], P.CHOICE["C"][3]])],
      ["B", "blue", "purple", "B8C2CE"], horizontal=True, stacked=True, fmt='0"%"', vmin=0, vmax=100,
      val_visible=False, title="選ばれた提案の割合", gap=50)
d.text(s, L, 4.75, 5.6, 0.4, "「楽しさキープ」と「バランス」で約8割。減らす方向の「回復重視」は2割弱", size=13, bold=True,
       color="navy", margin=(0, 0, 0, 0))
d.box(s, L, 5.25, 5.6, 1.5, fill="panel", radius=0.12)
d.text(s, L + 0.2, 5.3, 5.2, 1.4, [
    dict(t="予備調査の「増やしたい ＞ 減らしたい」と一致", size=13, bold=True, color="navy", after=2),
    dict(t="「組み替える」提案にしたことで、見送りは5%前後に抑えられている", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
for i, (g, v, col, fill) in enumerate([("群B", P.EXEC["B"][0], "blue", "sky"), ("群C", P.EXEC["C"][0], "B", "BL")]):
    y = 1.5 + i * 1.75
    d.box(s, 6.3, y, 3.25, 1.55, fill=fill, radius=0.12)
    d.text(s, 6.45, y + 0.05, 1.0, 1.45, g, size=16, bold=True, color=col, anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 7.3, y + 0.05, 2.15, 1.0, f"{v}%", size=34, bold=True, color=col, anchor="m", margin=(0, 0, 0, 0))
    d.text(s, 7.3, y + 1.0, 2.15, 0.4, "選んだ案を実行できた", size=11.5, color="muted", margin=(0, 0, 0, 0))
d.box(s, 6.3, 5.0, 3.25, 1.75, fill="pinkL", radius=0.12)
d.text(s, 6.45, 5.05, 2.95, 1.65, [
    dict(t="まだ1週分のみ", size=13, bold=True, color="pink", after=2),
    dict(t="群間の検定は事前に決めたとおり終了後に行う。途中で結論は出さない", size=12, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s)
d.notes(s, "介入1週目に選ばれた提案は、楽しさキープとバランスで約8割でした。予備調査の「増やしたい人が多い」という結果と一致しています。"
           "選んだ案を実行できた割合は群Bが54%、群Cが63%でしたが、まだ1週分なので、検定は終了後に行います。")

# 10 --------------------------------------------------------------- incidents
s = d.slide("実験中に起きたことと対応")
d.table(s, L, 1.5, R - L, [
    ["日付", "起きたこと", "対応", "影響"],
    ["11/6", "Android で通知が最大2時間遅れる", "通知の優先度を上げて修正（11/18・全群共通）", "記録率への影響は小さい"],
    ["11/9〜", "強い疲れの記録で相談先を表示（3件）", "手順どおり表示。継続は本人の判断", "各群1件ずつ"],
    ["11/20", "「今のままの顔を見るのがつらい」（群C・1名）", "ミラーの非表示設定を案内", "解析は群Cのまま（ITT）"],
    ["随時", "前日の記録を忘れた", "前日分までの後入力を許可（事前規定）", "後入力は記録の6%"],
], colw=[0.9, 3.0, 3.3, 1.9], rowh=0.72, size=12.5, align=["c", "l", "l", "l"], valign="m")
d.box(s, L, 5.3, R - L, 1.45, fill="sky", radius=0.12)
d.icon(s, "clip", L + 0.2, 5.7, 0.65, bg="navy")
d.text(s, L + 1.1, 5.35, R - L - 1.3, 1.35, [
    dict(t="すべて「逸脱・有害事象の記録表」に日時と内容を記録", size=14, bold=True, color="navy", after=3),
    dict(t="重い有害事象はなし。相談先の表示は事前に決めた基準どおりに作動した", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.assumed(s, "件数は想定値")
d.notes(s, "実験中に起きたことと対応です。Androidで通知が遅れる問題は、全群共通の修正として11/18に直しました。"
           "強い疲れの記録で相談先が表示されたのは3件で、手順どおりに対応しています。群Cで1名、今のままの顔を見るのがつらいという声があり、"
           "非表示設定を案内しました。解析では割り付けた群のまま扱います。")

# 11 --------------------------------------------------------------- analysis plan
s = d.slide("解析計画（11/14 に版を固定）")
d.table(s, L, 1.5, R - L, [
    ["問い", "目的変数", "方法"],
    ["RQ3（主要）", "6週時点の WHO-5", "共分散分析（2週の WHO-5 を共変量）。C対B・B対A を Holm 法で補正"],
    ["RQ2", "毎週の提案の実行（する／しない）", "ロジスティック混合モデル（群×週、参加者ごとの切片）"],
    ["RQ1", "6週時点の予測と実測のずれ", "平均絶対誤差と80%区間に入った割合（母集団モデルと比較）"],
    ["副次", "推し疲れの中身・楽しさ・生活への支障", "線形混合モデル。多重性の補正は行わず探索的に扱う"],
    ["感度分析", "欠測のある参加者を含めた主要解析", "多重代入法（20セット）で同じ結論になるか確認"],
], colw=[1.6, 2.9, 4.6], rowh=0.68, size=12.5, align=["l", "l", "l"], first_col_bold=True, valign="m")
d.box(s, L, 5.75, R - L, 1.0, fill="panel", radius=0.1,
      text="解析は割り付けた群のまま行う（ITT）。「実行した人ほど幸せか」は自己選択の偏りがあるため探索的な補助解析に限る",
      size=12.5, bold=True, color="navy", align="l", margin=(0.2, 0.03, 0.15, 0.03))
d.notes(s, "解析計画は割付の前日、11/14に版を固定しました。主要解析は6週時点のWHO-5の共分散分析で、C対BとB対AをHolm法で補正します。"
           "割り付けた群のまま解析し、実行した人ほど幸せかという分析は探索的な補助解析に限ります。")

# 12 --------------------------------------------------------------- next
s = d.slide("今後の予定と相談事項")
todo = [("12/13", "本実験の終了（6週間）"), ("12/14–16", "事後アンケート（SUS・似ている度・つながり感など）"),
        ("12/17", "データを固定して主要解析を実行"), ("12/18", "次回の進捗で速報"),
        ("12/21〜", "修論の執筆を開始")]
d.text(s, L, 1.5, 4.5, 0.4, "やること", size=16, bold=True, color="navy", margin=(0, 0, 0, 0))
for i, (dt, t) in enumerate(todo):
    y = 1.95 + i * 0.66
    d.pill(s, L, y + 0.1, 1.15, 0.34, dt, fill="blue" if i != 0 else "pink", size=11)
    d.text(s, L + 1.3, y, 3.3, 0.56, t, size=13, color="text", anchor="m", margin=(0, 0, 0, 0))
d.box(s, 5.15, 1.5, 4.4, 3.95, fill="pinkL", radius=0.12)
d.icon(s, "comments", 5.35, 1.65, 0.55, bg="pink")
d.text(s, 6.05, 1.65, 3.3, 0.55, "相談したいこと", size=16, bold=True, color="pink", anchor="m", margin=(0, 0, 0, 0))
d.text(s, 5.35, 2.35, 4.05, 3.0, [
    dict(t="ミラーを非表示にした人の扱い", size=14, bold=True, color="navy", after=2),
    dict(t="主解析は ITT。非表示の人を除いた感度分析も示すか", size=12.5, color="text", after=10),
    dict(t="記録率の差が出てきた場合", size=14, bold=True, color="navy", after=2),
    dict(t="欠測が群で偏ると主要解析に影響。多重代入の結果を本文に並べるか", size=12.5, color="text"),
], margin=(0, 0, 0, 0))
d.box(s, L, 5.65, R - L, 1.1, fill="panel", radius=0.1)
d.icon(s, "eye", L + 0.2, 5.9, 0.6, bg="blue")
d.text(s, L + 1.0, 5.68, R - L - 1.2, 1.04, [
    dict(t="次回（12/18）に見せるもの", size=14, bold=True, color="navy", after=3),
    dict(t="RQ1〜3 の主要な結果（速報）／脱落と記録率／アバターの評価／修論の章立て", size=12.5, color="text"),
], margin=(0, 0, 0, 0), anchor="m")
d.notes(s, "12/13に本実験が終わり、事後アンケートのあと12/17にデータを固定して主要解析を行います。次回12/18に速報を報告します。"
           "相談したいのは、ミラーを非表示にした人の扱いと、記録率の差が出てきた場合の欠測の扱いです。")

d.save(OUT)
print("saved", OUT, d.n, "slides")
