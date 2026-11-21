/* Sync v5: always apply Firebase on open; never ignore richer remote */
(function(){
  var THEME_KEY='daftar-theme-local';
  var hydrated=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var localUpdatedAt=0;
  var lastPull=0;

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
    if(r.name!=null) S.name=r.name;
    if(r.tasks!==undefined) S.tasks=Array.isArray(r.tasks)?r.tasks:[];
    if(r.days!==undefined) S.days=r.days&&typeof r.days==='object'?r.days:{};
    if(r.rewards!==undefined) S.rewards=Array.isArray(r.rewards)?r.rewards:[];
    if(r.claims!==undefined) S.claims=Array.isArray(r.claims)?r.claims:[];
    if(r.goal!==undefined) S.goal=r.goal||15;
    if(r.parentTasks!==undefined) S.parentTasks=Array.isArray(r.parentTasks)?r.parentTasks:[];
    if(r.parentPin!==undefined) S.parentPin=r.parentPin||'1234';
    if(r.posBehaviors!==undefined) S.posBehaviors=Array.isArray(r.posBehaviors)?r.posBehaviors:[];
    if(r.negBehaviors!==undefined) S.negBehaviors=Array.isArray(r.negBehaviors)?r.negBehaviors:[];
    if(r.streak!==undefined) S.streak=r.streak||0;
    if(r.lastActive!==undefined) S.lastActive=r.lastActive||'';
    if(r.pendingChanges!==undefined) S.pendingChanges=Array.isArray(r.pendingChanges)?r.pendingChanges:[];
    if(r.healthItems!==undefined) S.healthItems=Array.isArray(r.healthItems)?r.healthItems:[];
    applyLocalTheme();
    try{if(typeof lsSave==='function')lsSave()}catch(e){}
    return true;
  }

  function setOnline(ok){
    try{
      if(typeof syncStatus!=='undefined'){
        syncStatus=ok?'online':'offline';
        if(typeof updateSyncDot==='function')updateSyncDot();
      }
    }catch(e){}
  }

  function pullRemote(showMsg){
    if(typeof db==='undefined'||!db){
      setOnline(false);
      if(showMsg&&typeof showToast==='function')showToast('اتصال ابر برقرار نیست');
      return Promise.resolve(false);
    }
    return db.ref(FAMILY_PATH).once('value').then(function(snap){
      var r=snap.val();
      setOnline(true);
      lastPull=Date.now();
      if(!r){
        if(showMsg&&typeof showToast==='function')showToast('ابری خالی است');
        return false;
      }
      var s=sigOf(r);
      var changed=(s!==lastSig);
      lastSig=s;
      applyRemote(r);
      hydrated=true;
      window.__sarinaHydrated=true;
      if(changed){
        try{if(typeof render==='function')render()}catch(e){}
      }
      if(showMsg&&typeof showToast==='function'){
        showToast(changed?'همگام شد ✓':'قبلاً همگام بود');
      }
      return changed;
    }).catch(function(err){
      console.log('pull error',err);
      setOnline(false);
      if(showMsg&&typeof showToast==='function')showToast('خطا در دریافت از ابر');
      return false;
    });
  }

  function pushNow(force){
    if(!hydrated&&!force){
      console.log('sync: skip push until hydrated');
      return;
    }
    if(typeof db==='undefined'||!db){
      setOnline(false);
      try{if(typeof lsSave==='function')lsSave()}catch(e){}
      return;
    }
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    localUpdatedAt=payload._updatedAt;
    db.ref(FAMILY_PATH).update(payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
      setTimeout(function(){
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      },1000);
      setOnline(true);
      try{if(typeof lsSave==='function')lsSave()}catch(e){}
      console.log('sync: pushed',payload._updatedAt);
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      setOnline(false);
      console.log('sync push error',err);
    });
  }

  function schedulePush(){
    try{if(typeof lsSave==='function')lsSave()}catch(e){}
    if(S&&S.theme) saveLocalTheme(S.theme);
    localUpdatedAt=Date.now();
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){pushNow(false)},600);
  }

  // Override save — always update(), never set()
  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){ setOnline(!!(typeof db!=='undefined'&&db)); };

  function attach(){
    if(typeof db==='undefined'||!db)return false;
    if(db._syncV5)return true;
    db._syncV5=true;

    try{ db.ref(FAMILY_PATH).off(); }catch(e){}

    // ALWAYS take server data first
    pullRemote(false).then(function(changed){
      hydrated=true;
      window.__sarinaHydrated=true;
      // If cloud empty and local has data, seed once
      if(!lastSig){
        var hasLocal=(S.tasks&&S.tasks.length)||(S.healthItems&&S.healthItems.length)||(S.days&&Object.keys(S.days).length);
        if(hasLocal) pushNow(true);
      }
      try{if(typeof render==='function')render()}catch(e){}
    });

    db.ref(FAMILY_PATH).on('value',function(snap){
      if(writing)return;
      if(typeof ignoreRemote!=='undefined'&&ignoreRemote)return;
      var r=snap.val();
      if(!r)return;
      var s=sigOf(r);
      if(s===lastSig)return;
      lastSig=s;
      applyRemote(r);
      hydrated=true;
      window.__sarinaHydrated=true;
      setOnline(true);
      try{if(typeof render==='function')render()}catch(e){}
      console.log('sync: live update applied');
    },function(err){
      console.log('sync listen error',err);
      setOnline(false);
    });

    return true;
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t)return;
    var a=t.getAttribute('data-act');
    if(a==='theme'){
      setTimeout(function(){
        if(S&&S.theme){saveLocalTheme(S.theme);applyLocalTheme();}
      },30);
    }
    if(a==='force-sync'){
      e.preventDefault();
      e.stopPropagation();
      pullRemote(true);
    }
  },true);

  // Show sync button on home for parents
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      try{
        if(typeof deviceRole!=='undefined'&&deviceRole==='child')return html;
        if(typeof isParent!=='undefined'&&!isParent)return html;
      }catch(e){}
      if(html.indexOf('force-sync')>=0)return html;
      var bar='<div style="display:flex;gap:8px;justify-content:center;margin:4px 0 8px">';
      bar+='<button type="button" class="ghost" data-act="force-sync" style="font-weight:800">☁️ همگام‌سازی با ابر</button>';
      bar+='</div>';
      // inject after hero / before first card
      html=html.replace(/(<section class="card")/, bar+'$1');
      return html;
    };
  }

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(html.indexOf('data-act="force-sync"')>=0)return html;
      var btn='<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی</h2></div>';
      btn+='<p class="muted">اگر دو گوشی یکی نیستند این دکمه را بزنید</p>';
      btn+='<button type="button" class="btn" data-act="force-sync" style="width:100%">دریافت آخرین داده از ابر</button></section>';
      return html+btn;
    };
  }

  function boot(){
    applyLocalTheme();
    var tries=0;
    (function waitDb(){
      tries++;
      if(attach())return;
      if(tries<80) setTimeout(waitDb,200);
      else{hydrated=true;window.__sarinaHydrated=true;setOnline(false);}
    })();

    // Pull every 3s
    setInterval(function(){
      if(writing)return;
      if(Date.now()-lastPull<2500)return;
      pullRemote(false);
    },3000);

    // When app comes to foreground
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'){
        setTimeout(function(){pullRemote(false)},300);
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,150)});
  }else{
    setTimeout(boot,150);
  }

  window.__sarinaSync={forcePush:function(){pushNow(true)},pull:function(){return pullRemote(true)},hydrated:function(){return hydrated}};
  console.log('sync-fix v5 loaded');
})();
