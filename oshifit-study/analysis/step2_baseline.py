"""手順2 開始時の構造：k-means（シルエット・ブートストラップ安定性）、SEM の経路モデル、
PC アルゴリズム、Double Machine Learning（部分線形モデル）。
すべて開始時1回の横断データなので、得られるのは「関連」であり因果ではない。"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LassoCV
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler

from .common import TRAITS, Ctx, fmt, fmt_p, md_table

MIN_KM_N = 20
MIN_SEM_N = 50
MIN_PC_N = 30
MIN_DML_N = 40

SEM_DESC = """
sns ~ E + N + O
event ~ E + O
goods ~ C + N
watch ~ E + O
joy ~ watch + event + sns + goods
sleep ~ watch + sns
money ~ goods + event
duty ~ event + sns
compare ~ sns + N
wb ~ joy + sleep + money + duty + compare
pss ~ sleep + money + duty + compare + N
wb ~~ pss
"""


def km_features(S):
    return S.factors + list(S.freq_tags.keys()) + TRAITS


def run_kmeans(ctx: Ctx, df, S):
    feats = km_features(S)
    X = df[feats].astype(float).dropna()
    res = {"features": feats, "n": len(X)}
    if len(X) < MIN_KM_N:
        res["skipped"] = f"n={len(X)} が {MIN_KM_N} 未満"
        return res, None
    Z = StandardScaler().fit_transform(X)
    rng = ctx.rng(2)
    rows = []
    labels_by_k = {}
    for k in range(2, 7):
        if len(X) < 3 * k:
            continue
        km = KMeans(n_clusters=k, n_init=20, random_state=ctx.seed).fit(Z)
        lab = km.labels_
        labels_by_k[k] = lab
        sil = silhouette_score(Z, lab)
        aris = []
        for b in range(ctx.n_boot_cluster):
            idx = rng.integers(0, len(Z), len(Z))
            kb = KMeans(n_clusters=k, n_init=5, random_state=int(rng.integers(1e9))).fit(Z[idx])
            aris.append(adjusted_rand_score(lab, kb.predict(Z)))
        rows.append({"k": k, "silhouette": sil, "ARI平均": float(np.mean(aris)), "ARI_SD": float(np.std(aris)),
                     "最小の群の人数": int(np.bincount(lab).min())})
    tab = pd.DataFrame(rows)
    res["by_k"] = tab.to_dict(orient="records")
    if len(tab):
        best = int(tab.loc[tab["silhouette"].idxmax(), "k"])
        res["best_k_silhouette"] = best
        prof = X.assign(cluster=labels_by_k[best]).groupby("cluster").mean()
        prof.insert(0, "n", np.bincount(labels_by_k[best]))
        res["profile_best_k"] = prof.reset_index().to_dict(orient="records")
        ctx.save_csv("s2_kmeans_profile.csv", prof.reset_index())
        lab_df = pd.DataFrame({"pid": df.loc[X.index, "pid"].values, "cluster": labels_by_k[best]})
        ctx.save_csv("s2_kmeans_labels.csv", lab_df)
    return res, tab


def run_sem(df):
    import semopy
    cols = ["sns", "event", "goods", "watch", "joy", "sleep", "money", "duty", "compare", "wb", "pss"] + TRAITS
    data = df[cols].astype(float).dropna()
    res = {"model": SEM_DESC.strip(), "n": len(data), "standardized_input": True}
    if len(data) < MIN_SEM_N:
        res["skipped"] = f"n={len(data)} が {MIN_SEM_N} 未満"
        return res
    data = (data - data.mean()) / data.std(ddof=1)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m = semopy.Model(SEM_DESC)
            r = m.fit(data)
            st = semopy.calc_stats(m).T
        res["converged"] = bool(getattr(r, "success", True))
        for k in ["chi2", "DoF", "CFI", "TLI", "RMSEA"]:
            if k in st.index:
                res[k] = float(st.loc[k].iloc[0])
        est = m.inspect()
        res["paths"] = est[est["op"] == "~"][["lval", "rval", "Estimate", "Std. Err", "p-value"]].rename(
            columns={"lval": "結果", "rval": "説明"}).to_dict(orient="records")
    except Exception as e:
        res["error"] = f"{type(e).__name__}: {e}"
    return res


def run_pc(df):
    from causallearn.search.ConstraintBased.PC import pc
    cols = ["wb", "joy", "sleep", "money", "duty", "compare", "shs", "pss", "sns"] + TRAITS
    data = df[cols].astype(float).dropna()
    res = {"variables": cols, "n": len(data), "alpha": 0.05, "test": "fisherz",
           "note": "burnout は4つの負担の軸の平均と同じ情報（線形従属）なので入れない"}
    if len(data) < MIN_PC_N:
        res["skipped"] = f"n={len(data)} が {MIN_PC_N} 未満"
        return res
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            cg = pc(data.to_numpy(), 0.05, "fisherz", show_progress=False, node_names=cols)
        edges = []
        G = cg.G.graph
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                a, b = G[j, i], G[i, j]
                if a == 0 and b == 0:
                    continue
                if a == 1 and b == -1:
                    t = f"{cols[i]} --> {cols[j]}"
                elif a == -1 and b == 1:
                    t = f"{cols[j]} --> {cols[i]}"
                elif a == -1 and b == -1:
                    t = f"{cols[i]} --- {cols[j]}"
                elif a == 1 and b == 1:
                    t = f"{cols[i]} <-> {cols[j]}"
                else:
                    t = f"{cols[i]} ?? {cols[j]}"
                edges.append({"from": cols[i], "to": cols[j], "edge": t})
        res["edges"] = edges
    except Exception as e:
        res["error"] = f"{type(e).__name__}: {e}"
    return res


def dml_plr(y, d, X, learner: str, n_folds: int, n_rep: int, seed: int) -> dict:
    """部分線形モデル Y = θD + g(X) + ε を交差適合（cross-fitting）で推定する。
    θ は分割を変えた n_rep 回の中央値、SE は中央値を使う補正（Chernozhukov et al., 2018）。"""
    n = len(y)
    thetas, ses = [], []
    for r in range(n_rep):
        ry, rd = np.zeros(n), np.zeros(n)
        for tr, te in KFold(n_folds, shuffle=True, random_state=seed + r).split(X):
            for target, out in ((y, ry), (d, rd)):
                if learner == "rf":
                    m = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=seed + r)
                else:
                    m = LassoCV(cv=5, random_state=seed + r)
                sc = StandardScaler().fit(X[tr])
                m.fit(sc.transform(X[tr]), target[tr])
                out[te] = target[te] - m.predict(sc.transform(X[te]))
        theta = np.sum(rd * ry) / np.sum(rd * rd)
        psi = (ry - theta * rd) * rd
        se = np.sqrt(np.mean(psi ** 2) / (np.mean(rd ** 2) ** 2) / n)
        thetas.append(theta)
        ses.append(se)
    thetas, ses = np.array(thetas), np.array(ses)
    th = float(np.median(thetas))
    se = float(np.sqrt(np.median(ses ** 2 + (thetas - th) ** 2)))
    from scipy import stats
    return {"theta": th, "se": se, "ci_low": th - 1.96 * se, "ci_high": th + 1.96 * se,
            "p": float(2 * stats.norm.sf(abs(th / se))) if se > 0 else np.nan, "n": n,
            "learner": learner, "folds": n_folds, "repeats": n_rep}


def run_dml(ctx: Ctx, df, S):
    other = [t for t in S.freq_tags if t != "sns"]
    ctrl = TRAITS + other + ["age"]
    out = []
    for yname in ["compare", "wb"]:
        cols = [yname, "sns"] + ctrl
        data = df[cols].astype(float).dropna()
        if len(data) < MIN_DML_N:
            out.append({"outcome": yname, "treatment": "sns", "n": len(data),
                        "skipped": f"n={len(data)} が {MIN_DML_N} 未満"})
            continue
        for learner in ["rf", "lasso"]:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                r = dml_plr(data[yname].to_numpy(), data["sns"].to_numpy(), data[ctrl].to_numpy(),
                            learner, 5, 5, ctx.seed)
            r.update(outcome=yname, treatment="sns", controls=ctrl)
            out.append(r)
    return out


def plot_silhouette(ctx: Ctx, tab):
    try:
        from .common import setup_font
        setup_font()
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(5, 3.2))
        ax.plot(tab["k"], tab["silhouette"], "o-", color="#0058be", label="シルエット")
        ax.plot(tab["k"], tab["ARI平均"], "s--", color="#424754", label="安定性（ARI平均）")
        ax.set_xlabel("クラスタ数 k")
        ax.set_ylabel("値")
        ax.set_title("k-means：クラスタ数ごとの分かれ方と安定性")
        ax.legend()
        fig.tight_layout()
        fig.savefig(ctx.out_dir / "s2_kmeans_k.png", dpi=150)
        plt.close(fig)
        ctx.outputs.append("s2_kmeans_k.png")
    except Exception:
        pass


def run(ctx: Ctx):
    S = ctx.scheme
    df = ctx.store["main"]
    ctx.md("## 手順2 開始時の構造（横断データ。結果はすべて「関連」）", "")

    km, tab = run_kmeans(ctx, df, S)
    ctx.save_json("s2_kmeans.json", km)
    ctx.md("### 2-1 k-means（標準化した5要素・活動の割合4種・TIPI 5特性）", "")
    if "skipped" in km:
        ctx.md(f"実行しなかった：{km['skipped']}。", "")
    else:
        ctx.md(f"n={km['n']}。ブートストラップ {ctx.n_boot_cluster} 回で作り直し、全員のラベルとの一致（ARI）を見た。", "",
               *md_table(tab, 3), "",
               f"シルエットが最大の k = {km.get('best_k_silhouette')}。シルエット .25 未満は「はっきりした群はない」と読む。"
               "ARI が .6 未満なら、標本が変わると群が入れ替わる（不安定）。", "")
        if tab is not None and len(tab):
            plot_silhouette(ctx, tab)

    sem = run_sem(df)
    ctx.save_json("s2_sem.json", sem)
    ctx.md("### 2-2 SEM の経路モデル（性格 → 活動の割合 → 5要素 → WHO-5 / PSS-J）", "",
           "観測変数だけの経路モデル。変数は標準化してから推定したので、係数は標準化係数に近い。モデル式は s2_sem.json。", "")
    if "skipped" in sem:
        ctx.md(f"実行しなかった：{sem['skipped']}。", "")
    elif "error" in sem:
        ctx.md(f"推定できなかった（{sem['error']}）。", "")
    else:
        ctx.md(f"n={sem['n']}、CFI={fmt(sem.get('CFI'), 3)}、TLI={fmt(sem.get('TLI'), 3)}、RMSEA={fmt(sem.get('RMSEA'), 3)}。", "")
        pt = pd.DataFrame(sem["paths"])
        pt["p-value"] = pd.to_numeric(pt["p-value"], errors="coerce")
        ctx.md(*md_table(pt.rename(columns={"p-value": "p"}), 3), "")

    pcr = run_pc(df)
    ctx.save_json("s2_pc.json", pcr)
    ctx.md("### 2-3 PC アルゴリズム（causal-learn、Fisher-z、α = .05）", "")
    if "skipped" in pcr:
        ctx.md(f"実行しなかった：{pcr['skipped']}。", "")
    elif "error" in pcr:
        ctx.md(f"実行できなかった（{pcr['error']}）。", "")
    else:
        e = pcr["edges"]
        ctx.md(f"n={pcr['n']}、辺 {len(e)} 本：" + ("、".join(x["edge"] for x in e) if e else "なし"), "",
               "矢印は「この変数の組み合わせのもとで条件付き独立と矛盾しない向き」を示すだけで、因果の証明ではない。"
               "隠れた共通原因があれば向きは変わりうる。", "")

    dml = run_dml(ctx, df, S)
    ctx.save_json("s2_dml.json", dml)
    ctx.md("### 2-4 Double Machine Learning（SNS の割合 Q24・Q25 の平均と、比較の軸・WHO-5 の関連）", "",
           "部分線形モデル。性格5特性・ほかの活動の割合・年齢を調整。5分割の交差適合を5回くり返し中央値を取った。", "")
    rows = []
    for r in dml:
        if "skipped" in r:
            rows.append({"結果": r["outcome"], "学習器": "—", "n": r["n"], "θ": np.nan, "SE": np.nan,
                         "CI下": np.nan, "CI上": np.nan, "p": np.nan})
        else:
            rows.append({"結果": r["outcome"], "学習器": r["learner"], "n": r["n"], "θ": r["theta"], "SE": r["se"],
                         "CI下": r["ci_low"], "CI上": r["ci_high"], "p": r["p"]})
    ctx.md(*md_table(pd.DataFrame(rows), 3), "",
           "θ は「SNS の割合が1段階高い人は、ほかの条件が同じなら、その得点が θ 点違う」という横断的な関連。"
           "調整していない共通原因があれば偏る。", "")
    if any("skipped" in r for r in dml):
        ctx.md("n が足りない結果は推定していない。", "")
