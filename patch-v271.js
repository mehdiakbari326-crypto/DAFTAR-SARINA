/* patch-v271: healthDashboard آزاد→آماده, reward labels, reset sync flag, extra themes */
(function(){
  // 1) Fix main-page healthDashboard "آزاد" → "آماده"
  if(typeof healthDashboard==='function'){
    healthDashboard=function(){
      var items=typeof getHealthItems==='function'?getHealthItems():(S.healthItems||[]);
      if(!items.length) return '';
      var h='<section class="card"><div class="card-h"><h2>🥗 سلامتی</h2></div><div class="health-row">';
      items.forEach(function(it){
        var left=typeof daysUntilHealth==='function'?daysUntilHealth(it):0;
        var avail=left===0;
        var cd=it.cooldownDays||7;
        var cls=avail?'ok':(left<=3?'soon':(left<=10?'mid':''));
        h+='<div class="health-chip '+cls+'">';
        h+='<span class="h-emoji">'+(it.emoji||'🍱')+'</span>';
        h+='<span class="h-title">'+esc(it.title||'')+'</span>';
        if(avail){
          h+='<span class="h-days">🎁 آماده</span>';
          h+='<span class="h-title" style="font-size:10px">هر '+fa(cd)+' روز</span>';
        }else if(left<=3){
          h+='<span class="h-days">⚡ '+fa(left)+' روز</span>';
        }else{
          h+='<span class="h-days">'+fa(left)+' روز مانده</span>';
        }
        h+='</div>';
      });
      return h+'</div></section>';
    };
  }

  // 2) Also patch fancyHealthStrip if present
  if(typeof fancyHealthStrip==='function'){
    var _fhs=fancyHealthStrip;
    fancyHealthStrip=function(){
      var html=_fhs();
      return String(html||'').replace(/آزاد/g,'آماده');
    };
  }

  // 3) Reward icon labels in settings picker
  var LABELS={'🎡':'شهربازی','🎬':'سینما','🌳':'پارک','🛒':'خرید','🚶':'گردش','🎮':'بازی','🍕':'پیتزا','🧸':'عروسک','🏊':'استخر','🎨':'نقاشی','📚':'کتاب','🍦':'بستنی','⚽':'ورزش','🧁':'شیرینی','🎁':'هدیه'};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      try{
        document.querySelectorAll('#rewEmojiPick button').forEach(function(b){
          var e=b.getAttribute('data-e');
          if(e&&LABELS[e]&&!b.getAttribute('title')) b.setAttribute('title', LABELS[e]);
        });
      }catch(e){}
    },800);
  });

  // 4) Extra themes
  try{
    var EXTRA=[
      {id:'sky',name:'آسمان',icon:'☁️'},
      {id:'peach',name:'هلو',icon:'🍑'},
      {id:'berry',name:'توت',icon:'🫐'}
    ];
    if(typeof THEMES!=='undefined'&&Array.isArray(THEMES)){
      EXTRA.forEach(function(t){ if(!THEMES.some(function(x){return x.id===t.id})) THEMES.push(t); });
    }
    var st=document.createElement('style');
    st.textContent=[
      '[data-theme="sky"]{--bg:#F0F7FF;--ink:#1E3A5F;--muted:#6B8AAD;--line:#D6E8FF;--accent:#38BDF8;--accent-soft:#E0F2FE;--accent-deep:#0284C7;--hero:linear-gradient(145deg,#38BDF8,#7DD3FC 40%,#BAE6FD)}',
      '[data-theme="peach"]{--bg:#FFF5F0;--ink:#5C2C1E;--muted:#B07A68;--line:#FFE0D4;--accent:#FB7185;--accent-soft:#FFE4E6;--accent-deep:#E11D48;--hero:linear-gradient(145deg,#FB7185,#FDA4AF 40%,#FECACA)}',
      '[data-theme="berry"]{--bg:#FDF4FF;--ink:#4A1D5C;--muted:#9B7AB0;--line:#F0D4FF;--accent:#C026D3;--accent-soft:#FAE8FF;--accent-deep:#A21CAF;--hero:linear-gradient(145deg,#C026D3,#E879F9 40%,#F0ABFC)}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  // 5) When full activity reset, stamp _daysResetAt so other devices wipe days
  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    if(t.getAttribute('data-act')==='reset-all-2'){
      setTimeout(function(){
        try{
          S._daysResetAt=S._daysResetAt||{};
          S._daysResetAt._all=Date.now();
          if(typeof saveProfile==='function') saveProfile();
        }catch(err){}
      },50);
    }
    if(t.getAttribute('data-act')==='reset-today'){
      setTimeout(function(){
        try{
          var k=typeof todayKey==='function'?todayKey():'';
          if(!k) return;
          S._daysResetAt=S._daysResetAt||{};
          S._daysResetAt[k]=Date.now();
          if(S.days&&S.days[k]) S.days[k]._reset=Date.now();
          if(typeof saveProfile==='function') saveProfile();
        }catch(err){}
      },50);
    }
  }, true);

  console.log('patch-v271: آماده + labels + reset flag');
})();
