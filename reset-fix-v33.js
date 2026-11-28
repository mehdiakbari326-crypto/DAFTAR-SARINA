/* reset-fix-v33: hard full reset + direct cloud PUT + block claims restore */
(function(){
  var BLOCK_UNTIL = 0;
  var CLOUD = 'https://sarina-kv.mehdiakbari326.workers.dev/family/sarina';

  function isParentDev(){
    try{
      if(typeof deviceRole !== 'undefined' && deviceRole === 'parent') return true;
      if(typeof isParent !== 'undefined' && isParent) return true;
      var keys = ['daftar-device-role-v2','daftar-device-role-backup','daftar-device-role'];
      for(var i=0;i<keys.length;i++){
        var r = localStorage.getItem(keys[i]);
        if(r === 'parent') return true;
      }
    }catch(e){}
    return false;
  }

  function clone(o){
    try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return o; }
  }

  function wipeLocal(){
    if(typeof S === 'undefined') return;
    S.days = {};
    S.claims = [];
    S.streak = 0;
    S.lastActive = '';
    if(S.play && typeof S.play === 'object'){
      S.play.badges = {};
      S.play.chanceOpenedWeek = '';
    }
    (S.healthItems || []).forEach(function(it){ it.lastDate = ''; });
    try{
      S.pendingChanges = (S.pendingChanges || []).filter(function(p){
        if(!p || !p.type) return false;
        var t = String(p.type);
        return t.indexOf('mark') < 0 && t.indexOf('health') < 0 && t.indexOf('claim') < 0;
      });
    }catch(e){ S.pendingChanges = []; }
    var now = Date.now();
    S._daysResetAt = S._daysResetAt || {};
    S._daysResetAt._all = now;
    S._claimsResetAt = now;
    BLOCK_UNTIL = now + 15000;
  }

  function persistLocal(){
    try{ if(typeof lsSave === 'function') lsSave(); }catch(e){}
    try{
      localStorage.setItem('daftar-sarina-v9', JSON.stringify(S));
      localStorage.setItem('daftar-sarina-backup-v9', JSON.stringify({
        name:S.name,tasks:S.tasks,days:{},rewards:S.rewards,claims:[],
        goal:S.goal,parentTasks:S.parentTasks,parentPin:S.parentPin,
        posBehaviors:S.posBehaviors,negBehaviors:S.negBehaviors,streak:0,
        lastActive:'',pendingChanges:S.pendingChanges||[],healthItems:S.healthItems
      }));
    }catch(e){}
  }

  function directCloudPut(){
    try{
      var body = clone(S);
      body.days = {};
      body.claims = [];
      body.streak = 0;
      body.lastActive = '';
      if(body.play && typeof body.play === 'object'){
        body.play.badges = {};
        body.play.chanceOpenedWeek = '';
      }
      (body.healthItems || []).forEach(function(it){ it.lastDate = ''; });
      body.pendingChanges = [];
      var now = Date.now();
      body._daysResetAt = Object.assign({}, body._daysResetAt || {}, {_all: now});
      body._claimsResetAt = now;
      body._updatedAt = now + 5000;
      body._device = (typeof deviceRole !== 'undefined' ? deviceRole : 'parent') + '-reset';

      fetch(CLOUD, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify(body),
        cache: 'no-store'
      }).then(function(r){ return r.json(); }).then(function(m){
        try{
          if(m && Array.isArray(m.claims)) S.claims = m.claims;
          if(m && m._claimsResetAt) S._claimsResetAt = m._claimsResetAt;
          if(m && m.days) S.days = m.days;
          persistLocal();
          if(typeof render === 'function') render();
        }catch(e){}
      }).catch(function(){});
    }catch(e){}
  }

  function fullReset(){
    wipeLocal();
    persistLocal();
    try{ if(typeof saveProfile === 'function') saveProfile(); }catch(e){}
    try{ if(window.__sarinaSync && window.__sarinaSync.push) window.__sarinaSync.push(); }catch(e){}
    directCloudPut();
    setTimeout(function(){
      try{ if(window.__sarinaSync && window.__sarinaSync.push) window.__sarinaSync.push(); }catch(e){}
      directCloudPut();
    }, 800);
    try{ if(typeof showToast === 'function') showToast('همهٔ ثبت‌ها، جوایز و دستاوردها پاک شد'); }catch(e){}
    try{ if(typeof render === 'function') render(); }catch(e){}
  }

  function resetToday(){
    if(typeof S === 'undefined') return;
    var k = typeof todayKey === 'function' ? todayKey() : '';
    if(!k) return;
    if(!S.days) S.days = {};
    S.days[k] = {tasks:{}, notes:[], behaviors:{}};
    S.claims = (S.claims || []).filter(function(c){ return c && c.k !== k; });
    S._daysResetAt = S._daysResetAt || {};
    S._daysResetAt[k] = Date.now();
    persistLocal();
    try{ if(typeof saveProfile === 'function') saveProfile(); }catch(e){}
    try{ if(window.__sarinaSync && window.__sarinaSync.push) window.__sarinaSync.push(); }catch(e){}
    try{
      var body = clone(S);
      body._updatedAt = Date.now() + 3000;
      fetch(CLOUD, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
        cache:'no-store'
      }).catch(function(){});
    }catch(e){}
    try{ if(typeof showToast === 'function') showToast('ثبت‌ها و جوایز امروز پاک شد'); }catch(e){}
    try{ if(typeof render === 'function') render(); }catch(e){}
  }

  function resetHealth(){
    if(typeof S === 'undefined') return;
    (S.healthItems || []).forEach(function(it){ it.lastDate = ''; });
    persistLocal();
    try{ if(typeof saveProfile === 'function') saveProfile(); }catch(e){}
    try{ if(window.__sarinaSync && window.__sarinaSync.push) window.__sarinaSync.push(); }catch(e){}
    try{
      var body = clone(S);
      body._updatedAt = Date.now() + 3000;
      fetch(CLOUD, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
        cache:'no-store'
      }).catch(function(){});
    }catch(e){}
    try{ if(typeof showToast === 'function') showToast('تاریخ مصرف سلامتی ریست شد'); }catch(e){}
    try{ if(typeof render === 'function') render(); }catch(e){}
  }

  function onClick(e){
    var t = e.target && e.target.closest && e.target.closest('[data-act]');
    if(!t) return;
    var a = t.getAttribute('data-act');
    if(a !== 'reset-all-1' && a !== 'reset-all-2' && a !== 'reset-all-cancel' && a !== 'reset-today' && a !== 'reset-health-logs') return;

    if(a === 'reset-all-1'){
      e.preventDefault();
      e.stopPropagation();
      if(!isParentDev()){
        try{ showToast('فقط والدین'); }catch(err){}
        return;
      }
      var box = document.getElementById('resetStep2') || document.getElementById('resetConfirmBox');
      if(box) box.style.display = 'block';
      return;
    }
    if(a === 'reset-all-cancel'){
      e.preventDefault();
      e.stopPropagation();
      var box2 = document.getElementById('resetStep2') || document.getElementById('resetConfirmBox');
      if(box2) box2.style.display = 'none';
      return;
    }
    if(a === 'reset-all-2'){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isParentDev()){
        try{ showToast('فقط والدین'); }catch(err){}
        return;
      }
      fullReset();
      var box3 = document.getElementById('resetStep2') || document.getElementById('resetConfirmBox');
      if(box3) box3.style.display = 'none';
      return;
    }
    if(a === 'reset-today'){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isParentDev()){ try{ showToast('فقط والدین'); }catch(err){} return; }
      if(confirm('ثبت‌ها و جوایز امروز پاک شود؟')) resetToday();
      return;
    }
    if(a === 'reset-health-logs'){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isParentDev()){ try{ showToast('فقط والدین'); }catch(err){} return; }
      if(confirm('تاریخ مصرف همه آیتم‌های سلامتی ریست شود؟')) resetHealth();
      return;
    }
  }

  document.addEventListener('click', onClick, true);

  function patchApply(){
    try{
      if(!window.__sarinaSync || !window.__sarinaSync.applyRemote) return;
      if(window.__sarinaSync.__resetPatched) return;
      var orig = window.__sarinaSync.applyRemote;
      window.__sarinaSync.applyRemote = function(r){
        if(Date.now() < BLOCK_UNTIL){
          try{
            if(r && typeof r === 'object'){
              r = clone(r);
              r.claims = [];
              if(S && S._claimsResetAt) r._claimsResetAt = S._claimsResetAt;
              if(S && S._daysResetAt && S._daysResetAt._all){
                if(S.days && !Object.keys(S.days).length) r.days = {};
              }
            }
          }catch(e){}
        }
        var res = orig.call(this, r);
        if(Date.now() < BLOCK_UNTIL && typeof S !== 'undefined'){
          S.claims = [];
          if(S.play) { S.play.badges = {}; }
        }
        return res;
      };
      window.__sarinaSync.__resetPatched = true;
    }catch(e){}
  }

  setTimeout(patchApply, 300);
  setTimeout(patchApply, 1500);
  setTimeout(function(){ document.addEventListener('click', onClick, true); }, 500);

  try{ window.doResetAllActivity = fullReset; }catch(e){}
  try{ window.__sarinaFullReset = fullReset; }catch(e){}

  console.log('reset-fix-v33 active');
})();
