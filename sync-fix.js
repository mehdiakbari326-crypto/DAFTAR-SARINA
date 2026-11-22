/* Sync v11: REST-FIRST (never hang on blocked WebSocket)
 * Cloud is source of truth. Simple, reliable, visible status.
 */
(function(){
  var PATH='family/sarina';
  var REST='https://sarina-daftar-default-rtdb.firebaseio.com/family/sarina.json';
  var THEME_KEY='daftar-theme-local';
  var hydrated=false;
  var pulledOnce=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var online=false;

  function toast(msg){
    try{ if(typeof showToast==='function'){ showToast(msg); return; } }catch(e){}
    try{
      var el=document.createElement('div');
      el.className='toast';
      el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){ try{el.remove()}catch(e){} }, 3500);
    }catch(e){}
  }

  function setDot(on){
    online=!!on;
    try{
      if(typeof syncStatus!=='undefined') syncStatus=on?'online':'offline';
      if(typeof updateSyncDot==='function') updateSyncDot();
      document.querySelectorAll('.sync-dot').forEach(function(d){
        d.classList.toggle('on', !!on);
        d.classList.toggle('off', !on);
      });
    }catch(e){}
  }

  function loadTheme(){ try{return localStorage.getItem(THEME_KEY)}catch(e){return null} }
  function saveTheme(t){ try{if(t)localStorage.setItem(THEME_KEY,t)}catch(e){} }
  function applyThemeLocal(){
    var t=loadTheme();
    if(t&&typeof S!=='undefined'){
      S.theme=t;
      if(typeof applyTheme==='function') applyTheme();
    }
  }

  function sharedFrom(Sref){
    return {
      name:Sref.name||'سارینا',
      tasks:Sref.tasks||[],
      days:Sref.days||{},
      rewards:Sref.rewards||[],
      claims:Sref.claims||[],
      goal:Sref.goal||15,
      parentTasks:Sref.parentTasks||[],
      parentPin:Sref.parentPin||'1234',
      posBehaviors:Sref.posBehaviors||[],
      negBehaviors:Sref.negBehaviors||[],
      streak:Sref.streak||0,
      lastActive:Sref.lastActive||'',
      pendingChanges:Sref.pendingChanges||[],
      healthItems:Sref.healthItems||[],
      _updatedAt:Date.now()
    };
  }

  function sigOf(r){
    try{
      return JSON.stringify({
        t:r.tasks,d:r.days,h:r.healthItems,rw:r.rewards,g:r.goal,
        pb:r.posBehaviors,nb:r.negBehaviors,st:r.streak,pc:r.pendingChanges,u:r._updatedAt
      });
    }catch(e){ return String(Math.random()); }
  }

  function applyRemote(r){
    if(!r||typeof r!=='object') return false;
    // ignore pure ping-only payloads
    if(!r.tasks && !r.days && !r.healthItems && r._ping) return false;

    if(r.name!=null) S.name=r.name;
    if(r.tasks) S.tasks=Array.isArray(r.tasks)?r.tasks.slice():S.tasks;
    if(r.days) S.days=JSON.parse(JSON.stringify(r.days));
    if(r.rewards) S.rewards=Array.isArray(r.rewards)?r.rewards.slice():S.rewards;
    if(r.claims) S.claims=Array.isArray(r.claims)?r.claims.slice():[];
    if(r.goal!=null) S.goal=r.goal;
    if(r.parentTasks) S.parentTasks=Array.isArray(r.parentTasks)?r.parentTasks.slice():[];
    if(r.parentPin) S.parentPin=r.parentPin;
    if(r.posBehaviors) S.posBehaviors=Array.isArray(r.posBehaviors)?r.posBehaviors.slice():[];
    if(r.negBehaviors) S.negBehaviors=Array.isArray(r.negBehaviors)?r.negBehaviors.slice():[];
    if(r.streak!=null) S.streak=r.streak;
    if(r.lastActive!=null) S.lastActive=r.lastActive;
    if(r.pendingChanges) S.pendingChanges=Array.isArray(r.pendingChanges)?r.pendingChanges.slice():[];
    if(r.healthItems) S.healthItems=JSON.parse(JSON.stringify(r.healthItems));
    applyThemeLocal();
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    return true;
  }

  function summarize(r){
    if(!r) return 'خالی';
    return 'تسک '+(r.tasks&&r.tasks.length||0)+
      ' | سلامتی '+(r.healthItems&&r.healthItems.length||0)+
      ' | روز '+(r.days?Object.keys(r.days).length:0)+
      ' | پاداش '+(r.rewards&&r.rewards.length||0);
  }

  function isEmptyLocal(){
    try{
      var days=S.days?Object.keys(S.days).length:0;
      var tasks=S.tasks?S.tasks.length:0;
      return days===0 && tasks<=1;
    }catch(e){ return true; }
  }

  // ---- REST only for reliability ----
  function restGet(){
    return fetch(REST+'?t='+Date.now(), {
      method:'GET',
      headers:{'Accept':'application/json'},
      cache:'no-store'
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    });
  }

  function restPatch(payload){
    return fetch(REST, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    });
  }

  function pull(showMsg){
    return restGet().then(function(r){
      setDot(true);
      if(!r || (typeof r==='object' && !r.tasks && !r.healthItems && !r.days)){
        if(showMsg) toast('ابر خالی است');
        hydrated=true; pulledOnce=true;
        return false;
      }
      var before=isEmptyLocal();
      applyRemote(r);
      lastSig=sigOf(r);
      hydrated=true; pulledOnce=true;
      window.__sarinaHydrated=true;
      try{ if(typeof render==='function') render(); }catch(e){}
      if(showMsg) toast('✓ همگام شد — '+summarize(r));
      // if device was empty, hard reload so every module sees new S
      if(before && !isEmptyLocal()){
        setTimeout(function(){ try{ location.reload(); }catch(e){} }, 400);
      }
      return true;
    }).catch(function(err){
      console.log('REST pull fail', err);
      setDot(false);
      if(showMsg) toast('اتصال به ابر برقرار نشد. اینترنت/VPN را چک کنید');
      return false;
    });
  }

  function push(force){
    if(!pulledOnce && !force) return;
    if(isEmptyLocal() && !force) return;
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    restPatch(payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
      setDot(true);
      setTimeout(function(){ if(typeof ignoreRemote!=='undefined') ignoreRemote=false; }, 800);
      try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      setDot(false);
      console.log('REST push fail', err);
    });
  }

  function schedulePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveTheme(S.theme);
    if(!pulledOnce || isEmptyLocal()) return;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ push(false); }, 600);
  }

  function hardReset(){
    toast('در حال دریافت از ابر...');
    var role='', theme=loadTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{
      localStorage.removeItem('daftar-sarina-v9');
      localStorage.removeItem('daftar-sarina-backup-v9');
    }catch(e){}
    return pull(true).then(function(ok){
      try{
        if(role){
          localStorage.setItem('daftar-device-role-v2', role);
          localStorage.setItem('daftar-device-role-backup', role);
        }
        if(theme) saveTheme(theme);
      }catch(e){}
      if(ok) setTimeout(function(){ try{ location.reload(); }catch(e){} }, 500);
      return ok;
    });
  }

  // Override globals — kill old SDK sync
  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){};

  // Optional: SDK live listener only if it connects quickly
  function trySdkListener(){
    try{
      if(typeof firebase==='undefined'||!firebase.database) return;
      var dbref=firebase.database().ref(PATH);
      var done=false;
      var timer=setTimeout(function(){ done=true; }, 3000);
      firebase.database().ref('.info/connected').once('value').then(function(snap){
        if(done) return;
        clearTimeout(timer);
        if(!snap.val()) return; // not connected — stay on REST
        dbref.on('value', function(s){
          if(writing) return;
          if(typeof ignoreRemote!=='undefined'&&ignoreRemote) return;
          var r=s.val();
          if(!r) return;
          var sig=sigOf(r);
          if(sig===lastSig) return;
          lastSig=sig;
          applyRemote(r);
          setDot(true);
          try{ if(typeof render==='function') render(); }catch(e){}
        });
      }).catch(function(){});
    }catch(e){}
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='force-sync'){ e.preventDefault(); e.stopPropagation(); toast('در حال همگام‌سازی...'); pull(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardReset(); }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 30); }
  }, true);

  function syncBar(){
    return '<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:8px 0 12px">'+
      '<button type="button" class="btn" data-act="force-sync" style="width:85%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی با ابر</button>'+
      '<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>'+
      '</div>';
  }

  // Show sync buttons on Today for everyone (until stable)
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      if(html.indexOf('data-act="force-sync"')>=0) return html;
      // inject after level / first card
      if(html.indexOf('class="level-card"')>=0){
        html=html.replace(/(<section class="level-card"[\s\S]*?<\/section>)/, function(m){ return m+syncBar(); });
      }else{
        html=syncBar()+html;
      }
      return html;
    };
  }

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      html=html.replace(/<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی[\s\S]*?<\/section>/g,'');
      html+= '<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی</h2></div>'+
        '<p class="muted">اگر داده ناقص است بازنشانی کامل را بزنید</p>'+
        '<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">دریافت از ابر</button>'+
        '<button type="button" class="ghost" data-act="hard-sync" style="width:100%">🔄 بازنشانی کامل از ابر</button></section>';
      return html;
    };
  }

  function boot(){
    applyThemeLocal();
    // Always REST pull first — don't wait for SDK
    pull(false).then(function(ok){
      if(!ok && !isEmptyLocal()){
        // local has data, cloud unreachable — keep local, try push later
        pulledOnce=true;
      }
      trySdkListener();
    });
    // periodic REST pull every 5s
    setInterval(function(){ if(!writing) pull(false); }, 5000);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='visible') pull(false);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 300); });
  }else{
    setTimeout(boot, 300);
  }

  window.__sarinaSync={ pull:function(){return pull(true)}, hard:hardReset, push:function(){push(true)}, online:function(){return online} };
  console.log('sync-fix v11 REST-first');
})();
