/* Permanent device role: parent vs Sarina */
(function(){
  function applyHardRole(){
    try{
      var role = localStorage.getItem('daftar-device-role-v2') || '';
      if(!role) return;
      if(typeof deviceRole !== 'undefined') deviceRole = role;
      if(role === 'parent'){
        if(typeof isParent !== 'undefined') isParent = true;
        if(typeof cancelAllNotifs === 'function') try{ cancelAllNotifs(); }catch(e){}
      } else if(role === 'child'){
        if(typeof isParent !== 'undefined') isParent = false;
      }
    }catch(e){}
  }

  var _set = typeof setDeviceRole === 'function' ? setDeviceRole : null;
  if(_set){
    setDeviceRole = function(role){
      try{ localStorage.setItem('daftar-device-role-v2', role); }catch(e){}
      deviceRole = role;
      showRolePicker = false;
      if(role === 'parent'){
        isParent = true;
        if(typeof cancelAllNotifs === 'function') try{ cancelAllNotifs(); }catch(e){}
      } else {
        isParent = false;
        if(typeof scheduleSarinaReminders === 'function') try{ scheduleSarinaReminders(); }catch(e){}
      }
      if(typeof render === 'function') render();
    };
  }

  var _render = typeof render === 'function' ? render : null;
  if(_render){
    render = function(){
      applyHardRole();
      _render.apply(this, arguments);
      try{
        if(deviceRole === 'child'){
          document.querySelectorAll('[data-act="enter-parent"],[data-act="exit-parent"]').forEach(function(el){
            el.style.display = 'none';
          });
          var fa = document.querySelector('.foot-actions');
          if(fa && !fa.querySelector('.sarina-only-label')){
            fa.innerHTML = '<span class="muted sarina-only-label" style="font-size:12px">🦄 مخصوص سارینا</span>';
          }
        } else if(deviceRole === 'parent'){
          document.querySelectorAll('[data-act="enter-parent"],[data-act="exit-parent"]').forEach(function(el){
            el.style.display = 'none';
          });
          var fa2 = document.querySelector('.foot-actions');
          if(fa2 && !fa2.querySelector('.parent-only-label')){
            fa2.innerHTML = '<span class="muted parent-only-label" style="font-size:12px">👨‍👩‍👧 حالت والدین</span>';
          }
          isParent = true;
        }
      }catch(e){}
    };
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-act]');
    if(!t) return;
    var a = t.getAttribute('data-act');
    if(a === 'enter-parent' && (localStorage.getItem('daftar-device-role-v2') === 'child' || deviceRole === 'child')){
      e.preventDefault();
      e.stopPropagation();
      if(typeof showToast === 'function') showToast('این تبلت مخصوص ساریناست');
      return false;
    }
    if(a === 'exit-parent' && (localStorage.getItem('daftar-device-role-v2') === 'parent' || deviceRole === 'parent')){
      e.preventDefault();
      e.stopPropagation();
      if(typeof showToast === 'function') showToast('این گوشی والدین است');
      return false;
    }
  }, true);

  function boot(){
    setTimeout(function(){
      applyHardRole();
      if(typeof deviceRole !== 'undefined' && deviceRole === 'parent' && typeof cancelAllNotifs === 'function'){
        try{ cancelAllNotifs(); }catch(e){}
      }
      if(typeof render==='function') render();
    }, 80);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
