// OshiFit 提案の一覧（初期値）。アプリ（index.html）・開発者ページ（admin.html）・分析（analysis/common.py）が同じものを読む。
// Firestore の plans/{id} に同じ id の文書があれば、その項目で上書きする（題名・やり方・効果の値など）。active:false で出さなくなる。
// 題名・やり方は倫理委員会で承認済み。変えるときは必ず今井が確認する。
window.OSHIFIT_PLANS=[
 {id:"sns23",axis:"sleep",title:"寝る30分前からSNSはお休みモード",how:"寝る時刻を決め、その30分前に通知をオフにして、スマホを手の届かない所に置く。夜に出た推しの投稿は翌朝まとめて見る",eff:16,trait:null}, // idは集計の互換のため sns23 のまま（旧：SNSは23時まで）
 {id:"archive",axis:"sleep",title:"リアタイは週2回まで、ほかはアーカイブで",how:"見逃しは翌日の決めた時間に見る",eff:12,trait:"C"},
 {id:"budget",axis:"money",title:"今月のグッズ予算を先に決める",how:"予算を決め、超えたら翌月に回す",eff:16,trait:"C"},
 {id:"declutter",axis:"money",title:"グッズを棚卸しして、使わないものをフリマで次のファンへ",how:"月に1回、1年以上飾っていない・使っていないグッズを選び、フリマアプリで出品する。売上は次の推し活の予算に回す",eff:12,trait:"O"},
 {id:"donate",axis:"wb",title:"使わないモノを寄付につなげる",how:"推しグッズはフリマで譲って売上の一部を寄付、本・CD・DVDは買取金額が寄付になるサービスへ、ぬいぐるみ・文具・おもちゃは寄付団体へ送る",eff:10,trait:"A"},
 {id:"oneday",axis:"money",title:"欲しいグッズは1日おいてから決める",how:"カートに入れて24時間後にもう一度見る",eff:12,trait:"N"},
 {id:"choose3",axis:"duty",title:"次の振り返りまでに追う推しの予定を3つまでに絞る",how:"推しの予定（配信・イベント・発売日など）を書き出し、追うものを3つまで選ぶ。残りは「今回は見送る」と決め、通知が来たら「リストにないから見送る」と自分に言う",eff:15,trait:null,multi:true}, // 推しが2人・2組以上（Q5b）で、義務感・人間関係が60点未満の人だけに出す
 {id:"skipok",axis:"duty",title:"「行かない回」を1つ決めておく",how:"遠征やイベントは無理のない回だけ選ぶ",eff:12,trait:"C"},
 {id:"mute",axis:"compare",title:"「当選」「〇〇円分」などの言葉に反応しない練習をする",how:"SNSでこうした言葉を見かけたら、ほかの人と比べる前にいったん画面を閉じ、ひと呼吸おいて「自分は自分の推し活」と心の中で言う",eff:15,trait:"N"},
 {id:"snsonce",axis:"compare",title:"SNSを見るのは1日2回・各15分まで",how:"見る時間を決め、それ以外は通知オフ",eff:12,trait:"E-"},
 {id:"party",axis:"joy",title:"友達と同時視聴の日をつくる",how:"週末に1回、感想を話しながら見る",eff:12,trait:"E"},
 {id:"create",axis:"joy",title:"感想メモや創作で推しを残す",how:"視聴後に3行の感想、または絵・文章",eff:12,trait:"O"},
 {id:"calm",axis:"joy",title:"寝る前15分は推しの曲だけの時間",how:"画面を見ずに音楽だけで過ごす",eff:10,trait:"A"},
 {id:"event",axis:"joy",title:"行きたいイベントを1つ予定に入れる",how:"1か月以内に行けるイベントを1つ選び、日程と予算を先に決めておく",eff:12,trait:"E"},
 {id:"good3",axis:"wb",title:"推しのおかげで良かったことを3つ書く",how:"週に2回、寝る前に推しに関する良かったことを3つメモする",eff:10,trait:null},
];
