# OshiFit 研究版の分析手順（手順0〜7）

研究者が、開発者ページから書き出した CSV（`baseline.csv`・`weekly.csv`・`trial.csv`・`free.csv`）を分析するための手順。
CSV の形は `../DATA_SCHEMA_ja.md`、項目と採点規則は `../public/questionnaire.json`、提案の一覧（id・軸・改善の見込み eff）は `../public/index.html` の `PLANS` から読む。

## 大事な前提

- **群は本人が選んだもの**（群A は自動判定、群B は提案を選んだ人＝プランB「最適化された推し活」、群C は今のままを選んだ人＝プランA「現在のままの推し活」）。無作為割り付けではないので、群の差や変化との結びつきは **「関連」** と書き、「効果」「〜によって改善した」と書かない。
- 手順2 は開始時1回の横断データ。PC アルゴリズム・SEM・DML の矢印や係数も「関連」。
- 参加者の CSV と出力フォルダはリポジトリに入れない（出力には参加者ごとの値が入る）。`analysis/.gitignore` で CSV・図・出力フォルダを除外しているが、置き場所は `oshifit-study/` の外にする。
- 合成データ（`make_synthetic.py`）の結果は動作確認用。論文・発表に使わない。合成データのフォルダには目印ファイル `合成データ_SYNTHETIC.txt` があり、レポートの冒頭に「合成データ」と出る。

## 準備と実行

```bash
cd oshifit-study
python -m venv .venv && . .venv/bin/activate      # Windows は .venv\Scripts\activate
pip install -r analysis/requirements.txt

# 実データ（フォルダはリポジトリの外）
python -m analysis.run --data ~/oshifit_data/2027-01-10 --out ~/oshifit_results/2027-01-10
# 同じこと：python analysis/run.py --data ... --out ...

# 合成データで動作確認
python -m analysis.make_synthetic --out /tmp/oshifit_synth --n 120
python -m analysis.run --data /tmp/oshifit_synth --out /tmp/oshifit_synth_out

# テスト
python -m pytest analysis/tests -q
```

主な設定：`--boot`（媒介分析と α のブートストラップ、既定 2000）、`--boot-cluster`（k-means 安定性、既定 200）、`--stab`（安定性選択、既定 200）、`--prior-sd`（提案の改善量の事前SD、既定 8 点）、`--seed`、`--steps 0,4,5`（一部だけ。手順0は常に実行）。
120人・既定の回数で数分かかる。人数が足りない方法は止まらずに飛ばし、レポートに「実行しなかった（理由）」と書く。1つの手順が失敗しても次へ進み、`run_log.json` に記録する。

## 標本

- **本分析**：注意確認（Q42 = 2）に合った人、かつプレ実験でない人（`pilot` が baseline・trial のどちらでも 1 でない）。
- **感度分析**：全員（注意確認に合わなかった人・プレ実験の人を含む）。手順4 の主要な ANCOVA を感度分析でも出す。

## 各手順

