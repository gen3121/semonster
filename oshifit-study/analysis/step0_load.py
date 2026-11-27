"""手順0 読み込みと整理：CSV を読み、注意確認・プレ実験で分け、得点を項目から計算し直して保存値と照合する。"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .common import SCORE_KEYS, TRAITS, Ctx, md_table

POST_KEYS = [f"{k}_post" for k in SCORE_KEYS]
TOL = 0.51   # 保存値が整数に丸められている場合も一致とみなす幅


def read_csv(path):
    return pd.read_csv(path, encoding="utf-8-sig", dtype=str, keep_default_na=False, na_values=[""])


def to_num(df: pd.DataFrame, cols):
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def compare_scores(df, recomputed: pd.DataFrame, keys, stored_keys, where) -> list[dict]:
    rows = []
    for k, sk in zip(keys, stored_keys):
        if sk not in df.columns:
            rows.append({"表": where, "pid": "（全員）", "得点": sk, "保存値": None, "再計算": None, "注": "列がない"})
            continue
        st = pd.to_numeric(df[sk], errors="coerce")
        rc = recomputed[k]
        for pid, a, b in zip(df["pid"], st, rc):
            if np.isnan(a) and np.isnan(b):
                continue
            if np.isnan(a) != np.isnan(b) or abs(a - b) > TOL:
                rows.append({"表": where, "pid": pid, "得点": sk, "保存値": a, "再計算": b,
                             "注": "片方が空" if np.isnan(a) != np.isnan(b) else "差が0.5より大きい"})
    return rows


def exec_rate_from_weekly(weekly: pd.DataFrame) -> pd.Series:
    """群Bの実行率：行った=1、一部=0.5、行わなかった=0 の平均（全回・全提案を通して）。"""
    did = [c for c in weekly.columns if c.startswith("did_")]
    if not did:
        return pd.Series(dtype=float)
    m = weekly[did].apply(pd.to_numeric, errors="coerce").replace({0: 1.0, 1: 0.5, 2: 0.0})
    tot = m.sum(axis=1, min_count=1)
    cnt = m.notna().sum(axis=1)
    g = pd.DataFrame({"pid": weekly["pid"], "s": tot, "n": cnt}).groupby("pid")[["s", "n"]].sum()
    return (g["s"] / g["n"].replace(0, np.nan)).rename("exec_rate_rc")


def run(ctx: Ctx):
    S = ctx.scheme
    d = ctx.data_dir
    ctx.md("## 手順0 読み込みと整理", "")
    if not (d / "baseline.csv").exists():
        ctx.md("baseline.csv が見つからないため、分析できません。", "")
        ctx.store["stop"] = True
        return
    base = read_csv(d / "baseline.csv")
    weekly = read_csv(d / "weekly.csv") if (d / "weekly.csv").exists() else pd.DataFrame(columns=["pid"])
    trial = read_csv(d / "trial.csv") if (d / "trial.csv").exists() else pd.DataFrame(columns=["pid"])
    free_n = len(read_csv(d / "free.csv")) if (d / "free.csv").exists() else 0

    num_items = [c for c in S.all_items if c not in ("Q2", "Q3", "Q4", "Q4b", "Q5", "Q5b", "Q6", "Q62")]
    base = to_num(base, num_items + ["pilot"] + SCORE_KEYS + [c for c in base.columns if c.startswith("pred_")])
    trial = to_num(trial, [c for c in trial.columns if c not in ("pid", "group", "final_at")])
    weekly = to_num(weekly, [c for c in weekly.columns if c not in ("pid", "group", "at")])
    dup = base["pid"].duplicated().sum()
    base = base.drop_duplicates("pid", keep="first").reset_index(drop=True)

    # 開始時の得点を項目から計算し直す
    rc = pd.DataFrame([S.score(r) for _, r in base.iterrows()])
    mism = compare_scores(base, rc, SCORE_KEYS, SCORE_KEYS, "baseline")
    tp = pd.DataFrame([S.tipi(r) for _, r in base.iterrows()])
    act = pd.DataFrame({tag: base[items].astype(float).mean(axis=1) for tag, items in S.freq_tags.items()})
    wide = pd.concat([base[["pid", "group", "pilot", "plans_offered", "plans_chosen"] +
                           [c for c in base.columns if c.startswith("pred_")] +
                           [c for c in S.all_items if c in base.columns]].reset_index(drop=True),
                      rc, tp, act], axis=1)
    wide = wide.loc[:, ~wide.columns.duplicated(keep="last")]
    wide["age"] = pd.to_numeric(base.get("Q1"), errors="coerce")

    # 注意確認（Q42 = 2）
    att_id, att_ans = S.attention[0] if S.attention else ("Q42", 2)
    wide["att_ok"] = (pd.to_numeric(base[att_id], errors="coerce") == att_ans).astype(int)

    # 最後の調査
    if len(trial) and "pid" in trial.columns:
        trial = trial.drop_duplicates("pid", keep="first").reset_index(drop=True)
        trc = pd.DataFrame([S.score(r) for _, r in trial.iterrows()])
        mism += compare_scores(trial, trc, SCORE_KEYS, POST_KEYS, "trial")
        post = pd.concat([trial[["pid"]], trc.add_suffix("_post")], axis=1)
        for c in ["final_day", "n_checkins", "exec_rate", "pilot"]:
            post[c + ("_trial" if c == "pilot" else "")] = trial.get(c)
        jk = [c for c in ["J1", "J2", "K1", "K2", "K3", "K4", "K5"] if c in trial.columns]
        post = pd.concat([post, trial[jk]], axis=1)
        wide = wide.merge(post, on="pid", how="left")
        # pilot は baseline と trial のどちらかで 1 なら 1
        wide["pilot"] = np.fmax(wide["pilot"].fillna(0), wide.get("pilot_trial", pd.Series(0, index=wide.index)).fillna(0))
        has_post = trial[S.who5_items].notna().all(axis=1).sum() if set(S.who5_items) <= set(trial.columns) else 0
    else:
        wide = wide.copy().assign(**{c: np.nan for c in [f"{k}_post" for k in SCORE_KEYS] +
                              ["final_day", "n_checkins", "exec_rate"]})
        has_post = 0

    # 振り返り：3回目の WHO-5 と実行率
    wide = wide.copy()
    wide["wb_r3"], wide["day_r3"] = np.nan, np.nan
    er_mis = []
    if len(weekly) and "week" in weekly.columns:
        w3 = weekly[weekly["week"] == 3].drop_duplicates("pid")
        if set(S.who5_items) <= set(w3.columns):
            w3 = w3.assign(wb_r3=w3[S.who5_items].sum(axis=1, min_count=5) * 4)
            wide = wide.drop(columns=["wb_r3", "day_r3"]).merge(
                w3[["pid", "wb_r3", "day"]].rename(columns={"day": "day_r3"}), on="pid", how="left")
        # 実行率：毎日のアンケート（daily.csv）の「今日、提案を行ったか」から出す（2026-11-19 から振り返りでは聞かない）。
        # daily.csv がなければ、旧版の振り返りの did_ から出す
        src = read_csv(d / "daily.csv") if (d / "daily.csv").exists() else weekly
        er = exec_rate_from_weekly(src[src["group"] == "B"] if "group" in src.columns else src)
        wide = wide.merge(er, left_on="pid", right_index=True, how="left")
        for pid, a, b in zip(wide["pid"], wide["exec_rate"], wide["exec_rate_rc"]):
            if np.isfinite(a) and np.isfinite(b) and abs(a - b) > 0.01:
                er_mis.append({"表": "trial/weekly", "pid": pid, "得点": "exec_rate", "保存値": a, "再計算": b,
                               "注": "weekly から計算した値と違う"})
        # 実行率は trial の値を優先し、空なら weekly から計算した値を使う
        wide["exec_rate"] = wide["exec_rate"].fillna(wide["exec_rate_rc"])
    mism += er_mis

    for k in SCORE_KEYS:
        if k + "_post" in wide.columns:
            wide["d_" + k] = wide[k + "_post"] - wide[k]
    wide["is_B"] = (wide["group"] == "B").astype(int)
    wide = wide.copy()

    # 参加の区分（2026-11-27 決定）。途中でやめた人・毎日の記録が少ない人を、どの分析に使うかを分ける
    #   ア 開始のみ：群は決まったが、毎日の記録0〜6日・振り返りなし → 開始時の記述と群の選択だけ
    #   イ 途中まで：最後の調査なし。振り返り1回以上か毎日の記録7日以上 → 上に加えて毎日の記録の混合モデル
    #   ウ 最後まで（記録が少ない）：最後の調査あり・毎日の記録13日以下 → 主な分析に入れ、感度分析で外す
    #   エ 最後まで：最後の調査あり・毎日の記録14日以上（半分以上）
    dl = read_csv(d / "daily.csv") if (d / "daily.csv").exists() else pd.DataFrame()
    if len(dl) and "pid" in dl.columns:
        key = "date" if "date" in dl.columns else ("day" if "day" in dl.columns else None)
        nd = dl.groupby("pid")[key].nunique() if key else dl.groupby("pid").size()
        wide["n_daily"] = wide["pid"].map(nd).fillna(0).astype(int)
    else:
        wide["n_daily"] = 0
    nck = weekly.groupby("pid")["week"].nunique() if len(weekly) and "week" in weekly.columns else pd.Series(dtype=float)
    wide["n_reflect"] = wide["pid"].map(nck).fillna(0).astype(int)
    has_final = wide["wb_post"].notna() if "wb_post" in wide.columns else pd.Series(False, index=wide.index)
    def _cat(i):
        if not isinstance(wide.at[i, "group"], str) or not wide.at[i, "group"]:
            return "未決定"
        if has_final[i]:
            return "エ_最後まで" if wide.at[i, "n_daily"] >= 14 else "ウ_最後まで_記録少"
        if wide.at[i, "n_reflect"] >= 1 or wide.at[i, "n_daily"] >= 7:
            return "イ_途中まで"
        return "ア_開始のみ"
    wide["part_cat"] = [_cat(i) for i in wide.index]
    wide["daily_ge14"] = (wide["n_daily"] >= 14).astype(int)

    # 研究者のメモで「分析から除外」にした人（baseline.csv の exclude = 1）は本分析から外す。感度分析には入れる
    wide["exclude"] = pd.to_numeric(base["exclude"], errors="coerce").fillna(0).values if "exclude" in base.columns else 0
    main = wide[(wide["att_ok"] == 1) & (wide["pilot"].fillna(0) == 0) & (wide["exclude"] == 0)].reset_index(drop=True)
    sens = wide.reset_index(drop=True)
    ctx.store.update(main=main, sens=sens, weekly=weekly, wide=wide)

    mm = pd.DataFrame(mism, columns=["表", "pid", "得点", "保存値", "再計算", "注"])
    ctx.save_csv("s0_score_mismatches.csv", mm)
    ctx.save_csv("s0_clean_main.csv", main)   # 出力フォルダは実データを含む。リポジトリに入れない
    counts = []
    for name, d_ in [("全員（感度分析）", sens), ("本分析（注意確認○・プレ実験除外）", main)]:
        row = {"標本": name, "n": len(d_)}
        for g in "ABC":
            row[f"群{g}"] = int((d_["group"] == g).sum())
        row["最後の調査あり"] = int(d_["wb_post"].notna().sum())
        counts.append(row)
    cdf = pd.DataFrame(counts)
    # 参加の区分ごとの人数（参加者の流れ図に使う）と、最後まで続けた人・やめた人の開始時の比較
    cats = ["未決定", "ア_開始のみ", "イ_途中まで", "ウ_最後まで_記録少", "エ_最後まで"]
    flow = pd.DataFrame([{"区分": c, "人数": int((main["part_cat"] == c).sum()),
                          **{f"群{g}": int(((main["part_cat"] == c) & (main["group"] == g)).sum()) for g in "ABC"}} for c in cats])
    ctx.save_csv("s0_participation.csv", flow)
    done = main["part_cat"].isin(["ウ_最後まで_記録少", "エ_最後まで"])
    att = pd.DataFrame([{"得点": k, "最後まで（平均）": main.loc[done, k].mean(), "途中でやめた（平均）": main.loc[~done & main["group"].notna(), k].mean(),
                         "最後まで n": int(done.sum()), "途中でやめた n": int((~done & main["group"].notna()).sum())}
                        for k in ["wb", "burnout"] if k in main.columns])
    ctx.save_csv("s0_attrition.csv", att)
    summary = {"n_baseline": len(base), "duplicated_pid_removed": int(dup), "n_weekly_rows": len(weekly),
               "n_trial_rows": len(trial), "n_trial_with_who5": int(has_post), "n_free": free_n,
               "attention_failed": int((wide["att_ok"] == 0).sum()), "pilot": int((wide["pilot"] == 1).sum()),
               "excluded_by_note": int((wide["exclude"] == 1).sum()),
               "score_mismatches": len(mm), "samples": counts}
    ctx.save_json("s0_summary.json", summary)
    ctx.md(f"- baseline {len(base)} 人、weekly {len(weekly)} 行、trial {len(trial)} 行、free {free_n} 件。"
           f"重複した pid {dup} 件は先の行を残した。",
           f"- 注意確認（{att_id} = {att_ans}）に合わなかった人：{summary['attention_failed']} 人。"
           f"プレ実験（pilot = 1）：{summary['pilot']} 人。研究者のメモで除外（exclude = 1）：{summary['excluded_by_note']} 人。本分析ではこれらを除き、感度分析では含める。",
           f"- 得点は questionnaire.json の規則で項目から計算し直し、保存値と照合した。"
           f"食い違い（差が0.5より大きい、または片方が空）：{len(mm)} 件（s0_score_mismatches.csv）。"
           "以後の分析は計算し直した値を使う。", "")
    ctx.md(*md_table(cdf), "")
    ctx.md("### 参加の区分（本分析の標本）", "",
           "ア＝開始のみ（毎日の記録0〜6日・振り返りなし）、イ＝途中まで（最後の調査なし）、ウ＝最後まで・毎日の記録13日以下、エ＝最後まで・14日以上。"
           "開始時と最後の比較（手順4）はウとエを使い、ウを外した結果も示す。毎日の記録の混合モデル（手順8）はイ・ウ・エの記録をすべて使う。", "",
           *md_table(flow), "", "最後まで続けた人と途中でやめた人の、開始時の値：", "", *md_table(att, 1), "")
    if len(mm):
        ctx.md("食い違いの内訳（得点ごとの件数）：" +
               "、".join(f"{k} {v}" for k, v in mm["得点"].value_counts().items()), "")
