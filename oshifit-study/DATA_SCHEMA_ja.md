# OshiFit 研究版：保存するデータと書き出す CSV の形

## Firestore（プロジェクト `oshifit-study`、asia-northeast1）

```
participants/{uid}                 … 参加者1人（uid は Firebase Authentication の ID。ログインはメールアドレスとパスワード。メールアドレスは Authentication にだけあり、ここには入れない）
  pid            研究用の番号（例 "7F3K-92QD"。自動で作る。マイページに出す）
  qset           質問の版（"short"＝短縮版、"full"＝全項目）
  withdrawn      旧版の「参加をやめる」で付いた印（2026-11-17 にアプリから削除。今は付かない）
  mode           "study"
  appVersion     アプリの版（例 "2026-11-12"）
  createdAt      サーバー時刻（同意して始めた時）
  answers        開始時の回答（Q2 性別は新規登録の画面で聞く。短縮版では questionnaire.json の short_omit の17項目は空） {Q1: 21, Q2: "女性", …, W1: 3, H1: 5, P1: 2, Q62: "自由記述"}
  scores         開始時の得点 {wb, joy, sleep, money, duty, compare, burnout, who5raw, shs, pss}
  plansOffered   [{id, why, ai?, aiTried?}]（示した提案、最大3つ）。ai＝推しに合わせて AI が書いた文 {title, how, model, v, at}（表示した文）。aiTried:true＝AI が使えず固定の文を出した
  group          "A" | "B" | "C"（一度決めたら変えられない）
  planIds        群B：選んだ提案の id の配列。群C：示した提案の先頭1つ。群A：[]
  decidedAt      サーバー時刻（群が決まった時）。「開始からの日数」の起点
  pred           {A:{…scores}, B:{…scores}, hw, hwWb}（2つの未来で示した見込み。群Aはなし）
  avatar         {v:2, gender, face, skin, hair, hairColor, brow, eye, eyeColor, nose, mouth, glasses, beard, shirt}（番号と記号だけ。写真は使わない。avatar.js）
  final          {answers:{…}, scores:{…}, day, at, totals:{yen, min, n}}（最後の調査。totals は毎日のアンケートの合計と回答日数）
participants/{uid}/checkins/{week} … 振り返り（week = 何回目か 1〜6。文書IDも同じ）
  week, day（開始からの日数）, at（サーバー時刻）
  did_<planId>, Q44, Q45, Q47, Q48, joy   旧版のみ（2026-11-19 から振り返りでは聞かない。毎日のアンケートで聞く）
  dBurn          前回から今日までの毎日の負担4項目の平均（0〜100）。burn にも同じ値（画面のグラフ用）
  dJoy, dMood    同じ期間の「幸せを感じた」・気分の平均（1〜7）。joyN は dJoy を0〜100にしたもの
  exec_<planId>  同じ期間の、その提案の実行（行った1・一部0.5・行わなかった0）の平均。dExec は全提案の平均、dExecDays は行った日（一部も含む）の数
  stress         0=減った 1=変わらない 2=増えた
  happy          0=上がった 1=変わらない 2=下がった
  W1〜W5         3回目だけ（0〜5）
  adjBurn, adjBurnHw, adjWb, adjWbHw, adjN, adjNWb   その時点で本人の記録で直した28日目の見込み（推し疲れ・WHO-5）と80%区間の半幅、使った記録の数（index.html の personalPred）
  sumYen, sumMin, nDaily   前回の振り返り（1回目は群が決まった時）から今回までの、毎日のアンケートのお金・時間の合計と回答日数
participants/{uid}/daily/{YYYY-MM-DD} … 毎日のアンケート（全群。1日1回、書き換え不可。文書IDは端末の日付）
  date, day（開始からの日数）, at（サーバー時刻）
  mood           1〜7（とても悪い〜とても良い）
  yen            今日の推し活に使ったお金（円、0〜1,000,000）
  minutes        今日の推し活の時間（分、0〜1,440）
  joy, Q44, Q45, Q47, Q48   1〜7
  did_<planId>   群B・C だけ。0=行った 1=一部 2=行わなかった
（participants/{uid} の追加項目）
  cfgVersion     群を決めたときの実験の条件の版（study/protocol の version。なければ 0）。変えられない
  cfgUsed        群を決めたときの実験の条件の値（初期値と study/protocol を混ぜたもの）。変えられない

admins/{email}                     … 開発者ページを見られる人（大学アカウント）
――― ②実験の条件（版で管理。実験が始まったら固定）―――
study/protocol                     … 実験の条件（誰でも読める。開発者ページからだけ変える）。項目と初期値は public/settings.js
  version, gapDays, nChecks, finalDay, finalMaxDay, groupA{axisMin, axisCount, who5Min}, ref{…}, weights{trait, act},
  diminish[…], clashFactor, burden, interval{hw, hwWb, hwStep, hwWbStep}, pc{burnout{su,se}, wb{su,se}},
  locked（true で固定。固定中は変えられない）, lockedAt, lockedBy, lockReason（外した理由）, updatedAt, updatedBy
  （範囲外・型の違う値は無視して初期値を使う。書いていない項目も初期値）
study/protocol/history/{版}        … 変更の記録（version, reason, before, after, changed[{k, before, after}], at, by）。消せない・書き換えられない
study/protocol/events/{自動ID}     … 固定する・外すの記録（type: lock/unlock, reason, at, by, version）
plans/{id}                         … 提案の上書き・追加。初期値は public/plans.js。固定中は active だけ変えられる
  title, how, axis, eff, trait, act, multi, active（false で新しい参加者に出さない。選んだ人の記録には残る）
――― ③運用（いつでも変えてよい）―――
ops/alerts                         … 「確認が必要」の基準（noCheckDays, noDailyDays, who5Max）。開発者だけが読み書き
notices/{id}                       … お知らせ。text, active, from, to（YYYY-MM-DD）, target（all / participants）, level（info / warn）
notes/{pid}                        … 参加者ごとのメモ（開発者だけが読み書き。参加者には見えない）。text, exclude（true で分析の本分析から外す）, updatedAt, updatedBy

pilots/{pid}                       … プレ実験の参加ID（研究者が入れる。参加者からは見えない）
```

