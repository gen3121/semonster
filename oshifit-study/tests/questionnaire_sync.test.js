// index.html に埋め込んだ質問紙と questionnaire.json が同じか（承認済みの文言を1か所でずらさないため）
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
test("index.html の OSHIFIT_Q と questionnaire.json が一致する", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const emb = JSON.parse(html.match(/window\.OSHIFIT_Q=(\{[\s\S]*?\});<\/script>/)[1]);
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "questionnaire.json"), "utf8"));
  assert.deepEqual(emb, file);
  const n = file.sections.filter((s) => s.id !== "free").reduce((a, s) => a + s.items.length, 0);
  assert.equal(n, 85, "全項目は85（67＋SHS 4＋PSS-J 14）。短縮版で省くのは short_omit");
  const omit = new Set(file.short_omit);
  const used = JSON.stringify(file.scoring);
  for (const id of omit) assert.ok(!used.includes(`"${id}"`), id + " は採点に使っていない");
  assert.equal(n - omit.size - 1, 67, "短縮版で答えるのは67項目（性別は登録画面）");
});
