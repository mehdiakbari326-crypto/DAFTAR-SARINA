/* Robust Firebase sync: merge remote data, keep theme local, prevent overwrite races */
(function(){
  var THEME_KEY='daftar-theme-local';
  var writing=false;
  var writeTimer=null;
  var lastRemoteJson='';
  var lastLocalWrite=0;

  function loadLocalTheme(){
    try{
      var t=localStorage.getItem(THEME_KEY);
      if(t) return t;
    }catch(e){}
    return null;
  }
  function saveLocalTheme(t){
    try{if(t) localStorage.setItem(THEME_KEY,t)}catch(e){}
  }

  // Theme is per-device, not shared
  function applyLocalTheme(){
    var t=loadLocalTheme();
    if(t&&typeof S!=='undefined'){
      S.theme=t;
      if(typeof applyTheme==='function') applyTheme();
    }
  }

  // Snapshot of shared fields only (no theme, no device stuff)
  function sharedPayload(){
    return {
      name:S.name,
      tasks:S.tasks||[],
      days:S.days||{},
      rewards:S.rewards||[],
      claims:S.claims||[],
      goal:S.goal||15,
      parentTasks:S.parentTasks||[],
      parentPin:S.parentPin||'1234',
      posBehaviors:S.posBehaviors||[],
      negBehaviors:S.negBehaviors||[],
      streak:S.streak||0,
      lastActive:S.lastActive||'',
      pendingChanges:S.pendingChanges||[],
      healthItems:S.healthItems||[],
      _updatedAt:Date.now()
    };
  }

  function mergeRemote(r){
    if(!r||typeof r!=='object')return false;
    // Prefer remote arrays/objects when present (even if empty array was intentional)
    // Use hasOwn-style checks via !== undefined
    if(r.name!==undefined&&r.name!==null) S.name=r.name;
    if(r.tasks!==undefined) S.tasks=r.tasks||[];
    if(r.days!==undefined) S.days=r.days||{};
    if(r.rewards!==undefined) S.rewards=r.rewards||[];
    if(r.claims!==undefined) S.claims=r.claims||[];
    if(r.goal!==undefined) S.goal=r.goal||15;
    if(r.parentTasks!==undefined) S.parentTasks=r.parentTasks||[];
    if(r.parentPin!==undefined) S.parentPin=r.parentPin||'1234';
    if(r.posBehaviors!==undefined) S.posBehaviors=r.posBehaviors||[];
    if(r.negBehaviors!==undefined) S.negBehaviors=r.negBehaviors||[];
    if(r.streak!==undefined) S.streak=r.streak||0;
    if(r.lastActive!==undefined) S.lastActive=r.lastActive||'';
    if(r.pendingChanges!==undefined) S.pendingChanges=r.pendingChanges||[];
    if(r.healthItems!==undefined) S.healthItems=r.healthItems||[];
    // NEVER take theme from remote
    applyLocalTheme();
    return true;
  }

  function pushToFirebase(){
    if(typeof db==='undefined'||!db){
      if(typeof lsSave==='function') lsSave();
      if(typeof syncStatus!=='undefined'){syncStatus='offline';if(typeof updateSyncDot==='function')updateSyncDot()}
      return;
    }
    var payload=sharedPayload();
    writing=true;
    lastLocalWrite=Date.now();
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    db.ref(FAMILY_PATH).update(payload).then(function(){
      writing=false;
      // brief ignore window then accept remote again
      setTimeout(function(){
        if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      },400);
      if(typeof syncStatus!=='undefined'){syncStatus='online';if(typeof updateSyncDot==='function')updateSyncDot()}
      if(typeof lsSave==='function') lsSave();
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      if(typeof syncStatus!=='undefined'){syncStatus='offline';if(typeof updateSyncDot==='function')updateSyncDot()}
      console.log('sync push error',err);
    });
  }

  // Debounced save to avoid rapid overwrites
  function schedulePush(){
    if(typeof lsSave==='function') lsSave();
    if(writeTimer) clearTimeout(writeTimer);
    writeTimer=setTimeout(function(){
      pushToFirebase();
    },280);
  }

  // Replace saveProfile
  if(typeof saveProfile==='function'){
    saveProfile=function(){
      // persist theme locally only
      if(S&&S.theme) saveLocalTheme(S.theme);
      schedulePush();
    };
  }

  // Intercept theme changes to stay local
  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act="theme"]');
    if(!t)return;
    // after original handler runs, lock theme local
    setTimeout(function(){
      if(S&&S.theme){
        saveLocalTheme(S.theme);
        applyLocalTheme();
      }
    },50);
  },false);

  function attachListener(){
    if(typeof db==='undefined'||!db)return;
    if(db._sarinaSyncAttached)return;
    db._sarinaSyncAttached=true;

    db.ref(FAMILY_PATH).on('value',function(snap){
      // If we just wrote, skip echoes briefly
      if(writing) return;
      if(typeof ignoreRemote!=='undefined'&&ignoreRemote) return;

      var r=snap.val();
      if(!r)return;

      // Skip if identical to last applied remote
      var sig='';
      try{sig=JSON.stringify({
        tasks:r.tasks,rewards:r.rewards,days:r.days,
        pos:r.posBehaviors,neg:r.negBehaviors,
        health:r.healthItems,pending:r.pendingChanges,
        goal:r.goal,claims:r.claims,name:r.name,
        updated:r._updatedAt
      })}catch(e){sig=String(Math.random())}

      if(sig===lastRemoteJson) return;
      lastRemoteJson=sig;

      // If remote is older than our last write by a tiny margin, still merge
      // (update() merges fields; we always apply remote shared state)
      mergeRemote(r);
      if(typeof lsSave==='function') lsSave();
      if(typeof syncStatus!=='undefined'){syncStatus='online';if(typeof updateSyncDot==='function')updateSyncDot()}

      // Notify pending for parents etc. (reuse existing side-effects lightly)
      try{
        if(typeof render==='function') render();
      }catch(e){console.log('sync render',e)}
    },function(err){
      console.log('sync listen error',err);
      if(typeof syncStatus!=='undefined'){syncStatus='offline';if(typeof updateSyncDot==='function')updateSyncDot()}
    });
  }

  function boot(){
    // migrate theme to local store once
    try{
      var existing=loadLocalTheme();
      if(!existing&&typeof S!=='undefined'&&S.theme){
        saveLocalTheme(S.theme);
      }
      applyLocalTheme();
    }catch(e){}

    attachListener();

    // Re-attach after firebase init delay
    setTimeout(attachListener,500);
    setTimeout(attachListener,1500);

    // Periodic pull safety net
    setInterval(function(){
      if(typeof db==='undefined'||!db||writing)return;
      db.ref(FAMILY_PATH).once('value').then(function(snap){
        var r=snap.val();
        if(!r)return;
        var before='';
        try{before=JSON.stringify(S.posBehaviors)+JSON.stringify(S.rewards)+JSON.stringify(S.healthItems)+Object.keys(S.days||{}).length}catch(e){}
        mergeRemote(r);
        var after='';
        try{after=JSON.stringify(S.posBehaviors)+JSON.stringify(S.rewards)+JSON.stringify(S.healthItems)+Object.keys(S.days||{}).length}catch(e){}
        if(before!==after){
          if(typeof lsSave==='function') lsSave();
          if(typeof render==='function') render();
        }
      }).catch(function(){});
    },8000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,200)});
  }else{
    setTimeout(boot,200);
  }

  console.log('sync-fix.js loaded');
})();
