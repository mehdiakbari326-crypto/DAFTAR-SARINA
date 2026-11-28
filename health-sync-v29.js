/* health-sync-v29: home ↔ settings same healthItems; labels; force cloud push */
(function(){
  function faNum(n){
    try{ if(typeof fa==='function') return fa(n); }catch(e){}
    return String(n);
  }
  function items(){
    try{
      if(typeof getHealthItems==='function') return getHealthItems()||[];
      return (S&&S.healthItems)||[];
    }catch(e){ return []; }
  }
  function forceSave(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    try{
      if(typeof saveProfile==='function') saveProfile();
      else if(typeof schedulePush==='function') schedulePush();
    }catch(e){}
    try{
      if(window.__sarinaSync && typeof window.__sarinaSync.push==='function'){
        window.__sarinaSync.push();
      }
    }catch(e){}
  }

  function chipHtml(it){
    var left=0;
    try{ left = typeof daysUntilHealth==='function' ? daysUntilHealth(it) : 0; }catch(e){}
    var cd = it.cooldownDays!=null ? +it.cooldownDays : 7;
    if(isNaN(cd)||cd<1) cd=7;
    var cls = left===0 ? 'ok' : (left<=3 ? 'soon' : (left<=10 ? 'mid' : ''));
    var h='<div class="health-chip '+cls+'" data-health-id="'+esc(it.id||'')+'">';
    h+='<span class="h-emoji">'+(it.emoji||'🍱')+'</span>';
    h+='<span class="h-title">'+esc(it.title||'')+'</span>';
    if(left===0){
      h+='<span class="h-days">🎁 آماده</span>';
      h+='<span class="h-sub">هر '+faNum(cd)+' روز</span>';
    }else if(left<=3){
      h+='<span class="h-days">⚡ '+faNum(left)+' روز</span>';
      h+='<span class="h-sub">هر '+faNum(cd)+' روز</span>';
    }else{
      h+='<span class="h-days">'+faNum(left)+' روز مانده</span>';
      h+='<span class="h-sub">هر '+faNum(cd)+' روز</span>';
    }
    h+='</div>';
    return h;
  }

  function dashboardHtml(){
    var list=items();
    if(!list.length) return '';
    var h='<section class="card health-dash"><div class="card-h"><h2>🥗 سلامتی</h2></div>';
    h+='<div class="health-row">';
    list.forEach(function(it){ h+=chipHtml(it); });
    h+='</div></section>';
    return h;
  }

  try{
    var st=document.createElement('style');
    st.id='health-sync-v29-css';
    st.textContent=[
      '.health-dash .health-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
      '.health-chip{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:88px;max-width:110px;padding:10px 8px;border-radius:18px;border:2px solid var(--line);background:#fff;text-align:center}',
      '.health-chip.ok{background:#ECFDF5;border-color:#6EE7B7}',
      '.health-chip.soon{background:#FFF7ED;border-color:#FDBA74}',
      '.health-chip.mid{background:#F5F3FF;border-color:#C4B5FD}',
      '.health-chip .h-emoji{font-size:32px;line-height:1.1}',
      '.health-chip .h-title{font-size:12px;font-weight:800;color:var(--ink)}',
      '.health-chip .h-days{font-size:11px;font-weight:800;color:var(--accent-deep)}',
      '.health-chip .h-sub{font-size:10px;color:var(--muted);font-weight:600}',
      '.health-chip.ok .h-days{color:#047857}',
      '.health-chip.soon .h-days{color:#C2410C}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  healthDashboard = function(){ return dashboardHtml(); };
  if(typeof fancyHealthStrip==='function'){
    fancyHealthStrip = function(){ return dashboardHtml(); };
  }

  function patchHtml(html){
    if(!html||typeof html!=='string') return html;
    var dash=dashboardHtml();
    if(!dash) return html;
    var re=/<section class="card[^"]*"[^>]*>\s*<div class="card-h"><h2>[^<]*سلامتی[\s\S]*?<\/section>/;
    if(re.test(html)){
      html=html.replace(re, dash);
    }
    html=html.replace(/<section class="card health-dash"[\s\S]*?<\/section>/, dash);
    return html;
  }

  if(typeof todayView==='function'){
    var _tv=todayView;
    todayView=function(){ return patchHtml(_tv()); };
  }

  if(typeof settingsView==='function'){
    var _sv=settingsView;
    settingsView=function(){ return _sv(); };
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='edit-health' || a==='del-health' || a==='chip-health' ||
       a==='edit-health-date' || a==='clear-health-date' || a==='log-health' ||
       a==='pick-emoji'){
      setTimeout(function(){
        forceSave();
        try{ if(typeof render==='function') render(); }catch(err){}
      }, 120);
    }
  }, true);

  document.addEventListener('submit', function(e){
    var form=e.target;
    if(!form||form.id!=='healthFormSet') return;
    setTimeout(function(){
      try{
        var list=S.healthItems||[];
        if(list.length){
          var last=list[list.length-1];
          var emojiEl=document.getElementById('healthEmojiIn');
          var em=emojiEl&&emojiEl.value;
          if(!em){
            try{ em=window.selectedEmoji||selectedEmoji; }catch(err){}
          }
          if(em && last){
            last.emoji=em;
          }
          if(last && last.title && /شکلات|chocolate/i.test(last.title) && (!last.emoji||last.emoji==='🍔'||last.emoji==='🍱')){
            last.emoji='🍫';
          }
        }
      }catch(err){}
      forceSave();
      try{ if(typeof render==='function') render(); }catch(err){}
    }, 100);
  }, true);

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act="edit-health"]');
    if(!t) return;
    setTimeout(function(){
      forceSave();
      try{ render(); }catch(err){}
    }, 300);
  }, false);

  console.log('health-sync-v29: unified chips + force push');
})();
