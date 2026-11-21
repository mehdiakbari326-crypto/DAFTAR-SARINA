/* Sync v7: hard reset from cloud for stuck devices */
(function(){
  var THEME_KEY='daftar-theme-local';
  var PATH='family/sarina';
  var hydrated=false;
  var pulledOnce=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var reallyOnline=false;

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
      setTimeout(function(){try{el.remove()}catch(e){}},2800);
    }catch(e){ try{alert(msg)}catch(x){} }
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
    var withDate=0;
    if(r.healthItems){ r.healthItems.forEach(function(x){ if(x&&x.lastDate) withDate++; }); }
    return 'تسک '+t+' | سلامتی '+h+' ('+withDate+' تاریخ‌دار) | روز '+d+' | پاداش '+rw;
  }

  function pullRemote(showMsg){
    var database=getDb();
    if(!database){
      setDot(false);
      if(showMsg) toast('Firebase وصل نیست');
      return Promise.resolve(false);
    }
    return database.ref(getPath()).once('value').then(function(snap){
      var r=snap.val();
      setDot(true);
      if(!r){
        if(showMsg) toast('ابر خالی است');
        hydrated=true;
        window.__sarinaHydrated=true;
        return false;
      }
      applyRemote(r);
      lastSig=sigOf(r);
      hydrated=true;
      pulledOnce=true;
      window.__sarinaHydrated=true;
      try{ if(typeof render==='function') render(); }catch(e){ console.log(e); }
      if(showMsg) toast('از ابر: '+summarize(r)+' ✓');
      return true;
    }).catch(function(err){
      console.log('pull error',err);
      setDot(false);
      if(showMsg) toast('خطای ابر: '+(err&&err.message?err.message:'نامشخص'));
      return false;
    });
  }

  function hardResetFromCloud(){
    toast('بازنشانی از ابر...');
    var role='', theme=loadLocalTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{
      localStorage.removeItem('daftar-sarina-v9');
      localStorage.removeItem('daftar-sarina-backup-v9');
    }catch(e){}
    try{
      S.tasks=[]; S.days={}; S.rewards=[]; S.claims=[];
      S.posBehaviors=[]; S.negBehaviors=[]; S.healthItems=[];
      S.pendingChanges=[]; S.streak=0;
    }catch(e){}
    return pullRemote(true).then(function(ok){
      try{
        if(role){
          localStorage.setItem('daftar-device-role-v2', role);
          localStorage.setItem('daftar-device-role-backup', role);
        }
        if(theme) saveLocalTheme(theme);
      }catch(e){}
      if(ok){
        setTimeout(function(){
          try{ location.reload(); }catch(e){}
        }, 600);
      }
      return ok;
    });
  }

  function pushNow(force){
    if(!pulledOnce && !force){
      console.log('sync: block push until first pull');
      return;
    }
    if(!hydrated&&!force)return;
    var database=getDb();
    if(!database){
      setDot(false);
      try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
      return;
    }
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    database.ref(getPath()).update(payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
      setTimeout(function(){
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      },1200);
      setDot(true);
      try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      setDot(false);
      console.log('push error',err);
    });
  }

  function schedulePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveLocalTheme(S.theme);
    if(!pulledOnce)return;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ pushNow(false); }, 800);
  }

  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){};

  function watchConnection(){
    var database=getDb();
    if(!database)return;
    try{
      database.ref('.info/connected').on('value',function(snap){
        setDot(!!snap.val());
      });
    }catch(e){}
  }

  function attach(){
    var database=getDb();
    if(!database)return false;
    if(database._syncV7)return true;
    database._syncV7=true;

    try{ database.ref(getPath()).off(); }catch(e){}
    watchConnection();

    pullRemote(false).then(function(ok){
      if(!ok){
        var hasLocal=(S.tasks&&S.tasks.length)||(S.healthItems&&S.healthItems.some(function(x){return x&&x.lastDate;}));
        if(hasLocal){ pulledOnce=true; pushNow(true); }
      }
      try{ if(typeof render==='function') render(); }catch(e){}
    });

    database.ref(getPath()).on('value',function(snap){
      if(writing)return;
      if(typeof ignoreRemote!=='undefined'&&ignoreRemote)return;
      var r=snap.val();
      if(!r)return;
      var s=sigOf(r);
      if(s===lastSig)return;
      lastSig=s;
      applyRemote(r);
      hydrated=true;
      pulledOnce=true;
      window.__sarinaHydrated=true;
      try{ if(typeof render==='function') render(); }catch(e){}
    },function(err){
      console.log('listen error',err);
      setDot(false);
    });

    return true;
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t)return;
    var a=t.getAttribute('data-act');
    if(a==='theme'){
      setTimeout(function(){
        if(S&&S.theme){ saveLocalTheme(S.theme); applyLocalTheme(); }
      },30);
    }
    if(a==='force-sync'){
      e.preventDefault(); e.stopPropagation();
      toast('در حال دریافت...');
      pullRemote(true);
    }
    if(a==='hard-sync'){
      e.preventDefault(); e.stopPropagation();
      hardResetFromCloud();
    }
  },true);

  function injectSyncBtn(html){
    if(!html) return html;
    if(html.indexOf('data-act="hard-sync"')>=0) return html;
    var bar='<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:6px 0 12px">';
    bar+='<button type="button" class="btn" data-act="force-sync" style="width:80%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی با ابر</button>';
    bar+='<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>';
    bar+='</div>';
    html=html.replace(/<div[^>]*>\s*<button[^>]*data-act="force-sync"[\s\S]*?<\/div>/,'');
    return html.replace(/(<section class="card")/, bar+'$1');
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      try{ if(typeof deviceRole!=='undefined'&&deviceRole==='child') return html; }catch(e){}
      return injectSyncBtn(html);
    };
  }

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(html.indexOf('data-act="hard-sync"')>=0) return html;
      var btn='<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی</h2></div>';
      btn+='<p class="muted">اگر گوشی دیگر داده دارد و این گوشی نه، بازنشانی کامل را بزنید</p>';
      btn+='<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">دریافت از ابر</button>';
      btn+='<button type="button" class="ghost" data-act="hard-sync" style="width:100%">🔄 بازنشانی کامل از ابر</button></section>';
      return html+btn;
    };
  }

  function boot(){
    applyLocalTheme();
    var tries=0;
    (function waitDb(){
      tries++;
      if(attach()) return;
      if(tries<100) setTimeout(waitDb,200);
      else setDot(false);
    })();
    setInterval(function(){ if(!writing) pullRemote(false); }, 5000);
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible') setTimeout(function(){ pullRemote(false); }, 200);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,100); });
  }else{
    setTimeout(boot,100);
  }

  window.__sarinaSync={
    pull:function(){return pullRemote(true)},
    hard:function(){return hardResetFromCloud()},
    push:function(){pushNow(true)},
    online:function(){return reallyOnline}
  };
  console.log('sync-fix v7 loaded');
})();
