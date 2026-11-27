// OshiFit 本実験の「研究参加についての説明書」「同意書」「同意撤回書」を Word で作る（A4・BIZ UDPゴシック）
// 使い方：node docs/src/make_consent_docx.js  → docs/OshiFit_説明書・同意書・同意撤回書_20261127.docx
// 【 】は今井が埋める（承認番号・保管期間・撤回の期限）。内容を変えたら、倫理審査で承認された内容と合っているかを確かめる
const fs = require("fs"), path = require("path");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  LevelFormat, PageBreak, ShadingType, Footer, PageNumber } = require("docx");

const FONT = "BIZ UDPゴシック";
const OUT = path.join(__dirname, "..", "OshiFit_説明書・同意書・同意撤回書_20261127.docx");
const PAGE_W = 11906, MARGIN = 1134, CONTENT_W = PAGE_W - MARGIN * 2;   // A4、余白 2cm

const r = (t, o = {}) => new TextRun({ text: t, font: FONT, size: o.size || 21, bold: o.bold, color: o.color });
const p = (t, o = {}) => new Paragraph({ children: Array.isArray(t) ? t : [r(t, o)], alignment: o.align, spacing: { before: o.before || 0, after: o.after ?? 80, line: 300 }, indent: o.indent });
const h1 = (t) => new Paragraph({ children: [r(t, { size: 32, bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 } });
const h2 = (t) => new Paragraph({ children: [r(t, { size: 23, bold: true })], spacing: { before: 200, after: 80 }, keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "0B3C6E", space: 2 } } });
const li = (t, lvl = 0) => new Paragraph({ children: Array.isArray(t) ? t : [r(t)], numbering: { reference: "bul", level: lvl }, spacing: { after: 60, line: 300 } });
const br = () => new Paragraph({ children: [new PageBreak()] });
const blank = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [r("")], spacing: { after: 0 } }));

const bd = { style: BorderStyle.SINGLE, size: 6, color: "7A8594" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function table(rows, widths) {
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: rows.map((cells, i) => new TableRow({
    children: cells.map((c, j) => new TableCell({ borders, width: { size: widths[j], type: WidthType.DXA },
      shading: j === 0 ? { fill: "EEF3F8", type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: (Array.isArray(c) ? c : [c]).map((t) => p(t, { after: 0, bold: j === 0 })) })) })) });
}
const check = (t) => new Paragraph({ children: [r("□　", { size: 24 }), r(t)], spacing: { after: 70, line: 300 }, indent: { left: 240 } });

const STUDY = "推し活の持続を支えるシステム OshiFit の構築と検証";
const WHO = "大阪工業大学大学院 情報科学研究科 メディアインタラクション研究室　今井 元（指導教員：大井 翔）";

// ---------------------------------------------------------------- 1. 説明書（参加者が持ち帰る）
const explain = [
  h1("研究参加についての説明書"),
  p("この説明書は、お持ち帰りください。", { align: AlignmentType.CENTER, after: 200, color: "5A6676" }),
  table([["研究の名前", STUDY], ["研究者", WHO], ["倫理審査", "本研究は【倫理審査委員会】の承認を受けています（承認番号：【　　　　】）"]], [2000, CONTENT_W - 2000]),
  h2("1. 研究の目的"),
  p("推し活（好きな人や作品を応援する活動）は毎日を明るくする一方で、お金や時間、睡眠、SNSでの比較などから疲れてしまうこともあります。この研究では、推し活の状態を見える化し、あなたの推しと性格に合った無理のない推し活の工夫を提案するアプリ「OshiFit（推しフィット）」を使って、推し活と幸福度・ストレスの関係を調べます。"),
  h2("2. していただくこと"),
  li([r("始めるとき（研究室・約25分）：", { bold: true }), r("この説明と同意のあと、ご自分のスマートフォンで登録し、最初の質問（性格・推し活の中身・最近の気分やストレスなど）に答え、アバターを作ります（写真は使いません）。その後、提案と「今のままの推し活」「整えた推し活」の2つの未来を見比べて、どちらで続けるかを選びます。")]),
  li([r("約28日間（ご自宅など）：", { bold: true }), r("毎日のアンケート（約1分）と、4日ごとの振り返り（全6回、各約1分）に答えます。")]),
  li([r("最後（28日目以降・研究室・約20分）：", { bold: true }), r("最後の調査（約10分）に答え、研究の説明を受けます。来られない場合は、アプリから答えていただけます。")]),
  p("始めるときと最後に、お菓子と飲み物をお渡しします。そのほかの謝礼はありません。", { before: 60 }),
  h2("3. 集めるデータと扱い"),
  li("アプリで集めるのは、質問への回答と、研究用の番号（9桁）です。名前は回答と一緒に保存しません。"),
  li("ログインのためにメールアドレス（または Google・Microsoft のアカウント）を使いますが、回答とは別に管理し、研究の結果に名前やメールアドレスが出ることはありません。"),
  li("提案の文をあなたの推しに合わせて作るために、点数・性格・推し活の中身・推しの名前を AI（OpenAI または Google）に送ります。名前やメールアドレスは送りません。送った内容は AI の学習には使われません。"),
  li("データは Firebase（Google のクラウド、東京）に保存し、見ることができるのは研究者（今井・大井）だけです。結果は、個人が分からない形（集計した値）で、修士論文や学会で発表します。"),
  li("この同意書は、回答のデータとは別に、鍵のかかる場所で保管します。研究が終わったあと【5年間】保管し、その後は細断して捨てます。"),
  h2("4. 参加は自由です"),
  li("参加するかどうかは自由です。参加しなくても、途中でやめても、成績などの不利益は一切ありません。"),
  li("つらいときは、アンケートや振り返りを休んでかまいません。アプリのホームとマイページの「相談先」から、相談の窓口をいつでも開けます。"),
  li([r("同意の撤回：", { bold: true }), r("参加したあとでも、同意を取り消すことができます。同意撤回書を出していただくか、下の連絡先に研究用の番号を知らせてください。その方の回答を分析から除き、削除します。ただし、【論文の分析を始める 2027年2月1日】より後は、すでに集計した結果から取り除けないことがあります。")]),
  li("途中でやめた場合、同意を撤回しない限り、それまでの回答は上に書いたとおり研究に使います。"),
  h2("5. 起こりうる負担"),
  p("毎日約1分の回答が負担になることがあります。また、質問によって推し活や気分について考えることで、気持ちが揺れることがあります。その場合は休んでかまいません。最後の調査で WHO-5（気分の尺度）の点数がとても低いときは、アプリの画面で相談先をご案内します。"),
  h2("6. 連絡すること"),
  p("記録が続かないときに、登録したメールアドレスに1回だけお知らせを送ることがあります。LINE のお知らせ（研究者の LINE 公式アカウント）は、友だち追加した方にだけ届きます（任意）。"),
  h2("7. 問い合わせ先"),
  p(WHO), p("メール：m1m02530106@oit.ac.jp　場所：2棟6階 263研究室"),
];

