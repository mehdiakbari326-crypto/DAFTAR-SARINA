/* reset-fix-v32: force full reset even if older handlers stopPropagation */
(function(){
  function isParentDev(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='parent') return true;
      if(typeof isParent!=='undefined' && isParent) return true;
      var r=localStorage.getItem('daftar-device-role-v2')||'';
      return r==='parent';
    }catch(e){ return false; }
  }
  function fullReset(){
    if(typeof S==='undefined') return;
    S.days={};
    S.claims=[];
    S.streak=0;
    S.lastActive='';
    if(S.play&&typeof S.play==='object'){
      S.play.badges={};
      S.play.chanceOpenedWeek='';
    }
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    try{
      S.pendingChanges=(S.pendingChanges||[]).filter(function(p){
        return p&&p.type&&String(p.type).indexOf('mark')<0&&String(p.type).indexOf('health')<0&&String(p.type).indexOf('claim')<0;
      });
    }catch(e){ S.pendingChanges=[]; }
    S._daysResetAt=S._daysResetAt||{};
    S._daysResetAt._all=Date.now();
    S._claimsResetAt=Date.now();
    try{ if(typeof lsSave==='function') lsSave(); }catch(e){}
    try{ if(typeof saveProfile==='function') saveProfile(); }catch(e){}
    try{ if(window.__sarinaSync&&window.__sarinaSync.push) window.__sarinaSync.push(); }catch(e){}
    try{ if(typeof showToast==='function') showToast('همهٔ ثبت‌ها، جوایز و دستاوردها پاک شد'); }catch(e){}
    try{ if(typeof render==='function') render(); }catch(e){}
  }
  function onClick(e){
    var t=e.target&&e.target.closest&&e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='reset-all-2'){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isParentDev()){
        try{ showToast('فقط والدین'); }catch(err){}
        return;
      }
      fullReset();
    }
  }
  document.addEventListener('click', onClick, true);
  setTimeout(function(){
    document.addEventListener('click', onClick, true);
  }, 1000);
  console.log('reset-fix-v32 active');
})();
