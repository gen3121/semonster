"""手順5 幸福度の根拠：WHO-5 が10点以上上がった人の重み付きロジスティック回帰、
WHO-5（3時点）の線形混合モデル、実行率との用量反応、ブートストラップ媒介分析。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

from .common import Ctx, fmt, md_table

MIN_LOGIT = 20
MIN_MIXED_PIDS = 10
MIN_DOSE = 10
MIN_MED = 15


def improved_logit(ctx: Ctx, df):
    d = df[df["group"].isin(["B", "C"])].dropna(subset=["wb", "wb_post"]).copy()
    d["improved"] = ((d["wb_post"] - d["wb"]) >= 10).astype(int)
    rates = df.dropna(subset=["wb", "wb_post"]).assign(
        improved=lambda x: ((x["wb_post"] - x["wb"]) >= 10).astype(int)).groupby("group")["improved"].agg(["count", "mean"])
    res = {"rates_by_group": rates.reset_index().rename(columns={"count": "n", "mean": "割合"}).to_dict(orient="records")}
    wts = ctx.store.get("ipw")
    if wts is None or len(d) < MIN_LOGIT:
        res["skipped"] = "IPW の重みがない、または n 不足"
        return res
    d = d.merge(wts, on="pid")
    if d["improved"].nunique() < 2:
        res["skipped"] = "改善した人／しなかった人のどちらかがいない"
        return res
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            X = sm.add_constant(d[["is_B", "wb"]].astype(float))
            r = sm.GLM(d["improved"], X, family=sm.families.Binomial(), var_weights=d["w"]).fit(cov_type="HC0")
        ci = r.conf_int().loc["is_B"]
        res.update(n=len(d), OR_B_vs_C=float(np.exp(r.params["is_B"])), CI_low=float(np.exp(ci[0])),
                   CI_high=float(np.exp(ci[1])), p=float(r.pvalues["is_B"]), adjusted_for="開始時の WHO-5、IPW")
    except Exception as e:
        res["error"] = f"{type(e).__name__}: {e}"
    return res


def long_who5(df):
    rows = []
    for _, r in df.iterrows():
        rows.append({"pid": r["pid"], "group": r["group"], "day": 0.0, "wb": r["wb"]})
        if np.isfinite(r.get("wb_r3", np.nan)) and np.isfinite(r.get("day_r3", np.nan)):
            rows.append({"pid": r["pid"], "group": r["group"], "day": float(r["day_r3"]), "wb": r["wb_r3"]})
        if np.isfinite(r.get("wb_post", np.nan)) and np.isfinite(r.get("final_day", np.nan)):
            rows.append({"pid": r["pid"], "group": r["group"], "day": float(r["final_day"]), "wb": r["wb_post"]})
    return pd.DataFrame(rows, columns=["pid", "group", "day", "wb"]).dropna(subset=["wb"])


def mixed(df):
    L = long_who5(df)
    res = {"n_pid": int(L["pid"].nunique()) if len(L) else 0, "n_obs": len(L),
           "formula": "wb ~ day * C(group, Treatment('C')) + (1 | pid)"}
    if res["n_pid"] < MIN_MIXED_PIDS or L["group"].nunique() < 2 or "C" not in set(L["group"]):
        res["skipped"] = "人数が足りない、または群 C がない"
        return res, L
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            r = smf.mixedlm("wb ~ day * C(group, Treatment('C'))", L, groups=L["pid"]).fit(reml=True)
        ci = r.conf_int()
        fe = [{"項": k, "推定値": float(r.fe_params[k]), "SE": float(r.bse_fe[k]), "CI下": float(ci.loc[k, 0]),
               "CI上": float(ci.loc[k, 1]), "p": float(r.pvalues[k])} for k in r.fe_params.index]
        res.update(converged=bool(r.converged), fixed_effects=fe,
                   random_intercept_var=float(r.cov_re.iloc[0, 0]), residual_var=float(r.scale))
    except Exception as e:
        res["error"] = f"{type(e).__name__}: {e}"
    return res, L


def dose(df):
    d0 = df[df["group"] == "B"]
    out = []
    for v in ["wb", "burnout"]:
        d = d0[["exec_rate", v, "d_" + v]].astype(float).dropna()
        row = {"結果": f"{v} の変化", "n": len(d)}
        if len(d) < MIN_DOSE or d["exec_rate"].std() == 0:
            row["注"] = "n不足または実行率がばらつかない"
            out.append(row)
            continue
        r = smf.ols(f"d_{v} ~ exec_rate + {v}", data=d).fit(cov_type="HC3")
        ci = r.conf_int().loc["exec_rate"]
        row.update({"実行率の係数": r.params["exec_rate"], "SE_HC3": r.bse["exec_rate"], "CI下": ci[0], "CI上": ci[1],
                    "p": r.pvalues["exec_rate"], "注": "実行率0→1の差。開始時の値を調整"})
        out.append(row)
    return pd.DataFrame(out)


def mediation(ctx: Ctx, df):
    """X=実行率 → M=推し疲れの変化 → Y=WHO-5 の変化（群B）。パーセンタイル法のブートストラップ。"""
    d = df[df["group"] == "B"][["exec_rate", "d_burnout", "d_wb", "burnout", "wb"]].astype(float).dropna()
    res = {"n": len(d), "n_boot": ctx.n_boot, "X": "exec_rate", "M": "d_burnout", "Y": "d_wb",
           "covariates": "M のモデルに開始時 burnout、Y のモデルに開始時 wb"}
    if len(d) < MIN_MED or d["exec_rate"].std() == 0:
        res["skipped"] = "n 不足、または実行率がばらつかない"
        return res
    arr = d.to_numpy()

    def est(a_):
        X, M, Y, Bp, Wp = a_.T
        A = np.column_stack([np.ones(len(X)), X, Bp])
        a = np.linalg.lstsq(A, M, rcond=None)[0][1]
        B = np.column_stack([np.ones(len(X)), M, X, Wp])
        cb = np.linalg.lstsq(B, Y, rcond=None)[0]
        return a, cb[1], cb[2], a * cb[1]

    a, b, cp, ab = est(arr)
    rng = ctx.rng(5)
    bs = np.array([est(arr[rng.integers(0, len(arr), len(arr))]) for _ in range(ctx.n_boot)])
    lo, hi = np.percentile(bs[:, 3], [2.5, 97.5])
    res.update(a=float(a), b=float(b), direct=float(cp), indirect=float(ab), indirect_ci=[float(lo), float(hi)],
               total=float(ab + cp))
    return res


def plot_traj(ctx: Ctx, L):
    try:
        from .common import setup_font
        setup_font()
        import matplotlib.pyplot as plt
        col = {"A": "#424754", "B": "#0058be", "C": "#825100"}
        fig, ax = plt.subplots(figsize=(5.2, 3.4))
        for g in sorted(L["group"].unique()):
            x = L[L["group"] == g].copy()
            x["時点"] = pd.cut(x["day"], [-1, 1, 21, 99], labels=["開始時", "3回目", "最後"])
            m = x.groupby("時点", observed=True).agg(day=("day", "mean"), wb=("wb", "mean"))
            ax.plot(m["day"], m["wb"], "o-", color=col.get(g, "k"), label=f"群{g}")
        ax.set_xlabel("開始からの日数")
        ax.set_ylabel("WHO-5（0〜100）")
        ax.set_title("WHO-5 の平均の推移（群は本人の選択）")
        ax.legend()
        fig.tight_layout()
        fig.savefig(ctx.out_dir / "s5_who5_trajectory.png", dpi=150)
        plt.close(fig)
        ctx.outputs.append("s5_who5_trajectory.png")
    except Exception:
        pass


def run(ctx: Ctx):
    df = ctx.store["main"]
    ctx.md("## 手順5 幸福度の根拠", "")
    lg = improved_logit(ctx, df)
    ctx.save_json("s5_improved_logit.json", lg)
    ctx.md("### 5-1 WHO-5 が10点以上上がった人（0〜100点）", "",
           *md_table(pd.DataFrame(lg["rates_by_group"]), 2), "")
    if "skipped" in lg or "error" in lg:
        ctx.md(f"重み付きロジスティック回帰は実行しなかった：{lg.get('skipped', lg.get('error'))}。", "")
    else:
        ctx.md(f"IPW 重み付きロジスティック回帰（開始時 WHO-5 を調整、n={lg['n']}）：B 対 C のオッズ比 "
               f"{fmt(lg['OR_B_vs_C'])}（95%CI {fmt(lg['CI_low'])}〜{fmt(lg['CI_high'])}、p={fmt(lg['p'], 3)}）。", "")

    mx, L = mixed(df)
    ctx.save_json("s5_mixed_who5.json", mx)
    if len(L):
        ctx.save_csv("s5_who5_long.csv", L)
    ctx.md("### 5-2 線形混合モデル（WHO-5 を3時点：開始時0日・3回目の振り返りの日・最後の調査の日）", "",
           f"式：{mx['formula']}。基準は群C。人数 {mx['n_pid']}、観測 {mx['n_obs']}。", "")
    if "skipped" in mx or "error" in mx:
        ctx.md(f"実行しなかった：{mx.get('skipped', mx.get('error'))}。", "")
    else:
        ctx.md(*md_table(pd.DataFrame(mx["fixed_effects"]), 3), "",
               "「day:C(group)[T.B]」が群Bと群Cの1日あたりの傾きの差（×28 で4週間分）。"
               f"収束：{'した' if mx['converged'] else 'していない'}。", "")
        plot_traj(ctx, L)

    ds = dose(df)
    ctx.save_csv("s5_dose_response.csv", ds)
    ctx.md("### 5-3 用量反応（群B：変化量 ~ 実行率 + 開始時の値、HC3）", "", *md_table(ds, 2), "",
           "実行率は本人が決めるので、続けられた人がもともと良くなりやすい人だった可能性がある（関連）。", "")

    md = mediation(ctx, df)
    ctx.save_json("s5_mediation.json", md)
    ctx.md(f"### 5-4 媒介分析（群B：実行率 → 推し疲れの変化 → WHO-5 の変化、ブートストラップ {ctx.n_boot} 回）", "")
    if "skipped" in md:
        ctx.md(f"実行しなかった：{md['skipped']}。", "")
    else:
        ctx.md(f"n={md['n']}。a={fmt(md['a'])}、b={fmt(md['b'])}、間接効果 a×b={fmt(md['indirect'])}"
               f"（95%CI {fmt(md['indirect_ci'][0])}〜{fmt(md['indirect_ci'][1])}）、直接効果 {fmt(md['direct'])}。",
               "M と Y は同じ期間の変化量なので、時間の順序は保証されない。媒介は「関連の分解」として読む。", "")
