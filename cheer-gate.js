/* cheer-gate: motivate/toasts only on Sarina (child) device */
(function(){
  var CHEER = /آفرین سارینا|دختر باهوش|دختر زرنگ|ستاره گرفتی|قهرمانم|ستاره منی|فوق‌العاده|چه دختر|ادامه‌ش بده|سارینا جون|خوشحال شدم|🦄|🌸|💕/;

  function isChildDevice(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='child') return true;
      var r=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||'';
      return r==='child';
    }catch(e){ return false; }
  }
  function isParentDevice(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='parent') return true;
      var r=localStorage.getItem('daftar-device-role-v2')||localStorage.getItem('daftar-device-role-backup')||'';
      return r==='parent';
    }catch(e){ return false; }
  }

  var _toast = typeof showToast==='function' ? showToast : null;
  showToast = function(msg){
    try{
      var s=String(msg||'');
      if(isParentDevice() && CHEER.test(s)){
        if(_toast) _toast('ثبت شد ✓');
        return;
      }
    }catch(e){}
    if(_toast) return _toast(msg);
  };

  try{
    if(typeof celebrate==='function'){
      var _cel=celebrate;
      celebrate=function(){ if(isChildDevice()) try{ _cel(); }catch(e){} };
    }
  }catch(e){}

  try{
    if(typeof balloonParty==='function'){
      var _bp=balloonParty;
      balloonParty=function(msg){ if(isChildDevice()) try{ _bp(msg); }catch(e){} };
    }
  }catch(e){}

  try{
    if(typeof showSarinaNotif==='function'){
      var _n=showSarinaNotif;
      showSarinaNotif=function(title,body,tag){
        if(!isChildDevice()) return;
        return _n(title,body,tag);
      };
    }
  }catch(e){}

  console.log('cheer-gate: parent devices silent for motivate toasts');
})();
