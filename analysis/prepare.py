"""質問紙データ(xlsx) → 匿名化した分析用の表。メールアドレス・タイムスタンプは読み込まない。
使い方: python prepare.py <xlsx> <出力csv>   （出力csvは個票なのでリポジトリに入れない）"""
import sys
import numpy as np
import pandas as pd

SRC, OUT = sys.argv[1], sys.argv[2]
raw = pd.read_excel(SRC, sheet_name=0)
cols = list(raw.columns)
pick = lambda i: raw.iloc[:, i]                 # 列番号は 2026/10/09 受領版のもの

d = pd.DataFrame({
    'age': pick(2), 'sex': pick(3), 'job': pick(4),
    'free_wd': pick(5), 'free_hd': pick(6), 'n_oshi': pick(8),
    # TIPI-J（5件法で回収されている）
    'tipi_1': pick(16), 'tipi_2': pick(17), 'tipi_3': pick(18), 'tipi_4': pick(19), 'tipi_5': pick(20),
    'tipi_6': pick(21), 'tipi_7': pick(22), 'tipi_8': pick(23), 'tipi_9': pick(24), 'tipi_10': pick(25),
    'av_empathy': pick(26), 'av_mood': pick(27), 'av_visual': pick(28),
    'cur_media': pick(29), 'cur_live': pick(30), 'cur_goods': pick(31), 'cur_sns': pick(32),
    'ideal_media': pick(33), 'ideal_live': pick(34), 'ideal_goods': pick(35), 'ideal_sns': pick(36),
    'w_ikigai': pick(37), 'w_schedule': pick(38), 'w_confidence': pick(39), 'check4': pick(40),
    'b_sleep': pick(41), 'b_money': pick(42), 'b_duty': pick(43), 'b_envy': pick(44), 'w_create': pick(45),
    'trg_escape': pick(46), 'trg_reward': pick(47), 'trg_payday': pick(48), 'trg_rebound': pick(49), 'trg_recover': pick(50), 'trg_other': pick(51),
    'income': pick(52), 'expense': pick(53), 'spend': pick(54),
})
n0 = len(d)
d = d[d['n_oshi'] != '推し活をしていない']                       # 推し活をしていない人を除く
n1 = len(d)
d = d.dropna(subset=['cur_media', 'w_ikigai'])
d = d[d['check4'] == 4]                                       # 確認問題の誤答を除く
n2 = len(d)
print(f'回答 {n0} → 推し活をしている {n1} → 確認問題に正答 {n2}')
d.drop(columns=['check4']).reset_index(drop=True).to_csv(OUT, index=False)
