# OshiFit 研究版：保存するデータと書き出す CSV の形

## Firestore（プロジェクト `oshifit-study`、asia-northeast1）

```
participants/{uid}                 … 参加者1人（uid は匿名認証の ID）
  pid            参加ID（例 "7F3K-92QD"。画面に出すID）
  mode           "study"
  appVersion     アプリの版（例 "2026-11-12"）
  createdAt      サーバー時刻（同意して始めた時）
  answers        開始時の回答 {Q1: 21, Q2: "女性", …, W1: 3, H1: 5, P1: 2, Q62: "自由記述"}
  scores         開始時の得点 {wb, joy, sleep, money, duty, compare, burnout, who5raw, shs, pss}
  plansOffered   [{id, why}]（示した提案、最大3つ）
  group          "A" | "B" | "C"（一度決めたら変えられない）
  planIds        群B：選んだ提案の id の配列。群C：示した提案の先頭1つ。群A：[]
  decidedAt      サーバー時刻（群が決まった時）。「開始からの日数」の起点
  pred           {A:{…scores}, B:{…scores}, hw, hwWb}（2つの未来で示した見込み。群Aはなし）
  avatar         {skin, hair, shirt, style, face, eye, brow, mouth, source}（写真は保存しない）
  final          {answers:{…}, scores:{…}, day, at}（最後の調査）
participants/{uid}/checkins/{week} … 振り返り（week = 何回目か 1〜6。文書IDも同じ）
  week, day（開始からの日数）, at（サーバー時刻）
  did_<planId>   0=行った 1=一部行った 2=行わなかった
  Q44, Q45, Q47, Q48, joy   1〜7
  stress         0=減った 1=変わらない 2=増えた
  happy          0=上がった 1=変わらない 2=下がった
  W1〜W5         3回目だけ（0〜5）
  burn, joyN     0〜100（画面のグラフ用）
admins/{email}                     … 開発者ページを見られる人（大学アカウント）
pilots/{pid}                       … プレ実験の参加ID（研究者が入れる。参加者からは見えない）
```

## 書き出す CSV（開発者ページ）

すべて UTF-8（BOM 付き、Excel で開ける）。1行目は列名。

### baseline.csv（1行1人）
`pid, uid, pilot(0/1), created_at, decided_at, group, plans_offered(;区切り), plans_chosen(;区切り), avatar_source,`
開始時の全項目 `Q1 … Q61, W1 … W5, H1 … H4, P1 … P14`（Q62 の自由記述は free.csv に分ける）、
得点 `wb, joy, sleep, money, duty, compare, burnout, who5raw, shs, pss`、
見込み `pred_B_wb, pred_B_joy, pred_B_sleep, pred_B_money, pred_B_duty, pred_B_compare, pred_B_burnout, pred_B_pss, pred_hw, pred_hwWb`

### weekly.csv（1行1回の振り返り）
`pid, group, week, day, at, did_<planId>…（その人の提案の分だけ。列は全提案分を作り、ないところは空）, Q44, Q45, Q47, Q48, joy, stress, happy, W1 … W5, burn, joyN`

### trial.csv（1行1人。最後の調査まで）
`pid, pilot, group, final_day, final_at,` 最後の調査の項目 `W1 … W5, H1 … H4, P1 … P14, Q29 … Q34, Q39, Q44 … Q51, J1, J2, K1 … K5`（群Aは J/K なし）、
最後の得点 `wb_post, joy_post, sleep_post, money_post, duty_post, compare_post, burnout_post, who5raw_post, shs_post, pss_post`、
`n_checkins`（振り返りの回数）、`exec_rate`（群Bで「行った=1、一部=0.5、行わなかった=0」の平均）

### free.csv（自由記述。個人が特定される内容がないか確認してから使う）
`pid, where(baseline_Q62 / final_how), text`

## 尺度と得点（questionnaire.json の scoring と同じ）
- 気持ちと生活・したくなるとき：7件法（1〜7）。5つの要素は (平均−1)÷6×100、負担の軸（sleep, money, duty, compare）は 100 から引いて「高いほど良い」にそろえる
- 推し疲れ burnout：Q44〜Q51 の平均を (平均−1)÷6×100（高いほど負担）
- WHO-5：0〜5 の合計 × 4（0〜100）。素点 who5raw は 0〜25
- SHS：H1〜H4 の平均（H4 は 8 から引いて逆転）、1〜7
- PSS-J：P1〜P14（0〜4）。P4, P5, P6, P7, P9, P10, P13 は 4 から引いて逆転。合計 0〜56
- TIPI-J：5件法（Q7〜Q16）。外向性 = Q7 と 6−Q12 など（index.html の big5）
- 注意確認：Q42 は 2 が正解。違う人は分析から除く（感度分析で含める）

## 補足（分析との取り決め）
- `Q1 … Q61` には **Q5b**（推しの数）も含む。選択式（Q2〜Q6、Q5b）は**選択肢の言葉のまま**書き出す
- 得点は丸めずに保存する（分析側は差0.5以内を一致とみなす）
- WHO-5 は必須項目なので空欄は出ない想定。空欄があれば分析では欠測として扱う
- `pred_B_*`：群Bは選んだ提案の見込み、群Cは「示した提案（先頭1つ）を試した場合」の見込み。群Aは空
- `trial.csv` は最後の調査に答えた人だけ。`exec_rate` は群Bの全振り返り・全提案の平均
- `pilot` は `pilots/{参加ID}` があれば 1（baseline と trial で同じ値）
