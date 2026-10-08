// Generates the OshiFit avatar illustrations (SVG -> PNG) used across all decks.
const sharp = require('sharp');
const fs = require('fs');
const OUT = __dirname + '/assets/';

const SKIN = '#F7D9C4', HAIR = '#3A2B2E', SHIRT = '#5B8DEF', OSHI = '#E8457C';

function eyes(expr) {
  if (expr === 'good') return `
    <path d="M108,152 Q121,137 134,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M166,152 Q179,137 192,152" stroke="#2B2024" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  if (expr === 'neutral') return `
    <ellipse cx="121" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="124" cy="146" r="3" fill="#fff"/>
    <ellipse cx="179" cy="150" rx="8" ry="11" fill="#2B2024"/><circle cx="182" cy="146" r="3" fill="#fff"/>`;
  // tired: half-closed lids, mild
  return `
    <path d="M109,150 L133,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/>
    <path d="M112,151 Q121,162 130,151" fill="#2B2024"/>
    <path d="M167,150 L191,150" stroke="#2B2024" stroke-width="5" stroke-linecap="round"/>
    <path d="M170,151 Q179,162 188,151" fill="#2B2024"/>
    <path d="M110,168 Q121,174 132,168" stroke="#9C8CC0" stroke-width="3" fill="none" opacity="0.55" stroke-linecap="round"/>
    <path d="M168,168 Q179,174 190,168" stroke="#9C8CC0" stroke-width="3" fill="none" opacity="0.55" stroke-linecap="round"/>`;
}
function mouth(expr) {
  if (expr === 'good') return `<path d="M134,188 Q150,212 166,188 Z" fill="#B8324F"/><path d="M140,197 Q150,206 160,197 Z" fill="#F08AA0"/>`;
  if (expr === 'neutral') return `<path d="M139,194 Q150,201 161,194" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<path d="M139,200 Q150,193 161,200" stroke="#8A3A4A" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}
