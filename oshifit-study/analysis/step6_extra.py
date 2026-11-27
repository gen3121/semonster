"""手順6 今回追加：性格との交互作用（HC3）と LASSO の安定性選択。どちらも探索的。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from sklearn.linear_model import Lasso, LassoCV
from sklearn.preprocessing import StandardScaler

from .common import TRAITS, Ctx, holm, md_table

MIN_INT = 20
MIN_STAB = 30
THRESH = 0.6


def interactions(df):
    rows = []
    bc = df[df["group"].isin(["B", "C"])]
    for v in ["wb", "burnout"]:
        for t in TRAITS:
            d = bc[[f"d_{v}", v, "is_B", t]].astype(float).dropna()
            row = {"モデル": f"d_{v} ~ B × {t}（B∪C）", "n": len(d)}
            if len(d) < MIN_INT or d["is_B"].nunique() < 2:
                row["注"] = "n不足"
                rows.append(row)
                continue
            d[t + "_c"] = d[t] - d[t].mean()
            r = smf.ols(f"d_{v} ~ is_B * {t}_c + {v}", data=d).fit(cov_type="HC3")
            k = f"is_B:{t}_c"
            rows.append({**row, "交互作用": r.params[k], "SE_HC3": r.bse[k], "p": r.pvalues[k], "注": "性格は中心化"})
    b = df[df["group"] == "B"]
    for v in ["wb", "burnout"]:
        for t in TRAITS:
            d = b[[f"d_{v}", v, "exec_rate", t]].astype(float).dropna()
            row = {"モデル": f"d_{v} ~ 実行率 × {t}（B）", "n": len(d)}
            if len(d) < MIN_INT or d["exec_rate"].std() == 0:
                row["注"] = "n不足"
                rows.append(row)
                continue
            d[t + "_c"] = d[t] - d[t].mean()
            d["er_c"] = d["exec_rate"] - d["exec_rate"].mean()
            r = smf.ols(f"d_{v} ~ er_c * {t}_c + {v}", data=d).fit(cov_type="HC3")
            k = f"er_c:{t}_c"
            rows.append({**row, "交互作用": r.params[k], "SE_HC3": r.bse[k], "p": r.pvalues[k], "注": "中心化"})
    tab = pd.DataFrame(rows)
    if "p" in tab:
        tab["p_holm（20本）"] = holm(tab["p"].astype(float).values)
    return tab


def stability(ctx: Ctx, df, S):
    feats = ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "shs", "pss"] + TRAITS + \
        list(S.freq_tags.keys()) + ["is_B"]
    bc = df[df["group"].isin(["B", "C"])]
    out, info = [], {"features": feats, "subsample": 0.5, "repeats": ctx.n_stab, "threshold": THRESH}
    rng = ctx.rng(6)
    for v in ["d_wb", "d_burnout"]:
        d = bc[feats + [v]].astype(float).dropna()
        if len(d) < MIN_STAB:
            info[v] = {"n": len(d), "skipped": f"n<{MIN_STAB}"}
            continue
        X = StandardScaler().fit_transform(d[feats])
        y = d[v].to_numpy()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            cv = LassoCV(cv=5, random_state=ctx.seed).fit(X, y)
            alpha = cv.alpha_   # 全体の LassoCV で選んだ α を固定して部分標本ごとに当てはめる
            sel = np.zeros(len(feats))
            m = len(y) // 2
            for _ in range(ctx.n_stab):
                idx = rng.choice(len(y), m, replace=False)
                c = Lasso(alpha=alpha, max_iter=10000).fit(X[idx], y[idx]).coef_
                sel += (c != 0)
        prob = sel / ctx.n_stab
        info[v] = {"n": len(d), "alpha_cv": float(cv.alpha_), "alpha_used": float(alpha)}
        for f, p in zip(feats, prob):
            out.append({"結果": v, "特徴": f, "選択確率": p, "安定": "○" if p >= THRESH else ""})
    return pd.DataFrame(out), info


def run(ctx: Ctx):
    S = ctx.scheme
    df = ctx.store["main"]
    ctx.md("## 手順6 今回追加（探索的）", "")
    it = interactions(df)
    ctx.save_csv("s6_interactions.csv", it)
    ctx.md("### 6-1 性格との交互作用（HC3 頑健 SE）", "",
           "「群B × 性格」は、提案を選んだことと変化の関連が性格で違うか。「実行率 × 性格」は群Bの中で、"
           "実行率と変化の関連が性格で違うか。20本を Holm 補正した値も示す。", "", *md_table(it, 3), "")
    st, info = stability(ctx, df, S)
    ctx.save_csv("s6_stability_selection.csv", st)
    ctx.save_json("s6_stability_selection.json", info)
    ctx.md(f"### 6-2 LASSO の安定性選択（B∪C、50%の部分標本 × {ctx.n_stab} 回、しきい値 {THRESH}）", "")
    if len(st) == 0:
        ctx.md("実行しなかった（n 不足）。", "")
    else:
        stable = st[st["安定"] == "○"]
        for v in st["結果"].unique():
            s = stable[stable["結果"] == v]
            ctx.md(f"- {v}（n={info[v]['n']}、α={info[v]['alpha_used']:.3g}）：安定して選ばれた特徴 = "
                   + ("、".join(s["特徴"]) if len(s) else "なし"))
        ctx.md("", "選ばれた特徴は「変化の予測に役立つ」ことを示すだけで、原因とは限らない。全特徴の確率は s6_stability_selection.csv。", "")
    for v in ["d_wb", "d_burnout"]:
        if isinstance(info.get(v), dict) and "skipped" in info[v]:
            ctx.md(f"- {v}：実行しなかった（{info[v]['skipped']}）。")
    ctx.md("")
