"""OshiFit 本実験の分析（oshifit_spec.md 第5節）。

使い方:
  python analyze.py               # data/ の実データ（baseline.csv, final.csv）を分析
  python analyze.py --demo        # 合成データで動作確認だけ（数値は論文に書かない）

入力の CSV（研究者ページの書き出し）:
  baseline.csv / final.csv : 1行1人。列 id, group(A/B/C), 質問ID（W1..W5, P1..P14, H1..H4, Q29.. など）
                             final.csv には、示した見込みの列 pred_wb, pred_wb_lo, pred_wb_hi（あれば）
出力: src/output_graphs/ に図、src/results.json に数値（第5章はこの値だけを使って書く）
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parent.parent
DATA, OUT = ROOT / "data", Path(__file__).resolve().parent / "output_graphs"

# 採点（画面試作の scoring と同じ式）
SMAX = 7
WHO5 = [f"W{i}" for i in range(1, 6)]
PSS = [f"P{i}" for i in range(1, 15)]
PSS_REV = {"P4", "P5", "P6", "P7", "P9", "P10", "P13"}
SHS = ["H1", "H2", "H3", "H4"]
BURNOUT = ["Q44", "Q45", "Q46", "Q47", "Q48", "Q49", "Q50", "Q51"]
AXES = {  # key: (items, reverse)
    "joy": (["Q29", "Q30", "Q31", "Q32", "Q33", "Q34", "Q39"], False),
    "sleep": (["Q44", "Q50"], True),
    "money": (["Q45", "Q46"], True),
    "duty": (["Q47", "Q49"], True),
    "compare": (["Q48", "Q51"], True),
}


def score(df: pd.DataFrame) -> pd.DataFrame:
    o = pd.DataFrame({"id": df["id"], "group": df.get("group")})
    o["who5_raw"] = df[WHO5].sum(axis=1, min_count=5)
    o["wb"] = o["who5_raw"] * 4                                         # 0〜100
    o["pss"] = sum(4 - df[c] if c in PSS_REV else df[c] for c in PSS)  # 0〜56
    o["shs"] = pd.concat([df[c] if c != "H4" else 8 - df[c] for c in SHS], axis=1).mean(axis=1)
    o["burnout"] = (df[BURNOUT].mean(axis=1) - 1) / (SMAX - 1) * 100
    for k, (items, rev) in AXES.items():
        s = (df[items].mean(axis=1) - 1) / (SMAX - 1) * 100
        o[k] = 100 - s if rev else s
    return o


def paired(pre: pd.Series, post: pd.Series) -> dict:
    d = (post - pre).dropna()
    if len(d) < 3:
        return {"n": int(len(d)), "note": "人数が足りない"}
    t = stats.ttest_rel(post.loc[d.index], pre.loc[d.index])
    w = stats.wilcoxon(d) if (d != 0).any() else None
    return {"n": int(len(d)), "mean_pre": float(pre.loc[d.index].mean()), "mean_post": float(post.loc[d.index].mean()),
            "mean_diff": float(d.mean()), "sd_diff": float(d.std(ddof=1)), "dz": float(d.mean() / d.std(ddof=1)) if d.std(ddof=1) > 0 else None,
            "t": float(t.statistic), "p_t": float(t.pvalue), "p_wilcoxon": float(w.pvalue) if w else None}


def ancova(df: pd.DataFrame, y: str) -> dict:
    """群B対C：28日目の値 ~ 群 + 開始時の値（最小二乗）。"""
    d = df[df["group"].isin(["B", "C"])][[f"{y}_post", f"{y}_pre", "group"]].dropna()
    if d["group"].nunique() < 2 or len(d) < 6:
        return {"n": int(len(d)), "note": "人数が足りない"}
    X = np.column_stack([np.ones(len(d)), (d["group"] == "B").astype(float), d[f"{y}_pre"]])
    yv = d[f"{y}_post"].to_numpy()
    beta, *_ = np.linalg.lstsq(X, yv, rcond=None)
    resid = yv - X @ beta
    dof = len(d) - X.shape[1]
    cov = (resid @ resid / dof) * np.linalg.inv(X.T @ X)
    se = float(np.sqrt(cov[1, 1]))
    tval = float(beta[1] / se)
    return {"n": int(len(d)), "n_B": int((d["group"] == "B").sum()), "n_C": int((d["group"] == "C").sum()),
            "adj_diff_B_minus_C": float(beta[1]), "se": se, "t": tval, "p": float(2 * stats.t.sf(abs(tval), dof))}


def accuracy(fin: pd.DataFrame, post: pd.Series) -> dict:
    if "pred_wb" not in fin:
        return {"note": "見込みの列（pred_wb）がない"}
    m = fin["pred_wb"].notna() & post.notna()
    err = (post[m] - fin.loc[m, "pred_wb"]).abs()
    out = {"n": int(m.sum()), "mae_wb": float(err.mean()) if m.any() else None}
    if {"pred_wb_lo", "pred_wb_hi"} <= set(fin.columns) and m.any():
        inside = (post[m] >= fin.loc[m, "pred_wb_lo"]) & (post[m] <= fin.loc[m, "pred_wb_hi"])
        out["coverage_wb"] = float(inside.mean())
    return out


def demo_data(n=60, seed=1):
    """合成データ（動作確認専用）。研究の結果ではない。"""
    rng = np.random.default_rng(seed)
    cols = WHO5 + PSS + SHS + sorted({c for v in AXES.values() for c in v[0]} | set(BURNOUT))
    def block(shift):
        d = {"id": [f"D{i:03d}" for i in range(n)], "group": rng.choice(["A", "B", "C"], n, p=[.2, .5, .3])}
        for c in cols:
            hi = 5 if c in WHO5 else 4 if c in PSS else 7
            lo = 0 if (c in WHO5 or c in PSS) else 1
            d[c] = np.clip(rng.integers(lo, hi + 1, n) + shift, lo, hi)
        return pd.DataFrame(d)
    base = block(0)
    fin = block(0)
    fin["group"] = base["group"]
    fin["pred_wb"] = rng.uniform(30, 70, n)
    fin["pred_wb_lo"], fin["pred_wb_hi"] = fin["pred_wb"] - 15, fin["pred_wb"] + 15
    return base, fin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    if a.demo:
        base, fin = demo_data()
    else:
        base, fin = pd.read_csv(DATA / "baseline.csv"), pd.read_csv(DATA / "final.csv")
    pre, post = score(base).set_index("id"), score(fin).set_index("id")
    keys = ["wb", "pss", "shs", "burnout", *AXES]
    merged = pre[["group"]].copy()
    for k in keys:
        merged[f"{k}_pre"], merged[f"{k}_post"] = pre[k], post[k]
    res = {"demo": a.demo, "n_baseline": int(len(pre)), "groups": pre["group"].value_counts().to_dict(), "paired": {}, "ancova": {}}
    for g in ["A", "B", "C"]:
        sub = merged[merged["group"] == g]
        res["paired"][g] = {k: paired(sub[f"{k}_pre"], sub[f"{k}_post"]) for k in ["wb", "pss", "shs", "burnout"]}
    res["ancova"] = {k: ancova(merged, k) for k in ["wb", "pss"]}
    res["accuracy"] = accuracy(fin.set_index("id"), post["wb"])
    OUT.mkdir(parents=True, exist_ok=True)
    name = "results_demo.json" if a.demo else "results.json"
    (Path(__file__).resolve().parent / name).write_text(json.dumps(res, ensure_ascii=False, indent=2))
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib import font_manager
        for f in font_manager.findSystemFonts():
            if "BIZUDPGothic" in f:
                font_manager.fontManager.addfont(f)
        plt.rcParams["font.family"] = "BIZ UDPGothic"            # 図も BIZ UDPゴシック（CLAUDE.md）
        fig, ax = plt.subplots(figsize=(5, 3.2))
        for g, c in zip("ABC", ["#9AA3B2", "#0058BE", "#BA1A1A"]):
            sub = merged[merged["group"] == g]
            ax.plot([0, 1], [sub["wb_pre"].mean(), sub["wb_post"].mean()], marker="o", color=c, label=f"群{g}（{len(sub)}人）")
        ax.set_xticks([0, 1], ["開始時", "28日目"]); ax.set_ylabel("幸福度（WHO-5、0〜100）"); ax.legend()
        ax.set_title("合成データ（動作確認用）" if a.demo else "幸福度の変化")
        fig.tight_layout(); fig.savefig(OUT / ("wb_change_demo.png" if a.demo else "wb_change.png"), dpi=200)
    except ImportError:
        print("matplotlib がないため図は作りません")
    print(json.dumps({k: res[k] for k in ["demo", "n_baseline", "groups"]}, ensure_ascii=False), "→", name)


if __name__ == "__main__":
    main()