## 書き出す CSV（開発者ページ）

すべて UTF-8（BOM 付き、Excel で開ける）。1行目は列名。

### baseline.csv（1行1人）
`pid, uid, pilot(0/1), exclude(0/1：notes で除外), note（研究者のメモ）, cfg_version, qset, withdrawn(0/1), withdrawn_at, created_at, decided_at, group, plans_offered(;区切り), plans_chosen(;区切り), avatar_source,`
開始時の全項目 `Q1 … Q61, W1 … W5, H1 … H4, P1 … P14`（Q4b 推しの名前と Q62 の自由記述は free.csv に分ける）、
得点 `wb, joy, sleep, money, duty, compare, burnout, who5raw, shs, pss`、
見込み `pred_B_wb, pred_B_joy, pred_B_sleep, pred_B_money, pred_B_duty, pred_B_compare, pred_B_burnout, pred_B_pss, pred_hw, pred_hwWb`

### weekly.csv（1行1回の振り返り）
`pid, group, week, day, at, did_<planId>…（その人の提案の分だけ。列は全提案分を作り、ないところは空）, Q44, Q45, Q47, Q48, joy, stress, happy, W1 … W5, burn, joyN`

### daily.csv（1行1日の毎日のアンケート）
`pid, group, date, day, at, mood, yen, minutes, joy, Q44, Q45, Q47, Q48, did_<planId>…`

weekly.csv には `sumYen, sumMin, nDaily, adjBurn, adjBurnHw, adjWb, adjWbHw, adjN, adjNWb` も入る。

### trial.csv（1行1人。最後の調査まで）
`pid, pilot, withdrawn, group, final_day, final_at,` 最後の調査の項目 `W1 … W5, H1 … H4, P1 … P14, Q29 … Q34, Q39, Q44 … Q51, J1, J2, K1 … K5`（群Aは J/K なし）、
最後の得点 `wb_post, joy_post, sleep_post, money_post, duty_post, compare_post, burnout_post, who5raw_post, shs_post, pss_post`、
`n_checkins`（振り返りの回数）、`exec_rate` は毎日のアンケートの「今日、提案を行ったか」から計算（旧版は振り返りから）、`total_yen, total_min, n_daily`（28日間の毎日のアンケートの合計と回答日数）、`exec_rate`（群Bで「行った=1、一部=0.5、行わなかった=0」の平均）

### config.json・plans.json（ZIP にだけ入る）
書き出したときの実験の条件（今の値・版・固定中か）、変更の記録と固定の記録、運用の基準、受け付けなかった項目と、提案の一覧（初期値と plans を混ぜたもの）。分析の手順7は plans.json があればそれを使う。

### free.csv（自由記述。個人が特定される内容がないか確認してから使う）
`pid, where(baseline_Q4b / ai_plan_{提案id} / baseline_Q62 / final_how), text`（ai_plan は「題名／やり方」）。trial.csv に plans_ai（提案ごとに AI の文なら1）と ai_model

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
