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
    ["short", "ショート", "u"], ["vshort", "ベリーショート", "m"], ["side", "サイドパート", "m"], ["mash", "マッシュ", "u"],
    ["center", "センター分け", "u"], ["spiky", "ツンツン", "m"], ["perm", "パーマ", "u"], ["wolf", "ウルフ", "u"],
    ["mlong", "ロング（後ろで結ぶ）", "u"], ["buzz", "坊主", "m"],
  ];
  const FACE = ["たまご", "まる", "ほそ長", "四角", "ベース"];
  const BROW = ["ふつう", "太め", "細め", "上がり", "下がり", "まっすぐ"];
  const EYE = ["まる", "たまご", "アーモンド", "たれ目", "つり目", "細め", "ぱっちり", "まつげ"];
  const NOSE = ["ちょん", "まる", "たて", "大きめ", "なし"];
  const MOUTH = ["にっこり", "ふつう", "小さめ", "大きめ", "口角上げ", "への字ぎみ"];
  const GLASSES = ["なし", "まる", "四角", "細ぶち", "サングラス"];
  const BEARD = ["なし", "口ひげ", "あごひげ", "無精ひげ", "フル"];

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
      wolf: `<path d="M33 62Q32 28 65 27Q98 28 97 62L98 92Q90 86 86 96L44 96Q40 86 32 92Z" fill="${d}"/>`,
      perm: `<path d="M32 60Q31 28 65 27Q99 28 98 60Q102 72 94 80L36 80Q28 72 32 60Z" fill="${d}"/>`,
    }[k] || "";
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
      center: `<path d="${cap(56)}Q88 42 68 38L65 44L62 38Q42 42 35 56Z" fill="${c}"/>`,
      spiky: `<path d="M35 52L33 34L44 40L46 24L56 34L65 20L74 34L84 24L86 40L97 34L95 52Q86 42 65 42Q44 42 35 52Z" fill="${c}"/>`,
      perm: `<path d="M33 56Q30 28 65 25Q100 28 97 56Q92 46 82 48Q74 40 65 46Q56 40 48 48Q38 46 33 56Z" fill="${c}"/>${[40, 52, 65, 78, 90].map((x) => `<circle cx="${x}" cy="${x === 65 ? 30 : 36}" r="7" fill="${c}"/>`).join("")}`,
      wolf: `<path d="${cap(56)}Q84 44 72 42Q62 52 50 46Q40 50 35 56Z" fill="${c}"/>`,
      mlong: `<path d="${cap(54)}Q86 42 66 41Q46 42 35 54Z" fill="${c}"/>`,
      buzz: `<path d="${cap(46)}Q85 37 65 37Q45 37 35 46Z" fill="${shade(c, 1)}" opacity=".85"/>`,
    }[k] || "";
    return top + (k === "buzz" ? "" : `<path d="M50 30Q60 27 70 29" stroke="${hl}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`);
  }
  function brows(b, c, mood) {
    const t = mood === "tired" ? 2 : mood === "bright" ? -1 : 0;
    const w = [2.2, 3.4, 1.4, 2.2, 2.2, 2.4][b] ?? 2.2, s = [[0, 0], [0, 0], [0, 0], [3, -2], [-2, 2], [1, 1]][b] || [0, 0];
    const L = `M46 ${56 + s[0] + t}Q53 ${52 + (b === 5 ? 3 : 0)} 60 ${55 + s[1] - t}`, R = `M70 ${55 + s[1] - t}Q77 ${52 + (b === 5 ? 3 : 0)} 84 ${56 + s[0] + t}`;
    return `<path d="${L}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${R}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  function eyes(e, col, mood, skin) {
    const y = 66, one = (x, flip) => {
      const f = flip ? -1 : 1;
      const base = [
        `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.4" fill="${col}"/>`,
        `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="${col}"/>`,
        `<path d="M${x - 6} ${y}Q${x} ${y - 6} ${x + 6} ${y}Q${x} ${y + 5} ${x - 6} ${y}Z" fill="${col}"/>`,
        `<path d="M${x - 6} ${y - 1}Q${x} ${y - 5} ${x + 6} ${y + 2 * f}Q${x} ${y + 6} ${x - 6} ${y - 1}Z" fill="${col}"/>`,
        `<path d="M${x - 6} ${y + 2 * f}Q${x} ${y - 6} ${x + 6} ${y - 2 * f}Q${x} ${y + 5} ${x - 6} ${y + 2 * f}Z" fill="${col}"/>`,
        `<path d="M${x - 5} ${y}Q${x} ${y - 3} ${x + 5} ${y}" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
        `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="6.6" fill="${col}"/>`,
        `<ellipse cx="${x}" cy="${y}" rx="4.8" ry="5.6" fill="${col}"/><path d="M${x - 6} ${y - 4}L${x - 8} ${y - 6}M${x + 6} ${y - 4}L${x + 8} ${y - 6}" stroke="${col}" stroke-width="1.4"/>`,
      ][e] || "";
      const shine = e === 5 ? "" : `<circle cx="${x + 1.6}" cy="${y - 2}" r="${e === 6 ? 2 : 1.5}" fill="#fff"/>${mood === "bright" && e !== 5 ? `<circle cx="${x - 1.8}" cy="${y + 2}" r="0.9" fill="#fff"/>` : ""}`;
      const lid = mood === "tired" && e !== 5 ? `<path d="M${x - 7} ${y - 7}L${x + 7} ${y - 7}L${x + 7} ${y - 0.5}Q${x} ${y - 2} ${x - 7} ${y - 0.5}Z" fill="${skin}"/>` : "";
      return base + shine + lid;
    };
    return one(54, false) + one(76, true);
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
  function render(av, mood = "neutral", size = 120) {
    av = { ...defaults(av && av.gender), ...(av || {}) };
    const hc = PALETTE[av.hairColor] || PALETTE[2], sk = SKIN[av.skin] || SKIN[3], sh = mood === "tired" ? shade(PALETTE[av.shirt] || "#2170e4", 0.7) : PALETTE[av.shirt] || "#2170e4";
    const H = Math.round((size * 140) / 130);
    const cheek = mood === "bright" ? `<ellipse cx="46" cy="79" rx="5" ry="3" fill="#f5a9c0" opacity=".7"/><ellipse cx="84" cy="79" rx="5" ry="3" fill="#f5a9c0" opacity=".7"/>` : "";
    return `<svg width="${size}" height="${H}" viewBox="0 0 130 140" role="img" aria-label="あなたのアバター">
${hairBack(av.hair, hc)}
<path d="M58 88L72 88L73 104L57 104Z" fill="${shade(sk, 0.9)}"/>
<path d="M16 140Q18 104 50 100Q57 106 65 106Q73 106 80 100Q112 104 114 140Z" fill="${sh}"/><path d="M50 100Q57 107 65 107Q73 107 80 100L76 99Q70 103 65 103Q60 103 54 99Z" fill="${shade(sh, 0.8)}"/>
<ellipse cx="36" cy="67" rx="4.5" ry="7" fill="${shade(sk, 0.95)}"/><ellipse cx="94" cy="67" rx="4.5" ry="7" fill="${shade(sk, 0.95)}"/>
<path d="${facePath(av.face)}" fill="${sk}"/>
${hairFront(av.hair, hc)}
${brows(av.brow, shade(hc, 0.85), mood)}${eyes(av.eye, EYE_COLOR[av.eyeColor] || EYE_COLOR[0], mood, sk)}${nose(av.nose, sk)}${cheek}${mouth(av.mouth, mood)}${beard(av.beard, hc)}${glasses(av.glasses)}
</svg>`;
  }

  window.OFAvatar = { render, defaults, stylesFor, PALETTE, SKIN, EYE_COLOR, HAIR, FACE, BROW, EYE, NOSE, MOUTH, GLASSES, BEARD };
})();
