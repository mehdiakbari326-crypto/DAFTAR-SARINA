/* Sync v12: Cloudflare Worker primary (no VPN), Firebase one-time migrate */
(function(){
  var FB_REST='https://sarina-daftar-default-rtdb.firebaseio.com/family/sarina.json';
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var hydrated=false, pulledOnce=false, writing=false, pushTimer=null, lastSig='', online=false;

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
    return '';
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
        t:r.tasks,d:r.days,h:r.healthItems,rw:r.rewards,g:r.goal,
        pb:r.posBehaviors,nb:r.negBehaviors,st:r.streak,pc:r.pendingChanges,u:r._updatedAt
      });
    }catch(e){return String(Math.random())}
  }

  function applyRemote(r){
    if(!r||typeof r!=='object') return false;
    if(!r.tasks&&!r.days&&!r.healthItems&&r._ping) return false;
    if(r.name!=null) S.name=r.name;
    if(r.tasks) S.tasks=Array.isArray(r.tasks)?r.tasks.slice():S.tasks;
    if(r.days) S.days=JSON.parse(JSON.stringify(r.days));
    if(r.rewards) S.rewards=Array.isArray(r.rewards)?r.rewards.slice():S.rewards;
    if(r.claims) S.claims=Array.isArray(r.claims)?r.claims.slice():[];
    if(r.goal!=null) S.goal=r.goal;
    if(r.parentTasks) S.parentTasks=Array.isArray(r.parentTasks)?r.parentTasks.slice():[];
    if(r.parentPin) S.parentPin=r.parentPin;
    if(r.posBehaviors) S.posBehaviors=Array.isArray(r.posBehaviors)?r.posBehaviors.slice():[];
    if(r.negBehaviors) S.negBehaviors=Array.isArray(r.negBehaviors)?r.negBehaviors.slice():[];
    if(r.streak!=null) S.streak=r.streak;
    if(r.lastActive!=null) S.lastActive=r.lastActive;
    if(r.pendingChanges) S.pendingChanges=Array.isArray(r.pendingChanges)?r.pendingChanges.slice():[];
    if(r.healthItems) S.healthItems=JSON.parse(JSON.stringify(r.healthItems));
    applyThemeLocal();
    try{ localStorage.setItem('daftar-sarina-v9', JSON.stringify(S)); }catch(e){}
    try{ localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify(S)); }catch(e){}
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    return true;
  }

  function summarize(r){
    if(!r) return 'خالی';
    return 'تسک '+(r.tasks&&r.tasks.length||0)+
      ' | سلامتی '+(r.healthItems&&r.healthItems.length||0)+
      ' | روز '+(r.days?Object.keys(r.days).length:0)+
      ' | پاداش '+(r.rewards&&r.rewards.length||0);
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

  function httpPatch(url, body){
    return fetch(url, {
      method:'PATCH',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(body)
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
      // No cloud configured — try Firebase once for migrate hint
      if(showMsg) toast('آدرس ابر تنظیم نشده — از تنظیمات وارد کنید');
      setDot(false);
      return Promise.resolve(false);
    }
    return httpGet(url).then(function(r){
      setDot(true);
      if(!r || (typeof r==='object' && !r.tasks && !r.healthItems && !r.days)){
        // empty cloud — try migrate from Firebase once
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
      // push firebase data to cloudflare
      var url=cloudUrl();
      var payload=Object.assign({}, r);
      delete payload._ping;
      payload._updatedAt=Date.now();
      return httpPut(url, payload).then(function(){
        applyRemote(payload);
        lastSig=sigOf(payload);
        hydrated=true; pulledOnce=true;
        setDot(true);
        try{ if(typeof render==='function') render(); }catch(e){}
        if(showMsg) toast('✓ داده از Firebase منتقل شد — '+summarize(payload));
        setTimeout(function(){ try{ location.reload(); }catch(e){} }, 500);
        return true;
      });
    }).catch(function(){
      if(showMsg) toast('مهاجرت انجام نشد (Firebase در دسترس نیست — VPN موقت روشن کنید فقط یک‌بار)');
      hydrated=true; pulledOnce=true;
      return false;
    });
  }

  function push(force){
    if(!pulledOnce&&!force) return;
    if(isEmptyLocal()&&!force) return;
    var url=cloudUrl();
    if(!url) return;
    var payload=sharedFrom(S);
    writing=true;
    if(typeof ignoreRemote!=='undefined') ignoreRemote=true;
    httpPatch(url, payload).then(function(){
      writing=false;
      lastSig=sigOf(payload);
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
    pushTimer=setTimeout(function(){ push(false); }, 600);
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
    toast('آدرس ابر ذخیره شد — در حال اتصال...');
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
    if(a==='set-cloud'){
      e.preventDefault(); e.stopPropagation();
      var cur=getCloudBase()||'https://sarina-daftar.YOUR_SUBDOMAIN.workers.dev';
      var u=prompt('آدرس Cloudflare Worker را وارد کنید (بدون / انتها):', cur);
      if(u===null) return;
      setCloudApi(u);
    }
    if(a==='migrate-fb'){
      e.preventDefault(); e.stopPropagation();
      if(!cloudUrl()){ toast('اول آدرس ابر را تنظیم کنید'); return; }
      toast('مهاجرت از Firebase...');
      migrateFromFirebase(true);
    }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 30); }
  }, true);

  function syncBar(){
    var configured=!!getCloudBase();
    var h='<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:8px 0 12px">';
    if(!configured){
      h+='<button type="button" class="btn" data-act="set-cloud" style="width:85%;background:linear-gradient(90deg,#F59E0B,#EF4444)">⚙️ تنظیم آدرس ابر (Cloudflare)</button>';
    }else{
      h+='<button type="button" class="btn" data-act="force-sync" style="width:85%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی با ابر</button>';
      h+='<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>';
    }
    h+='</div>';
    return h;
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      if(html.indexOf('data-act="force-sync"')>=0||html.indexOf('data-act="set-cloud"')>=0) return html;
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
      html=html.replace(/<section class="card"><div class="card-h"><h2>☁️ همگام‌سازی[\s\S]*?<\/section>/g,'');
      var base=getCloudBase();
      var box='<section class="card"><div class="card-h"><h2>☁️ ابر (Cloudflare)</h2></div>';
      box+='<p class="muted">آدرس فعلی: <b dir="ltr" style="font-size:11px">'+(base||'تنظیم نشده')+'</b></p>';
      box+='<button type="button" class="btn" data-act="set-cloud" style="width:100%;margin-bottom:8px">تنظیم / تغییر آدرس ابر</button>';
      box+='<button type="button" class="btn" data-act="force-sync" style="width:100%;margin-bottom:8px">همگام‌سازی</button>';
      box+='<button type="button" class="ghost" data-act="hard-sync" style="width:100%;margin-bottom:8px">بازنشانی کامل از ابر</button>';
      box+='<button type="button" class="ghost" data-act="migrate-fb" style="width:100%">انتقال یک‌باره از Firebase (نیاز به VPN)</button>';
      box+='</section>';
      return html+box;
    };
  }

  function boot(){
    applyThemeLocal();
    // load cloud-config.js value if present
    if(typeof window.CLOUD_API==='string'&&window.CLOUD_API){
      try{ if(!localStorage.getItem(CFG_KEY)) localStorage.setItem(CFG_KEY, window.CLOUD_API.replace(/\/+$/,'')); }catch(e){}
    }
    if(getCloudBase()){
      pull(false);
    }else{
      setDot(false);
      console.log('cloud API not configured');
    }
    setInterval(function(){ if(!writing && getCloudBase()) pull(false); }, 5000);
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='visible' && getCloudBase()) pull(false);
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
    online:function(){return online}
  };
  console.log('sync-fix v12 Cloudflare');
})();
