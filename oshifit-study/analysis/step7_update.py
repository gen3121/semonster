"""手順7 研究終了後：提案ごとの改善量を縮約（経験ベイズ）で更新し、見込みの80%区間の幅を実測から推定し直す。
結果は次の版のアプリの PLANS.eff と hw/hwWb を見直す材料。そのまま差し替える前に指導教員と確認する。"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .common import Ctx, load_plans, md_table, shrink

MIN_SE_FLOOR = 1.0     # 観測の SE がこれより小さいときは下限にする（2〜3人で SD がほぼ 0 になるのを防ぐ）
AXES_PRED = ["joy", "sleep", "money", "duty", "compare", "burnout"]


def split_ids(s):
    if not isinstance(s, str) or not s.strip():
        return []
    return [x.strip() for x in s.split(";") if x.strip()]


def plan_effects(ctx: Ctx, df, plans):
    B = df[df["group"] == "B"]
    C = df[df["group"] == "C"]
    rows = []
    for pid_, p in plans.items():
        ax = p["axis"]
        chose = B[B["plans_chosen"].apply(lambda s: pid_ in split_ids(s))]
        d = chose["d_" + ax].astype(float).dropna()
        n = len(d)
        obs = float(d.mean()) if n else np.nan
        sd = float(d.std(ddof=1)) if n >= 2 else np.nan
        se = max(sd / np.sqrt(n), MIN_SE_FLOOR) if n >= 2 else np.nan
        post, psd = shrink(p["eff"], ctx.prior_sd, obs, se)
        c_d = C["d_" + ax].astype(float).dropna()
        rows.append({"id": pid_, "axis": ax, "prior": p["eff"], "prior_sd": ctx.prior_sd, "n": n,
                     "observed": obs, "observed_sd": sd, "observed_se": se, "posterior": post, "posterior_sd": psd,
                     "only_this_plan_n": int(sum(len(split_ids(s)) == 1 for s in chose["plans_chosen"])),
                     "groupC_mean_change_same_axis": float(c_d.mean()) if len(c_d) else np.nan,
                     "note": "n<2 のため事前のまま" if n < 2 else ""})
    tab = pd.DataFrame(rows)
    # 参考：提案間のばらつき τ をモーメント法で推定（観測がある提案が3つ以上のとき）
    ok = tab.dropna(subset=["observed", "observed_se"])
    tau = None
    if len(ok) >= 3:
        resid = ok["observed"] - ok["prior"]
        tau2 = max(0.0, float(resid.var(ddof=1) - (ok["observed_se"] ** 2).mean()))
        tau = float(np.sqrt(tau2))
        if tau > 0:
            tab["posterior_eb_tau"] = [shrink(r.prior, tau, r.observed, r.observed_se)[0] if np.isfinite(r.observed_se)
                                       else r.prior for r in tab.itertuples()]
    return tab, tau


def interval_update(df):
    out = {"level": 0.8, "method": "誤差（観測−見込み）の絶対値の80パーセンタイル。参考に (q90−q10)/2 も出す"}
    for g, label in [("B", "プランB の見込み（pred_B_*）と群Bの観測"), ("C", "プランA の見込み（＝開始時の値）と群Cの観測")]:
        d = df[df["group"] == g]
        res = {"説明": label}
        for key, cols in [("wb", ["wb"]), ("axes_and_burnout", AXES_PRED), ("pss", ["pss"])]:
            errs, cover = [], []
            for c in cols:
                if (g == "B" and f"pred_B_{c}" not in d) or f"{c}_post" not in d:
                    continue
                pred = d[f"pred_B_{c}"] if g == "B" else d[c]
                e = (d[f"{c}_post"] - pred).astype(float)
                hwcol = "pred_hwWb" if c == "wb" else "pred_hw"
                if g == "B" and hwcol in d and c != "pss":
                    hw = d[hwcol].astype(float)
                    m = e.notna() & hw.notna()
                    cover += list((e[m].abs() <= hw[m]).astype(float))
                errs += list(e.dropna())
            errs = np.array(errs)
            if len(errs) < 5:
                res[key] = {"n_errors": len(errs), "skipped": "誤差が5件未満"}
                continue
            res[key] = {"n_errors": len(errs), "bias_mean": float(errs.mean()),
                        "halfwidth_abs_q80": float(np.percentile(np.abs(errs), 80)),
                        "halfwidth_q90_q10": float((np.percentile(errs, 90) - np.percentile(errs, 10)) / 2),
                        "current_interval_coverage": float(np.mean(cover)) if cover else None}
        out[g] = res
    out["current_fixed"] = {"axes_hw": "15＋5×(提案数−1)", "wb_hwWb": "12＋4×(提案数−1)"}
    return out


def run(ctx: Ctx):
    df = ctx.store["main"]
    plans, src = load_plans()
    ctx.md("## 手順7 研究終了後：提案の改善量と見込みの幅の更新", "")
    tab, tau = plan_effects(ctx, df, plans)
    ctx.save_csv("s7_plan_effects.csv", tab)
    ctx.save_json("plan_effects_updated.json", {
        "source_prior": src, "prior_sd": ctx.prior_sd, "se_floor": MIN_SE_FLOOR, "tau_moment_estimate": tau,
        "formula": "事後平均＝(事前×1/事前SD²＋観測平均×1/SE²)÷(1/事前SD²＋1/SE²)、事後SD＝√(1/(1/事前SD²＋1/SE²))",
        "caution": "観測は群Bの前後差で、対照のない変化（時間・平均への回帰を含む）。複数の提案を選んだ人は各提案に重ねて数える。",
        "plans": tab.to_dict(orient="records")})
    ctx.md(f"事前値は {src}、事前SD = {ctx.prior_sd} 点。観測は群Bでその提案を選んだ人の、その提案の軸の前後差。", "",
           *md_table(tab[["id", "axis", "prior", "n", "observed", "observed_se", "posterior", "posterior_sd",
                          "groupC_mean_change_same_axis", "note"]], 1), "",
           ("提案間のばらつき τ（モーメント法）= " + f"{tau:.1f} 点。" if tau is not None else
            "観測のある提案が3つ未満のため τ は推定していない。"),
           "観測には時間の経過や平均への回帰も含まれる。群Cの同じ軸の変化（右から2列目）と並べて読む。", "")
    iv = interval_update(df)
    ctx.save_json("prediction_interval_updated.json", iv)
    ctx.md("### 7-2 見込みの80%区間の幅（いまは軸 ±15、WHO-5 ±12）", "")
    rows = []
    for g in ["B", "C"]:
        for k, v in iv[g].items():
            if k == "説明":
                continue
            rows.append({"群": g, "対象": k, "誤差の数": v.get("n_errors"), "偏り（平均）": v.get("bias_mean", np.nan),
                         "半幅_誤差の絶対値の80%点": v.get("halfwidth_abs_q80", np.nan),
                         "半幅_(q90−q10)/2": v.get("halfwidth_q90_q10", np.nan),
                         "今の区間に入った割合": v.get("current_interval_coverage") if v.get("current_interval_coverage") is not None else np.nan})
    ctx.md(*md_table(pd.DataFrame(rows), 2), "",
           "群Bはプランの見込み、群Cは「今のまま」の見込み（開始時の値）との誤差。今の区間に入った割合が .8 から離れていれば幅を直す。", "")
