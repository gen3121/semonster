"""手順4 群の比較：群内の前後比較、B 対 C の ANCOVA、傾向スコアの重み付き回帰、Holm 補正。
群は本人が選んだもの（無作為ではない）。B と C の差は「関連」として読む。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from .common import TRAITS, Ctx, holm, md_table

VARS = ["wb", "pss", "shs", "burnout", "joy", "sleep", "money", "duty", "compare"]
PRIMARY = ["wb", "pss"]
MIN_PAIRED = 5
MIN_PER_GROUP = 5


def ps_covariates(S):
    return ["wb", "joy", "sleep", "money", "duty", "compare", "pss", "shs"] + TRAITS + list(S.freq_tags.keys())


def paired(df):
    rows = []
    for g in ["A", "B", "C"]:
        d0 = df[df["group"] == g]
        for v in VARS:
            d = d0[[v, v + "_post"]].astype(float).dropna()
            n = len(d)
            row = {"群": g, "変数": v, "n": n}
            if n < MIN_PAIRED:
                row["注"] = f"n<{MIN_PAIRED}"
                rows.append(row)
                continue
            diff = d[v + "_post"] - d[v]
            t, p = stats.ttest_rel(d[v + "_post"], d[v])
            try:
                w, pw = stats.wilcoxon(diff) if (diff != 0).any() else (np.nan, np.nan)
            except ValueError:
                w, pw = np.nan, np.nan
            sd = diff.std(ddof=1)
            row.update({"開始時": d[v].mean(), "最後": d[v + "_post"].mean(), "差の平均": diff.mean(),
                        "差のSD": sd, "t": t, "p_t": p, "W": w, "p_wilcoxon": pw,
                        "dz": diff.mean() / sd if sd > 0 else np.nan, "注": ""})
            rows.append(row)
    tab = pd.DataFrame(rows)
    tab["p_t_holm（群内）"] = np.nan
    for g in "ABC":
        m = tab["群"] == g
        if "p_t" in tab:
            tab.loc[m, "p_t_holm（群内）"] = holm(tab.loc[m, "p_t"].astype(float).values)
    return tab


def ancova(df, tipi: bool):
    d0 = df[df["group"].isin(["B", "C"])]
    rows = []
    for v in VARS:
        cols = [v, v + "_post", "is_B"] + (TRAITS if tipi else [])
        d = d0[cols].astype(float).dropna()
        nb, nc = int(d["is_B"].sum()), int((1 - d["is_B"]).sum())
        row = {"変数": v, "調整": "開始時＋TIPI" if tipi else "開始時", "n_B": nb, "n_C": nc}
        if min(nb, nc) < MIN_PER_GROUP:
            row["注"] = f"どちらかの群が{MIN_PER_GROUP}人未満"
            rows.append(row)
            continue
        f = f"{v}_post ~ is_B + {v}" + ("".join(f" + {t}" for t in TRAITS) if tipi else "")
        r = smf.ols(f, data=d).fit()
        ci = r.conf_int().loc["is_B"]
        row.update({"B−C（調整済み）": r.params["is_B"], "SE": r.bse["is_B"], "CI下": ci[0], "CI上": ci[1],
                    "p": r.pvalues["is_B"], "注": ""})
        rows.append(row)
    return pd.DataFrame(rows)


def ipw(ctx: Ctx, df, S):
    """B（=1）対 C（=0）の傾向スコア。安定化 IPW、1〜99パーセンタイルで切り詰め。"""
    cov = ps_covariates(S)
    d = df[df["group"].isin(["B", "C"])].dropna(subset=cov).copy()
    info = {"covariates": cov, "n": len(d)}
    if len(d) < 2 * MIN_PER_GROUP or d["is_B"].nunique() < 2 or min(d["is_B"].sum(), (1 - d["is_B"]).sum()) < MIN_PER_GROUP:
        info["skipped"] = "B と C の人数が足りない"
        return None, info
    Z = StandardScaler().fit_transform(d[cov].astype(float))
    lr = LogisticRegression(C=1.0, max_iter=2000).fit(Z, d["is_B"])   # 弱い L2 正則化で分離を防ぐ
    ps = np.clip(lr.predict_proba(Z)[:, 1], 0.01, 0.99)
    pb = d["is_B"].mean()
    w = np.where(d["is_B"] == 1, pb / ps, (1 - pb) / (1 - ps))
    lo, hi = np.percentile(w, [1, 99])
    w = np.clip(w, lo, hi)
    d["ps"], d["w"] = ps, w
    # 釣り合いの確認（標準化平均差）
    bal = []
    for c in cov:
        x, t = d[c].astype(float), d["is_B"]
        sdp = np.sqrt((x[t == 1].var() + x[t == 0].var()) / 2)
        raw = (x[t == 1].mean() - x[t == 0].mean()) / sdp if sdp > 0 else np.nan
        mw = lambda m: np.average(x[m], weights=d.loc[m, "w"])
        wtd = (mw(t == 1) - mw(t == 0)) / sdp if sdp > 0 else np.nan
        bal.append({"共変量": c, "SMD_重みなし": raw, "SMD_重みあり": wtd})
    ess = lambda m: d.loc[m, "w"].sum() ** 2 / (d.loc[m, "w"] ** 2).sum()
    info.update(weight_trim=[float(lo), float(hi)], ess_B=float(ess(d["is_B"] == 1)), ess_C=float(ess(d["is_B"] == 0)),
                balance=bal, ps_range=[float(ps.min()), float(ps.max())])
    return d[["pid", "ps", "w"]], info


def weighted_reg(df, wts):
    d0 = df.merge(wts, on="pid")
    rows = []
    for v in VARS:
        d = d0[[v, v + "_post", "is_B", "w"]].astype(float).dropna()
        row = {"変数": v, "n": len(d)}
        if len(d) < 2 * MIN_PER_GROUP or d["is_B"].nunique() < 2:
            row["注"] = "n不足"
            rows.append(row)
            continue
        r = smf.wls(f"{v}_post ~ is_B + {v}", data=d, weights=d["w"]).fit(cov_type="HC3")
        ci = r.conf_int().loc["is_B"]
        row.update({"B−C（重み付き）": r.params["is_B"], "SE_HC3": r.bse["is_B"], "CI下": ci[0], "CI上": ci[1],
                    "p": r.pvalues["is_B"], "注": ""})
        rows.append(row)
    return pd.DataFrame(rows)


def add_holm(tab: pd.DataFrame) -> pd.DataFrame:
    tab = tab.copy()
    tab["族"] = np.where(tab["変数"].isin(PRIMARY), "主要", "副次")
    tab["p_holm"] = np.nan
    if "p" in tab:
        for fam in ["主要", "副次"]:
            m = tab["族"] == fam
            tab.loc[m, "p_holm"] = holm(tab.loc[m, "p"].astype(float).values)
    return tab


def run(ctx: Ctx):
    S = ctx.scheme
    df = ctx.store["main"]
    ctx.md("## 手順4 群の比較（群は本人の選択。差は「関連」）", "")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        pt = paired(df)
    ctx.save_csv("s4_paired.csv", pt)
    ctx.md("### 4-1 群内の前後比較（対応のある t 検定・Wilcoxon、効果量 dz）", "",
           *md_table(pt[[c for c in ["群", "変数", "n", "開始時", "最後", "差の平均", "dz", "p_t", "p_wilcoxon",
                                     "p_t_holm（群内）", "注"] if c in pt.columns]], 2), "",
           "群内の前後差には、時間の経過・平均への回帰・調査に答えること自体の影響が混ざる。p_t_holm は群ごとに9変数で Holm 補正した値（副次）。", "")

    a1, a2 = add_holm(ancova(df, False)), ancova(df, True)
    ctx.save_csv("s4_ancova.csv", pd.concat([a1, a2], ignore_index=True))
    ctx.md("### 4-2 ANCOVA（最後の値 ~ 群 + 開始時の値、B 対 C、基準は C）", "",
           "主要な検定は WHO-5（wb）と PSS-J（pss）の2つで、この2つの中で Holm 補正する。ほかの7変数は副次で、7つの中で Holm 補正する。", "",
           *md_table(a1, 2), "", "TIPI 5特性も調整したもの（感度）：", "", *md_table(a2, 2), "")

    wts, info = ipw(ctx, df, S)
    ctx.save_json("s4_propensity.json", info)
    ctx.md("### 4-3 傾向スコアの重み付き回帰（安定化 IPW、HC3 頑健 SE）", "")
    if wts is None:
        ctx.md(f"実行しなかった：{info['skipped']}。", "")
        ctx.store["ipw"] = None
    else:
        ctx.store["ipw"] = wts
        ctx.save_csv("s4_ipw_weights.csv", wts)
        wr = add_holm(weighted_reg(df, wts))
        ctx.save_csv("s4_ipw_regression.csv", wr)
        bal = pd.DataFrame(info["balance"])
        ctx.md(f"n={info['n']}、傾向スコアの範囲 {info['ps_range'][0]:.2f}〜{info['ps_range'][1]:.2f}、"
               f"有効標本サイズ B {info['ess_B']:.1f}・C {info['ess_C']:.1f}。"
               f"重みあり SMD の最大 {bal['SMD_重みあり'].abs().max():.2f}（.1 未満が目安）。", "",
               *md_table(wr, 2), "",
               "傾向スコアは測った共変量の偏りしか補正しない。測っていない理由（やる気など）で選んだ違いは残る。", "")

    # 感度分析：注意確認に合わなかった人・プレ実験の人も含める
    sens = add_holm(ancova(ctx.store["sens"], False))
    sens = sens[sens["変数"].isin(PRIMARY)]
    ctx.save_csv("s4_ancova_sensitivity.csv", sens)
    ctx.md("### 4-4 感度分析（注意確認に合わなかった人・プレ実験の人を含めた ANCOVA、主要2変数）", "",
           *md_table(sens, 2), "")
