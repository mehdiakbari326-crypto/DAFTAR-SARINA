/* Sync v10: REST+SDK; sync buttons only in Settings */
(function(){
  var THEME_KEY='daftar-theme-local';
  var PATH='family/sarina';
  var REST_BASE='https://sarina-daftar-default-rtdb.firebaseio.com/family/sarina.json';
  var hydrated=false;
  var pulledOnce=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var reallyOnline=false;
  var usingRest=false;

  function getDb(){
    try{
      if(typeof db!=='undefined'&&db) return db;
      if(typeof firebase!=='undefined'&&firebase.database) return firebase.database();
    }catch(e){}
    return null;
  }
  function getPath(){
    try{ if(typeof FAMILY_PATH==='string'&&FAMILY_PATH) return FAMILY_PATH; }catch(e){}
    return PATH;
  }

  function loadLocalTheme(){
    try{return localStorage.getItem(THEME_KEY)||null}catch(e){return null}
  }
  function saveLocalTheme(t){
    try{if(t)localStorage.setItem(THEME_KEY,t)}catch(e){}
  }
  function applyLocalTheme(){
    var t=loadLocalTheme();
    if(t&&typeof S!=='undefined'){
      S.theme=t;
      if(typeof applyTheme==='function')applyTheme();
    }
  }

  function toast(msg){
    try{ if(typeof showToast==='function'){ showToast(msg); return; } }catch(e){}
    try{
      var el=document.createElement('div');
      el.className='toast';
      el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){try{el.remove()}catch(e){}},3000);
    }catch(e){}
  }

  function setDot(online){
    reallyOnline=!!online;
    try{
      if(typeof syncStatus!=='undefined') syncStatus=online?'online':'offline';
      if(typeof updateSyncDot==='function') updateSyncDot();
      document.querySelectorAll('.sync-dot').forEach(function(d){
        d.classList.toggle('on', !!online);
        d.classList.toggle('off', !online);
      });
    }catch(e){}
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
        n:r.name,t:r.tasks,d:r.days,rw:r.rewards,c:r.claims,g:r.goal,
        pt:r.parentTasks,pb:r.posBehaviors,nb:r.negBehaviors,
        st:r.streak,pc:r.pendingChanges,h:r.healthItems,u:r._updatedAt
      });
    }catch(e){return String(Math.random())}
  }

  function countHealthDates(items){
    var n=0;
    (items||[]).forEach(function(x){ if(x&&x.lastDate) n++; });
    return n;
  }
  function localLooksEmpty(){
    try{
      var days=S.days?Object.keys(S.days).length:0;
      var dated=countHealthDates(S.healthItems);
      return days===0 && dated===0 && !(S.streak||0);
    }catch(e){ return true; }
  }

  function applyRemote(r){
    if(!r||typeof r!=='object')return false;
    S.name = r.name!=null ? r.name : (S.name||'سارینا');
    S.tasks = Array.isArray(r.tasks) ? r.tasks.slice() : [];
    S.days = (r.days && typeof r.days==='object') ? JSON.parse(JSON.stringify(r.days)) : {};
    S.rewards = Array.isArray(r.rewards) ? r.rewards.slice() : [];
    S.claims = Array.isArray(r.claims) ? r.claims.slice() : [];
    S.goal = (r.goal!=null) ? r.goal : 15;
    S.parentTasks = Array.isArray(r.parentTasks) ? r.parentTasks.slice() : [];
    S.parentPin = r.parentPin || '1234';
    S.posBehaviors = Array.isArray(r.posBehaviors) ? r.posBehaviors.slice() : [];
    S.negBehaviors = Array.isArray(r.negBehaviors) ? r.negBehaviors.slice() : [];
    S.streak = r.streak || 0;
    S.lastActive = r.lastActive || '';
    S.pendingChanges = Array.isArray(r.pendingChanges) ? r.pendingChanges.slice() : [];
    S.healthItems = Array.isArray(r.healthItems) ? JSON.parse(JSON.stringify(r.healthItems)) : [];
    applyLocalTheme();
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    return true;
  }

  function summarize(r){
    if(!r) return 'خالی';
    var h=(r.healthItems&&r.healthItems.length)||0;
    var t=(r.tasks&&r.tasks.length)||0;
    var d=r.days?Object.keys(r.days).length:0;
    var rw=(r.rewards&&r.rewards.length)||0;
    return 'تسک '+t+' | سلامتی '+h+' | روز '+d+' | پاداش '+rw;
  }

  function restPull(){
    return fetch(REST_BASE+'?t='+Date.now(),{method:'GET',headers:{'Accept':'application/json'},cache:'no-store'})
      .then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); })
      .then(function(r){ usingRest=true; setDot(true); return r; });
  }
  function restPush(payload){
    return fetch(REST_BASE,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); usingRest=true; setDot(true); return res.json(); });
  }
  function sdkPull(){
    var database=getDb();
    if(!database) return Promise.reject(new Error('no-db'));
    return database.ref(getPath()).once('value').then(function(snap){ setDot(true); return snap.val(); });
  }

  function pullRemote(showMsg){
    return sdkPull().catch(function(){ return null; }).then(function(r){
      if(r) return r;
      return restPull();
    }).then(function(r){
      if(!r){
        if(showMsg) toast('ابر در دسترس نیست');
        hydrated=true; window.__sarinaHydrated=true;
        return false;
      }
      applyRemote(r);
      lastSig=sigOf(r);
      hydrated=true; pulledOnce=true; window.__sarinaHydrated=true;
      try{ if(typeof render==='function') render(); }catch(e){}
      if(showMsg) toast('همگام شد ✓ '+summarize(r));
      return true;
    }).catch(function(err){
      setDot(false);
      if(showMsg) toast('عدم اتصال به ابر');
      return false;
    });
  }

  function hardResetFromCloud(){
    toast('بازنشانی...');
    var role='', theme=loadLocalTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{ localStorage.removeItem('daftar-sarina-v9'); localStorage.removeItem('daftar-sarina-backup-v9'); }catch(e){}
    try{
      S.tasks=[]; S.days={}; S.rewards=[]; S.claims=[];
      S.posBehaviors=[]; S.negBehaviors=[]; S.healthItems=[];
      S.pendingChanges=[]; S.streak=0; S.goal=15;
    }catch(e){}
    return pullRemote(true).then(function(ok){
      try{
        if(role){ localStorage.setItem('daftar-device-role-v2',role); localStorage.setItem('daftar-device-role-backup',role); }
        if(theme) saveLocalTheme(theme);
      }catch(e){}
      if(ok) setTimeout(function(){ try{ location.reload(); }catch(e){} }, 400);
      return ok;
    });
  }

  function pushNow(force){
    if(!pulledOnce && !force) return;
    if(localLooksEmpty() && !force) return;
    if(!hydrated&&!force) return;
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    var database=getDb();
    var p=(database && !usingRest) ? database.ref(getPath()).update(payload) : restPush(payload);
    Promise.resolve(p).then(function(){
      writing=false; lastSig=sigOf(payload);
      setTimeout(function(){ if(typeof ignoreRemote!=='undefined') ignoreRemote=false; },1000);
      setDot(true);
      try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    }).catch(function(){
      restPush(payload).then(function(){
        writing=false; lastSig=sigOf(payload);
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
        setDot(true);
      }).catch(function(){
        writing=false;
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
        setDot(false);
      });
    });
  }

  function schedulePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveLocalTheme(S.theme);
    if(!pulledOnce||localLooksEmpty()) return;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ pushNow(false); }, 800);
  }

  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){};

  function attach(){
    var database=getDb();
    if(database){
      if(database._syncV10) return true;
      database._syncV10=true;
      try{ database.ref(getPath()).off(); }catch(e){}
      try{
        database.ref('.info/connected').on('value',function(snap){
          var on=!!snap.val();
          if(on){ usingRest=false; setDot(true); }
          else if(!usingRest) setDot(false);
        });
      }catch(e){}
      database.ref(getPath()).on('value',function(snap){
        if(writing) return;
        if(typeof ignoreRemote!=='undefined'&&ignoreRemote) return;
        var r=snap.val();
        if(!r) return;
        var s=sigOf(r);
        if(s===lastSig) return;
        lastSig=s;
        applyRemote(r);
        hydrated=true; pulledOnce=true; window.__sarinaHydrated=true;
        try{ if(typeof render==='function') render(); }catch(e){}
      });
    }else if(window._syncV10Rest){
      return true;
    }else{
      window._syncV10Rest=true;
    }

    var wasEmpty=localLooksEmpty();
    pullRemote(false).then(function(ok){
      if(ok && wasEmpty && !localLooksEmpty()){
        setTimeout(function(){ try{ location.reload(); }catch(e){} }, 300);
        return;
      }
      if(!ok){
        var hasLocal=(S.tasks&&S.tasks.length)||countHealthDates(S.healthItems);
        if(hasLocal){ pulledOnce=true; pushNow(true); }
      }
      try{ if(typeof render==='function') render(); }catch(e){}
    });
    return true;
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='theme'){
      setTimeout(function(){ if(S&&S.theme){ saveLocalTheme(S.theme); applyLocalTheme(); } },30);
    }
    if(a==='force-sync'){ e.preventDefault(); e.stopPropagation(); pullRemote(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardResetFromCloud(); }
  },true);

  // Only in Settings — remove from today page
  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      // strip any old sync blocks then add one clean card
      html=html.replace(/<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی[\s\S]*?<\/section>/g,'');
      if(html.indexOf('data-act="hard-sync"')>=0) return html;
      var btn='<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی</h2></div>';
      btn+='<p class="muted">فقط در صورت نیاز (مثلاً گوشی جدید)</p>';
      btn+='<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">دریافت از ابر</button>';
      btn+='<button type="button" class="ghost" data-act="hard-sync" style="width:100%">بازنشانی کامل از ابر</button></section>';
      return html+btn;
    };
  }

  // Strip any injected sync buttons from today view
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      html=html.replace(/<div[^>]*>(?:\s|<button)[^>]*data-act="force-sync"[\s\S]*?<\/div>/g,'');
      html=html.replace(/<button[^>]*data-act="force-sync"[\s\S]*?<\/button>/g,'');
      html=html.replace(/<button[^>]*data-act="hard-sync"[\s\S]*?<\/button>/g,'');
      return html;
    };
  }

  function boot(){
    applyLocalTheme();
    var tries=0;
    (function waitDb(){
      tries++;
      if(attach()) return;
      if(tries<30) setTimeout(waitDb,200);
      else attach();
    })();
    setInterval(function(){ if(!writing) pullRemote(false); }, 8000);
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible') setTimeout(function(){ pullRemote(false); }, 200);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,100); });
  }else setTimeout(boot,100);

  window.__sarinaSync={ pull:function(){return pullRemote(true)}, hard:hardResetFromCloud, push:function(){pushNow(true)} };
  console.log('sync-fix v10');
})();
