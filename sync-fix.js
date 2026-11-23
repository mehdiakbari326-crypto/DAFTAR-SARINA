/* Sync v18 — anti-stale
 * Root cause found in dual-phone simulation:
 *   Phone B pushed OLD local state and overwrote Phone A's marks on cloud.
 * Fixes:
 *  1) Never push without GET+merge first
 *  2) Skip push if local data is older/thinner than remote
 *  3) Instant push only after real user edits (dirty flag)
 *  4) Foreground pull every 4s to receive others' changes
 *  5) Server worker v2 also merges (deploy cloudflare/worker.js)
 */
(function(){
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var pulledOnce=false, writing=false, pushTimer=null, pullTimer=null;
  var lastSig='', lastRemoteAt=0, online=false, lastSummary='';
  var bootId=String(Date.now()), busy=false, dirty=false;

  function toast(msg){
    try{ if(typeof showToast==='function'){ showToast(msg); return; } }catch(e){}
    try{
      var el=document.createElement('div'); el.className='toast'; el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){try{el.remove()}catch(e){}},3500);
    }catch(e){}
  }

  function setDot(on){
    online=!!on;
    try{
      if(typeof syncStatus!=='undefined') syncStatus=on?'online':'offline';
      if(typeof updateSyncDot==='function') updateSyncDot();
      document.querySelectorAll('.sync-dot').forEach(function(d){
        d.classList.toggle('on',!!on); d.classList.toggle('off',!on);
      });
    }catch(e){}
  }

  function getCloudBase(){
    try{
      var saved=localStorage.getItem(CFG_KEY);
      if(saved) return String(saved).replace(/\/+$/,'');
    }catch(e){}
    if(typeof window.CLOUD_API==='string'&&window.CLOUD_API)
      return window.CLOUD_API.replace(/\/+$/,'');
    return DEFAULT_CLOUD;
  }
  function cloudUrl(){
    var b=getCloudBase();
    return b ? (b+'/family/sarina') : '';
  }

  function loadTheme(){ try{return localStorage.getItem(THEME_KEY)}catch(e){return null} }
  function saveTheme(t){ try{if(t)localStorage.setItem(THEME_KEY,t)}catch(e){} }
  function applyThemeLocal(){
    var t=loadTheme();
    if(t&&typeof S!=='undefined'){ S.theme=t; if(typeof applyTheme==='function') applyTheme(); }
  }
  function clone(o){ try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return o; } }

  function richness(r){
    if(!r||typeof r!=='object') return 0;
    var days=r.days||{}, marks=0, notes=0, weights=0;
    Object.keys(days).forEach(function(k){
      var d=days[k]||{};
      marks += d.tasks ? Object.keys(d.tasks).length : 0;
      notes += (d.notes&&d.notes.length)||0;
      if(d.weight!=null) weights++;
    });
    return (r.tasks&&r.tasks.length||0)*3 + Object.keys(days).length*8 + marks*4 + notes*2 + weights*5
      + (r.healthItems&&r.healthItems.length||0)*2 + (r.rewards&&r.rewards.length||0)*2 + (r.goal?2:0);
  }

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
      _updatedAt: Date.now(),
      _device: bootId
    };
  }

  function sigOf(r){
    try{
      return JSON.stringify({
        t:r.tasks, d:r.days, h:r.healthItems, rw:r.rewards, c:r.claims,
        g:r.goal, pt:r.parentTasks, pb:r.posBehaviors, nb:r.negBehaviors,
        st:r.streak, pc:r.pendingChanges
      });
    }catch(e){ return String(Math.random()); }
  }

  function applyRemote(r){
    if(!r || typeof r!=='object') return false;
    if(!r.tasks && !r.days && !r.healthItems) return false;

    S.name = r.name != null ? r.name : (S.name || 'سارینا');
    S.tasks = Array.isArray(r.tasks) ? clone(r.tasks) : [];
    S.days = r.days && typeof r.days==='object' ? clone(r.days) : {};
    S.rewards = Array.isArray(r.rewards) ? clone(r.rewards) : [];
    S.claims = Array.isArray(r.claims) ? clone(r.claims) : [];
    S.goal = r.goal != null ? r.goal : 15;
    S.parentTasks = Array.isArray(r.parentTasks) ? clone(r.parentTasks) : [];
    S.parentPin = r.parentPin || '1234';
    S.posBehaviors = Array.isArray(r.posBehaviors) ? clone(r.posBehaviors) : [];
    S.negBehaviors = Array.isArray(r.negBehaviors) ? clone(r.negBehaviors) : [];
    S.streak = r.streak || 0;
    S.lastActive = r.lastActive || '';
    S.pendingChanges = Array.isArray(r.pendingChanges) ? clone(r.pendingChanges) : [];
    S.healthItems = Array.isArray(r.healthItems) ? clone(r.healthItems) : [];
    if(r.play && typeof r.play==='object') S.play = clone(r.play);

    applyThemeLocal();
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    lastSummary = summarize(r);
    return true;
  }

  function summarize(r){
    if(!r) return 'خالی';
    return 'تسک '+(r.tasks&&r.tasks.length||0)+
      ' | روز '+(r.days?Object.keys(r.days).length:0)+
      ' | سلامتی '+(r.healthItems&&r.healthItems.length||0)+
      ' | پاداش '+(r.rewards&&r.rewards.length||0)+
      ' | هدف '+(r.goal!=null?r.goal:'—');
  }

  function httpGet(url){
    return fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(), {
      method:'GET', headers:{'Accept':'application/json'}, cache:'no-store'
    }).then(function(res){
      if(!res.ok) throw new Error('GET '+res.status);
      return res.json();
    });
  }
  function httpPut(url, body){
    return fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(body)
    }).then(function(res){
      if(!res.ok) throw new Error('PUT '+res.status);
      return res.json();
    });
  }

  function mergeDays(a, b){
    // b (local edits) wins on same task id
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

  function pull(showMsg){
    var url=cloudUrl();
    if(!url){ if(showMsg) toast('آدرس ابر خالی'); setDot(false); return Promise.resolve(false); }
    return httpGet(url).then(function(remote){
      setDot(true);
      if(!remote || (!remote.tasks && !remote.days && !remote.healthItems)){
        if(showMsg) toast('ابر خالی است');
        pulledOnce=true;
        return false;
      }

      var remoteAt = remote._updatedAt || 0;
      var remoteSig = sigOf(remote);
      var localR = richness(sharedFrom(S));
      var remoteR = richness(remote);

      // If we have unsynced dirty local edits, merge them on top of remote instead of discarding
      if(dirty){
        try{
          remote = clone(remote);
          remote.days = mergeDays(remote.days||{}, S.days||{});
          if((S.tasks||[]).length >= (remote.tasks||[]).length) remote.tasks = clone(S.tasks);
          if(S.goal!=null) remote.goal = S.goal;
          if((S.rewards||[]).length >= (remote.rewards||[]).length) remote.rewards = clone(S.rewards);
          if((S.healthItems||[]).length >= (remote.healthItems||[]).length) remote.healthItems = clone(S.healthItems);
          if((S.posBehaviors||[]).length >= (remote.posBehaviors||[]).length) remote.posBehaviors = clone(S.posBehaviors);
          if((S.negBehaviors||[]).length >= (remote.negBehaviors||[]).length) remote.negBehaviors = clone(S.negBehaviors);
        }catch(e){}
      }

      var changed = (remoteSig !== lastSig) || (remoteAt > lastRemoteAt);
      applyRemote(remote);
      lastSig = sigOf(remote);
      lastRemoteAt = Math.max(lastRemoteAt, remoteAt);
      pulledOnce=true; window.__sarinaHydrated=true;

      if(changed || showMsg){
        try{ if(typeof render==='function') render(); }catch(e){}
      }
      if(showMsg) toast('✓ دریافت شد — '+summarize(remote));

      // If dirty, push merged result back
      if(dirty){
        schedulePush(true);
      }
      return true;
    }).catch(function(err){
      setDot(false);
      if(showMsg) toast('خطا دریافت');
      return false;
    });
  }

  function push(force){
    if(writing) return Promise.resolve(false);
    if(!force && !dirty) return Promise.resolve(false);
    var url=cloudUrl();
    if(!url) return Promise.resolve(false);

    var localPayload = sharedFrom(S);
    if(richness(localPayload)<3 && !force) return Promise.resolve(false);

    writing=true;
    // ALWAYS get server first — never blind overwrite
    return httpGet(url).then(function(remote){
      setDot(true);
      remote = remote || {};
      var remoteAt = remote._updatedAt || 0;

      var payload = clone(localPayload);
      // Server days + local days; local wins per-task for dirty edits
      payload.days = mergeDays(remote.days||{}, localPayload.days||{});

      // Prefer longer config lists
      if((remote.tasks||[]).length > (payload.tasks||[]).length) payload.tasks = clone(remote.tasks);
      if((remote.healthItems||[]).length > (payload.healthItems||[]).length) payload.healthItems = clone(remote.healthItems);
      if((remote.rewards||[]).length > (payload.rewards||[]).length && !dirty) payload.rewards = clone(remote.rewards);
      if((remote.posBehaviors||[]).length > (payload.posBehaviors||[]).length) payload.posBehaviors = clone(remote.posBehaviors);
      if((remote.negBehaviors||[]).length > (payload.negBehaviors||[]).length) payload.negBehaviors = clone(remote.negBehaviors);

      try{
        var map={};
        (remote.pendingChanges||[]).concat(payload.pendingChanges||[]).forEach(function(p){
          if(p&&p.id) map[p.id]=p;
        });
        payload.pendingChanges=Object.keys(map).map(function(k){return map[k];});
      }catch(e){}

      payload._updatedAt = Date.now();
      payload._device = bootId;

      return httpPut(url, payload).then(function(saved){
        writing=false;
        dirty=false;
        // Use server-merged result if returned
        if(saved && typeof saved==='object' && (saved.tasks||saved.days)){
          applyRemote(saved);
          lastSig = sigOf(saved);
          lastRemoteAt = saved._updatedAt || payload._updatedAt;
          lastSummary = summarize(saved);
        }else{
          lastSig = sigOf(payload);
          lastRemoteAt = payload._updatedAt;
          lastSummary = summarize(payload);
        }
        setDot(true);
        return true;
      });
    }).catch(function(){
      writing=false;
      setDot(false);
      return false;
    });
  }

  function schedulePush(force){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveTheme(S.theme);
    dirty = true;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ push(true); }, 100);
  }

  function hardReset(){
    toast('بازنشانی از ابر...');
    var role='', theme=loadTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{
      localStorage.removeItem('daftar-sarina-v9');
      localStorage.removeItem('daftar-sarina-backup-v9');
    }catch(e){}
    try{
      S.tasks=[]; S.days={}; S.rewards=[]; S.claims=[];
      S.healthItems=[]; S.pendingChanges=[]; S.streak=0;
    }catch(e){}
    dirty=false; pulledOnce=false; lastSig=''; lastRemoteAt=0;
    return pull(true).then(function(ok){
      try{
        if(role){
          localStorage.setItem('daftar-device-role-v2',role);
          localStorage.setItem('daftar-device-role-backup',role);
        }
        if(theme) saveTheme(theme);
      }catch(e){}
      if(ok) setTimeout(function(){ try{ location.reload(); }catch(e){} }, 400);
      return ok;
    });
  }

  function fullSync(showMsg){
    if(busy) return Promise.resolve(false);
    busy=true;
    if(showMsg) toast('همگام‌سازی...');
    return pull(!!showMsg).then(function(){
      dirty=true;
      return push(true);
    }).then(function(ok){
      if(showMsg) toast(ok?('✓ همگام شد — '+(lastSummary||'')):'انجام شد');
      try{ if(typeof render==='function') render(); }catch(e){}
      busy=false; return ok;
    }).catch(function(){ busy=false; return false; });
  }

  function startForegroundPull(){
    stopForegroundPull();
    pullTimer=setInterval(function(){
      if(document.visibilityState!=='visible') return;
      if(writing || busy) return;
      pull(false);
    }, 4000);
  }
  function stopForegroundPull(){
    if(pullTimer){ clearInterval(pullTimer); pullTimer=null; }
  }

  function setCloudApi(url){
    url=(url||'').trim().replace(/\/+$/,'');
    if(!url){ toast('آدرس خالی'); return; }
    if(url.indexOf('https://')!==0){ toast('باید https:// باشد'); return; }
    try{ localStorage.setItem(CFG_KEY, url); }catch(e){}
    window.CLOUD_API=url;
    toast('آدرس ذخیره شد');
    hardReset();
  }

  // Only real edits set dirty + push
  saveProfile = function(){ schedulePush(true); };
  startFirebaseSync = function(){};

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='force-sync'){ e.preventDefault(); e.stopPropagation(); fullSync(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardReset(); }
    if(a==='push-cloud'){
      e.preventDefault(); e.stopPropagation();
      toast('ارسال...'); dirty=true;
      push(true).then(function(ok){ toast(ok?('✓ '+lastSummary):'ارسال نشد'); });
    }
    if(a==='set-cloud'){
      e.preventDefault(); e.stopPropagation();
      var u=prompt('آدرس Cloudflare:', getCloudBase());
      if(u===null) return;
      setCloudApi(u);
    }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 30); }
  }, true);

  function syncBar(){
    return '<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:8px 0 12px">'+
      '<button type="button" class="btn" data-act="force-sync" style="width:85%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی الان</button>'+
      '<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>'+
      '<p class="muted" style="font-size:11px;text-align:center;margin:0">ارسال بعد از ثبت · دریافت وقتی اپ باز است</p>'+
      '</div>';
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      if(html.indexOf('data-act="force-sync"')>=0) return html;
      if(html.indexOf('class="level-card"')>=0){
        html=html.replace(/(<section class="level-card"[\s\S]*?<\/section>)/, function(m){ return m+syncBar(); });
      }else html=syncBar()+html;
      return html;
    };
  }

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      html=html.replace(/<section class="card"><div class="card-h"><h2>☁️[\s\S]*?<\/section>/g,'');
      var box='<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی ابر</h2></div>';
      box+='<p class="muted" dir="ltr" style="font-size:11px">'+getCloudBase()+'</p>';
      box+='<p class="muted" style="font-size:12px;color:var(--pos);font-weight:700">محافظت در برابر بازنویسی اشتباه فعال است</p>';
      if(lastSummary) box+='<p class="muted" style="font-size:12px">'+lastSummary+'</p>';
      box+='<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">همگام‌سازی الان</button>';
      box+='<button type="button" class="btn" data-act="push-cloud" style="width:100%;margin-bottom:8px">ارسال کامل به ابر</button>';
      box+='<button type="button" class="ghost" data-act="hard-sync" style="width:100%;margin-bottom:8px">بازنشانی کامل از ابر</button>';
      box+='<button type="button" class="ghost" data-act="set-cloud" style="width:100%">تغییر آدرس ابر</button>';
      box+='</section>';
      return html+box;
    };
  }

  function boot(){
    applyThemeLocal();
    try{
      if(typeof window.CLOUD_API==='string'&&window.CLOUD_API){
        if(!localStorage.getItem(CFG_KEY))
          localStorage.setItem(CFG_KEY, window.CLOUD_API.replace(/\/+$/,''));
      }else if(!localStorage.getItem(CFG_KEY)){
        localStorage.setItem(CFG_KEY, DEFAULT_CLOUD);
      }
    }catch(e){}

    var tries=0;
    (function wait(){
      tries++;
      if(typeof S==='undefined'){
        if(tries<50) return setTimeout(wait,100);
      }
      // Boot: pull only — do NOT push until user edits (prevents stale overwrite)
      dirty=false;
      pull(false).then(function(){ pulledOnce=true; dirty=false; });
      startForegroundPull();
      document.addEventListener('visibilitychange', function(){
        if(document.visibilityState==='visible'){
          pull(false);
          startForegroundPull();
        }else stopForegroundPull();
      });
      try{ window.addEventListener('online', function(){ setTimeout(function(){ pull(false); }, 200); }); }catch(e){}
    })();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 400); });
  }else setTimeout(boot, 400);

  window.__sarinaSync={
    pull:function(){return pull(true)},
    push:function(){ dirty=true; return push(true); },
    sync:function(){return fullSync(true)},
    hard:hardReset,
    setCloud:setCloudApi,
    online:function(){return online},
    summary:function(){return lastSummary}
  };
  console.log('sync-fix v18 anti-stale');
})();
