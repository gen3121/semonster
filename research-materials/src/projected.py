"""Projected (assumed) study numbers shared by 進捗③④・公聴会・CHIIR decks.

Every value here is a placeholder projection, not data. Slides that use them carry
the 「想定値」 badge; replace them with the real results after the experiment.
"""

FLOW = dict(applied=241, consented=233, started=228, week2=213, alloc=(71, 71, 71),
            week4=(69, 70, 70), completed=(64, 66, 67))
EXCLUDED = dict(no_oshi=3, minor=2, withdrew=3)

# baseline period (all groups log only), daily logging rate %
BASE_LOG = [97, 95, 93, 92, 91, 90, 88, 89, 88, 87, 86, 86, 85, 84]
BASE_LOG_SEC = 31
NOTIF_SHARE = 42  # % of logs made right after the 21:00 reminder

BALANCE = [
    ["", "群A 記録のみ", "群B 提案（文章）", "群C 提案＋アバター"],
    ["人数", "71", "71", "71"],
    ["年齢（平均）", "22.4", "22.8", "22.5"],
    ["女性の割合", "72%", "70%", "73%"],
    ["WHO-5（2週・0〜25）", "13.2", "13.1", "13.3"],
    ["推し疲れ（1〜5）", "2.9", "3.0", "2.9"],
    ["充実（1〜5）", "3.8", "3.8", "3.7"],
    ["記録率（1〜2週）", "89%", "88%", "90%"],
]

# 80% prediction-interval half-width before / after 14 days of logs
PI = dict(wb=(0.91, 0.67), bo=(1.18, 0.86))
PI_SIM = dict(wb=0.64, bo=0.83)

FACETS = ["睡眠", "出費", "義務感", "比較"]
FACET_SHARE = [38, 27, 19, 16]

# proposals chosen in intervention week 1 (week 3): keep / balance / recovery / skip (%)
CHOICE = dict(B=[41, 36, 17, 6], C=[38, 39, 19, 4])

# execution rate of the chosen proposal, weeks 3-6 (%)
EXEC = dict(B=[54, 49, 46, 44], C=[63, 61, 58, 57])
EXEC_OR = dict(or_=1.71, lo=1.18, hi=2.48, p=".005")

# WHO-5 raw score (0-25) at week 0, 2, 4, 6
WHO5 = dict(A=[13.0, 13.2, 13.1, 13.0], B=[13.2, 13.1, 13.6, 13.8], C=[13.1, 13.3, 14.2, 14.7])
ANCOVA = [
    ["比較", "調整済みの差", "95%信頼区間", "p（Holm 補正後）"],
    ["C − B（主要）", "+0.9", "−0.1 〜 +1.9", ".08（.16）"],
    ["B − A（主要）", "+0.8", "−0.2 〜 +1.8", ".12（.16）"],
    ["C − A（探索的）", "+1.7", "+0.7 〜 +2.7", ".001"],
]
ADJ = dict(A=13.0, B=13.8, C=14.6)

# prediction accuracy at week 6 (MAE on 1-5 scale) and 80% PI coverage
MAE = dict(wb=(0.68, 0.49), bo=(0.84, 0.62))
COVER = dict(wb=78, bo=76)

# change in fatigue facets (week 2 -> week 6), negative = better
FACET_CHANGE = dict(A=[-0.02, 0.03, -0.05, 0.00], B=[-0.15, -0.12, -0.10, -0.06], C=[-0.31, -0.22, -0.14, -0.05])
JOY = dict(A=(3.9, 3.9), B=(3.9, 3.9), C=(3.8, 3.9))

# weekly logging rate (%) weeks 1-6
LOG_WEEK = dict(A=[91, 87, 82, 78, 74, 71], B=[90, 88, 84, 81, 78, 75], C=[91, 88, 87, 86, 84, 83])

AVATAR_EVAL = dict(similar=3.7, continuity_C=4.6, continuity_B=4.1, trust=3.4, anxiety_C=1.9, anxiety_B=1.8,
                   sus=dict(A=79.0, B=77.8, C=76.4))

QUOTES = [
    ("群C", "ぼやけていた自分がだんだんはっきりしてくるのが楽しみで、記録を続けられた"),
    ("群B", "「推しを減らせ」と言われないのがよかった。グッズの買い方だけ変えた"),
    ("群C", "「今のまま」の自分の顔を見て、夜中まで配信を見るのをやめようと思った"),
    ("群C", "予測が2週続けて外れて、少し信用できなくなった"),
]
