/* sync-resilience-v31: keep green when cloud reachable; retry; fix red-dot stuck */
(function(){
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var lastOkAt=0;
  var failCount=0;

  function base(){
    try{
      var s=localStorage.getItem('daftar-cloud-api');
      if(s && String(s).indexOf('https://')===0) return String(s).replace(/\/+$/,'');
    }catch(e){}
    if(typeof window.CLOUD_API==='string' && window.CLOUD_API.indexOf('https://')===0)
      return window.CLOUD_API.replace(/\/+$/,'');
    return DEFAULT_CLOUD;
  }

  function setOnline(on){
    try{
      if(typeof syncStatus!=='undefined') syncStatus = on ? 'online' : 'offline';
      if(typeof updateSyncDot==='function') updateSyncDot();
      document.querySelectorAll('.sync-dot,#syncDot').forEach(function(d){
        if(!d) return;
        d.classList.toggle('on', !!on);
        d.classList.toggle('off', !on);
        if(on) d.style.background='#3ddc97';
        else d.style.background='#ff6b6b';
      });
    }catch(e){}
  }

  function healthPing(){
    var b=base();
    if(!b){ setOnline(false); return Promise.resolve(false); }
    var url=b+'/health?t='+Date.now();
    return fetch(url,{method:'GET',headers:{'Accept':'application/json'},cache:'no-store'})
      .then(function(r){
        if(!r.ok) throw new Error('h'+r.status);
        return r.json();
      })
      .then(function(j){
        if(j && j.ok){
          lastOkAt=Date.now(); failCount=0; setOnline(true);
          return true;
        }
        throw new Error('bad');
      })
      .catch(function(){
        failCount++;
        if(failCount>=2 && Date.now()-lastOkAt>15000) setOnline(false);
        return false;
      });
  }

  function wrapSync(){
    var api=window.__sarinaSync;
    if(!api || api._resilient) return;
    var _pull=api.pull, _push=api.push, _sync=api.sync;
    if(typeof _pull==='function'){
      api.pull=function(){
        return Promise.resolve(_pull.apply(api,arguments)).then(function(ok){
          if(ok!==false){ lastOkAt=Date.now(); failCount=0; setOnline(true); }
          else return healthPing().then(function(){ return ok; });
          return ok;
        }).catch(function(e){
          return healthPing().then(function(){ throw e; });
        });
      };
    }
    if(typeof _push==='function'){
      api.push=function(){
        return Promise.resolve(_push.apply(api,arguments)).then(function(ok){
          if(ok!==false){ lastOkAt=Date.now(); failCount=0; setOnline(true); }
          else healthPing();
          return ok;
        }).catch(function(){ healthPing(); return false; });
      };
    }
    if(typeof _sync==='function'){
      api.sync=function(){
        return Promise.resolve(_sync.apply(api,arguments)).then(function(ok){
          if(ok!==false){ lastOkAt=Date.now(); failCount=0; setOnline(true); }
          return ok;
        }).catch(function(){ healthPing(); return false; });
      };
    }
    api._resilient=true;
    api.health=healthPing;
  }

  function ensureSavePush(){
    try{
      if(typeof schedulePush==='function'){
        if(typeof saveProfile==='function'){
          var src=String(saveProfile);
          if(src.indexOf('schedulePush')<0 && src.indexOf('__sarinaSync')<0 && src.indexOf('lsSave')>=0){
            var _save=saveProfile;
            saveProfile=function(){
              try{ _save.apply(this,arguments); }catch(e){}
              try{ schedulePush(); }catch(e2){}
            };
          }
        }
      }else if(window.__sarinaSync && typeof window.__sarinaSync.push==='function'){
        if(typeof saveProfile==='function'){
          var _s2=saveProfile;
          saveProfile=function(){
            try{ _s2.apply(this,arguments); }catch(e){}
            try{ window.__sarinaSync.push(); }catch(e2){}
          };
        }
      }
    }catch(e){}
  }

  function boot(){
    wrapSync();
    ensureSavePush();
    healthPing().then(function(ok){
      if(ok && window.__sarinaSync && typeof window.__sarinaSync.pull==='function'){
        try{ window.__sarinaSync.pull(); }catch(e){}
      }
    });
    setInterval(function(){ healthPing(); }, 12000);
    setTimeout(wrapSync, 800);
    setTimeout(wrapSync, 2000);
    setTimeout(ensureSavePush, 900);
  }

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 600); });
  else setTimeout(boot, 600);

  console.log('sync-resilience-v31 loaded');
})();
