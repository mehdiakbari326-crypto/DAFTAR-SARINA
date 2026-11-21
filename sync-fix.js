/* Sync v4: kill old listeners, Firebase source of truth, never let empty wipe rich data */
(function(){
  var THEME_KEY='daftar-theme-local';
  var hydrated=false;
  var writing=false;
  var pushTimer=null;
  var lastSig='';
  var localUpdatedAt=0;

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

  function richness(x){
    if(!x)return 0;
    var n=0;
    try{
      n+=(x.tasks&&x.tasks.length)||0;
      n+=((x.rewards&&x.rewards.length)||0)*2;
      n+=((x.healthItems&&x.healthItems.length)||0)*2;
      n+=((x.posBehaviors&&x.posBehaviors.length)||0);
      n+=((x.negBehaviors&&x.negBehaviors.length)||0);
      n+=((x.claims&&x.claims.length)||0);
      n+=((x.pendingChanges&&x.pendingChanges.length)||0);
      if(x.days){
        var keys=Object.keys(x.days);
        n+=keys.length*3;
        keys.forEach(function(k){
          var d=x.days[k]||{};
          if(d.tasks) n+=Object.keys(d.tasks).length;
          if(d.notes) n+=(d.notes.length||0);
          if(d.weight) n+=1;
        });
      }
      if(x.streak) n+=x.streak;
    }catch(e){}
    return n;
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
    db.ref(FAMILY_PATH).once('value').then(function(snap){
      var remote=snap.val();
      if(remote&&!force){
        var rr=richness(remote), lr=richness(payload);
        var remoteAt=remote._updatedAt||0;
        if(rr>lr+3 && remoteAt>=localUpdatedAt){
          console.log('sync: abort push, remote richer',rr,lr);
          applyRemote(remote);
          lastSig=sigOf(remote);
          try{if(typeof render==='function')render()}catch(e){}
          return;
        }
      }
      writing=true;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
      localUpdatedAt=payload._updatedAt;
      return db.ref(FAMILY_PATH).update(payload).then(function(){
        writing=false;
        lastSig=sigOf(payload);
        setTimeout(function(){
          if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
        },800);
        setOnline(true);
        try{if(typeof lsSave==='function')lsSave()}catch(e){}
        console.log('sync: pushed rich',richness(payload));
      });
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
    pushTimer=setTimeout(function(){pushNow(false)},500);
  }

  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){ setOnline(!!(typeof db!=='undefined'&&db)); };

  function attach(){
    if(typeof db==='undefined'||!db)return false;
    if(db._syncV4)return true;
    db._syncV4=true;

    try{ db.ref(FAMILY_PATH).off(); }catch(e){}

    db.ref(FAMILY_PATH).once('value').then(function(snap){
      var r=snap.val();
      var localR=richness(S);
      if(r){
        var remoteR=richness(r);
        console.log('sync hydrate local',localR,'remote',remoteR);
        if(remoteR>=localR){
          applyRemote(r);
          lastSig=sigOf(r);
        }else{
          lastSig=sigOf(r);
          hydrated=true;
          window.__sarinaHydrated=true;
          pushNow(true);
          setOnline(true);
          try{if(typeof render==='function')render()}catch(e){}
          return;
        }
      }else if(localR>0){
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
      var remoteR=richness(r);
      var localR=richness(S);
      var remoteAt=r._updatedAt||0;
      if(remoteR+2<localR && remoteAt<localUpdatedAt){
        console.log('sync: ignore poorer older remote');
        return;
      }
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
      if(typeof db==='undefined'||!db){
        if(typeof showToast==='function')showToast('اتصال برقرار نیست');
        return;
      }
      db.ref(FAMILY_PATH).once('value').then(function(snap){
        var r=snap.val();
        if(r){
          applyRemote(r);
          lastSig=sigOf(r);
          if(typeof showToast==='function')showToast('همگام شد ✓');
          if(typeof render==='function')render();
        }else{
          pushNow(true);
          if(typeof showToast==='function')showToast('داده محلی ارسال شد');
        }
      }).catch(function(){
        if(typeof showToast==='function')showToast('خطا در همگام‌سازی');
      });
    }
  },true);

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(html.indexOf('force-sync')>=0)return html;
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
      if(tries<60) setTimeout(waitDb,200);
      else{hydrated=true;window.__sarinaHydrated=true;setOnline(false);}
    })();

    setInterval(function(){
      if(typeof db==='undefined'||!db||writing)return;
      db.ref(FAMILY_PATH).once('value').then(function(snap){
        var r=snap.val();
        if(!r)return;
        var s=sigOf(r);
        if(s===lastSig)return;
        var remoteR=richness(r), localR=richness(S);
        if(remoteR+2<localR && (r._updatedAt||0)<localUpdatedAt)return;
        lastSig=s;
        applyRemote(r);
        hydrated=true;
        setOnline(true);
        try{if(typeof render==='function')render()}catch(e){}
      }).catch(function(){});
    },4000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,200)});
  }else{
    setTimeout(boot,200);
  }

  window.__sarinaSync={forcePush:function(){pushNow(true)},hydrated:function(){return hydrated}};
  console.log('sync-fix v4 loaded');
})();
