/* Weight tracking: daily log, parent approve, kid chart, interpolate, weekly trend */
(function(){
  try{
    var st=document.createElement('style');
    st.textContent=[
      '.weight-card{background:linear-gradient(165deg,#E0F2FE 0%,#F3E8FF 45%,#FCE7F3 100%);border:2px solid #C4B5FD;border-radius:24px;padding:16px;box-shadow:0 10px 28px rgba(147,197,253,.25);display:grid;gap:12px}',
      '.weight-card h2{margin:0;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;color:#5B21B6}',
      '.weight-form{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}',
      '.weight-form input{min-height:48px;border:2px solid #DDD6FE;border-radius:16px;padding:8px 14px;background:#fff;font-size:18px;font-weight:800;text-align:center;color:#6B3FBF}',
      '.weight-form .btn{min-height:48px;border-radius:16px;padding:8px 18px;font-weight:800;background:linear-gradient(135deg,#8B5CF6,#EC4899);color:#fff}',
      '.weight-today{text-align:center;font-size:13px;font-weight:700;color:#7C3AED}',
      '.weight-today b{font-size:22px;color:#6B21A8}',
      '.weight-trend{border-radius:16px;padding:10px 14px;font-weight:700;font-size:13.5px;text-align:center}',
      '.weight-trend.down{background:#D1FAE5;color:#047857;border:2px solid #6EE7B7}',
      '.weight-trend.up{background:#FEF3C7;color:#B45309;border:2px solid #FCD34D}',
      '.weight-trend.same{background:#EDE9FE;color:#5B21B6;border:2px solid #C4B5FD}',
      '.weight-chart-wrap{background:#fff;border-radius:20px;padding:12px 8px 8px;border:2px solid #E9D5FF;overflow:hidden}',
      '.weight-chart-wrap svg{width:100%;height:180px;display:block}',
      '.weight-legend{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-size:11px;font-weight:700;color:#7C3AED}',
      '.weight-legend span{display:inline-flex;align-items:center;gap:4px}',
      '.weight-dot{width:10px;height:10px;border-radius:50%;background:#A78BFA;display:inline-block}',
      '.weight-dot.interp{background:#F9A8D4;border:2px dashed #EC4899}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function getWeight(k){
    var d=getDay(k);
    var w=d&&d.weight;
    if(w==null||w==='')return null;
    w=parseFloat(w);
    return isNaN(w)?null:w;
  }

  function setWeightDirect(k,w){
    w=Math.round(parseFloat(w)*10)/10;
    if(isNaN(w)||w<=0||w>200)return false;
    var d=JSON.parse(JSON.stringify(getDay(k)));
    d.weight=w;
    S.days[k]=d;
    saveProfile();
    return true;
  }

  function submitWeight(w){
    w=parseFloat(String(w).replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}).replace(/[٠-٩]/g,function(c){return String(c.charCodeAt(0)-1632)}).replace(/,/g,'.'));
    if(isNaN(w)||w<5||w>150){
      showToast('وزن را درست وارد کن (مثلاً ۲۵.۵)');
      return;
    }
    w=Math.round(w*10)/10;
    var k=todayKey();
    if(isParent||deviceRole==='parent'){
      if(setWeightDirect(k,w)){
        showToast('وزن امروز ثبت شد: '+w+' کیلو ⚖️');
        render();
      }
      return;
    }
    // child → pending approval
    if(typeof addPending==='function'){
      addPending('weight',{k:k,w:w},'وزن امروز: '+w+' کیلو');
      showToast('درخواست وزن برای والدین ارسال شد 🔔');
      render();
    }
  }

  /* series for last N days: {k, w, real} real=false if interpolated */
  function weightSeries(n){
    n=n||14;
    var keys=[];
    for(var i=n-1;i>=0;i--) keys.push(addDays(todayKey(),-i));
    var raw=keys.map(function(k){return {k:k,w:getWeight(k)}});
    // find known points
    var known=[];
    raw.forEach(function(p,i){if(p.w!=null) known.push({i:i,w:p.w})});
    if(!known.length) return raw.map(function(p){return {k:p.k,w:null,real:false}});

    var out=[];
    for(var i=0;i<raw.length;i++){
      if(raw[i].w!=null){
        out.push({k:raw[i].k,w:raw[i].w,real:true});
        continue;
      }
      // interpolate between nearest known left/right
      var left=null,right=null;
      for(var a=known.length-1;a>=0;a--){if(known[a].i<i){left=known[a];break}}
      for(var b=0;b<known.length;b++){if(known[b].i>i){right=known[b];break}}
      var val=null;
      if(left&&right){
        var t=(i-left.i)/(right.i-left.i);
        val=left.w+(right.w-left.w)*t;
      }else if(left){
        val=left.w; // hold last
      }else if(right){
        val=right.w;
      }
      out.push({k:raw[i].k,w:val==null?null:Math.round(val*10)/10,real:false});
    }
    return out;
  }

  function weekTrendMsg(){
    // compare average of last 3 days with previous 3 days (using real weights only)
    var recent=[],prev=[];
    for(var i=0;i<3;i++){
      var w1=getWeight(addDays(todayKey(),-i));
      var w2=getWeight(addDays(todayKey(),-(i+3)));
      if(w1!=null) recent.push(w1);
      if(w2!=null) prev.push(w2);
    }
    if(recent.length<1||prev.length<1){
      return {cls:'same',text:'⚖️ هنوز دادهٔ کافی برای روند هفتگی نیست. هر روز وزن را ثبت کن!'};
    }
    var avg=function(a){return a.reduce(function(x,y){return x+y},0)/a.length};
    var r=avg(recent),p=avg(prev);
    var diff=Math.round((r-p)*10)/10;
    if(diff<=-0.2){
      return {cls:'down',text:'🌟 آفرین سارینا! روند وزنت این هفته کاهشی بوده ('+fa(Math.abs(diff))+' کیلو کمتر). عالی پیش میری!'};
    }
    if(diff>=0.2){
      return {cls:'up',text:'💜 سارینا جان، روند وزن این هفته کمی افزایشی بوده (+'+fa(diff)+' کیلو). با هم مواظب خوراکی‌ها می‌شیم!'};
    }
    return {cls:'same',text:'✨ وزن این هفته تقریباً ثابت مانده. چه تعادل قشنگی!'};
  }

  function buildChart(series){
    var pts=series.filter(function(p){return p.w!=null});
    if(pts.length<1){
      return '<div style="text-align:center;padding:24px"><div style="font-size:40px">🦄</div><p class="muted">هنوز وزنی ثبت نشده. اولین وزن را وارد کن!</p></div>';
    }
    var ws=pts.map(function(p){return p.w});
    var minW=Math.min.apply(null,ws);
    var maxW=Math.max.apply(null,ws);
    if(maxW===minW){minW-=0.5;maxW+=0.5}
    var pad=Math.max(0.3,(maxW-minW)*0.15);
    minW-=pad;maxW+=pad;

    var W=320,H=180,L=28,R=12,T=16,B=28;
    var iw=W-L-R, ih=H-T-B;
    var n=series.length;

    function xAt(i){return L+(n<=1?iw/2:(i/(n-1))*iw)}
    function yAt(w){return T+ih-((w-minW)/(maxW-minW))*ih}

    // path
    var d='';
    series.forEach(function(p,i){
      if(p.w==null)return;
      var x=xAt(i),y=yAt(p.w);
      d+=(d?' L ':'M ')+x.toFixed(1)+' '+y.toFixed(1);
    });

    // area under curve
    var area='';
    var first=true,lastX=L;
    series.forEach(function(p,i){
      if(p.w==null)return;
      var x=xAt(i),y=yAt(p.w);
      if(first){area='M '+x.toFixed(1)+' '+(T+ih)+' L '+x.toFixed(1)+' '+y.toFixed(1);first=false}
      else area+=' L '+x.toFixed(1)+' '+y.toFixed(1);
      lastX=x;
    });
    if(!first) area+=' L '+lastX.toFixed(1)+' '+(T+ih)+' Z';

    var svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">';
    // soft grid
    for(var g=0;g<4;g++){
      var gy=T+(ih/3)*g;
      svg+='<line x1="'+L+'" y1="'+gy+'" x2="'+(W-R)+'" y2="'+gy+'" stroke="#EDE9FE" stroke-width="1"/>';
    }
    // gradient area
    svg+='<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">';
    svg+='<stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.55"/>';
    svg+='<stop offset="100%" stop-color="#FBCFE8" stop-opacity="0.05"/>';
    svg+='</linearGradient></defs>';
    if(area) svg+='<path d="'+area+'" fill="url(#wg)"/>';
    // line
    if(d) svg+='<path d="'+d+'" fill="none" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    // points
    series.forEach(function(p,i){
      if(p.w==null)return;
      var x=xAt(i),y=yAt(p.w);
      if(p.real){
        svg+='<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="#A78BFA" stroke="#fff" stroke-width="2"/>';
        svg+='<text x="'+x+'" y="'+(y-10)+'" text-anchor="middle" font-size="9" font-weight="700" fill="#6B21A8">'+p.w+'</text>';
      }else{
        svg+='<circle cx="'+x+'" cy="'+y+'" r="4" fill="#F9A8D4" stroke="#EC4899" stroke-width="1.5" stroke-dasharray="2 1"/>';
      }
    });
    // x labels: first, mid, last
    [0,Math.floor((n-1)/2),n-1].forEach(function(i){
      if(i<0||i>=n)return;
      var label=series[i].k.slice(5); // MM-DD
      svg+='<text x="'+xAt(i)+'" y="'+(H-6)+'" text-anchor="middle" font-size="9" fill="#7C3AED">'+label+'</text>';
    });
    svg+='</svg>';
    return svg;
  }

  function weightPanel(){
    var k=todayKey();
    var todayW=getWeight(k);
    var series=weightSeries(14);
    var trend=weekTrendMsg();
    var h='<section class="weight-card">';
    h+='<h2>⚖️ وزن سارینا</h2>';
    if(todayW!=null){
      h+='<div class="weight-today">امروز: <b>'+fa(todayW)+'</b> کیلوگرم</div>';
    }else{
      h+='<div class="weight-today">امروز هنوز وزن ثبت نشده</div>';
    }
    h+='<form class="weight-form" id="weightForm">';
    h+='<input id="weightIn" type="text" inputmode="decimal" placeholder="مثلاً ۲۵.۵" value="'+(todayW!=null?todayW:'')+'">';
    h+='<button class="btn" type="submit">ثبت</button>';
    h+='</form>';
    if(!isParent&&deviceRole!=='parent'){
      h+='<p class="muted" style="margin:0;text-align:center;font-size:12px">بعد از ثبت، والدین باید تأیید کنند 💜</p>';
    }
    h+='<div class="weight-trend '+trend.cls+'">'+trend.text+'</div>';
    h+='<div class="weight-chart-wrap">'+buildChart(series)+'</div>';
    h+='<div class="weight-legend">';
    h+='<span><i class="weight-dot"></i> ثبت‌شده</span>';
    h+='<span><i class="weight-dot interp"></i> روزهای بدون داده (تقریبی)</span>';
    h+='</div></section>';
    return h;
  }

  // inject into health view and today view
  var _healthView=typeof healthView==='function'?healthView:null;
  if(_healthView){
    healthView=function(){
      return weightPanel()+_healthView();
    };
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    var prevToday=todayView;
    todayView=function(){
      var html=prevToday();
      // add compact weight entry near end before prizes if not present
      if(html.indexOf('weight-card')<0){
        // keep full panel mainly on health; on today show mini
        var k=todayKey();
        var tw=getWeight(k);
        var mini='<section class="weight-card" style="padding:12px">';
        mini+='<h2>⚖️ وزن امروز</h2>';
        mini+='<form class="weight-form" id="weightFormToday">';
        mini+='<input id="weightInToday" type="text" inputmode="decimal" placeholder="کیلوگرم" value="'+(tw!=null?tw:'')+'">';
        mini+='<button class="btn" type="submit">ثبت</button></form>';
        mini+='<p class="muted" style="margin:0;text-align:center;font-size:12px">نمودار کامل در تب 🥗 سلامتی</p></section>';
        if(html.indexOf('prizes-card')>=0){
          html=html.replace('<section class="card prizes-card">', mini+'<section class="card prizes-card">');
        }else{
          html+=mini;
        }
      }
      return html;
    };
  }

  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form.id==='weightForm'||form.id==='weightFormToday'){
      e.preventDefault();
      e.stopPropagation();
      var id=form.id==='weightForm'?'weightIn':'weightInToday';
      var el=document.getElementById(id);
      submitWeight(el&&el.value);
    }
  },true);

  console.log('weight.js loaded');
})();
