/* Sync v15 — auto sync every 3s + multi-device guards
 * 1) Always pull before push
 * 2) Never overwrite richer cloud with poorer local
 * 3) Hard reset clears local and reloads from cloud
 * 4) Clear toasts with counts so user sees truth
 */
(function(){
  var THEME_KEY='daftar-theme-local';
  var CFG_KEY='daftar-cloud-api';
  var DEFAULT_CLOUD='https://sarina-kv.mehdiakbari326.workers.dev';
  var hydrated=false, pulledOnce=false, writing=false, pushTimer=null;
  var lastSig='', online=false, lastSummary='', quietUntil=0, bootId=String(Date.now());

  function toast(msg){
    try{ if(typeof showToast==='function'){ showToast(msg); return; } }catch(e){}
    try{
      var el=document.createElement('div'); el.className='toast'; el.textContent=msg;
      document.body.appendChild(el);
      setTimeout(function(){try{el.remove()}catch(e){}},4000);
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

  function richness(r){
    if(!r||typeof r!=='object') return 0;
    var days=r.days||{};
    var dayN=Object.keys(days).length;
    var marks=0, notes=0, weights=0, beh=0;
    Object.keys(days).forEach(function(k){
      var d=days[k]||{};
      marks += d.tasks ? Object.keys(d.tasks).length : 0;
      notes += (d.notes&&d.notes.length)||0;
      if(d.weight!=null) weights++;
      beh += d.behaviors ? Object.keys(d.behaviors).length : 0;
    });
    return (r.tasks&&r.tasks.length||0)*3
      + dayN*8
      + marks*4
      + notes*2
      + weights*5
      + beh*3
      + (r.healthItems&&r.healthItems.length||0)*2
      + (r.rewards&&r.rewards.length||0)*2
      + (r.posBehaviors&&r.posBehaviors.length||0)
      + (r.negBehaviors&&r.negBehaviors.length||0)
      + (r.goal?2:0);
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
        st:r.streak, pc:r.pendingChanges, u:r._updatedAt
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
    var days=r.days?Object.keys(r.days).length:0;
    return 'تسک '+(r.tasks&&r.tasks.length||0)+
      ' | روز '+days+
      ' | سلامتی '+(r.healthItems&&r.healthItems.length||0)+
      ' | پاداش '+(r.rewards&&r.rewards.length||0)+
      ' | هدف '+(r.goal!=null?r.goal:'—');
  }

  function localRichness(){
    try{ return richness(sharedFrom(S)); }catch(e){ return 0; }
  }

  function httpGet(url){
    return fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(), {
      method:'GET',
      headers:{'Accept':'application/json'},
      cache:'no-store'
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
    var out={};
    var keys={};
    Object.keys(a||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(b||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){
      var da=(a&&a[k])||{};
      var db=(b&&b[k])||{};
      var score=function(d){
        return (d.tasks?Object.keys(d.tasks).length:0)*3
          + ((d.notes&&d.notes.length)||0)
          + (d.weight!=null?5:0)
          + (d.behaviors?Object.keys(d.behaviors).length:0)*2;
      };
      if(score(db)>score(da)) out[k]=clone(db);
      else if(score(da)>0) out[k]=clone(da);
      else out[k]=clone(db);
      if(da.tasks && db.tasks){
        out[k].tasks = Object.assign({}, da.tasks, db.tasks);
        Object.keys(db.tasks).forEach(function(tid){
          var x=da.tasks[tid], y=db.tasks[tid];
          if(x&&y){
            if(y.s==='done'||x.s==='done') out[k].tasks[tid]=Object.assign({},x,y,{s:'done'});
            else out[k].tasks[tid]=Object.assign({},x,y);
          }
        });
      }
      if(da.notes || db.notes){
        var seen={}; var notes=[];
        ((da.notes)||[]).concat((db.notes)||[]).forEach(function(n){
          var id=n&&n.id; if(id&&seen[id]) return; if(id) seen[id]=1; notes.push(n);
        });
        out[k].notes=notes;
      }
      if(da.weight==null && db.weight!=null) out[k].weight=db.weight;
      if(db.weight==null && da.weight!=null) out[k].weight=da.weight;
    });
    return out;
  }

  function pull(showMsg){
    var url=cloudUrl();
    if(!url){
      if(showMsg) toast('آدرس ابر خالی است');
      setDot(false);
      return Promise.resolve(false);
    }
    return httpGet(url).then(function(remote){
      setDot(true);
      if(!remote || (!remote.tasks && !remote.days && !remote.healthItems)){
        if(showMsg) toast('ابر خالی است — اول از گوشی اصلی ارسال کامل بزنید');
        pulledOnce=true; hydrated=true;
        return false;
      }

      var localR = localRichness();
      var remoteR = richness(remote);
      var take = true;
      if(!showMsg){
        if(remoteR < localR * 0.5 && localR > 20){
          take = false;
          pulledOnce=true; hydrated=true;
          quietUntil = Date.now() + 500;
          schedulePush(true);
          return true;
        }
      }

      if(take){
        try{
          if(S && S.days && remote.days){
            remote = clone(remote);
            remote.days = mergeDays(S.days, remote.days);
          }
        }catch(e){}

        var prevSig = lastSig;
        var newSig = sigOf(remote);
        applyRemote(remote);
        lastSig = newSig;
        quietUntil = Date.now() + 600;
        hydrated=true; pulledOnce=true; window.__sarinaHydrated=true;
        if(prevSig && prevSig !== newSig){
          try{ if(typeof render==='function') render(); }catch(e){}
        }else if(showMsg){
          try{ if(typeof render==='function') render(); }catch(e){}
        }
        if(showMsg) toast('✓ دریافت شد — '+summarize(remote));
      }
      return true;
    }).catch(function(err){
      console.log('pull fail', err);
      setDot(false);
      if(showMsg) toast('خطا در دریافت: '+(err&&err.message||err));
      return false;
    });
  }

  function push(force){
    if(Date.now() < quietUntil && !force) return Promise.resolve(false);
    if(!pulledOnce && !force) return Promise.resolve(false);
    var url=cloudUrl();
    if(!url) return Promise.resolve(false);

    var localPayload = sharedFrom(S);
    var localR = richness(localPayload);
    if(localR < 5 && !force){
      return Promise.resolve(false);
    }

    writing=true;
    return httpGet(url).then(function(remote){
      setDot(true);
      remote = remote || {};
      var remoteR = richness(remote);

      if(!force && remoteR > localR + 15){
        writing=false;
        applyRemote(remote);
        lastSig=sigOf(remote);
        try{ if(typeof render==='function') render(); }catch(e){}
        return false;
      }

      var payload = clone(localPayload);
      if(remote.days){
        payload.days = mergeDays(remote.days, localPayload.days);
      }
      if((remote.tasks||[]).length > (payload.tasks||[]).length) payload.tasks = clone(remote.tasks);
      if((remote.healthItems||[]).length > (payload.healthItems||[]).length) payload.healthItems = clone(remote.healthItems);
      if((remote.rewards||[]).length > (payload.rewards||[]).length) payload.rewards = clone(remote.rewards);
      if((remote.posBehaviors||[]).length > (payload.posBehaviors||[]).length) payload.posBehaviors = clone(remote.posBehaviors);
      if((remote.negBehaviors||[]).length > (payload.negBehaviors||[]).length) payload.negBehaviors = clone(remote.negBehaviors);
      if(remote.goal && !payload.goal) payload.goal = remote.goal;
      try{
        var map={};
        (remote.pendingChanges||[]).concat(payload.pendingChanges||[]).forEach(function(p){
          if(p&&p.id) map[p.id]=p;
        });
        payload.pendingChanges=Object.keys(map).map(function(k){return map[k];});
      }catch(e){}

      payload._updatedAt = Date.now();
      payload._device = bootId;

      // skip put if nothing changed
      var ns=sigOf(payload);
      if(!force && ns===lastSig){
        writing=false;
        return true;
      }

      return httpPut(url, payload).then(function(){
        writing=false;
        lastSig=ns;
        lastSummary=summarize(payload);
        applyRemote(payload);
        setDot(true);
        return true;
      });
    }).catch(function(err){
      if(force){
        return httpPut(url, localPayload).then(function(){
          writing=false; setDot(true); lastSummary=summarize(localPayload); return true;
        }).catch(function(e2){
          writing=false; setDot(false);
          toast('ارسال ناموفق: '+(e2&&e2.message||e2));
          return false;
        });
      }
      writing=false;
      setDot(false);
      console.log('push fail', err);
      return false;
    });
  }

  function schedulePush(force){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    if(S&&S.theme) saveTheme(S.theme);
    if(!pulledOnce && !force) return;
    if(pushTimer) clearTimeout(pushTimer);
    pushTimer=setTimeout(function(){ push(!!force); }, force?150:400);
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
      S.posBehaviors=[]; S.negBehaviors=[];
    }catch(e){}
    quietUntil=0;
    pulledOnce=false;
    return httpGet(cloudUrl()).then(function(remote){
      if(!remote||(!remote.tasks&&!remote.days)){
        toast('ابر خالی یا در دسترس نیست');
        setDot(false);
        return false;
      }
      applyRemote(remote);
      lastSig=sigOf(remote);
      pulledOnce=true; hydrated=true;
      setDot(true);
      try{
        if(role){
          localStorage.setItem('daftar-device-role-v2',role);
          localStorage.setItem('daftar-device-role-backup',role);
        }
        if(theme) saveTheme(theme);
      }catch(e){}
      toast('✓ بازنشانی شد — '+summarize(remote));
      setTimeout(function(){ try{ location.reload(); }catch(e){} }, 500);
      return true;
    }).catch(function(err){
      setDot(false);
      toast('بازنشانی ناموفق: '+(err&&err.message||err));
      return false;
    });
  }

  var autoBusy=false;
  function fullSync(showMsg){
    if(autoBusy && !showMsg) return Promise.resolve(false);
    autoBusy=true;
    if(showMsg) toast('همگام‌سازی دوطرفه...');
    return pull(!!showMsg).then(function(){
      quietUntil=0;
      return push(true);
    }).then(function(ok){
      if(showMsg) toast(ok?('✓ همگام شد — '+(lastSummary||'')):'همگام‌سازی انجام شد');
      try{ if(typeof render==='function') render(); }catch(e){}
      autoBusy=false;
      return ok;
    }).catch(function(){ autoBusy=false; return false; });
  }

  function autoTick(){
    if(writing || autoBusy) return;
    if(typeof S==='undefined') return;
    autoBusy=true;
    pull(false).then(function(){
      quietUntil=0;
      return push(false);
    }).then(function(){ autoBusy=false; }).catch(function(){ autoBusy=false; });
  }

  function setCloudApi(url){
    url=(url||'').trim().replace(/\/+$/,'');
    if(!url){ toast('آدرس خالی'); return; }
    if(url.indexOf('https://')!==0){ toast('باید با https:// شروع شود'); return; }
    try{ localStorage.setItem(CFG_KEY, url); }catch(e){}
    window.CLOUD_API=url;
    toast('آدرس ذخیره شد');
    hardReset();
  }

  saveProfile=function(){ schedulePush(false); };
  startFirebaseSync=function(){};

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='force-sync'){ e.preventDefault(); e.stopPropagation(); fullSync(true); }
    if(a==='hard-sync'){ e.preventDefault(); e.stopPropagation(); hardReset(); }
    if(a==='push-cloud'){ e.preventDefault(); e.stopPropagation(); toast('ارسال...'); push(true).then(function(ok){ toast(ok?('✓ ارسال — '+lastSummary):'ارسال نشد'); }); }
    if(a==='set-cloud'){
      e.preventDefault(); e.stopPropagation();
      var u=prompt('آدرس Cloudflare Worker:', getCloudBase());
      if(u===null) return;
      setCloudApi(u);
    }
    if(a==='theme'){ setTimeout(function(){ if(S&&S.theme) saveTheme(S.theme); }, 30); }
  }, true);

  function syncBar(){
    return '<div style="display:flex;flex-direction:column;gap:8px;align-items:center;margin:8px 0 12px">'+
      '<button type="button" class="btn" data-act="force-sync" style="width:85%;background:linear-gradient(90deg,#6B3FBF,#9B6DFF)">☁️ همگام‌سازی الان</button>'+
      '<button type="button" class="ghost" data-act="hard-sync" style="font-size:12px;font-weight:700">🔄 بازنشانی کامل از ابر</button>'+
      '<p class="muted" style="font-size:11px;text-align:center;margin:0">همگام‌سازی خودکار هر ۳ ثانیه فعال است</p>'+
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
      box+='<p class="muted" style="font-size:12px;color:var(--pos);font-weight:700">همگام‌سازی خودکار هر ۳ ثانیه</p>';
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
        if(tries<40) return setTimeout(wait,100);
      }
      pull(false).then(function(){ quietUntil = Date.now() + 1500; pulledOnce = true; });
      setInterval(function(){ autoTick(); }, 3000);
      document.addEventListener('visibilitychange', function(){
        if(document.visibilityState==='visible') autoTick();
      });
      try{ window.addEventListener('online', function(){ setTimeout(autoTick, 300); }); }catch(e){}
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
    summary:function(){return lastSummary},
    richness:function(){return localRichness()}
  };
  console.log('sync-fix v15 auto 3s');
})();