// ---------------------------------------------------------------- 2. 同意書（研究者が保管）
const consent = [
  br(), h1("同意書"),
  p("大阪工業大学大学院 情報科学研究科 メディアインタラクション研究室　今井 元 宛", { after: 160 }),
  p(`私は、研究「${STUDY}」について、説明書を受け取り、次のことについて説明を受け、理解しました。`, { after: 120 }),
  check("研究の目的と、していただくこと（約28日間、毎日約1分、4日ごとの振り返り、最初と最後の研究室での回答）"),
  check("集めるデータと、その扱い（名前は回答と一緒に保存しないこと、研究者だけが見ること、集計した形で発表すること）"),
  check("提案の文を作るために、点数・性格・推しの名前などを AI（OpenAI または Google）に送ること"),
  check("参加は自由で、いつでもやめられ、やめても不利益がないこと"),
  check("同意を撤回できること、その方法と期限"),
  check("起こりうる負担と、相談先があること"),
  check("記録が続かないときに、メールで1回お知らせが届くことがあること"),
  p("以上を理解したうえで、自分の意思でこの研究に参加することに同意します。", { before: 160, after: 200, bold: true }),
  table([["同意した日", "　　　　年　　　月　　　日"], ["参加者の署名", ""], ["説明した人の署名", ""]], [2600, CONTENT_W - 2600]),
  ...blank(1),
  p("── 以下は研究者が記入 ──", { align: AlignmentType.CENTER, color: "5A6676", before: 120 }),
  table([["研究用の番号（9桁）", ""], ["参加コードを渡した日", "　　　　年　　　月　　　日"], ["最後の調査（研究室）", "　　　　年　　　月　　　日　　　□ 研究室　□ アプリ"]], [2600, CONTENT_W - 2600]),
  p("研究用の番号は、同意を撤回したときにその方の回答を消すためだけに使います。この同意書は回答のデータとは別に保管します。", { size: 18, color: "5A6676", before: 80 }),
];

// ---------------------------------------------------------------- 3. 同意撤回書
const withdraw = [
  br(), h1("同意撤回書"),
  p("大阪工業大学大学院 情報科学研究科 メディアインタラクション研究室　今井 元 宛", { after: 160 }),
  p(`私は、研究「${STUDY}」への参加について同意しましたが、その同意を撤回します。`),
  p("これまでの私の回答を、分析から除き、削除してください。", { after: 200 }),
  table([["撤回する日", "　　　　年　　　月　　　日"], ["研究用の番号（9桁）", "（マイページに出ている番号。分からなければ空欄で大丈夫です）"], ["参加者の署名", ""]], [2600, CONTENT_W - 2600]),
  ...blank(1),
  p("この用紙を研究室に持ってきていただくか、写真をメール（m1m02530106@oit.ac.jp）で送ってください。メールの本文に「同意を撤回します」と研究用の番号を書いていただくだけでもかまいません。", { size: 19 }),
  p("撤回しても、不利益は一切ありません。", { size: 19, bold: true }),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "・", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } }, run: { font: FONT } } }] }] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 16, children: ["OshiFit 本実験　", PageNumber.CURRENT] })] })] }) },
    children: [...explain, ...consent, ...withdraw],
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("saved", OUT); });