| 手順 | 何に答えるか | 方法 | 主な出力 |
|---|---|---|---|
| 0 読み込み | データはそろっているか。保存された得点は採点規則どおりか | 項目から得点を計算し直し、保存値と照合（差 0.5 まで一致とみなす）。実行率も weekly から計算し直して照合。以後は計算し直した値を使う | `s0_summary.json`、`s0_score_mismatches.csv`、`s0_clean_main.csv` |
| 1 尺度の確認 | 尺度はまとまっているか。5つの要素の構造は成り立つか | Cronbach の α（ブートストラップ95%CI）。5因子（充実7項目＋負担4軸×2項目）の CFA（semopy、CFI・TLI・RMSEA・SRMR）。期待する向きの相関（推し疲れ⇔PSS-J 正、充実⇔WHO-5・SHS 正 など） | `s1_alpha.csv`、`s1_cfa.json`、`s1_validity_checks.csv`、`s1_correlations.csv` |
| 2 開始時の構造 | どんなタイプの人がいるか。性格・活動・負担・幸福度はどう結びついているか | k-means（k = 2〜6、シルエット、ブートストラップ ARI で安定性）。SEM の経路モデル（性格 → 活動の割合 → 5要素 → WHO-5／PSS-J、変数は標準化。式は `step2_baseline.py` の `SEM_DESC`）。PC アルゴリズム（Fisher-z、α = .05）。DML（部分線形モデル、5分割の交差適合 × 5回、ランダムフォレストと LASSO）：SNS の割合（Q24・Q25 の平均）と比較の軸・WHO-5。調整は性格5特性・ほかの活動の割合・年齢 | `s2_kmeans.json`、`s2_kmeans_profile.csv`、`s2_sem.json`、`s2_pc.json`、`s2_dml.json`、`s2_kmeans_k.png` |
| 3 予測 | 開始時の情報から約4週間後の WHO-5・推し疲れをどこまで予測できるか | リッジ回帰。外側10分割で性能（CV R²・RMSE）、内側の RidgeCV で正則化の強さ。「開始時の値をそのまま予測にした場合」の RMSE と比べる | `s3_ridge_cv.csv`、`s3_ridge_coefficients.json` |
| 4 群の比較 | 各群で前後に変化があったか。B と C で最後の値に差があるか | 群内：対応のある t 検定・Wilcoxon、dz。B 対 C：ANCOVA（最後 ~ 群 + 開始時、TIPI も足した版）。傾向スコア（B になる確率、弱い L2 のロジスティック回帰）で安定化 IPW（1〜99パーセンタイルで切り詰め）、重み付き回帰（HC3）。釣り合い（SMD）と有効標本サイズも出す | `s4_paired.csv`、`s4_ancova.csv`、`s4_propensity.json`、`s4_ipw_regression.csv`、`s4_ancova_sensitivity.csv` |
| 5 幸福度の根拠 | WHO-5 が意味のある大きさで上がった人は B に多いか。変化はいつ起きたか。提案を多く実行した人ほど変化したか | WHO-5 が10点以上（0〜100）上がったかの IPW 重み付きロジスティック回帰。線形混合モデル（WHO-5 の3時点：開始時0日・3回目の振り返りの日・最後の調査の日、日数 × 群、人ごとのランダム切片、基準は群C）。用量反応（群B：変化 ~ 実行率 + 開始時、HC3）。媒介（群B：実行率 → 推し疲れの変化 → WHO-5 の変化、パーセンタイル法ブートストラップ） | `s5_improved_logit.json`、`s5_mixed_who5.json`、`s5_dose_response.csv`、`s5_mediation.json`、`s5_who5_trajectory.png` |
| 6 今回追加（探索） | 性格によって結びつきが違うか。変化を予測する特徴はどれか | 交互作用（変化 ~ 群B × 性格、群B内で 実行率 × 性格、HC3、20本を Holm 補正）。LASSO の安定性選択（B∪C、50%の部分標本 × 200回、全体の LassoCV で選んだ α を固定、選択確率 ≥ 0.6 を「安定」） | `s6_interactions.csv`、`s6_stability_selection.csv` |
| 7 研究終了後 | 提案ごとの改善の見込み（eff）と見込みの幅（±15・±12）を実測でどう直すか | 縮約（正規分布どうしの精度重み付き平均）：事前＝PLANS の eff（SD 8）、観測＝群Bでその提案を選んだ人のその軸の前後差（SE＝SD/√n、下限 1 点）。参考に提案間のばらつき τ をモーメント法で推定した版も出す。見込みの誤差（観測 − 見込み）の絶対値の80パーセンタイルを新しい半幅の候補にし、今の区間に入った割合も出す | `plan_effects_updated.json`、`s7_plan_effects.csv`、`prediction_interval_updated.json` |

最後に全体をまとめた `分析レポート.md` を出力フォルダに書く。

## 多重比較（Holm）

- **主要**：B 対 C の ANCOVA（開始時の値で調整）の WHO-5（wb）と PSS-J（pss）の2本。この2本で Holm 補正し、論文の主な結果にする。
- **副次**：同じ ANCOVA の SHS・推し疲れ・5要素の7本（7本で Holm）。IPW 回帰も同じ分け方。
- 群内の前後比較は群ごとに9変数で Holm（副次）。手順6 の交互作用は20本で Holm（探索）。
- 主要・副次の分け方は、データを見る前に指導教員と確認し、論文の方法の章に書く。

