/* Persist guard: keep role + local cache; never overwrite fresh Firebase data */
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
      if(r==='parent'&&typeof isParent!=='undefined') isParent=true;
      if(r==='child'&&typeof isParent!=='undefined') isParent=false;
    }catch(e){}
  }

  function backupData(){
    try{
      if(typeof S==='undefined'||!S)return;
      // Only backup if we look like we have real data
      var keys=S.days?Object.keys(S.days).length:0;
      var tasks=(S.tasks&&S.tasks.length)||0;
      if(keys===0&&tasks===0)return;
      writeJSON(DATA_BAK,{
        name:S.name,tasks:S.tasks,days:S.days,rewards:S.rewards,
        claims:S.claims,goal:S.goal,parentTasks:S.parentTasks,
        parentPin:S.parentPin,posBehaviors:S.posBehaviors,
        negBehaviors:S.negBehaviors,streak:S.streak,
        lastActive:S.lastActive,pendingChanges:S.pendingChanges,
        healthItems:S.healthItems
      });
      writeJSON(DATA_KEY,S);
    }catch(e){}
  }

  // Only restore backup if Firebase has NOT hydrated yet and local is empty
  function restoreIfEmpty(){
    try{
      if(window.__sarinaHydrated)return; // remote is authority
      if(typeof S==='undefined')return;
      var has=(S.tasks&&S.tasks.length)||(S.days&&Object.keys(S.days).length);
      if(has)return;
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
          pendingChanges:bak.pendingChanges||S.pendingChanges,
          healthItems:bak.healthItems||S.healthItems
        });
        console.log('persist-guard: restored local cache (pre-hydrate only)');
      }
    }catch(e){}
  }

  function wrapSetRole(){
    if(typeof setDeviceRole!=='function'||setDeviceRole._pg)return;
    var orig=setDeviceRole;
    setDeviceRole=function(role){
      persistRole(role);
      return orig.apply(this,arguments);
    };
    setDeviceRole._pg=true;
  }

  function boot(){
    lockRole();
    wrapSetRole();
    // restore only before firebase hydrate
    restoreIfEmpty();
    setTimeout(function(){
      lockRole();
      if(typeof showRolePicker!=='undefined'&&getSavedRole()) showRolePicker=false;
    },150);
    setTimeout(lockRole,500);
    // backup periodically but never push over remote
    setInterval(function(){
      if(window.__sarinaHydrated) backupData();
    },30000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
  console.log('persist-guard v2 active');
})();
