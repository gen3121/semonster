"""分析パイプラインの確認。oshifit-study/ で `python -m pytest analysis/tests -q` を実行する。"""
from __future__ import annotations

import json
import math

import numpy as np
import pandas as pd
import pytest

from analysis import make_synthetic, run
from analysis.common import Scheme, cronbach_alpha, holm, shrink

S = Scheme()


def base_answers():
    A = {k: 4 for k in S.axis_items["joy"] + S.burnout_items}
    A.update({k: 3 for k in S.who5_items})
    A.update({k: 4 for k in S.shs_items})
    A.update({k: 2 for k in S.pss_items})
    A.update({f"Q{i}": 3 for i in range(7, 17)})
    return A


# ---------------------------------------------------------------- 採点
def test_who5_times4():
    A = base_answers()
    A.update(W1=5, W2=5, W3=4, W4=0, W5=1)
    sc = S.score(A)
    assert sc["who5raw"] == 15 and sc["wb"] == 60


def test_pss_reverse():
    A = base_answers()
    for k in S.pss_items:
        A[k] = 4                       # 全部4：否定7項目は4、肯定7項目は 4−4=0
    assert S.score(A)["pss"] == 28
    assert set(S.pss_reverse) == {"P4", "P5", "P6", "P7", "P9", "P10", "P13"}
    for k in S.pss_items:
        A[k] = 0 if k in S.pss_reverse else 4   # 最もストレスが高い答え方
    assert S.score(A)["pss"] == 56


def test_shs_h4_reverse():
    A = base_answers()
    A.update(H1=7, H2=7, H3=7, H4=1)  # H4=1 は逆転して 7
    assert S.score(A)["shs"] == 7
    A["H4"] = 7
    assert S.score(A)["shs"] == pytest.approx((7 + 7 + 7 + 1) / 4)


def test_axis_reverse_and_joy():
    A = base_answers()
    for k in S.axis_items["joy"]:
        A[k] = 7
    A.update(Q44=1, Q50=1)            # 睡眠の負担が最小 → 100（高いほど良い）
    A.update(Q45=7, Q46=7)            # お金の負担が最大 → 0
    A.update(Q47=4, Q49=4)            # 真ん中 → 50
    sc = S.score(A)
    assert sc["joy"] == 100 and sc["sleep"] == 100 and sc["money"] == 0 and sc["duty"] == 50
    # 推し疲れは逆転しない：(平均−1)÷6×100
    b = np.mean([A[k] for k in S.burnout_items])
    assert sc["burnout"] == pytest.approx((b - 1) / 6 * 100)


def test_missing_item_gives_nan():
    A = base_answers()
    del A["P3"]
    assert math.isnan(S.score(A)["pss"])


def test_tipi():
    A = base_answers()
    A.update(Q7=5, Q12=1)             # 外向性が最大
    assert S.tipi(A)["E"] == 100


# ---------------------------------------------------------------- 統計の道具
def test_cronbach_known():
    # 3項目が完全に同じ → α = 1
    x = np.array([[1, 1, 1], [2, 2, 2], [3, 3, 3], [5, 5, 5]])
    assert cronbach_alpha(x) == pytest.approx(1.0)
    # 手計算：項目分散 [1,1]、合計の分散 = 1+1+2×共分散(0.5)=3 → α = 2×(1−2/3) = 2/3
    y = np.array([[1, 2], [2, 1], [3, 3]], dtype=float)
    iv = y.var(axis=0, ddof=1).sum()
    tv = y.sum(axis=1).var(ddof=1)
    assert cronbach_alpha(y) == pytest.approx(2 * (1 - iv / tv))
    assert cronbach_alpha(y) == pytest.approx(2 / 3)


def test_shrinkage_known():
    # 事前 10（SD 8）、観測 20（SE 8）→ 精度が同じなので 15、事後SD = 8/√2
    m, s = shrink(10, 8, 20, 8)
    assert m == pytest.approx(15) and s == pytest.approx(8 / math.sqrt(2))
    # 観測 SE 4（精度4倍）→ (10×1 + 20×4)/5 = 18
    m, _ = shrink(10, 8, 20, 4)
    assert m == pytest.approx(18)
    # 観測がない → 事前のまま
    assert shrink(12, 8, float("nan"), float("nan")) == (12, 8)


def test_holm_known():
    p = [0.01, 0.04, 0.03, 0.005]
    # 並べ替え 0.005×4=.02, 0.01×3=.03, 0.03×2=.06, 0.04×1=.04→単調化で .06
    assert np.allclose(holm(p), [0.03, 0.06, 0.06, 0.02])
    assert np.allclose(holm([0.5, 0.9]), [1.0, 1.0])
    r = holm([0.01, float("nan")])
    assert r[0] == pytest.approx(0.01) and math.isnan(r[1])


