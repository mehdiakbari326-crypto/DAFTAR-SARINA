/* Sync v17
 * - Instant PUSH after every local change (saveProfile)
 * - While app is visible: PULL every 4s so other phones' changes appear
 * - Background/idle: no traffic
 * - Cloud already has correct data; receive path was the gap
 */
(function(){
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var pulledOnce=false, writing=false, pushTimer=null, pullTimer=null;
  var lastSig='', lastRemoteAt=0, online=false, lastSummary='', quietUntil=0;
  var bootId=String(Date.now()), busy=false;

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
      // exclude _updatedAt so we detect real data changes
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
      ' | پاداش '+(r.rewards&&r.rewards.length||0);
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
    var out={}, keys={};
    Object.keys(a||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(b||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){
      var da=(a&&a[k])||{}, db=(b&&b[k])||{};
      // Always union task maps; prefer done > missed > unset
      var tasks={};
      Object.assign(tasks, da.tasks||{}, db.tasks||{});
      Object.keys(da.tasks||{}).forEach(function(tid){
        var x=(da.tasks||{})[tid], y=(db.tasks||{})[tid];
        if(x&&y){
          if(x.s==='done'||y.s==='done') tasks[tid]=Object.assign({},x,y,{s:'done'});
          else if(x.s==='missed'||y.s==='missed') tasks[tid]=Object.assign({},x,y,{s:'missed'});
          else tasks[tid]=Object.assign({},x,y);
        }else if(x && !y) tasks[tid]=clone(x);
        else if(y && !x) tasks[tid]=clone(y);
      });
      Object.keys(db.tasks||{}).forEach(function(tid){
        if(!tasks[tid]) tasks[tid]=clone((db.tasks||{})[tid]);
      });
      var seen={}, notes=[];
      ((da.notes)||[]).concat((db.notes)||[]).forEach(function(n){
        var id=n&&n.id; if(id&&seen[id]) return; if(id) seen[id]=1; notes.push(n);
      });
      var weight = db.weight!=null ? db.weight : da.weight;
      var behaviors = Object.assign({}, da.behaviors||{}, db.behaviors||{});
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

      // If we have local edits newer and richer, push instead of clobber
      var localR = richness(sharedFrom(S));
      var remoteR = richness(remote);
      if(!showMsg && !writing && localR > remoteR + 20 && lastRemoteAt && remoteAt <= lastRemoteAt){
        pulledOnce=true;
        schedulePush(true);
        return true;
      }

      // Merge days so neither side loses marks
      try{
        if(S && S.days && remote.days){
          remote = clone(remote);
          remote.days = mergeDays(remote.days, S.days);
        }
      }catch(e){}

      var changed = (remoteSig !== lastSig) || (remoteAt > lastRemoteAt);
      applyRemote(remote);
      lastSig = sigOf(remote);
      lastRemoteAt = Math.max(lastRemoteAt, remoteAt, remote._updatedAt||0);
      pulledOnce=true; window.__sarinaHydrated=true;
      quietUntil = Date.now() + 300;

      if(changed || showMsg){
        try{ if(typeof render==='function') render(); }catch(e){}
      }
      if(showMsg) toast('✓ دریافت شد — '+summarize(remote));
      return true;
    }).catch(function(err){
      setDot(false);
      if(showMsg) toast('خطا دریافت: '+(err&&err.message||err));
      return false;
    });
  }

  function push(force){
    if(writing) return Promise.resolve(false);
    if(Date.now()<quietUntil && !force) return Promise.resolve(false);
    var url=cloudUrl();
    if(!url) return Promise.resolve(false);

    var localPayload = sharedFrom(S);
    if(richness(localPayload)<3 && !force) return Promise.resolve(false);

    writing=true;
    return httpGet(url).then(function(remote){
      setDot(true);
      remote = remote || {};
      var payload = clone(localPayload);

      // Merge with whatever is on server so we never wipe the other phone's marks
      if(remote.days) payload.days = mergeDays(remote.days, localPayload.days);
      if((remote.tasks||[]).length > (payload.tasks||[]).length) payload.tasks = clone(remote.tasks);
      if((remote.healthItems||[]).length > (payload.healthItems||[]).length) payload.healthItems = clone(remote.healthItems);
      if((remote.rewards||[]).length > (payload.rewards||[]).length) payload.rewards = clone(remote.rewards);
      if((remote.posBehaviors||[]).length > (payload.posBehaviors||[]).length) payload.posBehaviors = clone(remote.posBehaviors);
      if((remote.negBehaviors||[]).length > (payload.negBehaviors||[]).length) payload.negBehaviors = clone(remote.negBehaviors);
      if(remote.goal!=null && payload.goal==null) payload.goal = remote.goal;
      try{
        var map={};
        (remote.pendingChanges||[]).concat(payload.pendingChanges||[]).forEach(function(p){
          if(p&&p.id) map[p.id]=p;
        });
        payload.pendingChanges = Object.keys(map).map(function(k){return map[k];});
      }catch(e){}

      payload._updatedAt = Date.now();
      payload._device = bootId;

      var ns = sigOf(payload);
      // still put when force even if same (updates _updatedAt)
      return httpPut(url, payload).then(function(){
        writing=false;
        lastSig = ns;
        lastRemoteAt = payload._updatedAt;
        lastSummary = summarize(payload);
        setDot(true);
        return true;
      });
    }).catch(function(){
      // fallback direct put
      return httpPut(url, localPayload).then(function(){
        writing=false; setDot(true);
        lastSig=sigOf(localPayload);
        lastRemoteAt=localPayload._updatedAt;
        lastSummary=summarize(localPayload);
        return true;
      }).catch(function(e2){
        writing=false; setDot(false);
        if(force) toast('ارسال نشد');
        return false;
      });
    });
  }

  function schedulePush(force){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveTheme(S.theme);
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){
      quietUntil=0;
      push(true);
    }, 80); // near-instant after each change
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
    quietUntil=0; pulledOnce=false; lastSig=''; lastRemoteAt=0;
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
      quietUntil=0;
      return push(true);
    }).then(function(ok){
      if(showMsg) toast(ok?('✓ همگام شد — '+(lastSummary||'')):'انجام شد');
      try{ if(typeof render==='function') render(); }catch(e){}
      busy=false; return ok;
    }).catch(function(){ busy=false; return false; });
  }

  // Foreground-only receive loop (other phone's changes)
  function startForegroundPull(){
    stopForegroundPull();
    pullTimer = setInterval(function(){
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

  // Critical: every mutDay/save hits this → instant cloud push
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
      toast('ارسال...'); quietUntil=0;
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
      '<p class="muted" style="font-size:11px;text-align:center;margin:0">ارسال لحظه‌ای بعد از ثبت · دریافت وقتی اپ باز است</p>'+
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
      box+='<p class="muted" style="font-size:12px;color:var(--pos);font-weight:700">ارسال بلافاصله بعد از هر ثبت</p>';
      box+='<p class="muted" style="font-size:12px">دریافت خودکار فقط وقتی اپ روی صفحه است</p>';
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
      pull(false).then(function(){ pulledOnce=true; });
      startForegroundPull();
      document.addEventListener('visibilitychange', function(){
        if(document.visibilityState==='visible'){
          pull(false);
          startForegroundPull();
        }else{
          stopForegroundPull();
        }
      });
      try{
        window.addEventListener('online', function(){ setTimeout(function(){ pull(false); }, 200); });
      }catch(e){}
    })();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 400); });
  }else setTimeout(boot, 400);

  window.__sarinaSync={
    pull:function(){return pull(true)},
    push:function(){return push(true)},
    sync:function(){return fullSync(true)},
    hard:hardReset,
    setCloud:setCloudApi,
    online:function(){return online},
    summary:function(){return lastSummary}
  };
  console.log('sync-fix v17 instant-push + foreground-pull');
})();
