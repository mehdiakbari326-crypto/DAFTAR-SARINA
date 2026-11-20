/* Sync v3: Firebase = source of truth; local = cache; theme device-local */
(function(){
  var THEME_KEY='daftar-theme-local';
  var hydrated=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';

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

  function pushNow(){
    if(!hydrated){
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
    db.ref(FAMILY_PATH).update(payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
      setTimeout(function(){
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      },700);
      setOnline(true);
      try{if(typeof lsSave==='function')lsSave()}catch(e){}
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
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(pushNow,400);
  }

  // Override saveProfile — never full set()
  saveProfile=function(){ schedulePush(); };

  // Disable original listener overwrite by replacing startFirebaseSync
  if(typeof startFirebaseSync==='function'){
    startFirebaseSync=function(){
      // no-op: v3 handles sync
      setOnline(!!(typeof db!=='undefined'&&db));
    };
  }

  function attach(){
    if(typeof db==='undefined'||!db)return false;
    if(db._syncV3)return true;
    db._syncV3=true;

    db.ref(FAMILY_PATH).once('value').then(function(snap){
      var r=snap.val();
      if(r){
        applyRemote(r);
        lastSig=sigOf(r);
        console.log('sync: hydrated');
      }else{
        writing=true;
        db.ref(FAMILY_PATH).update(sharedFrom(S)).then(function(){
          writing=false;
          lastSig=sigOf(sharedFrom(S));
        }).catch(function(){writing=false});
      }
      hydrated=true;
      window.__sarinaHydrated=true;
      setOnline(true);
      try{if(typeof render==='function')render()}catch(e){}
    }).catch(function(err){
      console.log('sync hydrate error',err);
      hydrated=true;
      window.__sarinaHydrated=true;
      setOnline(false);
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
    },function(err){
      console.log('sync listen error',err);
      setOnline(false);
    });

    return true;
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act="theme"]');
    if(!t)return;
    setTimeout(function(){
      if(S&&S.theme){saveLocalTheme(S.theme);applyLocalTheme();}
    },30);
  },false);

  function boot(){
    applyLocalTheme();
    var tries=0;
    (function waitDb(){
      tries++;
      if(attach())return;
      if(tries<50) setTimeout(waitDb,200);
      else{hydrated=true;window.__sarinaHydrated=true;setOnline(false);}
    })();

    setInterval(function(){
      if(typeof db==='undefined'||!db||writing)return;
      db.ref(FAMILY_PATH).once('value').then(function(snap){
        var r=snap.val();
        if(!r)return;
        var s=sigOf(r);
        if(s===lastSig)return;
        lastSig=s;
        applyRemote(r);
        hydrated=true;
        setOnline(true);
        try{if(typeof render==='function')render()}catch(e){}
      }).catch(function(){});
    },5000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,250)});
  }else{
    setTimeout(boot,250);
  }

  window.__sarinaSync={forcePush:pushNow,hydrated:function(){return hydrated}};
  console.log('sync-fix v3 loaded');
})();
