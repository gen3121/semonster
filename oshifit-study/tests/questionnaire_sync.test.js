// index.html に埋め込んだ質問紙と questionnaire.json が同じか（承認済みの文言を1か所でずらさないため）
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
test("index.html の OSHIFIT_Q と questionnaire.json が一致する", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const emb = JSON.parse(html.match(/window\.OSHIFIT_Q=(\{[\s\S]*?\});<\/script>/)[1]);
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "questionnaire.json"), "utf8"));
  assert.deepEqual(emb, file);
  const n = file.sections.filter((s) => s.id !== "free").reduce((a, s) => a + s.items.length, 0);
  assert.equal(n, 85, "85項目（67＋SHS 4＋PSS-J 14）");
});
