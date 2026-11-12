"""手順1 尺度の確認：Cronbach の α（ブートストラップ95%CI）、5因子の CFA、収束・弁別の相関。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from scipy import stats

from .common import TRAITS, Ctx, cronbach_alpha, fmt, md_table

MIN_ALPHA_N = 10
MIN_CFA_N = 50

# 期待する相関の向き（収束：同じ向き、弁別：逆向き）
EXPECT = [("burnout", "pss", +1, "推し疲れとストレスは正"), ("joy", "wb", +1, "充実と WHO-5 は正"),
          ("joy", "shs", +1, "充実と SHS は正"), ("wb", "shs", +1, "WHO-5 と SHS は正"),
          ("wb", "pss", -1, "WHO-5 とストレスは負"), ("burnout", "wb", -1, "推し疲れと WHO-5 は負"),
          ("shs", "pss", -1, "SHS とストレスは負")]


def alpha_ci(x: pd.DataFrame, n_boot: int, rng) -> tuple[float, float, float, int]:
    x = x.dropna()
    n = len(x)
    a = cronbach_alpha(x)
    if n < MIN_ALPHA_N:
        return a, np.nan, np.nan, n
    arr = x.to_numpy()
    bs = [cronbach_alpha(arr[rng.integers(0, n, n)]) for _ in range(n_boot)]
    bs = np.array([b for b in bs if np.isfinite(b)])
    lo, hi = (np.percentile(bs, [2.5, 97.5]) if len(bs) > 10 else (np.nan, np.nan))
    return a, lo, hi, n


def srmr(model, data: pd.DataFrame) -> float:
    obs = model.vars["observed"]
    S = np.cov(data[obs].to_numpy(), rowvar=False)
    sigma = model.calc_sigma()[0]
    d = np.sqrt(np.diag(S))
    r_s = S / np.outer(d, d)
    ds = np.sqrt(np.diag(sigma))
    r_m = sigma / np.outer(ds, ds)
    iu = np.tril_indices(len(obs))
    return float(np.sqrt(np.mean((r_s[iu] - r_m[iu]) ** 2)))


def run_cfa(df: pd.DataFrame, S) -> dict:
    import semopy
    names = {"joy": "Joy", "sleep": "Sleep", "money": "Money", "duty": "Duty", "compare": "Compare"}
    desc = "\n".join(f"{names[f]} =~ " + " + ".join(S.axis_items[f]) for f in S.factors)
    items = [i for f in S.factors for i in S.axis_items[f]]
    data = df[items].astype(float).dropna()
    res = {"model": desc, "n": len(data)}
    if len(data) < MIN_CFA_N:
        res["skipped"] = f"n={len(data)} が {MIN_CFA_N} 未満のため実行しない"
        return res
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m = semopy.Model(desc)
            r = m.fit(data, obj="MLW")
            st = semopy.calc_stats(m).T
        res["converged"] = bool(getattr(r, "success", True))
        for k in ["chi2", "DoF", "chi2 p-value", "CFI", "TLI", "RMSEA", "AIC", "BIC"]:
            if k in st.index:
                res[k] = float(st.loc[k].iloc[0])
        res["SRMR"] = srmr(m, data)
        est = m.inspect(std_est=True)
        res["loadings"] = est[est["op"] == "~"][["lval", "rval", "Estimate", "Est. Std", "p-value"]].rename(
            columns={"lval": "item", "rval": "factor"}).to_dict(orient="records")
        bad = [l for l in res["loadings"] if not np.isfinite(l["Est. Std"]) or abs(l["Est. Std"]) > 1.0]
        if bad:
            res["warning"] = "標準化負荷が1を超える、または計算できない項目がある（不適解の可能性）"
    except Exception as e:  # 収束しない・行列が特異など
        res["error"] = f"{type(e).__name__}: {e}"
    return res


def run(ctx: Ctx):
    S = ctx.scheme
    df = ctx.store["main"]
    rng = ctx.rng(1)
    ctx.md("## 手順1 尺度の確認", "")
    # α
    scales = [("joy", "推し活の充実（7項目）"), ("burnout", "推し疲れ（8項目）"), ("who5", "WHO-5（5項目）"),
              ("shs", "SHS（4項目、H4逆転）"), ("pss", "PSS-J（14項目、7項目逆転）")] + \
             [(k, f"負担の組：{k}（2項目）") for k in S.burden_axes]
    rows = []
    nb = min(ctx.n_boot, 2000)
    for key, label in scales:
        a, lo, hi, n = alpha_ci(S.item_matrix(df, key), nb, rng)
        rows.append({"尺度": label, "時点": "開始時", "n": n, "alpha": a, "CI下": lo, "CI上": hi})
    adf = pd.DataFrame(rows)
    ctx.save_csv("s1_alpha.csv", adf)
    ctx.md(f"### 1-1 Cronbach の α（開始時、本分析 n={len(df)}、ブートストラップ {nb} 回の95%CI）", "")
    ctx.md(*md_table(adf), "", "2項目の組の α は2項目の相関から決まるので、目安として読む。", "")

    # CFA
    cfa = run_cfa(df, S)
    ctx.save_json("s1_cfa.json", cfa)
    ctx.md("### 1-2 確認的因子分析（5因子：充実・睡眠・お金・義務感・比較）", "")
    if "skipped" in cfa:
        ctx.md(f"実行しなかった：{cfa['skipped']}。", "")
    elif "error" in cfa:
        ctx.md(f"推定できなかった（{cfa['error']}）。標本を増やすか、2項目因子の負荷を等しく固定する案を検討する。", "")
    else:
        ctx.md(f"n={cfa['n']}、収束：{'した' if cfa.get('converged') else 'していない可能性'}。"
               f"CFI={fmt(cfa.get('CFI'), 3)}、TLI={fmt(cfa.get('TLI'), 3)}、RMSEA={fmt(cfa.get('RMSEA'), 3)}、"
               f"SRMR={fmt(cfa.get('SRMR'), 3)}、χ²({fmt(cfa.get('DoF'), 0)})={fmt(cfa.get('chi2'), 1)}。",
               "目安（Hu & Bentler, 1999）：CFI・TLI ≥ .95、RMSEA ≤ .06、SRMR ≤ .08。2項目の因子は推定が不安定になりやすい。")
        if cfa.get("warning"):
            ctx.md(f"注意：{cfa['warning']}。")
        ctx.md("")

    # 相関
    vars_ = ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "shs", "pss"] + TRAITS
    sub = df[vars_].astype(float)
    corr = sub.corr()
    ctx.save_csv("s1_correlations.csv", corr.reset_index().rename(columns={"index": "var"}))
    chk = []
    for a, b, sign, label in EXPECT:
        x = sub[[a, b]].dropna()
        if len(x) < 5:
            chk.append({"組": label, "n": len(x), "r": np.nan, "p": np.nan, "期待どおり": "n不足"})
            continue
        r, p = stats.pearsonr(x[a], x[b])
        chk.append({"組": label, "n": len(x), "r": r, "p": p, "期待どおり": "はい" if np.sign(r) == sign else "いいえ"})
    cdf = pd.DataFrame(chk)
    ctx.save_csv("s1_validity_checks.csv", cdf)
    ctx.md("### 1-3 収束・弁別の確認（ピアソン相関、開始時）", "", *md_table(cdf),
           "", "相関行列の全体は s1_correlations.csv。", "")
