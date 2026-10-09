// 提案づくり: 5活動のうち最大2つを ±1段階動かした候補を予測し、本人の希望を守る案だけを残して3案にする。
(function () {
  const M = typeof module !== 'undefined' ? require('./model.js') : window.OF.model;
  const api = {};

  const MESSAGES = {
    live: { up: 'ライブ・現場を、もう1段階ふやす', down: 'ライブ・現場を、1段階へらす' },
    goods: { up: 'グッズ・課金の枠を、1段階ふやす', down: 'グッズは「まとめ買いの日」を決めて、使う額を1段階へらす' },
    stream: { up: '配信・動画を、1段階ふやす', down: '配信は、リアルタイムを減らしてアーカイブで見る（1段階へらす）' },
    sns: { up: 'SNSを、1段階ふやす', down: '夜のSNS・タイムラインを、1段階へらす' },
    late: { up: '夜更かしの日を、1段階ふやす', down: '夜更かしの日を、1段階へらす（寝る時刻の目標を決める）' },
  };
  api.describe = (changes) => changes.map((c) => MESSAGES[c.key][c.dir > 0 ? 'up' : 'down']);

  // wishes: { live:'more'|'same'|'less', ... }
  api.candidates = function (habit, wishes) {
    const acts = M.ACTIVITIES;
    const step = (key, dir) => {
      const lv = acts.find((a) => a.key === key).levels.length - 1;
      const next = habit.levels[key] + dir;
      return next < 0 || next > lv ? null : next;
    };
    const allowed = (key, dir) => {
      const w = (wishes && wishes[key]) || 'same';
      if (dir < 0 && w === 'more') return false;   // 増やしたい活動は減らさない
      if (dir > 0 && w === 'less') return false;   // 減らしたい活動は増やさない
      return step(key, dir) != null;
    };
    const singles = [];
    for (const a of acts) for (const dir of [-1, 1]) if (allowed(a.key, dir)) singles.push({ key: a.key, dir });
    const out = [];
    for (let i = 0; i < singles.length; i++) {
      out.push([singles[i]]);
      for (let j = i + 1; j < singles.length; j++) if (singles[i].key !== singles[j].key) out.push([singles[i], singles[j]]);
    }
    return out;
  };

  api.apply = function (habit, changes) {
    const levels = { ...habit.levels };
    for (const c of changes) levels[c.key] += c.dir;
    return levels;
  };

  api.generate = function (logs, today, wishes) {
    const habit = M.habitFromLogs(logs, today, 14);
    const base = M.forecast(logs, today, habit.levels);
    const evald = api.candidates(habit, wishes).map((ch) => {
      const f = M.forecast(logs, today, api.apply(habit, ch));
      return { changes: ch, joy: f.joy.mean, fatigue: f.fatigue.mean, dJoy: f.joy.mean - base.joy.mean, dFatigue: f.fatigue.mean - base.fatigue.mean };
    }).filter((c) => c.dFatigue < -0.02);       // 疲れが下がる案だけ
    // パレート最適（疲れが低く、楽しさが高いほど良い）
    const front = evald.filter((a) => !evald.some((b) => b !== a && b.fatigue <= a.fatigue && b.joy >= a.joy && (b.fatigue < a.fatigue || b.joy > a.joy)));
    const pool = front.length ? front : evald;
    const pick = [];
    const sig = (c) => c.changes.map((x) => x.key + x.dir).sort().join();
    const take = (label, id, sorter, filter = () => true) => {
      // まずパレート最適な案から、なければ疲れが下がる案すべてから、まだ選んでいない案を取る
      for (const set of [pool, evald]) {
        const c = [...set].filter((x) => filter(x) && !pick.some((p) => sig(p) === sig(x))).sort(sorter)[0];
        if (c) { pick.push({ id, label, ...c, texts: api.describe(c.changes) }); return; }
      }
    };
    // ③ 回復重視: 疲れが最も下がる（楽しさは少し下がってもよい）
    take('③ 回復重視型', 'recover', (a, b) => a.fatigue - b.fatigue);
    // ① 楽しさキープ: 楽しさがほぼ下がらず、楽しさの予測が最も高い
    take('① 楽しさキープ型', 'keep', (a, b) => b.joy - a.joy, (c) => c.dJoy >= -0.05);
    // ② バランス: 楽しさの変化 − 疲れの変化 が最大
    take('② バランス型', 'balance', (a, b) => (b.dJoy - b.dFatigue) - (a.dJoy - a.dFatigue));
    pick.sort((x, y) => x.label.localeCompare(y.label));
    return { habit, base, options: pick, candidateCount: evald.length };
  };

  if (typeof module !== 'undefined') module.exports = api;
  else window.OF.proposals = api;
})();
