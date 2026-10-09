"""予備調査215名 → 予測モデル v1.0 と基準分布（個票は出力しない）。
使い方: python model_v1.py <survey.csv> <出力フォルダ>
回答の向き: 回収データは「1＝よく当てはまる／高頻度」。6 から引いて「大きいほど高い」にそろえる。
  根拠: 逆向きに読むと、生きがい79%・出費の不安40%・睡眠33%、増やしたい（ライブ39%・グッズ36%）、減らしたい（SNS22%）が
  計画書の数字と一致する（順方向だと生きがい12%）。"""
import sys, json, os
import numpy as np, pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import RepeatedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
d = pd.read_csv(SRC)
likert = [c for c in d.columns if c.startswith(('tipi_', 'av_', 'cur_', 'ideal_', 'w_', 'b_', 'trg_'))]
d[likert] = 6 - d[likert]                                  # 向きをそろえる（大きいほど高い）
n = len(d)

ALPHA = lambda df: df.shape[1] / (df.shape[1] - 1) * (1 - df.var(ddof=1).sum() / df.sum(axis=1).var(ddof=1))
WB = ['w_ikigai', 'w_confidence', 'w_schedule', 'w_create']; BO = ['b_sleep', 'b_money', 'b_duty', 'b_envy']
d['WB'] = d[WB].mean(axis=1); d['BO'] = d[BO].mean(axis=1)
ACT = ['media', 'live', 'goods', 'sns']
for a in ACT: d['gap_' + a] = d['ideal_' + a] - d['cur_' + a]      # 正＝もっとしたい
d['avatar'] = d[['av_empathy', 'av_mood', 'av_visual']].mean(axis=1)
r = lambda x: 6 - x
d['E'] = (d.tipi_1 + r(d.tipi_6)) / 2; d['A'] = (r(d.tipi_2) + d.tipi_7) / 2; d['C'] = (d.tipi_3 + r(d.tipi_8)) / 2
d['N'] = (d.tipi_4 + r(d.tipi_9)) / 2; d['O'] = (d.tipi_5 + r(d.tipi_10)) / 2
TRG = ['trg_escape', 'trg_reward', 'trg_payday', 'trg_rebound', 'trg_recover']

SETS = {
    'F1 現状の頻度4つ': [f'cur_{a}' for a in ACT],
    'F2 ＋理想との差4つ': [f'cur_{a}' for a in ACT] + [f'gap_{a}' for a in ACT],
    'F3 ＋アバター意識・スイッチ': [f'cur_{a}' for a in ACT] + [f'gap_{a}' for a in ACT] + ['avatar'] + TRG,
    'F4 ＋性格(TIPI-J)': [f'cur_{a}' for a in ACT] + [f'gap_{a}' for a in ACT] + ['avatar'] + TRG + list('EACNO'),
    'F5 現状の頻度＋アバター意識・スイッチ': [f'cur_{a}' for a in ACT] + ['avatar'] + TRG,
}

def cv(cols, y, reps=20, seed=0):
    X = d[cols].values; Y = d[y].values; r2s = []; rm = []
    for tr, te in RepeatedKFold(n_splits=10, n_repeats=reps, random_state=seed).split(X):
        m = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 30))).fit(X[tr], Y[tr])
        p = m.predict(X[te]); r2s.append(r2_score(Y[te], p)); rm.append(np.sqrt(np.mean((Y[te] - p) ** 2)))
    return float(np.mean(r2s)), float(np.std(r2s)), float(np.mean(rm))

report = {'n': n, 'alpha': {'WB': round(ALPHA(d[WB]), 2), 'BO': round(ALPHA(d[BO]), 2)}, 'cv': {}}
print('N', n, 'alpha', report['alpha'])
print('分散(WB,BO)', round(d.WB.std(), 2), round(d.BO.std(), 2), '  ← 平均だけで予測したときの誤差（基準）')
for y in ['WB', 'BO']:
    for k, cols in SETS.items():
        m, s, rm = cv(cols, y)
        report['cv'].setdefault(y, {})[k] = {'r2': round(m, 3), 'r2_sd': round(s, 3), 'rmse': round(rm, 3), 'p': len(cols)}
        print(f'{y} {k:32s} CV R²={m:6.3f} (±{s:.3f})  RMSE={rm:.3f}  特徴{len(cols)}個')