# ---------------------------------------------------------------- 通しの実行（合成データ）
EXPECTED = ["分析レポート.md", "run_log.json", "s0_summary.json", "s0_score_mismatches.csv", "s1_alpha.csv",
            "s1_cfa.json", "s1_validity_checks.csv", "s2_kmeans.json", "s2_sem.json", "s2_pc.json", "s2_dml.json",
            "s3_ridge_cv.csv", "s3_ridge_coefficients.json", "s4_paired.csv", "s4_ancova.csv",
            "s4_propensity.json", "s4_ipw_regression.csv", "s4_ancova_sensitivity.csv",
            "s5_improved_logit.json", "s5_mixed_who5.json", "s5_dose_response.csv", "s5_mediation.json",
            "s6_interactions.csv", "s6_stability_selection.csv", "s7_plan_effects.csv",
            "plan_effects_updated.json", "prediction_interval_updated.json"]


@pytest.fixture(scope="module")
def synth_run(tmp_path_factory):
    d = tmp_path_factory.mktemp("synth")
    make_synthetic.make(d / "data", n=120, seed=3)
    ctx = run.main(["--data", str(d / "data"), "--out", str(d / "out"),
                    "--boot", "200", "--boot-cluster", "20", "--stab", "40"])
    return d / "out", ctx


def test_end_to_end_outputs(synth_run):
    out, _ = synth_run
    for f in EXPECTED:
        assert (out / f).exists(), f
    log = json.loads((out / "run_log.json").read_text(encoding="utf-8"))
    assert all(l["status"] == "ok" for l in log), log
    rep = (out / "分析レポート.md").read_text(encoding="utf-8")
    assert "合成データ" in rep
    for k in range(8):
        assert f"## 手順{k}" in rep


def test_synthetic_scores_match(synth_run):
    out, _ = synth_run
    mm = pd.read_csv(out / "s0_score_mismatches.csv", encoding="utf-8-sig")
    assert len(mm) == 0


def test_plan_effects_json(synth_run):
    out, ctx = synth_run
    pe = json.loads((out / "plan_effects_updated.json").read_text(encoding="utf-8"))
    ids = {p["id"] for p in pe["plans"]}
    assert {"sns23", "archive", "budget", "good3", "choose3"} <= ids and len(ids) == 15
    for p in pe["plans"]:
        if p["n"] >= 2:   # 事後平均は事前と観測の間にある
            lo, hi = sorted([p["prior"], p["observed"]])
            assert lo - 1e-9 <= p["posterior"] <= hi + 1e-9
            assert p["posterior_sd"] < p["prior_sd"]


def test_small_sample_does_not_crash(tmp_path):
    make_synthetic.make(tmp_path / "data", n=12, seed=5)
    ctx = run.main(["--data", str(tmp_path / "data"), "--out", str(tmp_path / "out"),
                    "--boot", "50", "--boot-cluster", "5", "--stab", "10"])
    log = json.loads((tmp_path / "out" / "run_log.json").read_text(encoding="utf-8"))
    assert all(l["status"] == "ok" for l in log), log
    rep = (tmp_path / "out" / "分析レポート.md").read_text(encoding="utf-8")
    assert "実行しなかった" in rep


def test_without_trial(tmp_path):
    make_synthetic.make(tmp_path / "data", n=60, seed=7)
    (tmp_path / "data" / "trial.csv").unlink()
    (tmp_path / "data" / "weekly.csv").unlink()
    run.main(["--data", str(tmp_path / "data"), "--out", str(tmp_path / "out"),
              "--boot", "50", "--boot-cluster", "5", "--stab", "10"])
    log = json.loads((tmp_path / "out" / "run_log.json").read_text(encoding="utf-8"))
    assert all(l["status"] == "ok" for l in log), log


def test_mismatch_detected(tmp_path):
    d = make_synthetic.make(tmp_path / "data", n=40, seed=9)
    b = pd.read_csv(d / "baseline.csv", encoding="utf-8-sig")
    b.loc[0, "pss"] = b.loc[0, "pss"] + 5
    b.to_csv(d / "baseline.csv", index=False, encoding="utf-8-sig")
    run.main(["--data", str(d), "--out", str(tmp_path / "out"), "--steps", "0"])
    mm = pd.read_csv(tmp_path / "out" / "s0_score_mismatches.csv", encoding="utf-8-sig")
    assert len(mm) == 1 and mm.loc[0, "得点"] == "pss"
