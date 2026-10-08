// Renders OshiFit app screen mockups (HTML -> PNG via Chromium).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const A = __dirname + '/assets/';
const img = n => 'data:image/png;base64,' + fs.readFileSync(A + n + '.png').toString('base64');

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'IPAPGothic','IPAGothic',Arial,sans-serif;background:transparent;width:380px;height:640px}
.phone{position:absolute;left:6px;top:6px;width:368px;height:628px;border-radius:44px;background:#1E2430;padding:12px}
.scr{width:344px;height:604px;border-radius:34px;background:#F4F8FC;overflow:hidden;position:relative}
.notch{position:absolute;left:122px;top:0;width:100px;height:22px;background:#1E2430;border-radius:0 0 14px 14px}
.bar{height:62px;padding:30px 18px 0;font-size:13px;color:#0B3C6E;font-weight:bold;display:flex;justify-content:space-between}
.bar .logo{color:#E8457C}
h1{font-size:20px;color:#0B3C6E;padding:6px 18px 4px}
.sub{font-size:12px;color:#5A6676;padding:0 18px 10px}
.card{background:#fff;margin:8px 14px;border-radius:16px;padding:12px 14px;box-shadow:0 2px 8px rgba(11,60,110,.08)}
.row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#24303F;margin:6px 0}
.chips{display:flex;gap:5px}
.chip{border:1.5px solid #B9D6F2;border-radius:12px;padding:3px 8px;font-size:12px;color:#0B3C6E;background:#fff}
.chip.on{background:#0099FF;border-color:#0099FF;color:#fff}
.btn{margin:12px 14px;border-radius:14px;background:#E8457C;color:#fff;text-align:center;padding:12px;font-size:15px;font-weight:bold}
.btn2{margin:8px 14px;border-radius:14px;background:#fff;color:#0B3C6E;border:1.5px solid #0B3C6E;text-align:center;padding:10px;font-size:14px;font-weight:bold}
.prog{height:6px;background:#DCE8F4;border-radius:3px;margin:0 18px 6px}
.prog>div{height:6px;background:#0099FF;border-radius:3px}
.scale{display:flex;justify-content:space-between;margin:10px 0 2px}
.scale span{width:34px;height:34px;border-radius:17px;border:2px solid #B9D6F2;display:flex;align-items:center;justify-content:center;font-size:13px;color:#0B3C6E}
.scale span.on{background:#0099FF;color:#fff;border-color:#0099FF}
.lbl{display:flex;justify-content:space-between;font-size:10.5px;color:#7A8594}
.slider{height:8px;background:#DCE8F4;border-radius:4px;position:relative;margin:8px 0}
.slider>i{position:absolute;left:0;top:0;height:8px;border-radius:4px;background:#0099FF}
.slider>b{position:absolute;top:-5px;width:18px;height:18px;border-radius:9px;background:#fff;border:3px solid #0099FF}
.stars{color:#F5B300;font-size:15px;letter-spacing:1px}
.pc{border-radius:16px;margin:8px 14px;padding:10px 12px;background:#fff;border:2px solid #E3EAF2}
.pc.sel{border-color:#12A38A;background:#F0FBF8}
.pc .t{font-size:14px;font-weight:bold;color:#0B3C6E}
.pc .d{font-size:12px;color:#3C4756;margin:4px 0}
.pc .m{display:flex;gap:6px;font-size:11px}
.tag{border-radius:8px;padding:2px 6px;font-weight:bold}
.up{background:#E3F6F2;color:#0C7A67}.dn{background:#FDEBDD;color:#B4600F}
.wish{margin:0 14px;background:#FFF0F5;border-radius:12px;padding:8px 10px;font-size:11.5px;color:#9A2350}
.split{display:flex;gap:8px;margin:4px 10px}
.col{flex:1;border-radius:16px;padding:8px 6px 10px;text-align:center}
.colA{background:#FFF4E8;border:2px solid #F7C08A}.colB{background:#E9F8F4;border:2px solid #8ED8C8}
.col h3{font-size:13px}.colA h3{color:#B4600F}.colB h3{color:#0C7A67}
.col img{width:150px;margin:2px 0}
.val{font-size:11px;color:#3C4756;text-align:left;padding:0 4px;margin-top:3px}
.val b{font-size:15px}
.dots{display:flex;flex-wrap:wrap;gap:2px;width:120px;margin:4px auto 0}
.dots i{width:9px;height:9px;border-radius:5px;display:block}
.note{font-size:10.5px;color:#5A6676;margin:8px 14px;line-height:1.45}
.res{margin:6px 14px;background:#fff;border-radius:12px;padding:8px 10px;font-size:11.5px;color:#0B3C6E}
.res .slider{margin:6px 0 0}
.facet{display:flex;gap:4px;justify-content:center;margin-top:5px}
.facet span{font-size:10px;border-radius:8px;padding:2px 5px;background:#fff;color:#B4600F;border:1px solid #F7C08A}
.circle{width:180px;height:180px;border-radius:90px;margin:8px auto;background:#E6F4FF;border:3px dashed #0099FF;overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.circle img{width:170px}
.priv{margin:4px 14px;background:#E6F4FF;border-radius:12px;padding:9px 11px;font-size:11.5px;color:#0B3C6E;line-height:1.5}
.tl{display:flex;gap:6px;margin:8px 14px;flex-wrap:wrap}
`;
function dots(n, colOn, colOff, k) { let s = '<div class="dots">'; for (let i = 0; i < n; i++) s += `<i style="background:${i < k ? colOn : colOff}"></i>`; return s + '</div>'; }
const T = {
  ja: {
    tipi: `<div class="bar"><span class="logo">OshiFit</span><span>3 / 10</span></div><div class="prog"><div style="width:30%"></div></div>
      <h1>あなたについて</h1><div class="sub">TIPI-J（10問・約1分）</div>
      <div class="card"><div style="font-size:15px;color:#0B3C6E;font-weight:bold;margin-bottom:4px">活発で、外向的だと思う</div>
      <div class="scale"><span>1</span><span>2</span><span>3</span><span>4</span><span class="on">5</span><span>6</span><span>7</span></div>
      <div class="lbl"><span>全く違うと思う</span><span>強くそう思う</span></div></div>
      <div class="card"><div style="font-size:15px;color:#0B3C6E;font-weight:bold;margin-bottom:4px">他人に不満をもち、もめごとを起こしやすい</div>
      <div class="scale"><span>1</span><span class="on">2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>
      <div class="lbl"><span>全く違うと思う</span><span>強くそう思う</span></div></div>
      <div class="card"><div class="row" style="font-weight:bold;color:#0B3C6E">増やしたい / 減らしたい推し活</div>
      <div class="row">ライブ・イベント<div class="chips"><span class="chip on">増やしたい</span><span class="chip">そのまま</span></div></div>
      <div class="row">SNS<div class="chips"><span class="chip">そのまま</span><span class="chip on">減らしたい</span></div></div></div>
      <div class="btn">つぎへ</div>`,
    avatar: `<div class="bar"><span class="logo">OshiFit</span><span>アバター作成</span></div>
      <h1>じぶんアバターをつくる</h1><div class="sub">あなたに似たアバターが「未来の見込み」を映します</div>
      <div class="circle"><img src="${img('av_neutral')}"></div>
      <div class="priv">🔒 写真は<b>この端末の中だけ</b>で処理し、アバターができたらすぐに削除します。サーバーには送信しません。</div>
      <div class="card"><div class="row" style="font-weight:bold;color:#0B3C6E">自動で推定したパーツ</div>
      <div class="tl"><span class="chip on">髪型：ボブ</span><span class="chip on">髪色：ダーク</span><span class="chip on">顔型：丸</span><span class="chip">眼鏡：なし</span><span class="chip on">推し色：ピンク</span></div></div>
      <div class="btn">写真から作る</div><div class="btn2">写真を使わずパーツで作る</div>`,
    log: `<div class="bar"><span class="logo">OshiFit</span><span>11/18（水）</span></div>
      <h1>今日の推し活</h1><div class="sub">約30秒・1日1回</div>
      <div class="card"><div class="row">ライブ・イベント<div class="chips"><span class="chip on">なし</span><span class="chip">参加</span><span class="chip">配信</span></div></div>
      <div class="row">グッズ・支出<div class="chips"><span class="chip">0円</span><span class="chip on">〜3千</span><span class="chip">それ以上</span></div></div>
      <div class="row">配信・動画<b style="color:#0099FF">1.5 時間</b></div><div class="slider"><i style="width:38%"></i><b style="left:34%"></b></div>
      <div class="row">SNS<b style="color:#0099FF">3.0 時間</b></div><div class="slider"><i style="width:70%"></i><b style="left:66%"></b></div></div>
      <div class="card"><div class="row">楽しさ<span class="stars">★★★★☆</span></div><div class="row">疲れ<span class="stars">★★★☆☆</span></div>
      <div class="row">睡眠への影響<div class="chips"><span class="chip">なし</span><span class="chip on">少し</span><span class="chip">大きい</span></div></div>
      <div class="row">いちばんの疲れ<div class="chips"><span class="chip on">睡眠</span><span class="chip">出費</span><span class="chip">義務感</span><span class="chip">比較</span></div></div></div>
      <div class="btn">記録する</div>
      <div class="res">未来の解像度 <b>62%</b>（記録8日目）<div class="slider"><i style="width:62%;background:#12A38A"></i></div></div>`,
    propose: `<div class="bar"><span class="logo">OshiFit</span><span>今週の提案</span></div>
      <h1>どれを試してみる？</h1>
      <div class="wish">あなたの希望：<b>ライブは増やしたい</b>／<b>SNSは減らしたい</b></div>
      <div class="pc"><div class="t">① 楽しさキープ型</div><div class="d">夜のSNSを1時間短くして、配信は週末にまとめて見る</div>
      <div class="m"><span class="tag up">充実 ±0</span><span class="tag up">推し疲れ −0.4</span></div></div>
      <div class="pc sel"><div class="t">② バランス型 ✓</div><div class="d">グッズは月1回の「まとめ買い日」に。浮いた分をライブ遠征へ</div>
      <div class="m"><span class="tag up">充実 +0.2</span><span class="tag up">推し疲れ −0.2</span></div></div>
      <div class="pc"><div class="t">③ 回復重視型</div><div class="d">24時以降はSNSオフ。睡眠を1時間ふやす</div>
      <div class="m"><span class="tag dn">充実 −0.2</span><span class="tag up">推し疲れ −0.7</span></div></div>
      <div class="note">※ 数値は予測の見込みで、効果を保証するものではありません。<br>※ 選ばない（今週は見送る）こともできます。</div>
      <div class="btn">②で1週間やってみる</div>`,
    mirror: `<div class="bar"><span class="logo">OshiFit</span><span>みらいミラー</span></div>
      <h1>6週間後のあなた</h1><div class="sub">いまの記録から予測した「見込み」です</div>
      <div class="split">
       <div class="col colA"><h3>今のまま</h3><img src="${img('ghostA')}">
        <div class="val">充実 <b>3.6</b> <span>(3.0–4.2)</span></div><div class="val">推し疲れ <b>3.5</b> <span>(2.8–4.2)</span></div>
        ${dots(20, '#F08A24', '#F9D9B8', 10)}<div style="font-size:9.5px;color:#B4600F;margin-top:2px">20人中10人が「疲れ高め」</div>
        <div class="facet"><span>睡眠</span><span>比較</span></div></div>
       <div class="col colB"><h3>提案どおり</h3><img src="${img('ghostB')}">
        <div class="val">充実 <b>3.8</b> <span>(3.2–4.4)</span></div><div class="val">推し疲れ <b>3.3</b> <span>(2.6–4.0)</span></div>
        ${dots(20, '#12A38A', '#BFE8DF', 7)}<div style="font-size:9.5px;color:#0C7A67;margin-top:2px">20人中7人が「疲れ高め」</div>
        <div class="facet"><span style="color:#0C7A67;border-color:#8ED8C8">睡眠</span></div></div>
      </div>
      <div class="note">ぼやけて見えるのは、まだ予測に幅があるからです。<b>記録を続けるほど、未来のあなたはくっきりします。</b></div>
      <div class="res"><b>答え合わせ</b>　先週の見込み 推し疲れ 3.2 → 実際 3.1 <span style="color:#0C7A67">✓ 範囲内</span></div>`,
  },
  en: {
    log: `<div class="bar"><span class="logo">OshiFit</span><span>Wed, Nov 18</span></div>
      <h1>Today's oshi-katsu</h1><div class="sub">~30 sec, once a day</div>
      <div class="card"><div class="row">Live / events<div class="chips"><span class="chip on">None</span><span class="chip">Went</span><span class="chip">Stream</span></div></div>
      <div class="row">Goods spend<div class="chips"><span class="chip">¥0</span><span class="chip on">&lt;¥3k</span><span class="chip">More</span></div></div>
      <div class="row">Streams / videos<b style="color:#0099FF">1.5 h</b></div><div class="slider"><i style="width:38%"></i><b style="left:34%"></b></div>
      <div class="row">Social media<b style="color:#0099FF">3.0 h</b></div><div class="slider"><i style="width:70%"></i><b style="left:66%"></b></div></div>
      <div class="card"><div class="row">Joy<span class="stars">★★★★☆</span></div><div class="row">Fatigue<span class="stars">★★★☆☆</span></div>
      <div class="row">Main fatigue<div class="chips"><span class="chip on">Sleep</span><span class="chip">Money</span><span class="chip">Duty</span><span class="chip">Compare</span></div></div></div>
      <div class="btn">Save</div>
      <div class="res">Future-self resolution <b>62%</b> (day 8)<div class="slider"><i style="width:62%;background:#12A38A"></i></div></div>`,
    propose: `<div class="bar"><span class="logo">OshiFit</span><span>This week</span></div>
      <h1>Which one to try?</h1>
      <div class="wish">Your wish: <b>more live events</b> / <b>less social media</b></div>
      <div class="pc"><div class="t">① Keep-the-joy</div><div class="d">Cut late-night SNS by 1 h; batch-watch streams on weekends</div>
      <div class="m"><span class="tag up">Fulfil ±0</span><span class="tag up">Fatigue −0.4</span></div></div>
      <div class="pc sel"><div class="t">② Balanced ✓</div><div class="d">One "goods day" a month; move the savings to a live trip</div>
      <div class="m"><span class="tag up">Fulfil +0.2</span><span class="tag up">Fatigue −0.2</span></div></div>
      <div class="pc"><div class="t">③ Recovery-first</div><div class="d">SNS off after midnight; +1 h of sleep</div>
      <div class="m"><span class="tag dn">Fulfil −0.2</span><span class="tag up">Fatigue −0.7</span></div></div>
      <div class="note">Values are predicted estimates, not guarantees. You can also skip this week.</div>
      <div class="btn">Try ② for a week</div>`,
    mirror: `<div class="bar"><span class="logo">OshiFit</span><span>Future Mirror</span></div>
      <h1>You, in 6 weeks</h1><div class="sub">Estimates from your own logs</div>
      <div class="split">
       <div class="col colA"><h3>As is</h3><img src="${img('ghostA')}">
        <div class="val">Fulfil <b>3.6</b> <span>(3.0–4.2)</span></div><div class="val">Fatigue <b>3.5</b> <span>(2.8–4.2)</span></div>
        ${dots(20, '#F08A24', '#F9D9B8', 10)}<div style="font-size:9.5px;color:#B4600F;margin-top:2px">10 of 20 futures: high fatigue</div></div>
       <div class="col colB"><h3>With proposal</h3><img src="${img('ghostB')}">
        <div class="val">Fulfil <b>3.8</b> <span>(3.2–4.4)</span></div><div class="val">Fatigue <b>3.3</b> <span>(2.6–4.0)</span></div>
        ${dots(20, '#12A38A', '#BFE8DF', 7)}<div style="font-size:9.5px;color:#0C7A67;margin-top:2px">7 of 20 futures: high fatigue</div></div>
      </div>
      <div class="note">The blur shows how uncertain the forecast still is. <b>The more you log, the sharper your future self becomes.</b></div>
      <div class="res"><b>Check-in</b>　Last week's forecast: fatigue 3.2 → actual 3.1 <span style="color:#0C7A67">✓ within range</span></div>`,
  },
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 380, height: 640 }, deviceScaleFactor: 2.5 });
  for (const lang of Object.keys(T)) for (const [k, body] of Object.entries(T[lang])) {
    await p.setContent(`<html><head><style>${css}</style></head><body><div class="phone"><div class="scr"><div class="notch"></div>${body}</div></div></body></html>`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${A}mk_${lang}_${k}.png`, omitBackground: true });
  }
  await b.close(); console.log('mockups done');
})();