## 仮定と限界

- ANCOVA：開始時の値と最後の値の関係が群で同じ（傾きが平行）、残差がおおむね正規。IPW：測った共変量で選び方の偏りが説明できる（測っていない理由は残る）。傾向スコアの範囲・SMD・有効標本サイズを必ず見る。
- 混合モデル：3回目の振り返りの WHO-5 が抜けた人も、開始時と最後の値で入る（欠測はランダムに近いと仮定）。
- 用量反応・媒介：実行率は本人が決めるので、もともと良くなりやすい人ほど実行した可能性がある。媒介の M と Y は同じ期間の変化で、時間の順序はない。
- CFA：負担の4軸は各2項目なので、識別はできても推定は不安定になりやすい（不適解の警告を出す）。n が 50 未満なら実行しない。
- PC アルゴリズム：推し疲れ（burnout）は4つの負担の軸の平均と同じ情報なので入れていない（入れると相関行列が特異になる）。
- 手順7 の観測は対照のない前後差で、時間の経過・平均への回帰を含む。群Cの同じ軸の変化を並べて出すので、比べて読む。複数の提案を選んだ人は、選んだ全部の提案に重ねて数える（提案ごとの効果は分けられない）。結果を PLANS に入れる前に指導教員と確認する。
- WHO-5 の素点：アプリは欠けた項目を 0 として足すが、分析では欠けたら空（NaN）にする。食い違いは手順0 で一覧になる。

## 出力の読み方

- `分析レポート.md`：手順ごとの人数・表・注意書き。まずここを読む。
- CSV は UTF-8（BOM 付き）で Excel で開ける。JSON は数値の詳細（モデル式、係数、収束の有無）。
- p 値の列は `p`、Holm 補正後は `p_holm`。CI は95%。効果量 dz は「差の平均 ÷ 差の SD」。

## 論文に使う出力

- 方法・結果（主要）：`s0_summary.json`（人数の流れ）、`s1_alpha.csv`、`s1_cfa.json`、`s4_ancova.csv`（主要2本と Holm）、`s4_ancova_sensitivity.csv`、`s4_ipw_regression.csv`＋`s4_propensity.json`（感度）、`s5_mixed_who5.json`、`s5_improved_logit.json`。
- 結果（副次・探索）：`s4_paired.csv`、`s5_dose_response.csv`、`s5_mediation.json`、`s6_*.csv`、手順2 の出力（横断の関連として）、`s3_ridge_cv.csv`。
- 考察・次の版：`plan_effects_updated.json`、`prediction_interval_updated.json`。
- 図：`s2_kmeans_k.png`、`s5_who5_trajectory.png`（BIZ UDPゴシック。`~/.fonts` に字体がないと別の字体になるので、論文用は字体を入れてから作る）。

## 方法の文献（論文に載せる前に原典で確認する）

- Chernozhukov, V., Chetverikov, D., Demirer, M., Duflo, E., Hansen, C., Newey, W., & Robins, J. (2018). Double/debiased machine learning for treatment and structural parameters. *The Econometrics Journal, 21*(1), C1–C68.
- Holm, S. (1979). A simple sequentially rejective multiple test procedure. *Scandinavian Journal of Statistics, 6*(2), 65–70.
- Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis: Conventional criteria versus new alternatives. *Structural Equation Modeling, 6*(1), 1–55.
- Meinshausen, N., & Bühlmann, P. (2010). Stability selection. *Journal of the Royal Statistical Society: Series B, 72*(4), 417–473.

## ファイル

```
analysis/
  run.py             手順0〜7をまとめて実行（CLI）
  common.py          採点・提案一覧の読み込み・保存・Holm・α・縮約・図の字体
  step0_load.py … step7_update.py   各手順
  make_synthetic.py  合成データ（動作確認用）
  tests/test_pipeline.py  採点・α・縮約・Holm・通しの実行のテスト
  requirements.txt
```
