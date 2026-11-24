/* perf-fix v2.4 — smoother UI, less work on weak devices */
(function(){
  try{
    var st=document.createElement('style');
    st.textContent=[
      '@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}}',
      '.mascot,.sparkle{will-change:auto}',
      '.shell{content-visibility:auto}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  var _render = typeof render==='function' ? render : null;
  var raf=0, queued=false;
  if(_render && !_render._perf){
    function debouncedRender(){
      if(queued) return;
      queued=true;
      if(raf) cancelAnimationFrame(raf);
      raf=requestAnimationFrame(function(){
        queued=false; raf=0;
        try{ _render(); }catch(e){}
      });
    }
    debouncedRender._perf=true;
    debouncedRender._orig=_render;
    window.render = debouncedRender;
    window.renderNow = function(){
      queued=false;
      if(raf){ cancelAnimationFrame(raf); raf=0; }
      try{ _render(); }catch(e){}
    };
  }

  try{
    if(typeof updateSyncDot==='function' && !updateSyncDot._perf){
      var _dot=updateSyncDot, lastDot=0;
      updateSyncDot=function(){
        var n=Date.now();
        if(n-lastDot<400) return;
        lastDot=n;
        try{ _dot(); }catch(e){}
      };
      updateSyncDot._perf=true;
    }
  }catch(e){}

  console.log('perf-fix v2.4 active');
})();
