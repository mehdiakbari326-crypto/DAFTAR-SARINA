/* Sync v13: Cloudflare full snapshot — all fields guaranteed */
(function(){
  var FB_REST='https://sarina-daftar-default-rtdb.firebaseio.com/family/sarina.json';
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var hydrated=false, pulledOnce=false, writing=false, pushTimer=null, lastSig='', online=false;
  var lastSummary='';

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
      if(saved) return saved.replace(/\/+$/,'');
    }catch(e){}
    if(typeof window.CLOUD_API==='string'&&window.CLOUD_API){
      return window.CLOUD_API.replace(/\/+$/,'');
    }
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

  function clone(o){
    try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return o; }
  }

  /** Full shared family snapshot — everything devices must share */
  function sharedFrom(Sref){
    return {
      name: Sref.name || 'سارینا',
      tasks: clone(Sref.tasks || []),
      days: clone(Sref.days || {}),           // includes tasks status, notes, behaviors, weight
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
      _updatedAt: Date.now()
    };
  }

  function sigOf(r){
    try{
      return JSON.stringify({
        t:r.tasks, d:r.days, h:r.healthItems, rw:r.rewards, c:r.claims,
        g:r.goal, pt:r.parentTasks, pb:r.posBehaviors, nb:r.negBehaviors,
        st:r.streak, pc:r.pendingChanges, la:r.lastActive, u:r._updatedAt
      });
    }catch(e){ return String(Math.random()); }
  }

  function applyRemote(r){
    if(!r || typeof r!=='object') return false;
    if(!r.tasks && !r.days && !r.healthItems && r._ping) return false;

    S.name = r.name != null ? r.name : (S.name || 'سارینا');
    S.tasks = Array.isArray(r.tasks) ? clone(r.tasks) : (S.tasks || []);
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

    applyThemeLocal(); // theme stays per-device
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    lastSummary = inventory(r);
    return true;
  }

  function inventory(r){
    if(!r) return 'خالی';
    var days=r.days||{};
    var dayKeys=Object.keys(days);
    var weights=0, notes=0, beh=0, taskMarks=0;
    dayKeys.forEach(function(k){
      var d=days[k]||{};
      if(d.weight!=null) weights++;
      notes += (d.notes&&d.notes.length)||0;
      beh += d.behaviors ? Object.keys(d.behaviors).length : 0;
      taskMarks += d.tasks ? Object.keys(d.tasks).length : 0;
    });
    return [
      'تسک‌ها: '+(r.tasks&&r.tasks.length||0),
      'رفتار+: '+(r.posBehaviors&&r.posBehaviors.length||0),
      'رفتار−: '+(r.negBehaviors&&r.negBehaviors.length||0),
      'سلامتی: '+(r.healthItems&&r.healthItems.length||0),
      'پاداش: '+(r.rewards&&r.rewards.length||0),
      'روزها: '+dayKeys.length,
      'وزن: '+weights,
      'یادداشت: '+notes,
      'وضعیت‌رفتار: '+beh,
      'علامت‌تسک: '+taskMarks,
      'هدف: '+(r.goal!=null?r.goal:'—'),
      'درانتظار: '+(r.pendingChanges&&r.pendingChanges.length||0)
    ].join(' | ');
  }

  function summarize(r){
    if(!r) return 'خالی';
    return 'تسک '+(r.tasks&&r.tasks.length||0)+
      ' | رفتار '+( (r.posBehaviors&&r.posBehaviors.length||0)+(r.negBehaviors&&r.negBehaviors.length||0) )+
      ' | سلامتی '+(r.healthItems&&r.healthItems.length||0)+
      ' | روز '+(r.days?Object.keys(r.days).length:0)+
      ' | پاداش '+(r.rewards&&r.rewards.length||0)+
      ' | وزن '+countWeights(r);
  }

  function countWeights(r){
    var n=0; var days=r.days||{};
    Object.keys(days).forEach(function(k){ if(days[k]&&days[k].weight!=null) n++; });
    return n;
  }

  function isEmptyLocal(){
    try{
      var days=S.days?Object.keys(S.days).length:0;
      var tasks=S.tasks?S.tasks.length:0;
      return days===0 && tasks<=1;
    }catch(e){ return true; }
  }

  function httpGet(url){
    return fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(), {
      method:'GET', headers:{'Accept':'application/json'}, cache:'no-store'
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    });
  }

  function httpPut(url, body){
    return fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(body)
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    });
  }

  function pull(showMsg){
    var url=cloudUrl();
    if(!url){
      if(showMsg) toast('آدرس ابر تنظیم نشده');
      setDot(false);
      return Promise.resolve(false);
    }
    return httpGet(url).then(function(r){
      setDot(true);
      if(!r || (typeof r==='object' && !r.tasks && !r.healthItems && !r.days)){
        return migrateFromFirebase(showMsg);
      }
      var before=isEmptyLocal();
      applyRemote(r);
      lastSig=sigOf(r);
      hydrated=true; pulledOnce=true; window.__sarinaHydrated=true;
      try{ if(typeof render==='function') render(); }catch(e){}
      if(showMsg) toast('✓ همگام شد — '+summarize(r));
      if(before && !isEmptyLocal()){
        setTimeout(function(){ try{ location.reload(); }catch(e){} }, 400);
      }
      return true;
    }).catch(function(err){
      console.log('cloud pull fail', err);
      setDot(false);
      if(showMsg) toast('اتصال به ابر برقرار نشد');
      return false;
    });
  }

  function migrateFromFirebase(showMsg){
    return httpGet(FB_REST).then(function(r){
      if(!r||(!r.tasks&&!r.healthItems)){
        if(showMsg) toast('ابر خالی است');
        hydrated=true; pulledOnce=true;
        return false;
      }
      var url=cloudUrl();
      var payload=Object.assign({}, r);
      delete payload._ping;
      payload.claims = payload.claims || [];
      payload.parentTasks = payload.parentTasks || [];
      payload._updatedAt=Date.now();
      return httpPut(url, payload).then(function(){
        applyRemote(payload);
        lastSig=sigOf(payload);
        hydrated=true; pulledOnce=true;
        setDot(true);
        try{ if(typeof render==='function') render(); }catch(e){}
        if(showMsg) toast('✓ منتقل شد — '+summarize(payload));
        setTimeout(function(){ try{ location.reload(); }catch(e){} }, 500);
        return true;
      });
    }).catch(function(){
      if(showMsg) toast('مهاجرت انجام نشد (یک‌بار VPN برای Firebase)');
      hydrated=true; pulledOnce=true;
      return false;
    });
  }

  /** Full PUT snapshot so nested days/behaviors/weight never partially lag */
  function push(force){
    if(!pulledOnce && !force) return;
    if(isEmptyLocal() && !force) return;
    var url=cloudUrl();
    if(!url) return;
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    httpPut(url, payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
      lastSummary=inventory(payload);
      setDot(true);
      setTimeout(function(){ if(typeof ignoreRemote!=='undefined') ignoreRemote=false; }, 800);
      try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    }).catch(function(err){
      writing=false;
      if(typeof ignoreRemote!=='undefined') ignoreRemote=false;
      setDot(false);
      console.log('cloud push fail', err);
    });
  }

  function schedulePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveTheme(S.theme);
    if(!pulledOnce||isEmptyLocal()) return;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ push(false); }, 700);
  }

  function hardReset(){
    toast('در حال دریافت از ابر...');
    var role='', theme=loadTheme();
    try{ role=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||''; }catch(e){}
    try{
      localStorage.removeItem('daftar-sarina-v9');
      localStorage.removeItem('daftar-sarina-backup-v9');
    }catch(e){}
    return pull(true).then(function(ok){
      try{
        if(role){
          localStorage.setItem('daftar-device-role-v2',role);
          localStorage.setItem('daftar-device-role-backup',role);
        }
        if(theme) saveTheme(theme);
      }catch(e){}
      if(ok) setTimeout(function(){ try{ location.reload(); }catch(e){} }, 500);
      return ok;
    });
  }

  function setCloudApi(url){
    url=(url||'').trim().replace(/\/+$/,'');
    if(!url){ toast('آدرس خالی است'); return; }
    if(url.indexOf('https://')!==0){ toast('آدرس باید با https:// شروع شود'); return; }
    try{ localStorage.setItem(CFG_KEY, url); }catch(e){}
    window.CLOUD_API=url;
    toast('آدرس ابر ذخیره شد');
    pull(true);
  }

  saveProfile=function(){ schedulePush(); };
  startFirebaseSync=function(){};

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='force-sync'){ e.preventDefault(); e.stopPropagation(); toast('همگام‌سازی...'); pull(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardReset(); }
    if(a==='push-cloud'){ e.preventDefault(); e.stopPropagation(); toast('ارسال کامل به ابر...'); push(true); setTimeout(function(){ toast(lastSummary||'ارسال شد'); }, 900); }
    if(a==='set-cloud'){
      e.preventDefault(); e.stopPropagation();
      var cur=getCloudBase();
      var u=prompt('آدرس Cloudflare Worker:', cur);
      if(u===null) return;
      setCloudApi(u);
    }
    if(a==='migrate-fb'){
      e.preventDefault(); e.stopPropagation();
      toast('مهاجرت از Firebase...');
      migrateFromFirebase(true);
    }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 30); }
  }, true);

  function syncBar(){
    return '<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:8px 0 12px">'+
      '<button type="button" class="btn" data-act="force-sync" style="width:85%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی با ابر</button>'+
      '<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>'+
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
      var base=getCloudBase();
      var box='<section class="card"><div class="card-h"><h2>☁️ ابر (Cloudflare)</h2></div>';
      box+='<p class="muted">آدرس: <b dir="ltr" style="font-size:11px">'+(base||'—')+'</b></p>';
      if(lastSummary) box+='<p class="muted" style="font-size:11px;line-height:1.6">'+lastSummary+'</p>';
      box+='<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">دریافت از ابر</button>';
      box+='<button type="button" class="btn" data-act="push-cloud" style="width:100%;margin-bottom:8px">ارسال کامل به ابر</button>';
      box+='<button type="button" class="ghost" data-act="hard-sync" style="width:100%;margin-bottom:8px">بازنشانی کامل از ابر</button>';
      box+='<button type="button" class="ghost" data-act="set-cloud" style="width:100%;margin-bottom:8px">تغییر آدرس ابر</button>';
      box+='<button type="button" class="ghost" data-act="migrate-fb" style="width:100%">مهاجرت از Firebase</button>';
      box+='</section>';
      return html+box;
    };
  }

  function boot(){
    applyThemeLocal();
    try{
      if(typeof window.CLOUD_API==='string'&&window.CLOUD_API){
        if(!localStorage.getItem(CFG_KEY)) localStorage.setItem(CFG_KEY, window.CLOUD_API.replace(/\/+$/,''));
      }else if(!localStorage.getItem(CFG_KEY)){
        localStorage.setItem(CFG_KEY, DEFAULT_CLOUD);
      }
    }catch(e){}
    pull(false);
    setInterval(function(){ if(!writing) pull(false); }, 5000);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='visible') pull(false);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 300); });
  }else setTimeout(boot, 300);

  window.__sarinaSync={
    pull:function(){return pull(true)},
    hard:hardReset,
    push:function(){push(true)},
    setCloud:setCloudApi,
    migrate:function(){return migrateFromFirebase(true)},
    online:function(){return online},
    inventory:function(){return lastSummary}
  };
  console.log('sync-fix v13 full snapshot');
})();
