// OshiFit の似顔アバター（Mii の作成画面を参考にしたパーツ式）。写真は使わない。
// 描く順：後ろ髪 → 首 → 服 → 耳 → 顔 → 前髪 → まゆ・目・鼻・口 → ひげ → めがね（後ろ髪が首や服の上に重ならない）
// av = {gender, face, skin, hair, hairColor, brow, eye, eyeColor, nose, mouth, glasses, beard, shirt}（数字や記号だけ。写真は保存しない）
(function () {
  "use strict";
  // 36色（髪・服で別々に選ぶ）。自然な色18＋おしゃれな色18
  const PALETTE = [
    "#0f0d0c", "#2b211e", "#3b2a22", "#4a3326", "#5a3d2e", "#6b4a35", "#7a5640", "#8a5a3c", "#9c6b45", "#ae7f52", "#c49a6c", "#d6b07c",
    "#e3c584", "#efd9a8", "#f4e7c8", "#9e9aa0", "#c9c7cc", "#eeeeee",
    "#7a1f2b", "#b3263a", "#e2445c", "#f07c94", "#f6b3c4", "#c0508a", "#7b5da8", "#a78bd6", "#3b4fa8", "#2170e4", "#6fb0f2", "#1d8f8a",
    "#3fb59a", "#2e7d32", "#8bc34a", "#e0a030", "#f57c00", "#d9532b",
  ];
  const SKIN = ["#fbe6d6", "#f8e1d0", "#f4d4bd", "#f1cdb3", "#eac0a0", "#e2b38f", "#d8a27c", "#c98f6a", "#b77a55", "#9c6a4a", "#7f5239", "#5f3b2b"];
  const EYE_COLOR = ["#2b2020", "#4a3326", "#6b4a35", "#3b4fa8", "#2e7d32", "#7b5da8"];

  // 髪型：[キー, 名前, 対象（f=女性向け, m=男性向け, u=どちらも）]
  const HAIR = [
    ["long", "ストレートロング", "f"], ["wave", "ゆるふわロング", "f"], ["semi", "セミロング", "f"], ["hime", "姫カット", "f"],
    ["bob", "ボブ", "f"], ["sbob", "ショートボブ", "u"], ["pony", "ポニーテール", "f"], ["twin", "ツインテール", "f"],
    ["bun", "お団子", "f"], ["halfup", "ハーフアップ", "f"], ["braid", "三つ編み", "f"],
    ["flip", "外ハネボブ", "f"], ["mwave", "ミディアムウェーブ", "f"],
    ["short", "ショート", "u"], ["vshort", "ベリーショート", "m"], ["side", "サイドパート", "m"], ["mash", "マッシュ", "u"],
    ["center", "センターパート", "u"], ["spiky", "ツンツン", "m"], ["perm", "ゆるパーマ", "u"], ["spiral", "スパイラルパーマ", "u"],
    ["wolf", "ウルフ", "u"], ["mlong", "ロング（後ろで結ぶ）", "u"], ["buzz", "坊主", "m"], ["gorin", "坊主（五厘）", "m"], ["skin", "スキンヘッド", "m"],
    ["upbang", "アップバング", "m"], ["twoblock", "ツーブロック", "m"], ["mohican", "ソフトモヒカン", "m"],
  ];
  const FACE = ["たまご", "まる", "ほそ長", "四角", "ベース"];
  const BROW = ["ふつう", "太め", "細め", "上がり", "下がり", "まっすぐ"];
  const EYE = ["まる", "たまご", "アーモンド", "たれ目", "つり目", "細め", "ぱっちり", "まつげ"];
  const NOSE = ["ちょん", "まる", "たて", "大きめ", "なし"];
  const MOUTH = ["にっこり", "ふつう", "小さめ", "大きめ", "口角上げ", "への字ぎみ"];
  const GLASSES = ["なし", "まる", "四角", "細ぶち", "サングラス"];
  const BEARD = ["なし", "口ひげ", "あごひげ", "無精ひげ", "フル"];
  const STRAND = ["なし", "細め", "S字（巻き）", "顔まわりカット"];   // おくれ毛（髪型と組み合わせる。結んだ髪型でも使える）

  const stylesFor = (gender) => HAIR.filter(([, , t]) => gender === "男性" ? t !== "f" : gender === "女性" ? t !== "m" : true);
  function defaults(gender) {
    const male = gender === "男性";
    return { v: 2, gender: gender || null, face: 0, skin: 3, hair: male ? "short" : gender === "女性" ? "bob" : "sbob", hairColor: 2, brow: 0, eye: 0, eyeColor: 0, nose: 0, mouth: 1, glasses: 0, beard: 0, shirt: 27 };
  }
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.max(0, Math.min(255, Math.round(x * k)))); return "#" + c.map((x) => x.toString(16).padStart(2, "0")).join(""); };

  // 顔の形（中心 65,64）
  function facePath(f) {
    return [
      "M65 33C83 33 94 46 94 64C94 84 81 96 65 96C49 96 36 84 36 64C36 46 47 33 65 33Z",                // たまご
      "M65 34C84 34 95 47 95 65C95 83 82 94 65 94C48 94 35 83 35 65C35 47 46 34 65 34Z",                // まる
      "M65 31C81 31 91 45 91 64C91 86 79 99 65 99C51 99 39 86 39 64C39 45 49 31 65 31Z",                // ほそ長
      "M65 33C86 33 94 45 94 62C94 80 90 90 78 94C72 96 58 96 52 94C40 90 36 80 36 62C36 45 44 33 65 33Z", // 四角
      "M65 33C84 33 94 45 94 61C94 75 90 85 82 90C76 95 70 97 65 97C60 97 54 95 48 90C40 85 36 75 36 61C36 45 46 33 65 33Z", // ベース
    ][f] || "";
  }
  // 後ろ髪（首・服より後ろに描く）
  function hairBack(k, c) {
    const d = shade(c, 0.82);
    return {
      long: `<path d="M30 62Q30 26 65 25Q100 26 100 62L103 128Q65 136 27 128Z" fill="${d}"/>`,
      wave: `<path d="M30 60Q29 25 65 24Q101 25 100 60Q104 80 99 96Q106 110 100 126Q65 136 30 126Q24 110 31 96Q26 80 30 60Z" fill="${d}"/>`,
      semi: `<path d="M31 62Q31 27 65 26Q99 27 99 62L101 108Q65 116 29 108Z" fill="${d}"/>`,
      hime: `<path d="M31 60Q31 26 65 25Q99 26 99 60L100 126Q65 134 30 126Z" fill="${d}"/>`,
      bob: `<path d="M31 64Q30 27 65 26Q100 27 99 64Q100 86 92 92L38 92Q30 86 31 64Z" fill="${d}"/>`,
      sbob: `<path d="M33 62Q32 28 65 27Q98 28 97 62Q98 78 92 84L38 84Q32 78 33 62Z" fill="${d}"/>`,
      pony: `<path d="M86 44Q112 50 106 86Q103 104 96 112Q101 86 92 62Z" fill="${d}"/>`,
      twin: `<ellipse cx="28" cy="80" rx="10" ry="24" fill="${d}"/><ellipse cx="102" cy="80" rx="10" ry="24" fill="${d}"/>`,
      bun: `<circle cx="65" cy="22" r="12" fill="${d}"/>`,
      halfup: `<path d="M31 62Q31 27 65 26Q99 27 99 62L101 112Q65 120 29 112Z" fill="${d}"/><circle cx="65" cy="24" r="7" fill="${d}"/>`,
      braid: `<path d="M32 62Q32 28 65 27Q98 28 98 62L96 90L34 90Z" fill="${d}"/>${[0, 1, 2, 3].map((i) => `<ellipse cx="96" cy="${92 + i * 9}" rx="6" ry="5.5" fill="${d}"/>`).join("")}`,
      mlong: `<path d="M34 60Q34 29 65 28Q96 29 96 60L94 80L36 80Z" fill="${d}"/><ellipse cx="65" cy="96" rx="6" ry="10" fill="${d}"/>`,
      wolf: `<path d="M33 62Q32 26 65 25Q98 26 97 62L96 80L34 80Z" fill="${d}"/>`,
      perm: `<path d="M32 60Q31 28 65 27Q99 28 98 60Q102 72 94 80L36 80Q28 72 32 60Z" fill="${d}"/>`,
      flip: `<path d="M31 62Q30 27 65 26Q100 27 99 62Q100 80 96 86Q102 88 106 82Q105 92 95 93L35 93Q25 92 24 82Q28 88 34 86Q30 80 31 62Z" fill="${d}"/>`,
      mwave: `<path d="M31 60Q30 26 65 25Q100 26 99 60Q104 74 98 86Q104 98 98 110Q65 117 32 110Q26 98 32 86Q26 74 31 60Z" fill="${d}"/>`,
      center: `<path d="M33 62Q32 27 65 26Q98 27 97 62L95 76Q65 82 35 76Z" fill="${d}"/>`,
      spiral: `<path d="M29 62Q26 20 65 19Q104 20 101 62Q103 74 97 80L33 80Q27 74 29 62Z" fill="${d}"/>${blobs([[31, 70, 6], [99, 70, 6], [34, 78, 5.5], [96, 78, 5.5]], d)}`,
    }[k] || "";
  }
  // 巻き毛（スパイラルパーマ）：小さな円を並べ、中に巻きの線を入れる
  function curls(pts, r, fill, line) {
    const edge = shade(fill, 0.62);
    return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width=".7"/><path d="M${x - r * 0.55} ${y + r * 0.15}Q${x - r * 0.1} ${y - r * 0.75} ${x + r * 0.55} ${y - r * 0.05}Q${x + r * 0.2} ${y + r * 0.5} ${x - r * 0.1} ${y + r * 0.2}" stroke="${line}" stroke-width="1.1" fill="none" opacity=".75" stroke-linecap="round"/>`).join("");
  }
  // 縁のでこぼこ（輪郭線なし）
  const blobs = (pts, c) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join("");
  // 巻きの線：決まった位置に、向きと大きさを少しずつ変えて置く（毎回同じ絵になる）
  function squiggles(c) {
    const P = [[40, 32], [50, 26], [60, 23], [71, 23], [81, 27], [90, 33], [36, 42], [46, 37], [57, 33], [68, 32], [79, 35], [93, 42], [42, 46], [53, 44], [64, 42], [75, 44], [86, 45], [34, 54], [96, 54], [50, 52], [70, 52], [60, 50], [81, 51]];
    const lt = shade(c, 1.55), dk = shade(c, 0.6);
    return P.map(([x, y], i) => { const w = 2.6 + (i % 3) * 0.6, f = i % 2 ? 1 : -1, col = i % 3 === 0 ? dk : lt;
      return `<path d="M${x - w} ${y}q${w / 2} ${-2.4 * f} ${w} 0t${w} 0" stroke="${col}" stroke-width="1" fill="none" opacity=".8" stroke-linecap="round"/>`; }).join("");
  }
  const arc = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI / 180; return [Math.round((cx + rx * Math.cos(a)) * 10) / 10, Math.round((cy + ry * Math.sin(a)) * 10) / 10]; });
  // 細部（毛流れ）：前髪の毛先の位置。つむじ（65,26）から毛先へ細い線を引き、layer は毛先をとがらせる（男性の短い髪型など）
  const TIPS = {
    short: { t: [[44, 44], [53, 44], [62, 42], [72, 41], [82, 43], [89, 47]], layer: 1 },
    vshort: { t: [[46, 42], [56, 39], [66, 38], [76, 39], [85, 42]], layer: 1 },
    side: { t: [[42, 47], [50, 46], [58, 42], [68, 39], [80, 39], [89, 43]], layer: 1 },
    mash: { t: [[40, 54], [47, 51], [55, 50], [63, 50], [71, 50], [79, 50], [87, 51], [92, 54]], layer: 1 },
    wolf: { t: [[43, 55], [52, 53], [62, 52], [72, 52], [81, 53], [90, 56]] },
    center: { t: [[39, 56], [44, 51], [86, 51], [91, 56]], layer: 1 },   // 分け目の近くは毛先を作らない
    twoblock: { t: [[44, 46], [52, 46], [60, 48], [68, 48], [76, 45], [85, 44]], layer: 1 },
    upbang: { t: [[42, 46], [50, 38], [58, 35], [72, 35], [82, 39], [89, 46]] },
    mlong: { t: [[44, 46], [54, 43], [66, 41], [77, 42], [87, 47]] },
    sbob: { t: [[42, 50], [50, 46], [58, 44], [67, 42], [76, 43], [86, 47]] },
    bob: { t: [[40, 53], [48, 48], [56, 48], [64, 50], [72, 47], [80, 44], [88, 49]] },
    flip: { t: [[40, 53], [48, 48], [56, 48], [64, 50], [72, 47], [80, 44], [88, 49]] },
    long: { t: [[42, 50], [50, 42], [60, 38], [70, 38], [80, 42], [88, 50]] },
    wave: { t: [[40, 54], [48, 48], [56, 50], [64, 47], [70, 41], [80, 45], [90, 52]] },
    mwave: { t: [[40, 54], [48, 48], [56, 49], [62, 47], [70, 42], [80, 45], [90, 52]] },
    semi: { t: [[40, 52], [48, 46], [56, 48], [64, 47], [72, 42], [82, 45], [90, 51]] },
    hime: { t: [[40, 50], [48, 50], [56, 50], [65, 50], [74, 50], [82, 50], [90, 50]] },
    pony: { t: [[42, 50], [50, 46], [60, 43], [70, 42], [80, 44], [88, 48]] },
    twin: { t: [[40, 52], [48, 47], [56, 48], [64, 46], [70, 43], [80, 46], [90, 51]] },
    bun: { t: [[42, 48], [52, 44], [62, 42], [72, 42], [82, 44], [89, 48]] },
    halfup: { t: [[42, 50], [50, 46], [60, 43], [70, 42], [80, 44], [88, 49]] },
    braid: { t: [[42, 50], [50, 46], [60, 43], [70, 42], [80, 44], [88, 49]] },
  };
  function detail(k, c) {
    const T = TIPS[k];
    if (!T) return "";
    const dk = shade(c, 0.66), hl = shade(c, 1.25);
    const lines = T.t.map(([x, y], i) => i % 2 ? "" : `<path d="M${65 + (x - 65) * 0.25} 28Q${65 + (x - 65) * 0.7} ${(28 + y) / 2 - 4} ${x} ${y - 1}" stroke="${dk}" stroke-width=".9" fill="none" opacity=".55" stroke-linecap="round"/>`).join("");
    const tufts = T.layer ? T.t.map(([x, y]) => { const o = x < 65 ? -1 : 1; return `<path d="M${x - 2.6} ${y - 1.5}L${x + o * 0.8} ${y + 3.6}L${x + 2.6} ${y - 1.5}Z" fill="${c}"/>`; }).join("") : "";
    const shine = `<path d="M47 33Q56 28 64 30" stroke="${hl}" stroke-width="2.2" fill="none" opacity=".5" stroke-linecap="round"/><path d="M70 30Q76 30 82 34" stroke="${hl}" stroke-width="1.4" fill="none" opacity=".4" stroke-linecap="round"/>`;
    return tufts + lines + shine;
  }
  // 後ろ髪の毛流れと毛先（長い髪）：[毛先の高さ, 毛先をとがらせるか]
  const BACKTIPS = { long: [128, 1], hime: [126, 1], semi: [108, 1], halfup: [112, 1], wave: [124, 0], mwave: [108, 0], bob: [92, 0], sbob: [84, 0], flip: [92, 0], center: [76, 0], mlong: [80, 0] };
  function backDetail(k, c) {
    const B = BACKTIPS[k];
    if (!B) return "";
    const [by, sharp] = B, dk = shade(c, 0.6);
    const xs = [[32, 35], [36, 38], [94, 92], [98, 95]];
    const lines = xs.map(([x0, x1]) => `<path d="M${x0} 66Q${x0 + (x0 < 65 ? -1 : 1)} ${(66 + by) / 2} ${x1} ${by - 5}" stroke="${dk}" stroke-width=".9" fill="none" opacity=".5"/>`).join("");
    const tips = sharp ? [31, 36, 41, 89, 94, 99].map((x) => `<path d="M${x - 2.5} ${by - 3}L${x} ${by + 3}L${x + 2.5} ${by - 3}Z" fill="${shade(c, 0.82)}"/>`).join("") : "";
    return lines + tips;
  }
  // えり足（服の上に描く）：ウルフの細く長い毛先を肩に流す
  function nape(k, c) {
    if (k !== "wolf") return "";
    const d = shade(c, 0.82), dk = shade(c, 0.6);
    const L = `<path d="M36 74Q33 92 38 104L34 118L42 106L42 120L47 104Q46 90 46 78Z" fill="${d}"/><path d="M38 84Q37 98 40 108" stroke="${dk}" stroke-width=".9" fill="none" opacity=".6"/>`;
    const R = `<path d="M94 74Q97 92 92 104L96 118L88 106L88 120L83 104Q84 90 84 78Z" fill="${d}"/><path d="M92 84Q93 98 90 108" stroke="${dk}" stroke-width=".9" fill="none" opacity=".6"/>`;
    return L + R;
  }
  // 前髪・頭頂部（顔の上に描く）
  function hairFront(k, c) {
    const hl = shade(c, 1.12), cap = (y = 48) => `M35 ${y}Q35 26 65 25Q95 26 95 ${y}`;
    const top = {
      long: `<path d="${cap(56)}Q86 40 65 40Q44 40 35 56Z" fill="${c}"/><path d="M38 52Q50 36 62 37L56 52Z" fill="${c}"/><path d="M92 52Q80 36 68 37L74 52Z" fill="${c}"/>`,
      wave: `<path d="${cap(56)}Q82 44 70 40Q60 52 46 48Q40 50 35 56Z" fill="${c}"/>`,
      semi: `<path d="${cap(54)}Q84 46 74 41Q62 50 48 46Q40 48 35 54Z" fill="${c}"/>`,
      hime: `<path d="${cap(52)}L95 52L93 50L37 50Z" fill="${c}"/><path d="M36 50L44 50L44 74L36 74Z" fill="${c}"/><path d="M86 50L94 50L94 74L86 74Z" fill="${c}"/>`,
      bob: `<path d="${cap(55)}Q86 47 78 43Q66 52 52 47Q42 48 35 55Z" fill="${c}"/>`,
      sbob: `<path d="${cap(54)}Q80 44 66 42Q50 46 35 54Z" fill="${c}"/>`,
      pony: `<path d="${cap(54)}Q86 42 66 42Q46 44 35 54Z" fill="${c}"/><circle cx="90" cy="46" r="3.5" fill="${shade(c, 0.6)}"/>`,
      twin: `<path d="${cap(54)}Q84 46 70 42Q58 50 44 46Q38 48 35 54Z" fill="${c}"/><circle cx="35" cy="56" r="3" fill="#e2445c"/><circle cx="95" cy="56" r="3" fill="#e2445c"/>`,
      bun: `<path d="${cap(52)}Q86 42 65 41Q44 42 35 52Z" fill="${c}"/>`,
      halfup: `<path d="${cap(54)}Q82 44 68 42Q52 46 35 54Z" fill="${c}"/>`,
      braid: `<path d="${cap(54)}Q80 46 64 42Q48 46 35 54Z" fill="${c}"/>`,
      short: `<path d="${cap(54)}Q86 40 66 41Q52 45 44 42Q38 46 35 54Z" fill="${c}"/>`,
      vshort: `<path d="${cap(48)}Q85 38 65 38Q45 38 35 48Z" fill="${c}"/>`,
      side: `<path d="${cap(54)}Q90 40 60 40Q52 46 40 46Q36 50 35 54Z" fill="${c}"/><path d="M60 40Q64 33 74 31" stroke="${hl}" stroke-width="1.6" fill="none"/>`,
      mash: `<path d="M34 58Q33 25 65 24Q97 25 96 58Q88 50 65 50Q42 50 34 58Z" fill="${c}"/>`,
      // センターパート：真ん中で分け、前髪を左右に流して耳の上までかぶせる（カーテンバング）
      center: `<path d="M34 60Q31 24 65 23Q99 24 96 60Q95 57 92 55Q84 52 78 45Q70 38 66 27L64 27Q60 38 52 45Q46 52 38 55Q35 57 34 60Z" fill="${c}"/><path d="M38 50Q37 56 39 60L36 62Q34 56 34 50Z" fill="${c}"/><path d="M92 50Q93 56 91 60L94 62Q96 56 96 50Z" fill="${c}"/><path d="M65 24L65 29" stroke="${shade(c, 0.65)}" stroke-width="1.3"/><path d="M61 32Q53 40 44 51" stroke="${hl}" stroke-width="1.3" fill="none" opacity=".6"/><path d="M69 32Q77 40 86 51" stroke="${hl}" stroke-width="1.3" fill="none" opacity=".6"/>`,
      // スパイラルパーマ：丸いシルエットに細かい巻きを重ね、前髪も巻いて眉の上まで
      // スパイラルパーマ：ふくらんだシルエットの縁をでこぼこにし、中に細かい巻きの線（明るい線と暗い線）を不規則に入れる
      spiral: `<path d="M31 60Q28 19 65 18Q102 19 99 60Q95 51 86 50Q76 47 65 48Q54 47 44 50Q35 51 31 60Z" fill="${c}"/>${blobs([[36, 34, 7], [44, 25, 7.5], [55, 20, 7], [66, 18, 7.5], [77, 20, 7], [87, 26, 7.5], [95, 35, 7], [33, 44, 6.5], [98, 45, 6.5], [38, 50, 5], [46, 51, 5.5], [55, 52, 5], [64, 52, 5.5], [73, 52, 5], [82, 51, 5.5], [91, 50, 5], [31, 56, 5], [99, 56, 5]], c)}${squiggles(c)}`,
      spiky: `<path d="M35 52L33 34L44 40L46 24L56 34L65 20L74 34L84 24L86 40L97 34L95 52Q86 42 65 42Q44 42 35 52Z" fill="${c}"/>`,
      perm: `<path d="M33 56Q30 28 65 25Q100 28 97 56Q92 46 82 48Q74 40 65 46Q56 40 48 48Q38 46 33 56Z" fill="${c}"/>${[40, 52, 65, 78, 90].map((x) => `<circle cx="${x}" cy="${x === 65 ? 30 : 36}" r="7" fill="${c}"/>`).join("")}`,
      // ウルフ：トップは短めで動きを出し、前髪は束感のあるぎざぎざ。顔まわりはあごまでのレイヤー（えり足は nape で肩に流す）
      wolf: `<path d="M34 60Q31 23 65 22Q99 23 96 60L93 51L90 58L86 49L81 55L77 47L72 54L67 46L62 54L57 47L52 55L47 49L43 57L39 51Z" fill="${c}"/><path d="M34 52Q31 68 37 84L39 75L42 86L44 70Q43 60 41 54Z" fill="${c}"/><path d="M96 52Q99 68 93 84L91 75L88 86L86 70Q87 60 89 54Z" fill="${c}"/>`,
      mlong: `<path d="${cap(54)}Q86 42 66 41Q46 42 35 54Z" fill="${c}"/>`,
      flip: `<path d="${cap(55)}Q86 47 78 43Q66 52 52 47Q42 48 35 55Z" fill="${c}"/>`,
      mwave: `<path d="${cap(55)}Q84 45 72 41Q60 50 46 47Q40 50 35 55Z" fill="${c}"/>`,
      // アップバング：前髪を上げて、おでこを出す
      upbang: `<path d="M35 58Q31 24 62 15Q72 12 82 18Q99 28 95 58Q93 47 87 42Q80 36 72 35Q65 33 58 35Q48 37 42 44Q37 49 35 58Z" fill="${c}"/><path d="M54 30Q60 16 76 20" stroke="${hl}" stroke-width="1.6" fill="none" opacity=".7"/><path d="M64 30Q70 22 82 26" stroke="${shade(c, 0.7)}" stroke-width="1.2" fill="none"/>`,
      // ツーブロック：上は重め、耳の上は刈り上げ（地肌が透ける）
      twoblock: `<path d="M36 60Q35 44 40 42L41 60Z" fill="${c}" opacity=".35"/><path d="M94 60Q95 44 90 42L89 60Z" fill="${c}" opacity=".35"/><path d="M39 50Q37 23 65 21Q93 23 91 50Q86 43 76 44Q66 49 56 44Q46 43 39 50Z" fill="${c}"/>`,
      // ソフトモヒカン：真ん中を高く、横は短く
      mohican: `<path d="M37 54Q36 30 65 29Q94 30 93 54Q90 45 84 42Q75 38 65 38Q55 38 46 42Q40 45 37 54Z" fill="${c}" opacity=".4"/><path d="M48 42L50 24L56 30L60 16L65 26L70 16L74 30L80 24L82 42Q74 36 65 37Q56 36 48 42Z" fill="${c}"/>`,
      gorin: `<path d="M37 54Q36 30 65 29Q94 30 93 54Q91 45 84 42Q75 38 65 38Q55 38 46 42Q39 45 37 54Z" fill="${c}" opacity=".38"/>`,   // 五厘：地肌が透ける短さ
      skin: `<ellipse cx="56" cy="40" rx="7" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-18 56 40)"/>`,   // スキンヘッド：髪なし、頭のつやだけ
      buzz: `<path d="M38 52Q37 30 65 29Q93 30 92 52Q90 44 84 41Q75 37 65 37Q55 37 46 41Q40 44 38 52Z" fill="${c}" opacity=".85"/>`,   // 頭の形に沿わせる（両端が浮かない）
    }[k] || "";
    return top + (["buzz", "spiky", "gorin", "skin", "spiral", "center", "upbang", "twoblock", "mohican"].includes(k) || TIPS[k] ? "" : `<path d="M50 30Q60 27 70 29" stroke="${hl}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`);
  }
  // おくれ毛：耳の前から頬に沿って下ろす細い毛
  function strands(t, c) {
    if (!t) return "";
    const L = [
      "",
      `<path d="M41 50Q38 66 42 86" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M89 50Q92 66 88 86" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      `<path d="M41 50Q35 60 41 68Q48 76 41 84Q37 89 42 92" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M89 50Q95 60 89 68Q82 76 89 84Q93 89 88 92" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      `<path d="M35 50Q34 70 41 84Q45 70 45 54Z" fill="${c}"/><path d="M95 50Q96 70 89 84Q85 70 85 54Z" fill="${c}"/>`,
    ][t] || "";
    return L;
  }
  function brows(b, c, mood) {
    const t = mood === "tired" ? 2 : mood === "bright" ? -1 : 0;
    const w = [2.2, 3.4, 1.4, 2.2, 2.2, 2.4][b] ?? 2.2, s = [[0, 0], [0, 0], [0, 0], [3, -2], [-2, 2], [1, 1]][b] || [0, 0];
    const L = `M46 ${56 + s[0] + t}Q53 ${52 + (b === 5 ? 3 : 0)} 60 ${55 + s[1] - t}`, R = `M70 ${55 + s[1] - t}Q77 ${52 + (b === 5 ? 3 : 0)} 84 ${56 + s[0] + t}`;
    return `<path d="${L}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${R}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  function eyes(e, col, mood, skin) {
    const y = 66;
    // o = 目じりの向き（左目は -1、右目は +1）。たれ目は目じりが下がり、つり目は上がる
    const one = (x, o) => {
      const rot = (deg) => `transform="rotate(${deg * o} ${x} ${y})"`;
      const lid = (dy) => `<path d="M${x - 6.5} ${y - 5 + (o < 0 ? dy : -dy)}Q${x} ${y - 8.5} ${x + 6.5} ${y - 5 + (o < 0 ? -dy : dy)}" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      const base = [
        `<circle cx="${x}" cy="${y}" r="5" fill="${col}"/>`,                                                            // まる
        `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="${col}"/>`,                                                   // たまご
        `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.3" fill="${col}"/>`,                                               // アーモンド
        `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="4.8" fill="${col}" ${rot(-14)}/>${lid(2.5)}`,                        // たれ目（目じりが下がる）
        `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="4.8" fill="${col}" ${rot(14)}/>${lid(-2.5)}`,                        // つり目（目じりが上がる）
        `<path d="M${x - 5} ${y}Q${x} ${y - 3.5} ${x + 5} ${y}" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, // 細め
        `<ellipse cx="${x}" cy="${y}" rx="5.8" ry="6.8" fill="${col}"/>`,                                               // ぱっちり
        `<ellipse cx="${x}" cy="${y}" rx="4.8" ry="5.6" fill="${col}"/><path d="M${x - 5.5} ${y - 4}Q${x} ${y - 8} ${x + 5.5} ${y - 4}" stroke="${col}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
          `<path d="M${x + 5 * o} ${y - 4.5}l${2.6 * o} -2.2M${x + 3 * o} ${y - 6}l${1.8 * o} -2.6" stroke="${col}" stroke-width="1.3" stroke-linecap="round"/>`, // まつげ（目じりの上に2本）
      ][e] || "";
      const shine = e === 5 ? "" : `<circle cx="${x + 1.6}" cy="${y - 1.8}" r="${e === 6 ? 2.1 : 1.5}" fill="#fff"/>${mood === "bright" || e === 6 ? `<circle cx="${x - 1.8}" cy="${y + 2}" r="0.9" fill="#fff"/>` : ""}`;
      const tired = mood === "tired" && e !== 5 ? `<path d="M${x - 7} ${y - 7.5}L${x + 7} ${y - 7.5}L${x + 7} ${y - 0.5}Q${x} ${y - 2} ${x - 7} ${y - 0.5}Z" fill="${skin}"/>` : "";
      return base + shine + tired;
    };
    return one(54, -1) + one(76, 1);
  }
  function nose(n, skin) {
    const d = shade(skin, 0.78);
    return ["<path d='M64 74Q65 77 67 75' stroke='" + d + "' stroke-width='1.6' fill='none' stroke-linecap='round'/>",
      `<ellipse cx="65" cy="75" rx="2.4" ry="1.8" fill="${d}"/>`,
      `<path d="M65 68L63 76Q65 77.5 67 76" stroke="${d}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
      `<path d="M61 76Q65 70 69 76Q65 79 61 76Z" fill="${d}"/>`, ""][n] || "";
  }
  function mouth(m, mood) {
    if (mood === "bright") return `<path d="M57 82Q65 92 73 82Q65 85 57 82Z" fill="#b5525e"/><path d="M60 85Q65 89 70 85" fill="#f08aa0"/>`;
    if (mood === "tired") return `<path d="M59 86Q65 82 71 86" fill="none" stroke="#a5575c" stroke-width="2" stroke-linecap="round"/>`;
    return [`<path d="M58 83Q65 90 72 83" fill="none" stroke="#b5525e" stroke-width="2.2" stroke-linecap="round"/>`,
      `<path d="M59 84Q65 87 71 84" fill="none" stroke="#b5525e" stroke-width="2" stroke-linecap="round"/>`,
      `<path d="M62 84Q65 86 68 84" fill="none" stroke="#b5525e" stroke-width="2" stroke-linecap="round"/>`,
      `<path d="M56 82Q65 92 74 82Q65 85 56 82Z" fill="#b5525e"/>`,
      `<path d="M58 84Q65 86 72 82" fill="none" stroke="#b5525e" stroke-width="2" stroke-linecap="round"/>`,
      `<path d="M59 86Q65 83 71 86" fill="none" stroke="#b5525e" stroke-width="2" stroke-linecap="round"/>`][m] || "";
  }
  function beard(b, c) {
    const d = shade(c, 0.9);
    return ["", `<path d="M56 80Q65 76 74 80Q65 82 56 80Z" fill="${d}"/>`,
      `<path d="M58 90Q65 99 72 90Q65 93 58 90Z" fill="${d}"/>`,
      `<path d="M42 78Q48 94 65 96Q82 94 88 78" fill="none" stroke="${d}" stroke-width="5" opacity=".28" stroke-linecap="round"/>`,
      `<path d="M38 70Q40 96 65 98Q90 96 92 70Q86 88 74 88Q65 80 56 88Q44 88 38 70Z" fill="${d}"/><path d="M56 80Q65 76 74 80Q65 82 56 80Z" fill="${d}"/>`][b] || "";
  }
  function glasses(g) {
    const k = "#2b2024";
    return ["", `<g fill="none" stroke="${k}" stroke-width="1.8"><circle cx="54" cy="66" r="8"/><circle cx="76" cy="66" r="8"/><path d="M62 66h6"/></g>`,
      `<g fill="none" stroke="${k}" stroke-width="1.8"><rect x="45" y="59" width="18" height="14" rx="2"/><rect x="67" y="59" width="18" height="14" rx="2"/><path d="M63 66h4"/></g>`,
      `<g fill="none" stroke="${k}" stroke-width="1"><rect x="45" y="60" width="18" height="12" rx="5"/><rect x="67" y="60" width="18" height="12" rx="5"/><path d="M63 65h4"/></g>`,
      `<g><rect x="44" y="59" width="19" height="13" rx="5" fill="#1a1a1f" opacity=".88"/><rect x="67" y="59" width="19" height="13" rx="5" fill="#1a1a1f" opacity=".88"/><path d="M63 64h4" stroke="#1a1a1f" stroke-width="2"/></g>`][g] || "";
  }

  // mood: "bright"（元気）| "neutral" | "tired"（少し疲れ。誇張しない）
  // mood は文字（区分）か {mood, smile 0〜1, fatigue 0〜1}（2つの未来で、得点の差をそのまま表情の差にする）
  function render(av, mood = "neutral", size = 120) {
    const fx = typeof mood === "object" && mood ? mood : null;
    if (fx) mood = fx.mood || "neutral";
    av = { ...defaults(av && av.gender), ...(av || {}) };
    const hc = PALETTE[av.hairColor] || PALETTE[2], sk = SKIN[av.skin] || SKIN[3], sh = mood === "tired" ? shade(PALETTE[av.shirt] || "#2170e4", 0.7) : PALETTE[av.shirt] || "#2170e4";
    const H = Math.round((size * 140) / 130);
    // ほお紅は女性を選んだ人だけ（男性に付けると化粧のように見えるため）
    const cheek = mood === "bright" && av.gender === "女性" ? `<ellipse cx="46" cy="79" rx="5" ry="3" fill="#f5a9c0" opacity=".55"/><ellipse cx="84" cy="79" rx="5" ry="3" fill="#f5a9c0" opacity=".55"/>` : "";
    // 疲れ：目の下のくまの濃さを推し疲れの値に比例させる。笑顔：口の上がり方を幸福度に比例させる
    const fat = fx ? Math.max(0, (fx.fatigue - 0.2) / 0.6) : mood === "tired" ? 0.7 : 0;
    const bags = fat > 0.02 ? `<path d="M47 73Q54 77 61 73" stroke="${shade(sk, 0.72)}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="${(Math.min(fat, 1) * 0.9).toFixed(2)}"/><path d="M69 73Q76 77 83 73" stroke="${shade(sk, 0.72)}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="${(Math.min(fat, 1) * 0.9).toFixed(2)}"/>` : "";
    const mth = fx ? (() => { const s = Math.max(0, Math.min(1, fx.smile)), y = 84 + (s - 0.45) * 16; return s >= 0.62 ? `<path d="M56 82Q65 ${y + 6} 74 82Q65 85 56 82Z" fill="#b5525e"/>` : `<path d="M58 84Q65 ${y.toFixed(1)} 72 84" fill="none" stroke="#b5525e" stroke-width="2.2" stroke-linecap="round"/>`; })() : mouth(av.mouth, mood);
    return `<svg width="${size}" height="${H}" viewBox="0 0 130 140" role="img" aria-label="あなたのアバター">
${hairBack(av.hair, hc)}${backDetail(av.hair, hc)}
<path d="M58 88L72 88L73 104L57 104Z" fill="${shade(sk, 0.9)}"/>
<path d="M16 140Q18 104 50 100Q57 106 65 106Q73 106 80 100Q112 104 114 140Z" fill="${sh}"/><path d="M50 100Q57 107 65 107Q73 107 80 100L76 99Q70 103 65 103Q60 103 54 99Z" fill="${shade(sh, 0.8)}"/>
${nape(av.hair, hc)}<ellipse cx="36" cy="67" rx="4.5" ry="7" fill="${shade(sk, 0.95)}"/><ellipse cx="94" cy="67" rx="4.5" ry="7" fill="${shade(sk, 0.95)}"/>
<path d="${facePath(av.face)}" fill="${sk}"/>
${hairFront(av.hair, hc)}${detail(av.hair, hc)}${strands(av.strand || 0, hc)}
${brows(av.brow, shade(hc, 0.85), mood)}${eyes(av.eye, EYE_COLOR[av.eyeColor] || EYE_COLOR[0], mood, sk)}${bags}${nose(av.nose, sk)}${cheek}${mth}${beard(av.beard, hc)}${glasses(av.glasses)}
</svg>`;
  }

  window.OFAvatar = { render, defaults, stylesFor, PALETTE, SKIN, EYE_COLOR, HAIR, FACE, BROW, EYE, NOSE, MOUTH, GLASSES, BEARD, STRAND };
})();
