// data/*.json を js/data.js に埋め込む（file:// で開いても読めるようにするため）。data/ を更新したら実行する。
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(dir, 'data/model_v1.json'), 'utf8'));
const norms = JSON.parse(fs.readFileSync(path.join(dir, 'data/norms.json'), 'utf8'));
const out = `// 自動生成: node tools/build_data.js（data/model_v1.json と data/norms.json を埋め込む。直接編集しない）
(function () {
  const data = ${JSON.stringify({ model, norms })};
  if (typeof module !== 'undefined') module.exports = data; else (window.OF = window.OF || {}).data = data;
})();
`;
fs.writeFileSync(path.join(dir, 'js/data.js'), out);
console.log('js/data.js', out.length, 'bytes');
