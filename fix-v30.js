/* fix-v30: full activity reset (claims/badges) + parent silent on behavior cheers */
(function(){
  function isParentDev(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='parent') return true;
      var r=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||'';
      return r==='parent';
    }catch(e){ return false; }
  }
  function isChildDev(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='child') return true;
      var r=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||'';
      return r==='child';
    }catch(e){ return false; }
  }

  function forcePush(){
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    try{ if(typeof saveProfile==='function') saveProfile(); }catch(e){}
    try{
      if(window.__sarinaSync && typeof window.__sarinaSync.push==='function')
        window.__sarinaSync.push();
    }catch(e){}
  }

  function fullResetActivity(){
    S.days = {};
    S.claims = [];
    S.streak = 0;
    S.lastActive = '';
    if(S.play && typeof S.play==='object'){
      S.play.badges = {};
      S.play.chanceOpenedWeek = '';
      S.play.stars = 0;
      S.play.level = 0;
    }
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    try{
      S.pendingChanges = (S.pendingChanges||[]).filter(function(p){
        return p && p.type && p.type.indexOf('mark')<0 && p.type.indexOf('health')<0 && p.type.indexOf('claim')<0;
      });
    }catch(e){ S.pendingChanges = []; }
    S._daysResetAt = S._daysResetAt || {};
    S._daysResetAt._all = Date.now();
    S._claimsResetAt = Date.now();
    forcePush();
    if(typeof showToast==='function') showToast('همهٔ ثبت‌ها، جوایز و دستاوردها پاک شد');
    try{ if(typeof render==='function') render(); }catch(e){}
  }

  function resetTodayOnly(){
    var k = typeof todayKey==='function' ? todayKey() : '';
    if(!k) return;
    if(!S.days) S.days={};
    S.days[k]={tasks:{},notes:[],behaviors:{}};
    S.claims = (S.claims||[]).filter(function(c){ return c && c.k !== k; });
    S._daysResetAt = S._daysResetAt||{};
    S._daysResetAt[k]=Date.now();
    forcePush();
    if(typeof showToast==='function') showToast('ثبت‌ها و جوایز امروز پاک شد');
    try{ render(); }catch(e){}
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='reset-all-2'){
      e.preventDefault();
      e.stopPropagation();
      if(isParentDev() || (typeof isParent!=='undefined'&&isParent)){
        fullResetActivity();
      }else{
        if(typeof showToast==='function') showToast('فقط والدین');
      }
    }
    if(a==='reset-today'){
      e.preventDefault();
      e.stopPropagation();
      if(isParentDev() || (typeof isParent!=='undefined'&&isParent)){
        if(confirm('ثبت‌ها و جوایز امروز پاک شود؟')) resetTodayOnly();
      }
    }
  }, true);

  try{ window.doResetAllActivity = fullResetActivity; }catch(e){}

  var CHEER = /آفرین|دختر باهوش|دختر زرنگ|ستاره|قهرمان|فوق‌العاده|چه دختر|سارینا جون|خوشحال شدم|عالی[!！]?|دوری کرد|رفتار بد|رفتار خوب|\+۱|🦄|🌸|💕|💜|⭐/;
  var _toast = typeof showToast==='function' ? showToast : null;
  showToast = function(msg){
    try{
      var s=String(msg||'');
      if(isParentDev() && CHEER.test(s)){
        if(_toast) _toast('ثبت شد ✓');
        return;
      }
    }catch(e){}
    if(_toast) return _toast(msg);
  };

  try{
    if(typeof celebrate==='function'){
      var _c=celebrate;
      celebrate=function(){ if(isChildDev()) try{_c()}catch(e){} };
    }
  }catch(e){}

  try{
    if(typeof showSarinaNotif==='function'){
      var _n=showSarinaNotif;
      showSarinaNotif=function(a,b,c){
        if(!isChildDev()) return;
        return _n(a,b,c);
      };
    }
  }catch(e){}

  console.log('fix-v30: full reset claims/badges + parent silent cheers');
})();
