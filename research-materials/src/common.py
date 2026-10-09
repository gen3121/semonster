"""Components shared by several OshiFit decks (roadmap, status rows, architecture)."""
from datetime import date
from oshideck import C, L, R


T0, T1 = date(2026, 10, 1), date(2027, 3, 15)


# Oct–Dec carry the detail, so they get more width than Jan–Mar.
_MW = [(date(2026, 10, 1), 1.75), (date(2026, 11, 1), 1.75), (date(2026, 12, 1), 1.5), (date(2027, 1, 1), 1.0),
       (date(2027, 2, 1), 0.85), (date(2027, 3, 1), 0.55)]
_ENDS = [date(2026, 11, 1), date(2026, 12, 1), date(2027, 1, 1), date(2027, 2, 1), date(2027, 3, 1), T1]


def _x(dt, x0, x1):
    tot = sum(w for _, w in _MW)
    k = (x1 - x0) / tot
    x = x0
    for (m, w), e in zip(_MW, _ENDS):
        if dt >= e:
            x += w * k
            continue
        return x + w * k * (dt - m).days / (e - m).days
    return x1


def roadmap(d, s, now, y0=1.55, rowh=0.6, x0=2.05, x1=9.45, en=False, compact=False):
    """Gantt-style roadmap from Oct 2026 to Mar 2027 with a 'now' marker."""
    months = [(date(2026, 10, 1), "10月" if not en else "Oct"), (date(2026, 11, 1), "11月" if not en else "Nov"),
              (date(2026, 12, 1), "12月" if not en else "Dec"), (date(2027, 1, 1), "1月" if not en else "Jan"),
              (date(2027, 2, 1), "2月" if not en else "Feb"), (date(2027, 3, 1), "3月" if not en else "Mar")]
    rows = [
        ("システム開発", [(date(2026, 10, 1), date(2026, 10, 30), "設計 → ベータ版", "blue")]),
        ("倫理審査・募集", [(date(2026, 10, 9), date(2026, 10, 23), "審査", "pink"),
                       (date(2026, 10, 24), date(2026, 11, 1), "募集", "purple")]),
        ("本実験（6週間）", [(date(2026, 11, 2), date(2026, 11, 15), "記録のみ", "B"),
                        (date(2026, 11, 16), date(2026, 12, 13), "介入（3群）", "B")]),
        ("解析・修論", [(date(2026, 12, 14), date(2027, 1, 29), "解析 → 執筆", "navy")]),
    ]
    n = len(rows)
    top = y0 + 0.38
    # month grid
    for i, (m, lab) in enumerate(months):
        x = _x(m, x0, x1)
        nxt = _x(months[i + 1][0], x0, x1) if i + 1 < len(months) else x1
        d.text(s, x, y0, nxt - x, 0.32, lab, size=12, bold=True, color="muted", align="c", anchor="m",
               margin=(0, 0, 0, 0))
        d.line(s, x, top, x, top + rowh * (n + 1), color="E3E8EF", width=1)
    for r, (lab, segs) in enumerate(rows):
        y = top + r * rowh
        d.text(s, L, y, x0 - L - 0.1, rowh, lab, size=13, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
        for a, b, t, col in segs:
            xa, xb = _x(a, x0, x1), _x(b, x0, x1)
            done = b <= now
            part = a < now < b
            light = {"blue": "sky2", "pink": "pinkL", "purple": "purpleL", "B": "BL", "navy": "sky"}[col]
            d.box(s, xa, y + 0.12, xb - xa, rowh - 0.24, fill=light, radius=0.08)
            if done or part:
                xe = xb if done else _x(now, x0, x1)
                mid = {"blue": "7CC4FF", "pink": "F29BB8", "purple": "B3A8E3", "B": "7FD3C3", "navy": "8FA3B8"}[col]
                d.box(s, xa, y + 0.12, xe - xa, rowh - 0.24, fill=col if done else mid, radius=0.08)
            d.text(s, xa, y + 0.12, max(xb - xa, 0.5), rowh - 0.24, t, size=11 if xb - xa > 0.6 else 9.5, bold=True,
                   color="white" if done else "navy", anchor="m", margin=(0.06, 0, 0, 0), wrap=False)
    # milestones
    y = top + n * rowh
    d.text(s, L, y, x0 - L - 0.1, rowh, "対外発表", size=13, bold=True, color="navy", anchor="m", margin=(0, 0, 0, 0))
    ms = [(date(2026, 10, 29), "CHIIR投稿\n10/29"), (date(2027, 1, 29), "修論提出\n1/29"),
          (date(2027, 2, 17), "公聴会\n2/17"), (date(2027, 3, 8), "CHIIR\n3/7–11")]
    for dt, lab in ms:
        x = _x(dt, x0, x1)
        col = "pink" if dt <= now else "white"
        d.box(s, x - 0.1, y + 0.08, 0.2, 0.2, fill=col, line="pink", lw=1.5, shape=__import__("pptx").enum.shapes.MSO_SHAPE.DIAMOND, radius=None)
        d.text(s, x - 0.55, y + 0.28, 1.1, 0.42, lab, size=10, color="text", align="c", margin=(0, 0, 0, 0), after=0)
    # now marker
    xn = _x(now, x0, x1)
    d.line(s, xn, top - 0.05, xn, top + rowh * n + 0.05, color="pink", width=2.25, dash=True)
    d.pill(s, xn - 0.7, top + rowh * n + 0.72, 1.4, 0.28, ("いまここ " if not en else "Now ") + f"{now.month}/{now.day}", fill="pink", size=10)
    return top + rowh * (n + 1) + 0.4


STATUS = {"完了": "B", "新規": "pink", "進行中": "blue", "未着手": "gray", "遅れ": "A", "継続": "purple"}


def status_rows(d, s, x, y, w, items, rowh=0.62, size=14, sub=11.5):
    """items: (status, title, detail)."""
    for i, (st, t, det) in enumerate(items):
        yy = y + i * rowh
        d.pill(s, x, yy + 0.12, 0.85, 0.3, st, fill=STATUS.get(st, "blue"), size=11)
        d.text(s, x + 1.0, yy + 0.02, w - 1.0, rowh - 0.04,
               [dict(t=t, size=size, bold=True, color="navy", after=1), dict(t=det, size=sub, color="muted")],
               margin=(0, 0, 0, 0), after=0)
    return y + len(items) * rowh


def architecture(d, s, y0=1.55, en=False, highlight=None):
    """OshiFit v2 architecture: inputs -> twin -> rebalance -> mirror, with feedback loop and safety layer."""
    from pptx.enum.shapes import MSO_SHAPE
    J = not en
    inp = [(("TIPI-J", "初回・約1分") if J else ("TIPI-J", "once, 1 min"), "brain"),
           (("毎日の記録", "1日約30秒") if J else ("Daily log", "≈30 s a day"), "pen"),
           (("本人の希望", "増やしたい／減らしたい") if J else ("Wishes", "more / less of what"), "heart")]
    ix, iw, ih = L, 2.35, 0.78
    for i, (t, ic) in enumerate(inp):
        yy = y0 + 0.1 + i * 0.95
        d.box(s, ix, yy, iw, ih, fill="white", line="line", radius=0.1, shadow=True)
        d.icon(s, ic, ix + 0.1, yy + 0.16, 0.46, bg="blue")
        d.text(s, ix + 0.66, yy, iw - 0.72, ih, [dict(t=t[0], size=13, bold=True, color="navy", after=0),
                                                 dict(t=t[1], size=10.5, color="muted")], anchor="m", margin=(0, 0, 0, 0))
    # engine blocks
    blocks = [
        ("①", "ベイズ個人ツイン" if J else "Bayesian Twin", "記録で毎晩更新する\n自分専用の予測" if J else "Personal model,\nupdated nightly", 3.15),
        ("②", "リバランス提案" if J else "Rebalance Engine", "減らさず組み替える\n3案（パレート最適）" if J else "Re-allocate, not restrict:\n3 Pareto options", 5.25),
    ]
    for num, t, sub, bx in blocks:
        hl = highlight in (None, num)
        d.box(s, bx, y0 + 0.55, 1.85, 1.95, fill="navy" if hl else "8FA3B8", radius=0.12, shadow=True)
        d.text(s, bx, y0 + 0.65, 1.85, 0.45, num, size=20, bold=True, color="white", align="c", margin=(0, 0, 0, 0))
        d.text(s, bx + 0.08, y0 + 1.08, 1.69, 0.5, t, size=14, bold=True, color="white", align="c", anchor="m",
               margin=(0, 0, 0, 0))
        d.text(s, bx + 0.08, y0 + 1.6, 1.69, 0.8, sub, size=11, color="white", align="c", margin=(0, 0, 0, 0),
               after=0)
    d.arrow(s, 2.88, y0 + 1.3, 0.24, 0.42, fill="blue")
    d.arrow(s, 5.03, y0 + 1.3, 0.2, 0.42, fill="blue")
    d.arrow(s, 7.13, y0 + 1.3, 0.2, 0.42, fill="blue")
    # mirror
    mx = 7.38
    hl = highlight in (None, "③")
    d.box(s, mx, y0 + 0.05, 2.17, 2.95, fill="BL" if hl else "EEF2F6", line="B" if hl else "line", lw=1.5, radius=0.12)
    d.text(s, mx, y0 + 0.1, 2.17, 0.36, "③④ みらいミラー" if J else "③④ Future Mirror", size=13, bold=True,
           color="B" if hl else "gray", align="c", margin=(0, 0, 0, 0))
    d.pic(s, "ghostA", mx + 0.02, y0 + 0.5, w=1.05)
    d.pic(s, "ghostB", mx + 1.1, y0 + 0.5, w=1.05)
    d.text(s, mx + 0.02, y0 + 1.25, 1.05, 0.3, "今のまま" if J else "As is", size=10.5, bold=True, color="A",
           align="c", margin=(0, 0, 0, 0))
    d.text(s, mx + 1.1, y0 + 1.25, 1.05, 0.3, "提案どおり" if J else "Proposal", size=10.5, bold=True, color="B",
           align="c", margin=(0, 0, 0, 0))
    d.text(s, mx + 0.12, y0 + 1.62, 1.95, 1.3,
           ([dict(t="ゆらぎアバター", size=11.5, bold=True, color="navy", after=0),
             dict(t="予測の幅を重なりで表示", size=10.5, after=5),
             dict(t="疲れの中身キュー", size=11.5, bold=True, color="navy", after=0),
             dict(t="睡眠・出費・義務感・比較", size=10.5)]
            if J else [dict(t="Possible-selves avatar", size=11, bold=True, color="navy", after=0),
                       dict(t="range shown as overlap", size=10.5, after=5),
                       dict(t="Fatigue-facet cues", size=11, bold=True, color="navy", after=0),
                       dict(t="sleep, money, duty, compare", size=10.5)]),
           color="text", margin=(0, 0, 0, 0))
    # feedback loop
    ly = y0 + 3.2
    d.box(s, 2.95, ly, 6.6, 0.5, fill="sky", radius=0.25,
          text=("選ぶ → 1週間ためす → 実行チェック → 記録 → 毎晩更新 → 答え合わせ" if J else
                "Choose → try a week → check-in → log → update → check forecast"),
          size=12, bold=True, color="navy", align="c")
    d.line(s, 8.45, y0 + 3.0, 8.45, ly, color="blue", width=2, arrow=True)
    d.line(s, 3.6, ly, 3.6, y0 + 2.5, color="blue", width=2, arrow=True)
    # safety layer
    d.box(s, L, y0 + 3.92, R - L, 0.48, fill="pinkL", radius=0.1,
          text=("セーフティ層：強いつらさの記録（WHO-5 素点13点未満など）では予測表示を止め、相談先を表示する" if J else
                "Safety layer: when logs signal strong distress, forecasts pause and help resources are shown"),
          size=12, bold=True, color="pink", align="l", margin=(0.62, 0.03, 0.1, 0.03))
    d.icon(s, "shield", L + 0.12, y0 + 3.97, 0.38, bg="pink")
