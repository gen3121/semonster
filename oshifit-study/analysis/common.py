"""共通の道具：質問紙の読み込み、採点、提案一覧、結果の保存、図の字体。

採点規則は public/questionnaire.json の scoring と DATA_SCHEMA_ja.md に合わせる。
項目の並びと逆転項目は questionnaire.json から読む（ここに書き写さない）。
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent          # oshifit-study/
QN_PATH = ROOT / "public" / "questionnaire.json"
INDEX_PATH = ROOT / "public" / "index.html"
SYNTH_MARKER = "合成データ_SYNTHETIC.txt"              # 合成データの目印（列ではなくファイルで示す）


# ---------------------------------------------------------------- 質問紙
def load_questionnaire(path: Path = QN_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


class Scheme:
    """questionnaire.json から作る採点の定義。"""

    def __init__(self, qn: dict | None = None):
        self.qn = qn or load_questionnaire()
        sc = self.qn["scoring"]
        self.smax = sc.get("max", 7)
        self.axes = sc["axes"]                                   # wb, joy, sleep, money, duty, compare
        self.axis_items = {a["key"]: a["items"] for a in self.axes}
        self.axis_reverse = {a["key"]: bool(a.get("reverse")) for a in self.axes}
        self.burnout_items = sc["burnout"]["items"]
        self.shs_items = sc["shs"]["items"]
        self.shs_reverse = sc["shs"].get("reverse", [])
        self.pss_items = sc["pss"]["items"]
        self.pss_reverse = sc["pss"].get("reverse", [])
        secs = {s["id"]: s for s in self.qn["sections"]}
        self.sections = secs
        self.who5_items = [i["id"] for i in secs["who5"]["items"]]
        self.tipi_items = [i["id"] for i in secs["tipi"]["items"]]
        self.freq_tags: dict[str, list[str]] = {}
        for it in secs["freq"]["items"]:
            self.freq_tags.setdefault(it["tag"], []).append(it["id"])
        self.attention = [(i["id"], i["answer"]) for s in self.qn["sections"] for i in s["items"]
                          if i.get("tag") == "attention"]
        self.factors = [a["key"] for a in self.axes if a["key"] != "wb"]   # 5つの要素
        self.burden_axes = [k for k in self.factors if self.axis_reverse[k]]
        self.all_items = [i["id"] for s in self.qn["sections"] for i in s["items"]]

    # 採点（1行＝1人の回答 dict/Series）。欠けた項目があれば NaN（アプリと同じ）
    def score(self, A) -> dict:
        g = lambda k: _num(A.get(k) if hasattr(A, "get") else A[k])
        o = {}
        for ax in self.axes:
            v = [g(k) for k in ax["items"]]
            if any(np.isnan(x) for x in v):
                o[ax["key"]] = np.nan
            elif ax["key"] == "wb":
                o["wb"] = sum(v) * 4
            else:
                s = (np.mean(v) - 1) / (self.smax - 1) * 100
                o[ax["key"]] = 100 - s if ax.get("reverse") else s
        b = [g(k) for k in self.burnout_items]
        o["burnout"] = np.nan if any(np.isnan(x) for x in b) else (np.mean(b) - 1) / (self.smax - 1) * 100
        w = [g(k) for k in self.who5_items]
        # アプリは欠けた WHO-5 を 0 として足す。分析では欠けたら NaN にする（差は報告で確認）
        o["who5raw"] = np.nan if any(np.isnan(x) for x in w) else sum(w)
        h = [(8 - g(k)) if k in self.shs_reverse else g(k) for k in self.shs_items]
        o["shs"] = np.nan if any(np.isnan(x) for x in h) else float(np.mean(h))
        p = [(4 - g(k)) if k in self.pss_reverse else g(k) for k in self.pss_items]
        o["pss"] = np.nan if any(np.isnan(x) for x in p) else float(sum(p))
        return o

    def tipi(self, A) -> dict:
        """TIPI-J（5件法）。index.html の big5 と同じ：(a+b−2)÷8×100。丸めはしない。"""
        g = lambda k: _num(A.get(k))
        r = lambda k: 6 - g(k)
        f = lambda a, b: (a + b - 2) / 8 * 100
        return {"E": f(g("Q7"), r("Q12")), "A": f(r("Q8"), g("Q13")), "C": f(g("Q9"), r("Q14")),
                "N": f(g("Q10"), r("Q15")), "O": f(g("Q11"), r("Q16"))}

    def item_matrix(self, df: pd.DataFrame, scale: str) -> pd.DataFrame:
        """α や CFA 用に、逆転をそろえた項目の行列を返す。"""
        if scale == "joy":
            return df[self.axis_items["joy"]].astype(float)
        if scale == "burnout":
            return df[self.burnout_items].astype(float)
        if scale == "who5":
            return df[self.who5_items].astype(float)
        if scale == "shs":
            m = df[self.shs_items].astype(float).copy()
            for k in self.shs_reverse:
                m[k] = 8 - m[k]
            return m
        if scale == "pss":
            m = df[self.pss_items].astype(float).copy()
            for k in self.pss_reverse:
                m[k] = 4 - m[k]
            return m
        if scale in self.axis_items:
            return df[self.axis_items[scale]].astype(float)
        raise KeyError(scale)


def _num(x) -> float:
    try:
        if x is None or (isinstance(x, str) and x.strip() == ""):
            return np.nan
        return float(x)
    except (TypeError, ValueError):
        return np.nan


SCORE_KEYS = ["wb", "joy", "sleep", "money", "duty", "compare", "burnout", "who5raw", "shs", "pss"]
TRAITS = ["E", "A", "C", "N", "O"]
TRAIT_JA = {"E": "外向性", "A": "協調性", "C": "勤勉性", "N": "神経症傾向", "O": "開放性"}
SCORE_JA = {"wb": "WHO-5（幸福度）", "joy": "推し活の充実", "sleep": "睡眠・生活", "money": "お金",
            "duty": "義務感・人間関係", "compare": "SNS・比較", "burnout": "推し疲れ", "who5raw": "WHO-5素点",
            "shs": "SHS", "pss": "PSS-J"}


# ---------------------------------------------------------------- 提案一覧（index.html の PLANS）
PLANS_FALLBACK = {  # index.html が読めないときだけ使う（2026-11-12 時点の値）
    "sns23": ("sleep", 16), "archive": ("sleep", 12), "budget": ("money", 16), "declutter": ("money", 12),
    "donate": ("wb", 10), "oneday": ("money", 12), "choose3": ("duty", 15), "skipok": ("duty", 12),
    "mute": ("compare", 15), "snsonce": ("compare", 12), "party": ("joy", 12), "create": ("joy", 12),
    "calm": ("joy", 10), "event": ("joy", 12), "good3": ("wb", 10)}


def load_plans(path: Path = INDEX_PATH) -> tuple[dict, str]:
    """{id: {"axis":..., "eff":...}} と読み込み元を返す。"""
    try:
        txt = path.read_text(encoding="utf-8")
        blk = txt[txt.index("const PLANS=["):]
        blk = blk[:blk.index("];")]
        found = {}
        for m in re.finditer(r'\{id:"([^"]+)",axis:"([^"]+)".*?eff:(\d+(?:\.\d+)?)', blk):
            found[m.group(1)] = {"axis": m.group(2), "eff": float(m.group(3))}
        if len(found) >= 10:
            return found, "public/index.html の PLANS"
    except (OSError, ValueError):
        pass
    return {k: {"axis": a, "eff": float(e)} for k, (a, e) in PLANS_FALLBACK.items()}, "analysis/common.py の控え（index.html を読めなかった）"


# ---------------------------------------------------------------- 実行の状態
@dataclass
class Ctx:
    data_dir: Path
    out_dir: Path
    scheme: Scheme
    seed: int = 20261112
    n_boot: int = 2000            # 媒介分析・α の信頼区間
    n_boot_cluster: int = 200     # k-means の安定性
    n_stab: int = 200             # LASSO 安定性選択の繰り返し
    prior_sd: float = 8.0
    synthetic: bool = False
    report: list = field(default_factory=list)
    outputs: list = field(default_factory=list)
    store: dict = field(default_factory=dict)   # 手順間で受け渡す値（例：IPW の重み）

    def rng(self, offset: int = 0) -> np.random.Generator:
        return np.random.default_rng(self.seed + offset)

    def md(self, *lines: str):
        self.report.extend(lines)

    def save_json(self, name: str, obj):
        p = self.out_dir / name
        with open(p, "w", encoding="utf-8") as f:
            json.dump(to_jsonable(obj), f, ensure_ascii=False, indent=2)
        self.outputs.append(name)
        return p

    def save_csv(self, name: str, df: pd.DataFrame, index: bool = False):
        p = self.out_dir / name
        df.to_csv(p, index=index, encoding="utf-8-sig")
        self.outputs.append(name)
        return p


def to_jsonable(o):
    if isinstance(o, dict):
        return {str(k): to_jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [to_jsonable(v) for v in o]
    if isinstance(o, pd.DataFrame):
        return to_jsonable(o.to_dict(orient="records"))
    if isinstance(o, pd.Series):
        return to_jsonable(o.to_dict())
    if isinstance(o, np.ndarray):
        return to_jsonable(o.tolist())
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        f = float(o)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o


# ---------------------------------------------------------------- 表示の道具
def fmt(x, d: int = 2) -> str:
    try:
        if x is None or (isinstance(x, float) and math.isnan(x)):
            return "—"
        return f"{float(x):.{d}f}"
    except (TypeError, ValueError):
        return str(x)


def fmt_p(p) -> str:
    if p is None or (isinstance(p, float) and math.isnan(p)):
        return "—"
    return "< .001" if p < 0.001 else f"{p:.3f}"


def md_table(df: pd.DataFrame, digits: int = 2, max_rows: int = 40) -> list[str]:
    if df is None or len(df) == 0:
        return ["（表なし）"]
    d = df.head(max_rows)
    cols = list(d.columns)
    is_p = lambda c: str(c) == "p" or str(c).startswith(("p_", "p-")) or str(c) == "p値"
    intcol = {c for c in cols if pd.api.types.is_numeric_dtype(d[c]) and d[c].dropna().size
              and np.all(np.mod(d[c].dropna().astype(float), 1) == 0) and not is_p(c)}
    out = ["| " + " | ".join(str(c).replace("|", "／") for c in cols) + " |", "|" + "---|" * len(cols)]
    for _, r in d.iterrows():
        cells = []
        for c in cols:
            v = r[c]
            if isinstance(v, (float, np.floating, int, np.integer)) and not isinstance(v, bool):
                if is_p(c):
                    cells.append(fmt_p(v))
                elif c in intcol and np.isfinite(v):
                    cells.append(str(int(v)))
                else:
                    cells.append(fmt(v, digits))
            else:
                cells.append("" if v is None or (isinstance(v, float) and np.isnan(v)) else str(v).replace("|", "／"))
        out.append("| " + " | ".join(cells) + " |")
    if len(df) > max_rows:
        out.append(f"（ほか {len(df) - max_rows} 行は CSV を参照）")
    return out


def holm(pvals) -> np.ndarray:
    """Holm の方法で調整した p 値（単調にそろえ、1 で打ち切る）。NaN はそのまま。"""
    p = np.asarray(pvals, dtype=float)
    out = np.full_like(p, np.nan)
    ok = ~np.isnan(p)
    q = p[ok]
    m = len(q)
    if m == 0:
        return out
    order = np.argsort(q)
    adj = np.empty(m)
    run = 0.0
    for rank, i in enumerate(order):
        run = max(run, (m - rank) * q[i])
        adj[i] = min(1.0, run)
    out[ok] = adj
    return out


def cronbach_alpha(items: pd.DataFrame | np.ndarray) -> float:
    x = np.asarray(items, dtype=float)
    x = x[~np.isnan(x).any(axis=1)]
    k = x.shape[1]
    if k < 2 or x.shape[0] < 3:
        return np.nan
    tv = x.sum(axis=1).var(ddof=1)
    if tv == 0:
        return np.nan
    return k / (k - 1) * (1 - x.var(axis=0, ddof=1).sum() / tv)


def shrink(prior_mean: float, prior_sd: float, obs_mean: float, obs_se: float) -> tuple[float, float]:
    """正規分布どうしの精度重み付き平均（経験ベイズの縮約）。返り値＝(事後平均, 事後SD)。"""
    if obs_se is None or not np.isfinite(obs_se) or not np.isfinite(obs_mean):
        return prior_mean, prior_sd
    pp, pd_ = 1 / prior_sd ** 2, 1 / obs_se ** 2
    post = (prior_mean * pp + obs_mean * pd_) / (pp + pd_)
    return float(post), float(math.sqrt(1 / (pp + pd_)))


# ---------------------------------------------------------------- 図（BIZ UDPゴシック）
def setup_font():
    """図はすべて BIZ UDPゴシック（プロジェクトの決まり）。見つからなければ False。"""
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib import font_manager, rcParams
    ok = False
    for p in list(Path.home().joinpath(".fonts").glob("BIZUDPGothic*.ttf")) + \
            list(Path("/usr/share/fonts").rglob("BIZUDPGothic*.ttf")):
        font_manager.fontManager.addfont(str(p))
        ok = True
    if ok:
        rcParams["font.family"] = "BIZ UDPGothic"
        rcParams["axes.unicode_minus"] = False
    return ok
