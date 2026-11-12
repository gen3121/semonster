"""合成データ（動作確認用の作り物）を DATA_SCHEMA_ja.md と同じ形の CSV で書き出す。

使い方：python -m analysis.make_synthetic --out 合成データのフォルダ [--n 120] [--seed 1]
フォルダに目印ファイル（合成データ_SYNTHETIC.txt）を置くので、run.py はレポートの冒頭に「合成データ」と書く。
ここから出た数値を研究の結果として使わない。
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "analysis"

from analysis.common import SCORE_KEYS, SYNTH_MARKER, Scheme, load_plans  # noqa: E402

REF = {"wb": 52, "joy": 70, "sleep": 70, "money": 65, "duty": 70, "compare": 70}
ACT = {"sns23": "sns", "archive": "watch", "budget": "goods", "oneday": "goods", "declutter": "goods",
       "skipok": "event", "mute": "sns", "snsonce": "sns", "party": "watch", "create": "watch", "calm": "watch",
       "event": "-event"}
TRAIT_OF = {"sns23": None, "archive": "C", "budget": "C", "declutter": "O", "donate": "A", "oneday": "N",
            "choose3": None, "skipok": "C", "mute": "N", "snsonce": "E-", "party": "E", "create": "O",
            "calm": "A", "event": "E", "good3": None}
OPTS = {"Q2": ["男性", "女性", "その他", "回答しない"], "Q3": ["学生", "会社員・公務員", "パート・アルバイト", "その他"],
        "Q4": ["実在のアイドル", "アニメ・漫画・ゲームのキャラクター", "VTuber・配信者", "声優", "バンド・アーティスト", "スポーツ選手"],
        "Q5": ["半年未満", "半年〜1年未満", "1年〜3年未満", "3年〜5年未満", "5年以上"],
        "Q5b": ["1人・1組", "2人・2組", "3人・3組以上"],
        "Q6": ["5,000円未満", "5,000円〜1万円未満", "1万円〜3万円未満", "3万円〜5万円未満", "5万円以上"]}


def lik(rng, center, scale, latent, lo, hi, load=0.8):
    e = rng.normal(size=np.shape(latent))
    return np.clip(np.round(center + scale * (load * latent + np.sqrt(1 - load ** 2) * e)), lo, hi).astype(int)


def items_from_latent(rng, S, L):
    """潜在値 L（dict）から、最後の調査でも聞く項目を作る。"""
    A = {}
    for k in S.axis_items["joy"]:
        A[k] = int(lik(rng, 5.0, 1.2, L["joy"], 1, 7))
    for ax in S.burden_axes:
        for k in S.axis_items[ax]:
            A[k] = int(lik(rng, 3.3, 1.3, L[ax], 1, 7))
    for k in S.who5_items:
        A[k] = int(lik(rng, 2.6, 1.1, L["wb"], 0, 5))
    for k in S.shs_items:
        sign = -1 if k in S.shs_reverse else 1
        A[k] = int(lik(rng, 4.4 if sign > 0 else 3.6, 1.1, sign * L["happy"], 1, 7))
    for k in S.pss_items:
        sign = -1 if k in S.pss_reverse else 1
        A[k] = int(lik(rng, 2.0, 0.85, sign * L["stress"], 0, 4, load=0.7))
    return A


def plans_for(sc, A, tipi, act, plans, multi):
    def trait_fit(pid):
        t = TRAIT_OF.get(pid)
        if not t:
            return 0
        m = 100 - tipi["E"] if t == "E-" else tipi[t]
        return (m - 50) / 50

    def act_fit(pid):
        a = ACT.get(pid)
        if pid == "choose3":
            return (np.mean(list(act.values())) - 1) / 4
        if not a:
            return .3
        x = (act[a.replace("-", "")] - 1) / 4
        return 1 - x if a[0] == "-" else x

    cand = [p for p in plans if not (p == "choose3" and not (multi and sc["duty"] < 60))]
    rank = sorted(cand, key=lambda p: -((REF[plans[p]["axis"]] - sc[plans[p]["axis"]]) + trait_fit(p) * 12 + act_fit(p) * 18))
    out, used = [], set()
    for p in rank:
        if len(out) == 3:
            break
        if plans[p]["axis"] in used:
            continue
        out.append(p)
        used.add(plans[p]["axis"])
    return out


def predict_multi(sc, ids, plans):
    B = dict(sc)
    cl = lambda x: float(np.clip(x, 0, 100))
    for i in ids:
        ax, eff = plans[i]["axis"], plans[i]["eff"]
        B[ax] = cl(B[ax] + eff)
        if ax != "wb":
            B["wb"] = cl(B["wb"] + eff / 4)
        if ax not in ("joy", "wb"):
            B["burnout"] = cl(B["burnout"] - eff / 4)
        else:
            B["joy"] = cl(B["joy"] + eff)
    B["pss"] = float(np.clip(sc["pss"] * (1 + (B["burnout"] - sc["burnout"]) / max(sc["burnout"], 1) * .25), 0, 56))
    return B, 15 + 5 * (len(ids) - 1), 12 + 4 * (len(ids) - 1)


def make(out: Path, n: int = 120, seed: int = 1) -> Path:
    rng = np.random.default_rng(seed)
    S = Scheme()
    plans, _ = load_plans()
    out.mkdir(parents=True, exist_ok=True)
    (out / SYNTH_MARKER).write_text("このフォルダの CSV は合成データ（動作確認用の作り物）。研究の結果として使わない。\n", encoding="utf-8")
    start = datetime(2026, 12, 1, 10, 0)
    base_rows, week_rows, trial_rows, free_rows = [], [], [], []
    did_cols = [f"did_{p}" for p in plans]
    for i in range(n):
        pid = "".join(rng.choice(list("ABCDEFGHJKLMNPQRSTUVWXYZ23456789"), 8))
        pid = pid[:4] + "-" + pid[4:]
        T = {t: rng.normal() for t in "EACNO"}
        act_l = {"watch": rng.normal() + 0.2 * T["O"], "event": rng.normal() + 0.5 * T["E"],
                 "goods": rng.normal() + 0.3 * T["N"], "sns": rng.normal() + 0.5 * T["E"] + 0.2 * T["N"]}
        common = rng.normal()   # 推し疲れの共通部分
        L = {"joy": 0.4 * act_l["event"] + 0.3 * act_l["watch"] + 0.2 * T["E"] + 0.8 * rng.normal(),
             "sleep": 0.5 * common + 0.3 * act_l["sns"] + 0.6 * rng.normal(),
             "money": 0.5 * common + 0.5 * act_l["goods"] + 0.6 * rng.normal(),
             "duty": 0.5 * common + 0.3 * act_l["event"] + 0.6 * rng.normal(),
             "compare": 0.5 * common + 0.4 * act_l["sns"] + 0.3 * T["N"] + 0.6 * rng.normal()}
        L["wb"] = 0.35 * L["joy"] - 0.35 * common - 0.3 * T["N"] + 0.8 * rng.normal()
        L["happy"] = 0.6 * L["wb"] - 0.2 * T["N"] + 0.7 * rng.normal()
        L["stress"] = 0.5 * T["N"] - 0.4 * L["wb"] + 0.3 * common + 0.7 * rng.normal()
        A = {"Q1": int(rng.integers(18, 40))}
        for k, opts in OPTS.items():
            A[k] = str(rng.choice(opts))
        tl = {"Q7": T["E"], "Q12": -T["E"], "Q8": -T["A"], "Q13": T["A"], "Q9": T["C"], "Q14": -T["C"],
              "Q10": T["N"], "Q15": -T["N"], "Q11": T["O"], "Q16": -T["O"]}
        for k, v in tl.items():
            A[k] = int(lik(rng, 3.0, 1.0, v, 1, 5))
        for tag, its in S.freq_tags.items():
            for k in its:
                A[k] = int(lik(rng, 2.8, 1.0, act_l[tag] / 1.2, 1, 5))
        for k in ["Q35", "Q36", "Q37", "Q38", "Q40", "Q41", "Q43", "Q52", "Q53", "Q54"] + [f"Q{j}" for j in range(55, 62)]:
            A[k] = int(rng.integers(1, 8))
        A["Q42"] = 2 if rng.random() > 0.05 else int(rng.choice([1, 3, 4, 5]))
        A.update(items_from_latent(rng, S, L))
        sc = S.score(A)
        tipi = S.tipi(A)
        actm = {t: float(np.mean([A[k] for k in its])) for t, its in S.freq_tags.items()}
        good = sum(sc[a["key"]] >= 60 for a in S.axes) >= 5 and sc["who5raw"] >= 13
        offered = plans_for(sc, A, tipi, actm, plans, A["Q5b"] != "1人・1組")
        if good:
            g, chosen = "A", []
        elif rng.random() < 0.55:
            g = "B"
            chosen = list(rng.choice(offered, int(rng.integers(1, len(offered) + 1)), replace=False))
        else:
            g, chosen = "C", offered[:1]
        pilot = int(i < 6)
        created = start + timedelta(days=int(rng.integers(0, 10)), minutes=int(rng.integers(0, 600)))
        decided = created + timedelta(minutes=15)
        row = {"pid": pid, "uid": f"synthUID{i:04d}", "pilot": pilot, "created_at": created.isoformat(),
               "decided_at": decided.isoformat(), "group": g, "plans_offered": ";".join(offered),
               "plans_chosen": ";".join(chosen), "avatar_source": str(rng.choice(["camera", "manual"]))}
        order = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q5b", "Q6"] + [f"Q{j}" for j in range(7, 62)] + \
            S.who5_items + S.shs_items + S.pss_items
        row.update({k: A.get(k, "") for k in order})
        row.update({k: round(sc[k], 2) for k in SCORE_KEYS})
        if g != "A":
            B, hw, hwWb = predict_multi(sc, chosen if g == "B" else offered, plans)
            row.update({f"pred_B_{k}": round(B[k], 2) for k in ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "pss"]})
            row.update(pred_hw=hw, pred_hwWb=hwWb)
        else:
            row.update({f"pred_B_{k}": "" for k in ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "pss"]})
            row.update(pred_hw="", pred_hwWb="")
        base_rows.append(row)
        if rng.random() < 0.15:
            free_rows.append({"pid": pid, "where": "baseline_Q62", "text": "（合成）推し活の自由記述の例"})

        # 振り返りと実行の程度
        p_exec = rng.beta(3, 2) if g == "B" else rng.beta(1.5, 4)
        n_check = 0 if g == "A" else (6 if rng.random() > 0.2 else int(rng.integers(2, 6)))
        day, dids, rows_w = 0, [], []
        shift = {k: 0.0 for k in L}
        if g == "B":
            for pid_ in chosen:
                ax = plans[pid_]["axis"]
                if ax in S.burden_axes:
                    shift[ax] -= 0.7 * p_exec
                else:
                    shift[ax] += 0.6 * p_exec
                shift["wb"] += 0.15 * p_exec
        shift["wb"] += -0.3 * shift["sleep"] - 0.2 * shift["compare"]
        shift["stress"] += 0.3 * (shift["sleep"] + shift["money"] + shift["duty"] + shift["compare"]) / 4 - 0.2 * shift["wb"]
        Lpost = {k: 0.85 * v + shift[k] + 0.45 * rng.normal() for k, v in L.items()}
        for wk in range(1, n_check + 1):
            day += int(rng.choice([4, 5, 5, 6]))
            frac = day / 30
            Lw = {k: (1 - frac) * L[k] + frac * Lpost[k] for k in L}
            w = {"pid": pid, "group": g, "week": wk, "day": day,
                 "at": (decided + timedelta(days=day)).isoformat()}
            w.update({c: "" for c in did_cols})
            for p_ in (chosen if g == "B" else offered[:1]):
                u = rng.random()
                v = 0 if u < 0.8 * p_exec else (1 if u < 0.8 * p_exec + 0.2 else 2)
                w[f"did_{p_}"] = v
                dids.append({0: 1.0, 1: 0.5, 2: 0.0}[v])
            it = items_from_latent(rng, S, Lw)
            for k in ["Q44", "Q45", "Q47", "Q48"]:
                w[k] = it[k]
            w["joy"] = int(lik(rng, 5.0, 1.2, Lw["joy"], 1, 7))
            w["stress"] = int(rng.choice([0, 1, 2], p=[.3, .5, .2]))
            w["happy"] = int(rng.choice([0, 1, 2], p=[.3, .5, .2]))
            for k in S.who5_items:
                w[k] = it[k] if wk == 3 else ""
            w["burn"] = round((np.mean([w[k] for k in ["Q44", "Q45", "Q47", "Q48"]]) - 1) / 6 * 100, 2)
            w["joyN"] = round((w["joy"] - 1) / 6 * 100, 2)
            rows_w.append(w)
        week_rows += rows_w
        if rng.random() < 0.9:   # 1割は最後の調査に答えない
            fday = max(28, day + int(rng.integers(0, 4))) if g != "A" else int(rng.integers(28, 32))
            fday = min(fday, 40)
            Af = items_from_latent(rng, S, Lpost)
            scp = S.score(Af)
            t = {"pid": pid, "pilot": pilot, "group": g, "final_day": fday,
                 "final_at": (decided + timedelta(days=fday)).isoformat()}
            ids = S.who5_items + S.shs_items + S.pss_items + S.axis_items["joy"] + S.burnout_items
            t.update({k: Af[k] for k in ids})
            for k in ["J1", "J2", "K1", "K2", "K3", "K4", "K5"]:
                t[k] = int(rng.integers(1, 6)) if g != "A" else ""
            t.update({f"{k}_post": round(scp[k], 2) for k in SCORE_KEYS})
            t["n_checkins"] = n_check
            t["exec_rate"] = round(float(np.mean(dids)), 4) if (g == "B" and dids) else ""
            trial_rows.append(t)
            if rng.random() < 0.1:
                free_rows.append({"pid": pid, "where": "final_how", "text": "（合成）最後の調査の自由記述の例"})

    base = pd.DataFrame(base_rows)
    week = pd.DataFrame(week_rows, columns=["pid", "group", "week", "day", "at"] + did_cols +
                        ["Q44", "Q45", "Q47", "Q48", "joy", "stress", "happy"] + S.who5_items + ["burn", "joyN"])
    trial_cols = ["pid", "pilot", "group", "final_day", "final_at"] + S.who5_items + S.shs_items + S.pss_items + \
        ["Q29", "Q30", "Q31", "Q32", "Q33", "Q34", "Q39"] + [f"Q{j}" for j in range(44, 52)] + \
        ["J1", "J2", "K1", "K2", "K3", "K4", "K5"] + [f"{k}_post" for k in SCORE_KEYS] + ["n_checkins", "exec_rate"]
    trial = pd.DataFrame(trial_rows, columns=trial_cols)
    free = pd.DataFrame(free_rows, columns=["pid", "where", "text"])
    for name, d in [("baseline", base), ("weekly", week), ("trial", trial), ("free", free)]:
        d.to_csv(out / f"{name}.csv", index=False, encoding="utf-8-sig")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="合成データ（動作確認用）を書き出す")
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=120)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    p = make(Path(a.out), a.n, a.seed)
    print(f"合成データを書き出した：{p}")
