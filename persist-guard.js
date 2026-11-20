/* Persist guard: keep data + device role across APK updates */
(function(){
  var ROLE_KEY='daftar-device-role-v2';
  var ROLE_BAK='daftar-device-role-backup';
  var DATA_KEY='daftar-sarina-v9';
  var DATA_BAK='daftar-sarina-backup-v9';

  function readJSON(key){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}
  }
  function writeJSON(key,val){
    try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}
  }

  /* --- Role: dual write + migrate -- */
  function getSavedRole(){
    try{
      return localStorage.getItem(ROLE_KEY)
        || localStorage.getItem(ROLE_BAK)
        || localStorage.getItem('daftar-device-role')
        || '';
    }catch(e){return ''}
  }
  function persistRole(role){
    if(!role)return;
    try{
      localStorage.setItem(ROLE_KEY,role);
      localStorage.setItem(ROLE_BAK,role);
    }catch(e){}
  }
  function lockRole(){
    var r=getSavedRole();
    if(!r)return;
    persistRole(r);
    try{
      if(typeof deviceRole!=='undefined') deviceRole=r;
      if(typeof showRolePicker!=='undefined') showRolePicker=false;
      if(r==='parent'){
        if(typeof isParent!=='undefined') isParent=true;
      }else if(r==='child'){
        if(typeof isParent!=='undefined') isParent=false;
      }
    }catch(e){}
  }

  /* --- Data backup -- */
  function backupData(){
    try{
      if(typeof S==='undefined'||!S)return;
      // never backup completely empty profile over a richer one
      var cur=readJSON(DATA_BAK);
      var score=function(x){
        if(!x)return 0;
        var n=0;
        if(x.tasks&&x.tasks.length)n+=x.tasks.length;
        if(x.days)n+=Object.keys(x.days).length*2;
        if(x.rewards&&x.rewards.length)n+=x.rewards.length;
        if(x.healthItems&&x.healthItems.length)n+=x.healthItems.length;
        if(x.pendingChanges&&x.pendingChanges.length)n+=x.pendingChanges.length;
        return n;
      };
      if(score(S)>=score(cur)) writeJSON(DATA_BAK,S);
      // also keep primary key in sync
      writeJSON(DATA_KEY,S);
    }catch(e){}
  }
  function restoreIfEmpty(){
    try{
      if(typeof S==='undefined')return;
      var has=S.tasks&&S.tasks.length;
      var days=S.days&&Object.keys(S.days).length;
      if(has||days)return;
      var bak=readJSON(DATA_BAK)||readJSON(DATA_KEY);
      if(!bak)return;
      if((bak.tasks&&bak.tasks.length)||(bak.days&&Object.keys(bak.days).length)){
        Object.assign(S,{
          name:bak.name||S.name,
          tasks:bak.tasks||S.tasks,
          days:bak.days||S.days,
          rewards:bak.rewards||S.rewards,
          claims:bak.claims||S.claims,
          goal:bak.goal||S.goal,
          parentTasks:bak.parentTasks||S.parentTasks,
          parentPin:bak.parentPin||S.parentPin,
          posBehaviors:bak.posBehaviors||S.posBehaviors,
          negBehaviors:bak.negBehaviors||S.negBehaviors,
          streak:bak.streak||S.streak,
          lastActive:bak.lastActive||S.lastActive,
          theme:bak.theme||S.theme,
          pendingChanges:bak.pendingChanges||S.pendingChanges,
          healthItems:bak.healthItems||S.healthItems
        });
        console.log('persist-guard: restored local backup');
      }
    }catch(e){}
  }

  /* --- Guard setDeviceRole -- */
  function wrapSetRole(){
    if(typeof setDeviceRole!=='function')return;
    if(setDeviceRole._persistWrapped)return;
    var orig=setDeviceRole;
    setDeviceRole=function(role){
      persistRole(role);
      return orig.apply(this,arguments);
    };
    setDeviceRole._persistWrapped=true;
  }

  /* --- Guard saveProfile: no accidental wipe -- */
  function wrapSave(){
    if(typeof saveProfile!=='function')return;
    if(saveProfile._persistWrapped)return;
    var orig=saveProfile;
    saveProfile=function(){
      try{
        // if current S lost tasks but backup has them, restore before save
        if(S&&(!S.tasks||!S.tasks.length)){
          var bak=readJSON(DATA_BAK);
          if(bak&&bak.tasks&&bak.tasks.length){
            S.tasks=bak.tasks;
          }
        }
        backupData();
      }catch(e){}
      return orig.apply(this,arguments);
    };
    saveProfile._persistWrapped=true;
  }

  /* --- Guard Firebase remote empty overwrite for critical arrays -- */
  function wrapRenderBoot(){
    restoreIfEmpty();
    lockRole();
    wrapSetRole();
    wrapSave();
  }

  // Run after app.js/app2.js boot
  function boot(){
    wrapRenderBoot();
    // re-apply shortly after app2 boot IIFE
    setTimeout(function(){
      wrapRenderBoot();
      lockRole();
      // hide role picker permanently if role known
      if(getSavedRole()&&typeof showRolePicker!=='undefined'){
        showRolePicker=false;
      }
      if(typeof render==='function'){
        try{render()}catch(e){}
      }
    },120);
    setTimeout(function(){
      lockRole();
      backupData();
    },800);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }

  // Periodic local backup while app is open
  setInterval(function(){
    try{backupData()}catch(e){}
  },30000);

  console.log('persist-guard active');
})();
