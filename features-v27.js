/* features-v27: reward icons, activity reset, health labels, chart, themes */
(function(){
  var REWARD_ICONS=['🎁','🎡','🎬','🌳','🛒','🚶','🎮','🍕','🧸','🏊','🎨','📚','🍦','⚽','🧁','🏖️','🧩','🎀'];
  var EXTRA_THEMES=[
    {id:'candy',name:'آبنبات',icon:'🍬'},
    {id:'sunset',name:'غروب',icon:'🌅'},
    {id:'lavender',name:'لاوندر',icon:'💜'},
    {id:'mint',name:'نعنا',icon:'🍃'},
    {id:'rainbow',name:'رنگین‌کمان',icon:'🌈'}
  ];

  try{
    var st=document.createElement('style');
    st.id='features-v27-css';
    st.textContent=[
      '[data-theme="candy"]{--bg:#FFF5FB;--ink:#5B1A4A;--muted:#B07A9A;--line:#FFD6EC;--accent:#FF6BCB;--accent-soft:#FFE3F4;--accent-deep:#C43A8F;--hero:linear-gradient(145deg,#FF6BCB,#FF9AD5 45%,#FFD36E)}',
      '[data-theme="sunset"]{--bg:#FFF8F2;--ink:#4A2A1A;--muted:#B08968;--line:#FFE0C2;--accent:#FF8A3D;--accent-soft:#FFE8D6;--accent-deep:#D95A12;--hero:linear-gradient(145deg,#FF8A3D,#FFB347 40%,#FF6B8A)}',
      '[data-theme="lavender"]{--bg:#F8F5FF;--ink:#3B2A5C;--muted:#8E7AAD;--line:#E6DCFF;--accent:#8B5CF6;--accent-soft:#EDE6FF;--accent-deep:#6D28D9;--hero:linear-gradient(145deg,#8B5CF6,#A78BFA 40%,#C4B5FD)}',
      '[data-theme="mint"]{--bg:#F3FFFB;--ink:#134E4A;--muted:#5F8F88;--line:#CFFAEC;--accent:#14B8A6;--accent-soft:#D1FAF5;--accent-deep:#0F766E;--hero:linear-gradient(145deg,#14B8A6,#5EEAD4 40%,#99F6E4)}',
      '[data-theme="rainbow"]{--bg:#FFF9FF;--ink:#3B2060;--muted:#9B7AB8;--line:#F0E0FF;--accent:#A855F7;--accent-soft:#F3E8FF;--accent-deep:#7E22CE;--hero:linear-gradient(135deg,#F472B6,#A78BFA 35%,#38BDF8 70%,#4ADE80)}',
      '.reward-emoji-pick{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}',
      '.reward-emoji-pick button{width:40px;height:40px;border-radius:12px;border:2px solid var(--line);background:#fff;font-size:20px;padding:0}',
      '.reward-emoji-pick button.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 2px var(--accent-soft)}',
      '.reward .r-emoji{font-size:28px;margin-left:8px}',
      '.reset-box{border:2px dashed var(--neg);border-radius:18px;padding:14px;margin-top:12px;background:#FFF5F5}',
      '.reset-box h3{margin:0 0 8px;font-size:15px;color:var(--neg)}',
      '.chart-kid{display:flex;align-items:flex-end;gap:3px;height:170px;overflow-x:auto;padding:10px 6px 4px;direction:ltr;background:linear-gradient(180deg,#FBF7FF,#fff);border-radius:18px;border:2px solid var(--line)}',
      '.chart-kid .col{flex:1;min-width:14px;max-width:40px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}',
      '.chart-kid .bar{width:65%;max-width:24px;border-radius:10px 10px 4px 4px;min-height:6px}',
      '.chart-kid .val{font-size:9px;font-weight:800}',
      '.chart-kid .lbl{font-size:9px;font-weight:700;color:var(--muted);white-space:nowrap}',
      '.theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '.theme-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:14px;border:2px solid var(--line);background:#fff;font-weight:800;font-size:12px}',
      '.theme-btn.active{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 4px 12px rgba(155,109,255,.2)}',
      '.theme-btn .t-icon{font-size:22px}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  try{
    if(typeof THEMES!=='undefined' && Array.isArray(THEMES)){
      EXTRA_THEMES.forEach(function(t){
        if(!THEMES.some(function(x){return x.id===t.id})) THEMES.push(t);
      });
    }
  }catch(e){}

  var selectedRewardEmoji='🎁';

  function rewardEmojiPicker(selected){
    selected=selected||selectedRewardEmoji||'🎁';
    var h='<div class="reward-emoji-pick" id="rewEmojiPick">';
    REWARD_ICONS.forEach(function(e){
      h+='<button type="button" data-act="pick-rew-emoji" data-e="'+e+'" class="'+(e===selected?'on':'')+'">'+e+'</button>';
    });
    h+='</div>';
    return h;
  }

  function patchHealthStrip(){
    if(typeof fancyHealthStrip!=='function') return;
    fancyHealthStrip=function(){
      var items=typeof getHealthItems==='function'?getHealthItems():(S.healthItems||[]);
      if(!items.length) return '';
      var h='<section class="card"><div class="card-h"><h2>🥗 سلامتی</h2></div><div class="health-row">';
      items.forEach(function(it){
        var left=typeof daysUntilHealth==='function'?daysUntilHealth(it):0;
        var cls=(left===0?'ok':(left<=3?'soon':(left<=10?'mid':'')));
        var cd=it.cooldownDays||7;
        h+='<div class="health-chip '+cls+'">';
        h+='<span class="h-emoji">'+(it.emoji||'🍱')+'</span>';
        h+='<span class="h-title">'+esc(it.title||'')+'</span>';
        if(left===0){
          h+='<span class="h-days">🎁 آماده</span>';
          h+='<span class="h-title" style="font-size:10px">هر '+fa(cd)+' روز</span>';
        }else if(left<=3){
          h+='<span class="h-days">⚡ '+fa(left)+' روز</span>';
        }else{
          h+='<span class="h-days">'+fa(left)+' روز مانده</span>';
        }
        h+='</div>';
      });
      h+='</div></section>';
      return h;
    };
  }

  function buildKidChart(range){
    range=range||(typeof reportRange!=='undefined'?reportRange:7)||7;
    var keys=[];
    for(var i=range-1;i>=0;i--) keys.push(addDays(todayKey(),-i));
    var scores=keys.map(function(k){return score(dayStats(k));});
    var maxS=1;
    scores.forEach(function(s){ var a=Math.abs(s)||0; if(a>maxS) maxS=a; });
    var h='<div class="chart-kid">';
    keys.forEach(function(k,i){
      var sc=scores[i];
      var abs=Math.abs(sc);
      var hgt=abs===0?8:Math.max(14,Math.round((abs/maxS)*125));
      var color=sc>0?'#9B6DFF':(sc<0?'#E86A4A':'#E5E7EB');
      var isToday=k===todayKey();
      var step=range<=7?1:(range<=14?2:5);
      var showLbl=isToday||i===0||i===keys.length-1||(i%step===0);
      var lbl='';
      if(isToday) lbl='امروز';
      else if(showLbl){
        try{ var p=String(k).split('-'); lbl=fa(parseInt(p[2],10))+'/'+fa(parseInt(p[1],10)); }catch(e){ lbl=''; }
      }
      h+='<div class="col" style="min-width:'+(range>20?11:range>10?16:22)+'px">';
      if(sc!==0) h+='<span class="val" style="color:'+color+'">'+(sc>0?'+':'')+fa(sc)+'</span>';
      else h+='<span class="val" style="opacity:.35">·</span>';
      h+='<div class="bar" style="height:'+hgt+'px;background:'+color+';'+(isToday?'outline:2px solid #FFC94A;':'')+'"></div>';
      h+='<span class="lbl" style="color:'+(isToday?'#6B3FBF':'')+'">'+lbl+'</span>';
      h+='</div>';
    });
    h+='</div>';
    h+='<p class="muted" style="text-align:center;font-size:11px;margin:6px 0 0">🟣 امتیاز مثبت · 🧡 منفی · ستون طلایی = امروز</p>';
    return h;
  }

  if(typeof reportView==='function'){
    var _rv=reportView;
    reportView=function(){
      var html=_rv();
      var chart=buildKidChart(typeof reportRange!=='undefined'?reportRange:7);
      if(html.indexOf('chart-kid')>=0) return html;
      html=html.replace(/<div class="chart-wrap"[\s\S]*?<\/div>/, chart);
      if(html.indexOf('chart-kid')<0){
        html=html.replace(/(range-btns[\s\S]*?<\/div>)/, function(m){ return m+chart; });
      }
      return html;
    };
  }

  if(typeof rewardsView==='function'){
    var _rew=rewardsView;
    rewardsView=function(){
      var html=_rew();
      try{
        (S.rewards||[]).forEach(function(r){
          if(r.emoji && html.indexOf(esc(r.t))>=0){
            html=html.replace(
              new RegExp('(<div class="r-t">)'+esc(r.t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),
              '$1<span class="r-emoji">'+r.emoji+'</span> '
            );
          }
        });
      }catch(e){}
      return html;
    };
  }

  function resetPanelHTML(){
    var h='<section class="card reset-box">';
    h+='<h3>🧹 پاک‌سازی ثبت‌ها</h3>';
    h+='<p class="muted" style="font-size:12px;margin:0 0 10px">تنظیمات (لیست تسک/پاداش/رفتار) پاک نمی‌شود. فقط علامت‌های انجام‌شده و تاریخ مصرف سلامتی.</p>';
    h+='<button type="button" class="ghost" data-act="reset-today" style="width:100%;margin-bottom:8px">فقط امروز را پاک کن</button>';
    h+='<button type="button" class="ghost" data-act="reset-health-logs" style="width:100%;margin-bottom:8px">ریست تاریخ مصرف سلامتی</button>';
    h+='<button type="button" class="btn" data-act="reset-all-1" style="width:100%;background:var(--neg)">ریست همهٔ ثبت‌های گذشته…</button>';
    h+='<div id="resetStep2" style="display:none;margin-top:10px;padding:10px;border-radius:12px;background:#fff;border:1px solid var(--neg)">';
    h+='<p style="margin:0 0 8px;font-weight:800;color:var(--neg);font-size:13px">مطمئنی؟ این کار برنمی‌گردد.</p>';
    h+='<button type="button" class="btn" data-act="reset-all-2" style="width:100%;background:#B91C1C;margin-bottom:6px">بله، همه ثبت‌ها پاک شود</button>';
    h+='<button type="button" class="ghost" data-act="reset-all-cancel" style="width:100%">انصراف</button>';
    h+='</div></section>';
    return h;
  }

  function enhanceSettingsRewards(html){
    if(html.indexOf('rewardFormSet')>=0 && html.indexOf('rewEmojiPick')<0){
      html=html.replace(/(<form class="add3" id="rewardFormSet"[^>]*>)/, rewardEmojiPicker(selectedRewardEmoji)+'$1');
    }
    try{
      (S.rewards||[]).forEach(function(r){
        if(!r.emoji) return;
        var tip=esc(r.t);
        if(html.indexOf(tip)>=0){
          html=html.replace(new RegExp('(<div class="r-t">)'+tip.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), '$1<span class="r-emoji">'+r.emoji+'</span> ');
        }
      });
    }catch(e){}
    if(html.indexOf('data-t="candy"')<0 && html.indexOf('theme-btn')>=0){
      var extra='';
      EXTRA_THEMES.forEach(function(t){
        extra+='<button type="button" class="theme-btn'+(S.theme===t.id?' active':'')+'" data-act="theme" data-t="'+t.id+'"><span class="t-icon">'+t.icon+'</span>'+t.name+'</button>';
      });
      html=html.replace(/(data-t="forest"[\s\S]*?<\/button>)/, function(m){ return m+extra; });
    }
    if(html.indexOf('reset-box')<0 && (typeof isParent==='undefined'||isParent)){
      html=html+resetPanelHTML();
    }
    return html;
  }

  if(typeof settingsView==='function'){
    var _sv=settingsView;
    settingsView=function(){ return enhanceSettingsRewards(_sv()); };
  }

  function doResetToday(){
    var k=todayKey();
    if(!S.days) S.days={};
    S.days[k]={tasks:{}, notes:[], behaviors:{}};
    saveProfile();
    if(typeof showToast==='function') showToast('ثبت‌های امروز پاک شد');
    render();
  }
  function doResetHealthLogs(){
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    saveProfile();
    if(typeof showToast==='function') showToast('تاریخ مصرف سلامتی ریست شد');
    render();
  }
  function doResetAllActivity(){
    S.days={};
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    saveProfile();
    if(typeof showToast==='function') showToast('همهٔ ثبت‌ها پاک شد');
    render();
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='pick-rew-emoji'){
      e.preventDefault(); e.stopPropagation();
      selectedRewardEmoji=t.getAttribute('data-e')||'🎁';
      try{
        document.querySelectorAll('#rewEmojiPick button').forEach(function(b){
          b.classList.toggle('on', b.getAttribute('data-e')===selectedRewardEmoji);
        });
      }catch(err){}
      return;
    }
    if(a==='reset-today'){
      e.preventDefault(); e.stopPropagation();
      if(typeof isParent!=='undefined' && !isParent){ showToast('فقط والدین'); return; }
      if(confirm('ثبت‌های امروز پاک شود؟')) doResetToday();
      return;
    }
    if(a==='reset-health-logs'){
      e.preventDefault(); e.stopPropagation();
      if(typeof isParent!=='undefined' && !isParent){ showToast('فقط والدین'); return; }
      if(confirm('همه تاریخ‌های مصرف سلامتی پاک شود؟')) doResetHealthLogs();
      return;
    }
    if(a==='reset-all-1'){
      e.preventDefault(); e.stopPropagation();
      if(typeof isParent!=='undefined' && !isParent){ showToast('فقط والدین'); return; }
      var box=document.getElementById('resetStep2');
      if(box) box.style.display='block';
      return;
    }
    if(a==='reset-all-cancel'){
      e.preventDefault(); e.stopPropagation();
      var box2=document.getElementById('resetStep2');
      if(box2) box2.style.display='none';
      return;
    }
    if(a==='reset-all-2'){
      e.preventDefault(); e.stopPropagation();
      if(typeof isParent!=='undefined' && !isParent){ showToast('فقط والدین'); return; }
      doResetAllActivity();
      return;
    }
  }, true);

  document.addEventListener('submit', function(e){
    var form=e.target;
    if(!form || form.id!=='rewardFormSet') return;
    e.preventDefault();
    e.stopPropagation();
    var rt=(document.getElementById('rewInSet')&&document.getElementById('rewInSet').value||'').trim();
    var rc=typeof toNum==='function'?toNum(document.getElementById('costInSet')&&document.getElementById('costInSet').value):parseInt(document.getElementById('costInSet')&&document.getElementById('costInSet').value,10);
    if(!rt||!rc) return;
    S.rewards=S.rewards||[];
    S.rewards.push({id:typeof uid==='function'?uid():('r'+Date.now()), t:rt, c:rc, emoji:selectedRewardEmoji||'🎁'});
    saveProfile();
    selectedRewardEmoji='🎁';
    render();
  }, true);

  function boot(){
    patchHealthStrip();
    try{ if(typeof applyTheme==='function') applyTheme(); }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 600); });
  else setTimeout(boot, 600);

  console.log('features-v27 loaded');
})();
