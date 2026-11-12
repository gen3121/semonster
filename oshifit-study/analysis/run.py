"""OshiFit 研究版の分析を手順0〜7の順に実行する。

使い方（oshifit-study/ で）:
    python -m analysis.run --data 書き出したCSVのフォルダ --out 結果のフォルダ
または
    python analysis/run.py --data ... --out ...
"""
from __future__ import annotations

import argparse
import sys
import traceback
from datetime import datetime
from pathlib import Path

if __package__ in (None, ""):          # python analysis/run.py で呼ばれたとき
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "analysis"

from analysis import (step0_load, step1_scales, step2_baseline, step3_predict,  # noqa: E402
                      step4_groups, step5_wellbeing, step6_extra, step7_update)
from analysis.common import SYNTH_MARKER, Ctx, Scheme  # noqa: E402

STEPS = [("0", step0_load), ("1", step1_scales), ("2", step2_baseline), ("3", step3_predict),
         ("4", step4_groups), ("5", step5_wellbeing), ("6", step6_extra), ("7", step7_update)]
REPORT = "分析レポート.md"


def main(argv=None) -> Ctx:
    ap = argparse.ArgumentParser(description="OshiFit 研究版の分析（手順0〜7）")
    ap.add_argument("--data", required=True, help="baseline.csv などがあるフォルダ")
    ap.add_argument("--out", required=True, help="結果を書き出すフォルダ（実データを含むのでリポジトリの外に置く）")
    ap.add_argument("--seed", type=int, default=20261112)
    ap.add_argument("--boot", type=int, default=2000, help="媒介分析・α のブートストラップ回数")
    ap.add_argument("--boot-cluster", type=int, default=200, help="k-means 安定性のブートストラップ回数")
    ap.add_argument("--stab", type=int, default=200, help="LASSO 安定性選択の繰り返し回数")
    ap.add_argument("--prior-sd", type=float, default=8.0, help="提案の改善量の事前SD（点）")
    ap.add_argument("--steps", default="0,1,2,3,4,5,6,7", help="実行する手順（手順0は常に実行）")
    ap.add_argument("--synthetic", action="store_true", help="合成データとして扱う（目印ファイルがあれば自動）")
    a = ap.parse_args(argv)

    data, out = Path(a.data), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    ctx = Ctx(data_dir=data, out_dir=out, scheme=Scheme(), seed=a.seed, n_boot=a.boot,
              n_boot_cluster=a.boot_cluster, n_stab=a.stab, prior_sd=a.prior_sd,
              synthetic=a.synthetic or (data / SYNTH_MARKER).exists())
    want = set(a.steps.split(",")) | {"0"}
    log = []
    for key, mod in STEPS:
        if key not in want:
            continue
        if ctx.store.get("stop"):
            break
        try:
            mod.run(ctx)
            log.append({"step": key, "status": "ok"})
        except Exception as e:   # 1つの手順が失敗しても続ける
            ctx.md(f"**手順{key}は途中で止まった**（{type(e).__name__}: {e}）。ほかの手順は続けた。", "")
            log.append({"step": key, "status": "error", "error": f"{type(e).__name__}: {e}",
                        "trace": traceback.format_exc()})
    ctx.save_json("run_log.json", log)

    head = ["# OshiFit 分析レポート", ""]
    if ctx.synthetic:
        head += ["> **合成データ（SYNTHETIC）**：この結果は動作確認用の作り物のデータから出したもの。"
                 "研究の結果として使わない・引用しない。", ""]
    head += [f"- 作成：{datetime.now():%Y-%m-%d %H:%M}　データ：`{data}`",
             f"- 乱数の種 {a.seed}、ブートストラップ {a.boot} 回、k-means 安定性 {a.boot_cluster} 回、安定性選択 {a.stab} 回、事前SD {a.prior_sd}",
             "- 群は本人が選んだもの（無作為割り付けではない）。群の差・関連を因果として書かない。",
             "- 出力フォルダには参加者ごとの値を含むファイルがある。リポジトリにコミットしない。", ""]
    errs = [l for l in log if l["status"] == "error"]
    if errs:
        head += ["**止まった手順**：" + "、".join(f"手順{l['step']}（{l['error']}）" for l in errs), ""]
    (out / REPORT).write_text("\n".join(head + ctx.report + ["", "## 出力ファイル", ""] +
                                        [f"- `{f}`" for f in ctx.outputs]) + "\n", encoding="utf-8")
    print(f"レポート：{out / REPORT}（出力 {len(ctx.outputs)} 件、止まった手順 {len(errs)} 件）")
    return ctx


if __name__ == "__main__":
    main()