# 採用する特徴量: 現状の頻度4つ＋理想との差4つ（アプリで毎週・初回に聞ける項目）。F1/F2/F5 の比較は上の表のとおり。
CHOSEN = sys.argv[3].split(',') if len(sys.argv) > 3 else SETS['F2 ＋理想との差4つ']
final = {'version': 'v1.0', 'placeholder': False, 'n': n, 'features': CHOSEN, 'scaleNote': '5件法。向きは「大きいほど高い／よく当てはまる」にそろえてある（回収データを 6−x）', 'outcomes': {}}
for y in ['WB', 'BO']:
    X = d[CHOSEN].values; Y = d[y].values
    sc = StandardScaler().fit(X); m = RidgeCV(alphas=np.logspace(-2, 3, 30)).fit(sc.transform(X), Y)
    coef_raw = m.coef_ / sc.scale_; icpt = float(m.intercept_ - np.sum(coef_raw * sc.mean_))
    pred = m.predict(sc.transform(X)); resid = Y - pred
    # 係数のばらつき（ブートストラップ1000回、リッジ係数は固定）→ 2つの頻度の組の「差」の確からしさに使う
    rng = np.random.default_rng(42); Bc = []
    for _ in range(1000):
        ix = rng.integers(0, n, n); sc_b = StandardScaler().fit(X[ix])
        from sklearn.linear_model import Ridge
        mb = Ridge(alpha=m.alpha_).fit(sc_b.transform(X[ix]), Y[ix]); Bc.append(mb.coef_ / sc_b.scale_)
    cov = np.cov(np.array(Bc).T)
    m_, s_, rm_ = cv(CHOSEN, y, reps=20, seed=1)
    final['outcomes'][y] = {'intercept': round(icpt, 4), 'coef': {c: round(float(b), 4) for c, b in zip(CHOSEN, coef_raw)}, 'ridgeAlpha': round(float(m.alpha_), 3),
                            'rmseCV': round(rm_, 3), 'r2CV': round(m_, 3), 'sdOutcome': round(float(Y.std(ddof=1)), 3), 'mean': round(float(Y.mean()), 3), 'coefCov': [[float(f'{v:.6g}') for v in row] for row in cov]}
    print(y, 'intercept', round(icpt, 3), {c: round(float(b), 3) for c, b in zip(CHOSEN, coef_raw)}, 'alpha', round(float(m.alpha_), 2))

# 基準分布（個人が特定されない集計のみ）
norm = {'n': n, 'items': {}, 'indices': {}}
for c in ['w_ikigai', 'w_confidence', 'w_schedule', 'w_create', 'b_sleep', 'b_money', 'b_duty', 'b_envy'] + [f'cur_{a}' for a in ACT] + [f'ideal_{a}' for a in ACT]:
    vc = d[c].round().astype(int).value_counts().reindex(range(1, 6), fill_value=0)
    norm['items'][c] = {'counts': [int(x) for x in vc.values], 'mean': round(float(d[c].mean()), 3)}
for c in ['WB', 'BO']:
    qs = d[c].quantile([.05, .25, 1 / 3, .5, 2 / 3, .75, .95]).round(3).tolist()
    norm['indices'][c] = {'sorted': [round(float(x), 3) for x in np.sort(d[c].values)], 'tertiles': [qs[2], qs[4]], 'mean': round(float(d[c].mean()), 3), 'sd': round(float(d[c].std(ddof=1)), 3)}
json.dump(final, open(os.path.join(OUT, 'model_v1.json'), 'w'), ensure_ascii=False, indent=2)
json.dump(norm, open(os.path.join(OUT, 'norms.json'), 'w'), ensure_ascii=False, indent=2)
json.dump(report, open(os.path.join(OUT, 'cv_report.json'), 'w'), ensure_ascii=False, indent=2)

# 性格・理想との差などの関連（参考）
print('\n相関（向きをそろえた後）'); print(d[['E', 'A', 'C', 'N', 'O', 'avatar', 'gap_media', 'gap_live', 'gap_goods', 'gap_sns', 'WB', 'BO']].corr().loc[['E', 'A', 'C', 'N', 'O', 'avatar', 'gap_media', 'gap_live', 'gap_goods', 'gap_sns'], ['WB', 'BO']].round(2).to_string())
inc = {'5万円未満': 3, '5〜10万円': 7.5, '10〜15万円': 12.5, '15〜20万円': 17.5, '20〜30万円': 25}
exp = {'負担なし': 0, '5万円未満': 3, '5〜10万円': 7.5, '10〜15万円': 12.5, '15〜20万円': 17.5}
spd = {'0円': 0, '5,000円未満': 0.25, '5,000円〜1万円': 0.75, '1万円〜3万円': 2, '3万円〜5万円': 4, '5万円〜10万円': 7.5, '10万円以上': 12}
disp = d.income.map(inc) - d.expense.map(exp); ratio = d.spend.map(spd) / disp.where(disp > 0)
ok = ratio.notna()
print('\n推し活費 ÷ 可処分所得（中央値で換算）  有効', int(ok.sum()), '名  中央値', round(float(ratio[ok].median()), 2), ' 1超', int((ratio[ok] > 1).sum()), '名')
print('  この比と「予算を超えて不安」の相関', round(float(np.corrcoef(ratio[ok].clip(upper=2), d.b_money[ok])[0, 1]), 2), ' / 推し活費(段階)との相関', round(float(np.corrcoef(d.spend.map(spd)[d.spend.map(spd).notna()], d.b_money[d.spend.map(spd).notna()])[0, 1]), 2))
