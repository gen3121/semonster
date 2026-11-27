"""手順3 予測：開始時の特徴から最後の WHO-5（wb_post）と推し疲れ（burnout_post）を予測する
リッジ回帰。外側10分割で性能を測り、内側の RidgeCV で正則化の強さを選ぶ。"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .common import TRAITS, Ctx, md_table

MIN_N = 30
ALPHAS = np.logspace(-3, 3, 25)


def features(S):
    return ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "shs", "pss"] + \
        TRAITS + list(S.freq_tags.keys()) + ["grp_B", "grp_C"]


def run(ctx: Ctx):
    S = ctx.scheme
    df = ctx.store["main"].copy()
    df["grp_B"] = (df["group"] == "B").astype(float)
    df["grp_C"] = (df["group"] == "C").astype(float)
    feats = features(S)
    ctx.md("## 手順3 予測（リッジ回帰、外側10分割の交差検証）", "",
           "特徴：開始時の得点9つ・TIPI 5特性・活動の割合4種・群（B, C のダミー、基準は A）。", "")
    rows, coefs = [], {}
    for target, pre in [("wb_post", "wb"), ("burnout_post", "burnout")]:
        d = df[feats + [target]].astype(float).dropna()
        n = len(d)
        if n < MIN_N:
            rows.append({"予測する値": target, "n": n, "CV_R2": np.nan, "CV_RMSE": np.nan,
                         "開始時のまま_RMSE": np.nan, "注": f"n<{MIN_N} のため実行しない"})
            continue
        X, y = d[feats].to_numpy(), d[target].to_numpy()
        oof = np.zeros(n)
        fold_r2 = []
        for tr, te in KFold(10, shuffle=True, random_state=ctx.seed).split(X):
            m = make_pipeline(StandardScaler(), RidgeCV(alphas=ALPHAS)).fit(X[tr], y[tr])
            oof[te] = m.predict(X[te])
            if len(te) > 1:
                fold_r2.append(r2_score(y[te], oof[te]))
        carry = d[pre].to_numpy()
        rows.append({"予測する値": target, "n": n, "CV_R2": r2_score(y, oof),
                     "CV_R2_各分割の平均": float(np.mean(fold_r2)),
                     "CV_RMSE": float(np.sqrt(mean_squared_error(y, oof))),
                     "開始時のまま_RMSE": float(np.sqrt(mean_squared_error(y, carry))), "注": ""})
        full = make_pipeline(StandardScaler(), RidgeCV(alphas=ALPHAS)).fit(X, y)
        sc, rg = full.named_steps["standardscaler"], full.named_steps["ridgecv"]
        coefs[target] = {"n": n, "alpha": float(rg.alpha_), "intercept": float(rg.intercept_),
                         "features": feats, "coef_standardized": dict(zip(feats, rg.coef_.tolist())),
                         "feature_mean": dict(zip(feats, sc.mean_.tolist())),
                         "feature_sd": dict(zip(feats, sc.scale_.tolist())),
                         "note": "係数は標準化した特徴に対するもの。予測＝intercept＋Σ coef×(x−mean)/sd"}
    tab = pd.DataFrame(rows)
    ctx.save_csv("s3_ridge_cv.csv", tab)
    ctx.save_json("s3_ridge_coefficients.json", coefs)
    ctx.md(*md_table(tab, 3), "",
           "CV_R2 は分割外の予測をまとめて計算した値。「開始時のまま_RMSE」は開始時の値をそのまま予測にした場合の誤差で、"
           "リッジがこれより小さくなければ予測の上積みはない。係数は s3_ridge_coefficients.json。", "")
