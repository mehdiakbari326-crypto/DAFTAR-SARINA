/* Sync v6: real connection status, hard pull from Firebase, diagnostics */
(function(){
  var THEME_KEY='daftar-theme-local';
  var PATH='family/sarina';
  var hydrated=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var reallyOnline=false;

  function getDb(){
    try{
      if(typeof db!=='undefined'&&db) return db;
      if(typeof firebase!=='undefined'&&firebase.database){
        return firebase.database();
      }
    }catch(e){}
    return null;
  }
  function getPath(){
    try{
      if(typeof FAMILY_PATH==='string'&&FAMILY_PATH) return FAMILY_PATH;
    }catch(e){}
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
    try{
      if(typeof showToast==='function'){showToast(msg);return;}
    }catch(e){}
    try{
      var el=document.createElement('div');
      el.className='toast';
      el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){try{el.remove()}catch(e){}},2500);
    }catch(e){try{alert(msg)}catch(x){}}
  }

  function setDot(online){
    reallyOnline=!!online;
    try{
      if(typeof syncStatus!=='undefined'){
        syncStatus=online?'online':'offline';
      }
      if(typeof updateSyncDot==='function') updateSyncDot();
      // also force-paint dots in case updateSyncDot is stale
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
    // HARD replace shared fields from server
    S.name = r.name!=null ? r.name : S.name;
    S.tasks = Array.isArray(r.tasks) ? r.tasks : [];
    S.days = (r.days && typeof r.days==='object') ? r.days : {};
    S.rewards = Array.isArray(r.rewards) ? r.rewards : [];
    S.claims = Array.isArray(r.claims) ? r.claims : [];
    S.goal = (r.goal!=null) ? r.goal : 15;
    S.parentTasks = Array.isArray(r.parentTasks) ? r.parentTasks : [];
    S.parentPin = r.parentPin || '1234';
    S.posBehaviors = Array.isArray(r.posBehaviors) ? r.posBehaviors : [];
    S.negBehaviors = Array.isArray(r.negBehaviors) ? r.negBehaviors : [];
    S.streak = r.streak || 0;
    S.lastActive = r.lastActive || '';
    S.pendingChanges = Array.isArray(r.pendingChanges) ? r.pendingChanges : [];
    S.healthItems = Array.isArray(r.healthItems) ? r.healthItems : [];
    applyLocalTheme();
    try{
      // write local cache AFTER server apply
      localStorage.setItem('daftar-sarina-v9', JSON.stringify(S));
    }catch(e){}
    try{if(typeof lsSave==='function')lsSave()}catch(e){}
    return true;
  }

  function summarize(r){
    if(!r)return 'خالی';
    var h=(r.healthItems&&r.healthItems.length)||0;
    var t=(r.tasks&&r.tasks.length)||0;
    var d=r.days?Object.keys(r.days).length:0;
    var rw=(r.rewards&&r.rewards.length)||0;
    return 'تسک '+t+' | سلامتی '+h+' | روز '+d+' | پاداش '+rw;
  }

  function pullRemote(showMsg){
    var database=getDb();
    if(!database){
      setDot(false);
      if(showMsg) toast('Firebase وصل نیست');
      return Promise.resolve(false);
    }
    var path=getPath();
    return database.ref(path).once('value').then(function(snap){
      var r=snap.val();
      setDot(true);
      if(!r){
        if(showMsg) toast('ابر خالی است');
        hydrated=true;
        window.__sarinaHydrated=true;
        return false;
      }
      var before=sigOf({healthItems:S.healthItems,days:S.days,tasks:S.tasks,rewards:S.rewards,goal:S.goal});
      applyRemote(r);
      lastSig=sigOf(r);
      hydrated=true;
      window.__sarinaHydrated=true;
      try{if(typeof render==='function')render()}catch(e){console.log('render after pull',e)}
      var after=sigOf({healthItems:S.healthItems,days:S.days,tasks:S.tasks,rewards:S.rewards,goal:S.goal});
      if(showMsg){
        toast('از ابر: '+summarize(r)+(before!==after?' ✓':' (بدون تغییر)'));
      }
      return true;
    }).catch(function(err){
      console.log('pull error',err);
      setDot(false);
      if(showMsg) toast('خطای ابر: '+(err&&err.message?err.message:'نامشخص'));
      return false;
    });
  }

  function pushNow(force){
    if(!hydrated&&!force)return;
    var database=getDb();
    if(!database){
      setDot(false);
      try{if(typeof lsSave==='function')lsSave()}catch(e){}
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
      try{if(typeof lsSave==='function')lsSave()}catch(e){}
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      setDot(false);
      console.log('push error',err);
    });
  }

  function schedulePush(){
    try{if(typeof lsSave==='function')lsSave()}catch(e){}
    if(S&&S.theme) saveLocalTheme(S.theme);
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){pushNow(false)},700);
  }

  // Override globals
  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){ /* disabled: v6 owns sync */ };

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
    if(database._syncV6)return true;
    database._syncV6=true;

    try{ database.ref(getPath()).off(); }catch(e){}
    watchConnection();

    // Hard pull on start
    pullRemote(false).then(function(ok){
      if(!ok){
        // seed only if cloud empty and local has data
        var hasLocal=(S.tasks&&S.tasks.length)||(S.healthItems&&S.healthItems.some(function(x){return x.lastDate;}));
        if(hasLocal) pushNow(true);
      }
      try{if(typeof render==='function')render()}catch(e){}
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
      window.__sarinaHydrated=true;
      try{if(typeof render==='function')render()}catch(e){}
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
        if(S&&S.theme){saveLocalTheme(S.theme);applyLocalTheme();}
      },30);
    }
    if(a==='force-sync'){
      e.preventDefault();
      e.stopPropagation();
      toast('در حال دریافت...');
      pullRemote(true);
    }
  },true);

  // Inject visible sync button
  function injectSyncBtn(html){
    if(!html||html.indexOf('data-act="force-sync"')>=0)return html;
    var bar='<div style="display:flex;gap:8px;justify-content:center;margin:6px 0 10px">';
    bar+='<button type="button" class="btn" data-act="force-sync" style="width:auto;min-width:60%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی با ابر</button>';
    bar+='</div>';
    return html.replace(/(<section class="card")/, bar+'$1');
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      try{
        if(typeof deviceRole!=='undefined'&&deviceRole==='child')return html;
      }catch(e){}
      return injectSyncBtn(html);
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
      if(tries<100) setTimeout(waitDb,200);
      else setDot(false);
    })();

    setInterval(function(){
      if(writing)return;
      pullRemote(false);
    },4000);

    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'){
        setTimeout(function(){pullRemote(false)},200);
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,100)});
  }else{
    setTimeout(boot,100);
  }

  window.__sarinaSync={
    pull:function(){return pullRemote(true)},
    push:function(){pushNow(true)},
    online:function(){return reallyOnline}
  };
  console.log('sync-fix v6 loaded');
})();
