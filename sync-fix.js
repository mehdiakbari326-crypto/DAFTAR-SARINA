/* Sync v23 — deletes stick: settings lists use local on push (no pickLonger)
 * - saveProfile → coalesced push to Cloudflare
 * - never pull while dirty/grace
 * - days merge; tasks/rewards/health/behaviors = local wins on push
 * - health probe on boot; soft offline on blip
 */
(function(){
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var writing=false, pushTimer=null, pullTimer=null;
  var lastSig='', lastRemoteAt=0, online=false, lastSummary='';
  var bootId=String(Date.now()), busy=false, dirty=false;
  var localEditUntil=0;

  function toast(msg){
    try{ if(typeof showToast==='function'){ showToast(msg); return; } }catch(e){}
    try{
      var el=document.createElement('div'); el.className='toast'; el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){try{el.remove()}catch(e){}},2800);
    }catch(e){}
  }
  function setDot(on){
    online=!!on;
    try{
      if(typeof syncStatus!=='undefined') syncStatus=on?'online':'offline';
      if(typeof updateSyncDot==='function') updateSyncDot();
      document.querySelectorAll('.sync-dot,#syncDot').forEach(function(d){
        d.classList.toggle('on',!!on); d.classList.toggle('off',!on);
        try{ d.style.background = on ? '#3ddc97' : '#ff6b6b'; }catch(e){}
      });
    }catch(e){}
  }
  function getCloudBase(){
    try{ var s=localStorage.getItem(CFG_KEY); if(s && String(s).indexOf('https://')===0) return String(s).replace(/\/+$/,''); }catch(e){}
    if(typeof window.CLOUD_API==='string'&&window.CLOUD_API && window.CLOUD_API.indexOf('https://')===0) return window.CLOUD_API.replace(/\/+$/,'');
    return DEFAULT_CLOUD;
  }
  function cloudUrl(){ var b=getCloudBase(); return b?(b+'/family/sarina'):''; }
  function clone(o){ try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return o; } }
  function loadTheme(){ try{return localStorage.getItem(THEME_KEY)}catch(e){return null} }
  function saveTheme(t){ try{if(t)localStorage.setItem(THEME_KEY,t)}catch(e){} }
  function applyThemeLocal(){
    var t=loadTheme();
    if(t&&typeof S!=='undefined'){ S.theme=t; if(typeof applyTheme==='function') applyTheme(); }
  }
  function inGrace(){ return Date.now() < localEditUntil; }

  function sharedFrom(Sref){
    return {
      name: Sref.name || 'سارینا',
      tasks: clone(Sref.tasks || []),
      days: clone(Sref.days || {}),
      rewards: clone(Sref.rewards || []),
      claims: clone(Sref.claims || []),
      goal: (Sref.goal != null ? Sref.goal : 15),
      parentTasks: clone(Sref.parentTasks || []),
      parentPin: Sref.parentPin || '1234',
      posBehaviors: clone(Sref.posBehaviors || []),
      negBehaviors: clone(Sref.negBehaviors || []),
      streak: Sref.streak || 0,
      lastActive: Sref.lastActive || '',
      pendingChanges: clone(Sref.pendingChanges || []),
      healthItems: clone(Sref.healthItems || []),
      play: clone(Sref.play || {}),
      _daysResetAt: clone(Sref._daysResetAt || {}),
      _claimsResetAt: Sref._claimsResetAt || 0
    };
  }

  function sigOf(r){
    try{
      return JSON.stringify({
        t:(r.tasks||[]).map(function(x){return x.id+':'+(x.title||'');}),
        d:Object.keys(r.days||{}).sort().map(function(k){
          var day=(r.days||{})[k]||{};
          return k+':'+JSON.stringify(day.tasks||{})+':'+JSON.stringify(day.behaviors||{})+':'+(day.weight!=null?day.weight:'');
        }),
        rw:(r.rewards||[]).map(function(x){return x.id+':'+(x.t||'')+':'+(x.c||0);}),
        h:(r.healthItems||[]).map(function(x){return x.id+':'+(x.cooldownDays||0)+':'+(x.lastDate||'');}),
        g:r.goal, cl:(r.claims||[]).length, p:(r.pendingChanges||[]).length
      });
    }catch(e){ return String(Date.now()); }
  }

  function summarize(r){
    return 'تسک '+(r.tasks&&r.tasks.length||0)+' | روز '+(r.days?Object.keys(r.days).length:0)+' | پاداش '+(r.rewards&&r.rewards.length||0);
  }

  function applyRemote(r){
    if(!r || typeof r!=='object') return false;
    if(!r.tasks && !r.days) return false;
    S.name = r.name != null ? r.name : (S.name || 'سارینا');
    S.tasks = Array.isArray(r.tasks) ? clone(r.tasks) : (S.tasks||[]);
    S.days = r.days && typeof r.days==='object' ? clone(r.days) : (S.days||{});
    S.rewards = Array.isArray(r.rewards) ? clone(r.rewards) : (S.rewards||[]);
    S.claims = Array.isArray(r.claims) ? clone(r.claims) : (S.claims||[]);
    S.goal = r.goal != null ? r.goal : (S.goal!=null?S.goal:15);
    S.parentTasks = Array.isArray(r.parentTasks) ? clone(r.parentTasks) : (S.parentTasks||[]);
    S.parentPin = r.parentPin || S.parentPin || '1234';
    S.posBehaviors = Array.isArray(r.posBehaviors) ? clone(r.posBehaviors) : (S.posBehaviors||[]);
    S.negBehaviors = Array.isArray(r.negBehaviors) ? clone(r.negBehaviors) : (S.negBehaviors||[]);
    S.streak = r.streak != null ? r.streak : (S.streak||0);
    S.lastActive = r.lastActive || S.lastActive || '';
    S.pendingChanges = Array.isArray(r.pendingChanges) ? clone(r.pendingChanges) : (S.pendingChanges||[]);
    S.healthItems = Array.isArray(r.healthItems) ? clone(r.healthItems) : (S.healthItems||[]);
    if(r.play && typeof r.play==='object') S.play = clone(r.play);
    if(r._daysResetAt) S._daysResetAt = clone(r._daysResetAt);
    if(r._claimsResetAt) S._claimsResetAt = r._claimsResetAt;
    applyThemeLocal();
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    lastSummary = summarize(r);
    return true;
  }

  function mergeDays(a, b){
    var out={}, keys={};
    Object.keys(a||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(b||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){
      var da=(a&&a[k])||{}, db=(b&&b[k])||{};
      var tasks=Object.assign({}, da.tasks||{}, db.tasks||{});
      var seen={}, notes=[];
      ((da.notes)||[]).concat((db.notes)||[]).forEach(function(n){
        var id=n&&n.id; if(id&&seen[id]) return; if(id) seen[id]=1; notes.push(n);
      });
      var weight = db.weight!=null ? db.weight : da.weight;
      var behaviors=Object.assign({}, da.behaviors||{}, db.behaviors||{});
      out[k]={tasks:tasks, notes:notes};
      if(weight!=null) out[k].weight=weight;
      if(Object.keys(behaviors).length) out[k].behaviors=behaviors;
    });
    return out;
  }

  function httpGet(url){
    return fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(), {
      method:'GET', headers:{'Accept':'application/json'}, cache:'no-store'
    }).then(function(res){ if(!res.ok) throw new Error('GET '+res.status); return res.json(); });
  }
  function httpPut(url, body){
    return fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(body)
    }).then(function(res){ if(!res.ok) throw new Error('PUT '+res.status); return res.json(); });
  }

  function pull(showMsg){
    var url=cloudUrl();
    if(!url){ if(showMsg) toast('آدرس ابر خالی'); setDot(false); return Promise.resolve(false); }
    if(!showMsg && (dirty || writing || inGrace())){
      if(dirty && !writing) schedulePush();
      return Promise.resolve(false);
    }
    return httpGet(url).then(function(remote){
      setDot(true);
      if(!remote || (!remote.tasks && !remote.days)){
        if(showMsg) toast('ابر خالی است');
        return false;
      }
      if(dirty || inGrace()){
        remote = clone(remote);
        remote.days = mergeDays(remote.days||{}, (S&&S.days)||{});
        remote.tasks = S.tasks;
        remote.rewards = S.rewards;
        remote.healthItems = S.healthItems;
        remote.posBehaviors = S.posBehaviors;
        remote.negBehaviors = S.negBehaviors;
        remote.goal = S.goal;
      }
      var remoteAt = remote._updatedAt || 0;
      var changed = sigOf(remote) !== lastSig || remoteAt > lastRemoteAt;
      applyRemote(remote);
      lastSig = sigOf(S);
      lastRemoteAt = Math.max(lastRemoteAt, remoteAt);
      window.__sarinaHydrated = true;
      if(changed || showMsg){ try{ if(typeof render==='function') render(); }catch(e){} }
      if(showMsg) toast('✓ دریافت — '+summarize(remote));
      if(dirty) schedulePush();
      return true;
    }).catch(function(){
      if(lastRemoteAt && (Date.now()-lastRemoteAt)<20000){ /* keep green */ }
      else setDot(false);
      if(showMsg) toast('خطا دریافت');
      return false;
    });
  }

  function push(){
    if(writing) return Promise.resolve(false);
    var url=cloudUrl();
    if(!url) return Promise.resolve(false);
    var localSnapshot = sharedFrom(S);
    if(!localSnapshot) return Promise.resolve(false);
    // allow push even with empty tasks so health/claims still sync

    writing=true;
    return httpGet(url).then(function(remote){
      setDot(true);
      remote = remote || {};
      var payload = clone(localSnapshot);
      payload.days = mergeDays(remote.days||{}, localSnapshot.days||{});
      try{
        var map={};
        (remote.pendingChanges||[]).concat(payload.pendingChanges||[]).forEach(function(p){ if(p&&p.id) map[p.id]=p; });
        payload.pendingChanges=Object.keys(map).map(function(k){return map[k];});
      }catch(e){}
      payload._updatedAt = Date.now();
      payload._device = bootId;

      return httpPut(url, payload).then(function(saved){
        writing=false;
        dirty=false;
        if(saved && typeof saved==='object'){
          saved = clone(saved);
          saved.days = mergeDays(saved.days||{}, localSnapshot.days||{});
          saved.tasks = localSnapshot.tasks;
          saved.rewards = localSnapshot.rewards;
          saved.healthItems = localSnapshot.healthItems;
          saved.posBehaviors = localSnapshot.posBehaviors;
          saved.negBehaviors = localSnapshot.negBehaviors;
          applyRemote(saved);
          lastSig = sigOf(saved);
          lastRemoteAt = saved._updatedAt || payload._updatedAt;
          lastSummary = summarize(saved);
        }else{
          applyRemote(payload);
          lastSig = sigOf(payload);
          lastRemoteAt = payload._updatedAt;
          lastSummary = summarize(payload);
        }
        localEditUntil = Date.now() + 12000;
        setDot(true);
        try{ if(typeof render==='function') render(); }catch(e){}
        return true;
      });
    }).catch(function(){
      writing=false;
      if(lastRemoteAt && (Date.now()-lastRemoteAt)<20000){ /* keep */ }
      else setDot(false);
      dirty=true;
      setTimeout(function(){ if(dirty) push(); }, 2500);
      return false;
    });
  }

  function schedulePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S && S.theme) saveTheme(S.theme);
    dirty = true;
    localEditUntil = Date.now() + 20000;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function(){ push(); }, 180);
  }

  function hardReset(){
    toast('بازنشانی از ابر...');
    var role='', theme=loadTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{ localStorage.removeItem('daftar-sarina-v9'); localStorage.removeItem('daftar-sarina-backup-v9'); }catch(e){}
    dirty=false; localEditUntil=0; lastSig=''; lastRemoteAt=0;
    return pull(true).then(function(ok){
      try{
        if(role){ localStorage.setItem('daftar-device-role-v2',role); localStorage.setItem('daftar-device-role-backup',role); }
        if(theme) saveTheme(theme);
      }catch(e){}
      if(ok) setTimeout(function(){ try{ location.reload(); }catch(e){} }, 350);
      return ok;
    });
  }

  function fullSync(showMsg){
    if(busy) return Promise.resolve(false);
    busy=true;
    if(showMsg) toast('همگام‌سازی...');
    var chain = dirty ? push() : Promise.resolve(true);
    return chain.then(function(){
      dirty=false; localEditUntil=0;
      return pull(!!showMsg);
    }).then(function(ok){
      if(showMsg) toast(ok?('✓ '+lastSummary):'انجام شد');
      try{ if(typeof render==='function') render(); }catch(e){}
      busy=false; return ok;
    }).catch(function(){ busy=false; return false; });
  }

  function startForegroundPull(){
    if(pullTimer) clearInterval(pullTimer);
    pullTimer=setInterval(function(){
      if(document.visibilityState!=='visible') return;
      if(dirty || writing || inGrace()) return;
      pull(false);
    }, 8000);
  }

  saveProfile = function(){ schedulePush(); };
  startFirebaseSync = function(){ try{ syncStatus='online'; updateSyncDot(); setDot(true); }catch(e){} };

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='push-cloud'){ e.preventDefault(); e.stopPropagation(); dirty=true; localEditUntil=Date.now()+20000; push().then(function(ok){ toast(ok?('✓ '+lastSummary):'ارسال نشد'); }); }
    if(a==='pull-cloud' || a==='sync-cloud'){ e.preventDefault(); e.stopPropagation(); fullSync(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardReset(); }
    if(a==='set-cloud'){
      e.preventDefault(); e.stopPropagation();
      var u=prompt('آدرس Worker:', getCloudBase());
      if(!u) return;
      u=String(u).trim().replace(/\/+$/,'');
      if(u.indexOf('https://')!==0){ toast('باید https باشد'); return; }
      try{ localStorage.setItem(CFG_KEY,u); }catch(e){}
      window.CLOUD_API=u; hardReset();
    }
    if(a==='mark' || a==='mark-beh' || a==='claim' || a==='del-note' || a==='del-task-perm' || a==='del-reward' || a==='del-health' || a==='del-pos-beh' || a==='del-neg-beh'){
      dirty=true; localEditUntil=Date.now()+20000;
    }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 40); }
  }, true);

  function boot(){
    applyThemeLocal();
    try{
      if(!localStorage.getItem(CFG_KEY)) localStorage.setItem(CFG_KEY, DEFAULT_CLOUD);
    }catch(e){}
    try{
      if(typeof db!=='undefined'&&db&&db.ref){
        try{ db.ref('family/sarina').off(); }catch(e){}
      }
    }catch(e){}
    var tries=0;
    (function wait(){
      tries++;
      if(typeof S==='undefined'){ if(tries<60) return setTimeout(wait,100); }
      dirty=false; localEditUntil=0;
      try{
        var hb=(getCloudBase()||DEFAULT_CLOUD)+'/health?t='+Date.now();
        fetch(hb,{cache:'no-store'}).then(function(r){ if(r.ok) setDot(true); }).catch(function(){});
      }catch(e){}
      pull(false).then(function(ok){ dirty=false; if(ok) setDot(true); });
      startForegroundPull();
      document.addEventListener('visibilitychange', function(){
        if(document.visibilityState==='visible'){
          if(!dirty && !inGrace()) pull(false);
          startForegroundPull();
        }
      });
      try{ window.addEventListener('online', function(){ setTimeout(function(){ if(dirty) push(); else pull(false); }, 300); }); }catch(e){}
    })();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 500); });
  else setTimeout(boot, 500);

  window.__sarinaSync={
    pull:function(){return pull(true)},
    push:function(){ dirty=true; localEditUntil=Date.now()+20000; return push(); },
    sync:function(){return fullSync(true)},
    hard:hardReset,
    online:function(){return online},
    summary:function(){return lastSummary}
  };
  console.log('sync-fix v23: health probe + soft offline');
})();