function brows(expr, HAIR = '#3A2B2E') {
  if (expr === 'tired') return `
    <path d="M108,128 Q121,124 134,131" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M166,131 Q179,124 192,128" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `
    <path d="M108,126 Q121,119 134,125" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M166,125 Q179,119 192,126" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}
function accessory(acc) {
  if (acc === 'sleep') return `
    <text x="232" y="78" font-family="Arial" font-weight="bold" font-size="34" fill="#7C6BC4">z</text>
    <text x="256" y="52" font-family="Arial" font-weight="bold" font-size="26" fill="#7C6BC4" opacity="0.8">z</text>`;
  if (acc === 'money') return `
    <g transform="translate(196,262) rotate(-8)">
      <rect x="0" y="0" width="74" height="50" rx="9" fill="#C98A4B"/>
      <rect x="40" y="14" width="34" height="22" rx="6" fill="#B07338"/>
      <circle cx="56" cy="25" r="4" fill="#F5D7A8"/>
      <path d="M10,-8 Q20,-22 30,-8" stroke="#B9B9B9" stroke-width="3" fill="none" stroke-dasharray="3 4"/>
    </g>`;
  if (acc === 'duty') return `
    <path d="M92,262 Q100,300 102,340" stroke="#6B4E3D" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M208,262 Q200,300 198,340" stroke="#6B4E3D" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  if (acc === 'compare') return `
    <g transform="translate(200,250) rotate(10)">
      <rect x="0" y="0" width="46" height="80" rx="8" fill="#2D3748"/>
      <rect x="4" y="8" width="38" height="62" rx="3" fill="#9FD8FF"/>
      <path d="M-14,10 L-28,0 M-16,30 L-32,30 M-14,50 L-28,60" stroke="#7FC8FF" stroke-width="4" stroke-linecap="round"/>
    </g>`;
  return '';
}
function avatarGroup(expr, acc = '', aged = false) {
  const HAIR = aged ? '#C9C3C7' : '#3A2B2E';
  const blush = expr === 'good' ? 0.55 : expr === 'neutral' ? 0.35 : 0.0;
  return `
  <g>
    <path d="M58,340 C58,276 104,252 150,252 C196,252 242,276 242,340 Z" fill="${SHIRT}"/>
    <path d="M128,252 L150,276 L172,252 Z" fill="#fff" opacity="0.9"/>
    <rect x="134" y="228" width="32" height="30" fill="${SKIN}"/>
    <path d="M56,170 C46,80 100,46 150,46 C204,46 256,80 244,170 L246,232 C232,222 226,200 226,176 L74,176 C74,200 68,222 54,232 Z" fill="${HAIR}"/>
    <circle cx="150" cy="156" r="88" fill="${SKIN}"/>
    <path d="M62,150 C62,86 104,58 150,58 C198,58 240,86 238,150 C226,120 200,104 176,98 C170,112 150,120 128,118 C108,118 92,112 86,104 C74,116 66,132 62,150 Z" fill="${HAIR}"/>
    <path d="M206,92 l14,-10 l4,16 Z" fill="${OSHI}"/><circle cx="214" cy="94" r="5" fill="#fff"/>
    ${brows(expr, aged ? '#9A9397' : '#3A2B2E')}
    ${eyes(expr)}
    <ellipse cx="104" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/>
    <ellipse cx="196" cy="182" rx="15" ry="9" fill="#F28CA0" opacity="${blush}"/>
    ${mouth(expr)}
    ${aged ? `<path d="M118,176 Q122,192 128,202" stroke="#D9B8A4" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M182,176 Q178,192 172,202" stroke="#D9B8A4" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M98,146 l-8,-4 M98,152 l-9,0 M202,146 l8,-4 M202,152 l9,0" stroke="#D9B8A4" stroke-width="2.5" stroke-linecap="round"/>` : ''}
    ${accessory(acc)}
  </g>`;
}
function single(expr, acc, aged) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="680" viewBox="0 0 300 340">${avatarGroup(expr, acc, aged)}</svg>`;
}
// Ensemble of "possible selves": ghosts sampled around the center; spread shrinks as logs accumulate.
function ensemble(spread, centerOpacity, ghostOpacity, blur, exprs) {
  const offs = [-2, -1, 1, 2];
  let g = '';
  offs.forEach((o, i) => {
    const dx = o * 52 * spread, dy = Math.abs(o) * 6 * spread;
    g += `<g transform="translate(${100 + dx},${dy}) " opacity="${ghostOpacity}" filter="url(#b)">${avatarGroup(exprs[i])}</g>`;
  });
  g += `<g transform="translate(100,0)" opacity="${centerOpacity}">${avatarGroup(exprs[4])}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="680" viewBox="0 0 500 340">
    <defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>${g}</svg>`;
}
(async () => {
  const jobs = {
    old_good: single('good', '', true), old_neutral: single('neutral', '', true), old_sad: single('tired', '', true),
    av_good: single('good'), av_neutral: single('neutral'), av_tired: single('tired'),
    av_sleep: single('tired', 'sleep'), av_money: single('neutral', 'money'),
    av_duty: single('tired', 'duty'), av_compare: single('neutral', 'compare'),
    ghost_d0: ensemble(1.0, 0.35, 0.32, 2.5, ['tired', 'neutral', 'good', 'tired', 'neutral']),
    ghost_d7: ensemble(0.55, 0.65, 0.30, 1.6, ['neutral', 'good', 'good', 'neutral', 'good']),
    ghost_d14: ensemble(0.18, 1.0, 0.22, 0.8, ['good', 'good', 'good', 'neutral', 'good']),
    ghostA: ensemble(0.5, 0.85, 0.28, 1.4, ['tired', 'neutral', 'tired', 'tired', 'tired']),
    ghostB: ensemble(0.5, 0.85, 0.28, 1.4, ['neutral', 'good', 'good', 'neutral', 'good']),
  };
  for (const [k, svg] of Object.entries(jobs)) {
    fs.writeFileSync(OUT + k + '.svg', svg);
    await sharp(Buffer.from(svg)).png().toFile(OUT + k + '.png');
  }
  console.log('avatars done');
})();
