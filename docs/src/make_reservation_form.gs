/**
 * OshiFit 本実験：研究室に来ていただく日時の予約フォームを作る（Google Apps Script）
 * 使い方：
 *  1. https://script.google.com/ を開き「新しいプロジェクト」
 *  2. この中身を全部貼り付け、下の PLACE と SLOTS を書き換える
 *  3. 上の「実行」（関数 makeForm）→ 初回は権限の確認が出るので許可する
 *  4. 下の「実行ログ」に、回答用 URL（参加者に送る）と編集用 URL が出る
 * 予約で集める名前とメールアドレスは、日時の連絡のためだけに使い、研究の回答とは別に保管し、研究が終わったら消す。
 */
const PLACE = '大阪工業大学 2棟6階 263研究室（メディアインタラクション研究室）';
const SLOTS = ['10:00〜', '11:00〜', '13:00〜', '14:00〜', '15:00〜', '16:00〜', '17:00〜'];   // 研究室に来ていただける時間帯

function makeForm() {
  const form = FormApp.create('OshiFit（推し活の研究）参加の予約');
  form.setDescription(
    '推し活を「長く楽しく続ける」ためのアプリ OshiFit の研究に参加していただける方の、研究室に来ていただく日時の予約です。\n\n' +
    '■ 当日すること（約25分）\n研究の説明を聞いて同意書に署名したあと、ご自分のスマートフォンで最初の質問とアバター作りをします。お菓子と飲み物をお渡しします。\n\n' +
    '■ その後\n約28日間、毎日のアンケート（約1分）と、4日ごとの振り返り（全6回、各約1分）に答えます。最後にもう一度研究室で最後の調査（約20分）に答えていただきます。\n\n' +
    '■ 場所\n' + PLACE + '\n\n' +
    '■ 受付期間\n2026年11月23日（月）〜2027年1月20日（水）\n\n' +
    'ご希望の日時を受け取ったら、メールで日時を確定してご連絡します。ここで伺う名前とメールアドレスは、日時の連絡のためだけに使い、研究の回答とは別に保管します。');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage('予約を受け付けました。日時を確定して、メールでご連絡します。ありがとうございます！');

  form.addTextItem().setTitle('お名前（ニックネーム可）').setRequired(true);
  const mail = form.addTextItem().setTitle('連絡先メールアドレス').setHelpText('日時の確定のご連絡に使います').setRequired(true);
  mail.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('メールアドレスの形で入力してください').build());

  form.addCheckboxItem().setTitle('参加の条件').setHelpText('当てはまるものすべてに✓をつけてください')
    .setChoiceValues(['18歳以上です', '推し（ジャンルは問いません）がいます', 'スマートフォンを持って来られます'])
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtLeast(3).setHelpText('3つすべてに当てはまる方が対象です').build())
    .setRequired(true);

  for (const [n, req] of [['第1希望', true], ['第2希望', false], ['第3希望', false]]) {
    form.addDateItem().setTitle(n + '：日にち').setRequired(req);
    form.addListItem().setTitle(n + '：時間').setChoiceValues(SLOTS).setRequired(req);
  }
  form.addParagraphTextItem().setTitle('質問や、ご都合についてのメモ（任意）');

  const ss = SpreadsheetApp.create('OshiFit 参加の予約（回答）');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('回答用 URL（参加者に送る）：' + form.getPublishedUrl());
  Logger.log('短い URL：' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('編集用 URL：' + form.getEditUrl());
  Logger.log('回答のスプレッドシート：' + ss.getUrl());
}
