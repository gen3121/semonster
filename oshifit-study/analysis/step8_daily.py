"""手順8 毎日の記録と個人補正（2026-11-17 追加）

毎日のアンケート（daily.csv）と振り返り（weekly.csv）を使い、次の5つを出す。
  8a 気分・推し疲れ（負担4項目）の推移：線形混合モデル（日数 × 群、人ごとのランダム切片と傾き）
  8b 提案を行った日の気分：個人内・個人間に分けた混合モデル（within-between、Curran & Bauer 2011 の考え方）
  8c 実行の続き方：ロジスティック混合モデル（変分ベイズ、人ごとのランダム切片）と GEE（交換可能相関、頑健SE）
  8d 個人補正の当てはまり：アプリの「本人の記録で直した見込み」を同じ式で計算し直し、最後の調査の値と比べる
      （平均絶対誤差・80%区間に入った割合）。あわせて、アプリの仮の分散（σu・σe）を混合モデルで推定し直す
  8e 一人ひとりの変化：信頼できる変化の指標 RCI（Jacobson & Truax 1991）。WHO-5 と PSS-J
  8f 提案の数と変化（群B）：選んだ提案の数ごとに、変化（開始時の値で調整）を比べる。アプリの仮定「2つめ0.8倍・3つめ0.6倍」を確かめる
群は本人の選択なので、どれも「関連」として読む。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

from .common import Ctx, cronbach_alpha, md_table
from .step0_load import read_csv, to_num

BURDEN4 = ["Q44", "Q45", "Q47", "Q48"]
PC_APP = {"burnout": {"su": 10.0, "se": 14.0}, "wb": {"su": 9.0, "se": 10.0}}   # index.html の PC と同じ値
Z80, H = 1.2816, 28
MIN_PIDS = 10


def burden4(df):
    v = df[BURDEN4].apply(pd.to_numeric, errors="coerce")
    return (v.mean(axis=1, skipna=False) - 1) / 6 * 100


def exec_score(df):
    did = [c for c in df.columns if c.startswith("did_")]
    if not did:
        return pd.Series(np.nan, index=df.index)
    m = df[did].apply(pd.to_numeric, errors="coerce").replace({0: 1.0, 1: 0.5, 2: 0.0})
    return m.mean(axis=1)


def fe_table(r, names=None):
    ci = r.conf_int()
    idx = [k for k in r.fe_params.index if names is None or k in names]
    return [{"項": k, "推定値": float(r.fe_params[k]), "SE": float(r.bse_fe[k]), "CI下": float(ci.loc[k, 0]),
             "CI上": float(ci.loc[k, 1]), "p": float(r.pvalues[k])} for k in idx]


def lmm_trend(D, y):
    d = D[["pid", "group", "day", y]].dropna()
    res = {"結果": y, "n_pid": int(d["pid"].nunique()), "n_obs": len(d),
           "式": f"{y} ~ day * C(group, Treatment('C')) + (1 + day | pid)"}
    if res["n_pid"] < MIN_PIDS or "C" not in set(d["group"]) or d["group"].nunique() < 2:
        res["skipped"] = "人数が足りない、または群Cがない"
        return res
    f = f"{y} ~ day * C(group, Treatment('C'))"
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            r = smf.mixedlm(f, d, groups=d["pid"], re_formula="~day").fit(reml=True)
            if not r.converged:
                raise RuntimeError("not converged")
        except Exception:
            r = smf.mixedlm(f, d, groups=d["pid"]).fit(reml=True)
            res["式"] += "（収束しないためランダム切片だけに変えた）"
    res.update(converged=bool(r.converged), fixed_effects=fe_table(r), residual_var=float(r.scale),
               random_cov=r.cov_re.values.tolist())
    return res


def within_between(D):
    d = D[D["group"].isin(["B", "C"])][["pid", "group", "day", "mood", "ex"]].dropna()
    res = {"n_pid": int(d["pid"].nunique()), "n_obs": len(d),
           "式": "mood ~ ex_within + ex_between + day + C(group) + (1 | pid)",
           "説明": "ex＝その日の実行（行った1・一部0.5・行わなかった0、提案が複数なら平均）。ex_within＝本人の平均からのずれ（その人の中で、行った日に気分が高いか）、ex_between＝本人の平均（よく行う人ほど気分が高いか）"}
    if res["n_pid"] < MIN_PIDS:
        res["skipped"] = "人数が足りない"
        return res
    d = d.assign(ex_between=d.groupby("pid")["ex"].transform("mean"))
    d = d.assign(ex_within=d["ex"] - d["ex_between"])
    f = "mood ~ ex_within + ex_between + day" + (" + C(group)" if d["group"].nunique() > 1 else "")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        r = smf.mixedlm(f, d, groups=d["pid"]).fit(reml=True)
    res.update(converged=bool(r.converged), fixed_effects=fe_table(r, ["ex_within", "ex_between", "day"]))
    return res


def exec_logit(D):
    d = D[D["group"].isin(["B", "C"])][["pid", "group", "day", "ex"]].dropna()
    d = d.assign(done=(d["ex"] > 0).astype(int))
    res = {"n_pid": int(d["pid"].nunique()), "n_obs": len(d), "結果": "その日に提案を行った（一部も含む）＝1"}
    if res["n_pid"] < MIN_PIDS or d["done"].nunique() < 2:
        res["skipped"] = "人数が足りない、またはばらつきがない"
        return res
    d = d.assign(day7=d["day"] / 7)
    f = "done ~ day7" + (" + C(group, Treatment('C'))" if d["group"].nunique() > 1 else "")
    out = {}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            g = smf.gee(f, "pid", d, family=sm.families.Binomial(), cov_struct=sm.cov_struct.Exchangeable()).fit()
            ci = g.conf_int()
            out["GEE"] = [{"項": k, "オッズ比": float(np.exp(g.params[k])), "CI下": float(np.exp(ci.loc[k, 0])),
                           "CI上": float(np.exp(ci.loc[k, 1])), "p": float(g.pvalues[k])} for k in g.params.index if k != "Intercept"]
        except Exception as e:
            out["GEE_error"] = f"{type(e).__name__}: {e}"
        try:
            from statsmodels.genmod.bayes_mixed_glm import BinomialBayesMixedGLM
            m = BinomialBayesMixedGLM.from_formula(f, {"pid": "0 + C(pid)"}, d).fit_vb()
            out["混合ロジスティック（変分ベイズ）"] = [
                {"項": n, "オッズ比": float(np.exp(mu)), "CI下": float(np.exp(mu - 1.96 * sd)), "CI上": float(np.exp(mu + 1.96 * sd))}
                for n, mu, sd in zip(m.model.exog_names, m.fe_mean, m.fe_sd) if n != "Intercept"]
            out["人ごとのばらつき_SD"] = float(np.exp(m.vcp_mean[0]))
        except Exception as e:
            out["GLMM_error"] = f"{type(e).__name__}: {e}"
    res.update(out, 説明="day7 は7日あたりの変化。オッズ比が1より小さいと、日がたつほど行わなくなる")
    return res


def shrink(res, su, se, hw0, prior):
    n = len(res)
    k = se * se / (su * su)
    b = float(np.sum(res)) / (n + k) if n else 0.0
    tau2 = max((hw0 / Z80) ** 2 - su * su, 1.0)
    hw = Z80 * np.sqrt(se * se / (n + k) + tau2)
    return float(np.clip(prior + b, 0, 100)), float(hw), n


def personal(ctx, main, D, W):
    """アプリと同じ式で、最後の調査より前の記録から見込みを直し、最後の調査の値と比べる。"""
    rows, resid = [], []
    W = W.assign(b4=burden4(W)) if len(W) else W
    for _, p in main.iterrows():
        if pd.isna(p.get("burnout")):
            continue
        b0 = (p[BURDEN4].astype(float).mean() - 1) / 6 * 100 if all(k in p for k in BURDEN4) else np.nan
        isB = p["group"] == "B" and pd.notna(p.get("pred_B_burnout"))
        prior_b = float(p["pred_B_burnout"]) if isB else float(p["burnout"])
        prior_w = float(p["pred_B_wb"]) if isB and pd.notna(p.get("pred_B_wb")) else float(p["wb"])
        hw, hww = (float(p["pred_hw"]), float(p["pred_hwWb"])) if isB and pd.notna(p.get("pred_hw")) else (15.0, 12.0)
        dB, dW = prior_b - float(p["burnout"]), prior_w - float(p["wb"])
        cut = p.get("final_day") if pd.notna(p.get("final_day")) else np.inf
        obs = pd.concat([D.loc[(D["pid"] == p["pid"]) & (D["day"] < cut), ["day", "b4"]],
                         W.loc[(W["pid"] == p["pid"]) & (W["day"] < cut), ["day", "b4"]] if len(W) else None]).dropna()
        r = (obs["b4"] - (b0 + dB * np.clip(obs["day"] / H, 0, 1))).to_numpy()
        resid += [(p["pid"], p["group"], x) for x in r]
        est, hwn, n = shrink(r, PC_APP["burnout"]["su"], PC_APP["burnout"]["se"], hw, prior_b)
        rw = []
        if pd.notna(p.get("wb_r3")) and pd.notna(p.get("day_r3")) and p["day_r3"] < cut:
            rw = [float(p["wb_r3"]) - (float(p["wb"]) + dW * min(p["day_r3"] / H, 1))]
        estw, hwnw, nw = shrink(rw, PC_APP["wb"]["su"], PC_APP["wb"]["se"], hww, prior_w)
        rows.append({"pid": p["pid"], "group": p["group"], "n_records": n, "burnout_post": p.get("burnout_post"),
                     "prior_burnout": prior_b, "prior_hw": hw, "adj_burnout": est, "adj_hw": hwn,
                     "wb_post": p.get("wb_post"), "prior_wb": prior_w, "prior_hwWb": hww, "adj_wb": estw, "adj_hwWb": hwnw, "n_wb": nw})
    P = pd.DataFrame(rows)
    acc = []
    for y, pr, ad, h0, h1 in [("burnout_post", "prior_burnout", "adj_burnout", "prior_hw", "adj_hw"),
                              ("wb_post", "prior_wb", "adj_wb", "prior_hwWb", "adj_hwWb")]:
        q = P.dropna(subset=[y]) if len(P) else P
        if len(q) < MIN_PIDS:
            acc.append({"結果": y, "n": len(q), "注": "人数が足りない"})
            continue
        for lab, c, h in [("最初の見込み", pr, h0), ("記録で直した見込み", ad, h1)]:
            e = q[y].astype(float) - q[c]
            acc.append({"結果": y, "見込み": lab, "n": len(q), "平均絶対誤差": float(e.abs().mean()),
                        "平均の誤差（偏り）": float(e.mean()), "80%区間に入った割合": float((e.abs() <= q[h]).mean()),
                        "区間の半幅の平均": float(q[h].mean())})
    # 分散の推定（アプリの σu・σe を直す候補）
    var = {"アプリの仮の値": PC_APP}
    R = pd.DataFrame(resid, columns=["pid", "group", "r"])
    if R["pid"].nunique() >= MIN_PIDS:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m = smf.mixedlm("r ~ 1", R, groups=R["pid"]).fit(reml=True)
        var["推し疲れ（負担4項目、0〜100）"] = {"su": float(np.sqrt(max(m.cov_re.iloc[0, 0], 0))), "se": float(np.sqrt(m.scale)),
                                       "平均のずれ": float(m.fe_params["Intercept"]), "n_pid": int(R["pid"].nunique()), "n_obs": len(R)}
    ctx.save_csv("s8_personal_prediction.csv", P)
    return pd.DataFrame(acc), var


def rci(ctx, main):
    S = ctx.scheme
    out = []
    for key, scale, lab in [("wb", "who5", "WHO-5（0〜100）"), ("pss", "pss", "PSS-J（0〜56、逆転項目は戻してから α）")]:
        if key + "_post" not in main.columns:
            continue
        a = cronbach_alpha(S.item_matrix(main, scale).dropna())
        sd = float(main[key].astype(float).std())
        sed = sd * np.sqrt(2) * np.sqrt(max(1 - a, 1e-6))
        d = (main[key + "_post"].astype(float) - main[key].astype(float)) / sed
        good = d > 1.96 if key == "wb" else d < -1.96
        bad = d < -1.96 if key == "wb" else d > 1.96
        for g in sorted(main["group"].dropna().unique()):
            m = (main["group"] == g) & d.notna()
            out.append({"尺度": lab, "群": g, "n": int(m.sum()), "α": a, "開始時SD": sd, "変化の基準（1.96×SEdiff）": 1.96 * sed,
                        "良くなった": int((good & m).sum()), "変わらない": int((~good & ~bad & m).sum()), "悪くなった": int((bad & m).sum())})
    return pd.DataFrame(out)


def n_plans_effect(main):
    """群B：選んだ提案の数（1〜3）ごとの変化。変化 ~ C(提案の数) + 開始時の値（頑健SE HC3）。
    アプリの仮定では、提案1つの改善を1とすると、2つで1.8、3つで2.4（足し合わせ・逓減）。"""
    d0 = main[main["group"] == "B"].copy()
    d0["n_plans"] = d0["plans_chosen"].fillna("").astype(str).map(lambda x: len([p for p in x.split(";") if p]))
    out = []
    for v, good in [("burnout", "下がるほど良い"), ("wb", "上がるほど良い")]:
        d = d0[["n_plans", v, "d_" + v]].dropna()
        d = d[d["n_plans"] > 0]
        row = {"結果": f"{v} の変化（{good}）", "n": len(d), **{f"n_{k}つ": int((d["n_plans"] == k).sum()) for k in (1, 2, 3)}}
        if len(d) < MIN_PIDS or d["n_plans"].nunique() < 2:
            row["注"] = "人数が足りない、または提案の数がばらつかない"
            out.append(row)
            continue
        r = smf.ols(f"d_{v} ~ C(n_plans) + {v}", data=d.astype(float)).fit(cov_type="HC3")
        base = d[d["n_plans"] == 1]["d_" + v].mean()
        for k in (2, 3):
            t = f"C(n_plans)[T.{float(k)}]"
            if t in r.params:
                ci = r.conf_int().loc[t]
                row[f"{k}つ−1つ"] = float(r.params[t]); row[f"{k}つ−1つ_CI"] = f"{ci[0]:.2f}〜{ci[1]:.2f}"
        row["1つの平均変化"] = float(base) if len(d[d["n_plans"] == 1]) else np.nan
        row["注"] = "仮定どおりなら、2つ・3つの変化は1つの1.8倍・2.4倍（向きは同じ）"
        out.append(row)
    return pd.DataFrame(out)


def run(ctx: Ctx):
    ctx.md("## 手順8 毎日の記録と個人補正", "")
    p = ctx.data_dir / "daily.csv"
    main = ctx.store.get("main")
    if main is None or not p.exists():
        ctx.md("daily.csv がないため、実行しなかった。", "")
        return
    D = read_csv(p)
    D = to_num(D, [c for c in D.columns if c not in ("pid", "group", "date", "at")])
    D = D[D["pid"].isin(set(main["pid"]))].copy()
    D["b4"], D["ex"] = burden4(D), exec_score(D)
    W = ctx.store.get("weekly", pd.DataFrame())
    W = W[W["pid"].isin(set(main["pid"]))].copy() if len(W) else W
    ctx.md(f"- 本分析の人の毎日の記録：{len(D)} 件（{D['pid'].nunique()} 人、1人あたり平均 {len(D) / max(D['pid'].nunique(), 1):.1f} 日）。", "")

    tr = [lmm_trend(D, "mood"), lmm_trend(D.rename(columns={"b4": "burden4"}), "burden4")]
    ctx.save_json("s8a_daily_trend.json", tr)
    ctx.md("### 8a 気分・推し疲れの推移（線形混合モデル、基準は群C）", "")
    for t in tr:
        if "fixed_effects" in t:
            ctx.md(f"`{t['式']}`（{t['n_pid']} 人・{t['n_obs']} 件）", "", *md_table(pd.DataFrame(t["fixed_effects"]), 3), "")
        else:
            ctx.md(f"- {t['結果']}：{t.get('skipped')}", "")

    wb = within_between(D)
    ctx.save_json("s8b_within_between.json", wb)
    ctx.md("### 8b 提案を行った日の気分（個人内と個人間に分ける）", "", wb["説明"], "")
    ctx.md(*(md_table(pd.DataFrame(wb["fixed_effects"]), 3) if "fixed_effects" in wb else [f"- {wb.get('skipped')}"]), "")

    lg = exec_logit(D)
    ctx.save_json("s8c_exec_logit.json", lg)
    ctx.md("### 8c 実行の続き方（ロジスティック混合モデルと GEE）", "", lg.get("説明", lg.get("skipped", "")), "")
    for k in ["混合ロジスティック（変分ベイズ）", "GEE"]:
        if k in lg:
            ctx.md(f"**{k}**", "", *md_table(pd.DataFrame(lg[k]), 3), "")

    acc, var = personal(ctx, main, D, W)
    ctx.save_csv("s8d_prediction_accuracy.csv", acc)
    ctx.save_json("personal_correction_params.json", var)
    ctx.md("### 8d 個人補正の当てはまり（最後の調査の値と比べる）", "",
           "最初の見込みと、最後の調査より前の記録で直した見込みを比べる。直した見込みの誤差が小さく、80%区間に入った割合が80%に近ければ、補正が働いている。"
           "`personal_correction_params.json` の su・se が、アプリの `PC` を直す候補（指導教員と確認してから入れる）。", "",
           *md_table(acc, 2), "")

    rc = rci(ctx, main)
    ctx.save_csv("s8e_rci.csv", rc)
    ctx.md("### 8e 一人ひとりの変化（RCI）", "",
           "RCI ＝ 変化 ÷（開始時SD × √2 × √(1−α)）。|RCI| > 1.96 を「信頼できる変化」とする（Jacobson & Truax, 1991）。", "",
           *md_table(rc, 2), "")

    npf = n_plans_effect(main)
    ctx.save_csv("s8f_n_plans.csv", npf)
    ctx.md("### 8f 提案の数と変化（群B）", "",
           "アプリは「2つめの提案は0.8倍、3つめは0.6倍」と仮定している（続けにくさ）。選んだ提案の数ごとの変化を比べ、この仮定を確かめる。"
           "本人が数を選んでいるので、数の違いには人の違いも混ざる（関連として読む）。", "", *md_table(npf, 2), "")
