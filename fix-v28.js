/* fix-v28: settings alignment, report chart, 2-step DB reset for parents */
(function(){
  try{
    var st=document.createElement('style');
    st.id='fix-v28-css';
    st.textContent=[
      '.set-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 10px;border:1.5px solid var(--line);border-radius:16px;margin:8px 0;background:#fff}',
      '.set-row .set-info{display:flex;align-items:center;gap:10px;min-width:0;flex:1}',
      '.set-row .set-info .emoji{font-size:28px;flex-shrink:0}',
      '.set-row .set-info .txt{min-width:0}',
      '.set-row .set-info strong{display:block;font-size:14px;font-weight:800;line-height:1.3;word-break:break-word}',
      '.set-row .set-info small{display:block;font-size:11px;color:var(--muted);margin-top:2px}',
      '.set-actions{display:flex;gap:6px;flex-shrink:0}',
      '.set-actions .edit-btn,.set-actions .del{border-radius:12px;padding:8px 12px;font-weight:700;font-size:12px;border:1.5px solid var(--line);background:#fff}',
      '.set-actions .edit-btn{color:var(--accent-deep);border-color:var(--accent)}',
      '.set-actions .del{color:#B91C1C;border-color:#FECACA}',
      '.chart-kid,.chart-wrap{display:flex!important;align-items:flex-end;gap:4px;min-height:170px;height:170px;overflow-x:auto;padding:10px 6px 6px;direction:ltr;background:linear-gradient(180deg,#FBF7FF,#fff);border-radius:18px;border:2px solid var(--line);box-sizing:border-box}',
      '.chart-kid .col,.chart-wrap .chart-col{flex:1;min-width:18px;max-width:40px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}',
      '.chart-kid .bar,.chart-wrap .chart-bar{width:70%;max-width:24px;border-radius:10px 10px 4px 4px;min-height:8px}',
      '.chart-kid .val,.chart-wrap .chart-val{font-size:9px;font-weight:800}',
      '.chart-kid .lbl,.chart-wrap .chart-lbl{font-size:9px;font-weight:700;color:var(--muted);white-space:nowrap}',
      '.chart-empty-msg{text-align:center;font-size:12px;color:var(--muted);margin:8px 0 0;font-weight:700}',
      '.reset-box{border:2px dashed #F87171;border-radius:18px;padding:14px;margin-top:14px;background:#FFF5F5}',
      '.reset-box h3{margin:0 0 6px;font-size:15px;color:#B91C1C}',
      '.reset-box .muted{font-size:12px;margin:0 0 10px}',
      '#resetConfirmBox{display:none;margin-top:10px;padding:12px;border-radius:14px;background:#fff;border:1.5px solid #FECACA}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function faNum(n){
    try{ if(typeof fa==='function') return fa(n); }catch(e){}
    return String(n);
  }

  var _prevStats = typeof dayStats==='function' ? dayStats : null;
  dayStats = function(k){
    var base = {done:0,missed:0,pos:0,neg:0};
    try{
      if(_prevStats){
        var b=_prevStats(k);
        if(b&&typeof b==='object') base=b;
      }else if(typeof dayTaskList==='function'){
        var list=dayTaskList(k);
        base.done=list.filter(function(t){return t.s==='done'}).length;
        base.missed=list.filter(function(t){return t.s==='missed'}).length;
      }
      var d=(typeof getDay==='function'?getDay(k):(S.days&&S.days[k])||{})||{};
      var beh=d.behaviors||{};
      var posDone=0,posMiss=0,negDone=0,negMiss=0;
      Object.keys(beh).forEach(function(key){
        var s=beh[key];
        if(key.indexOf('pos:')===0){ if(s==='done') posDone++; if(s==='missed') posMiss++; }
        if(key.indexOf('neg:')===0){ if(s==='done') negDone++; if(s==='missed') negMiss++; }
      });
      var notePos=(d.notes||[]).filter(function(n){return n.type==='pos'}).length;
      var noteNeg=(d.notes||[]).filter(function(n){return n.type==='neg'}).length;
      if(Object.keys(beh).length || notePos || noteNeg){
        base.pos = posDone + negMiss + notePos;
        base.neg = posMiss + negDone + noteNeg;
      }
    }catch(e){}
    return base;
  };

  function isParentDevice(){
    try{
      if(typeof deviceRole!=='undefined' && deviceRole==='parent') return true;
      if(typeof isParent!=='undefined' && isParent) return true;
    }catch(e){}
    return false;
  }

  function buildChart(range){
    range = range || (typeof reportRange!=='undefined'?reportRange:7) || 7;
    var keys=[];
    for(var i=range-1;i>=0;i--){
      try{ keys.push(addDays(todayKey(),-i)); }
      catch(e){ keys.push(String(i)); }
    }
    var scores=keys.map(function(k){
      try{ return (typeof score==='function'?score(dayStats(k)):0)||0; }
      catch(e){ return 0; }
    });
    var maxS=1;
    scores.forEach(function(s){ var a=Math.abs(s)||0; if(a>maxS) maxS=a; });
    var any=scores.some(function(s){return s!==0});

    var h='<div class="chart-kid" style="display:flex;align-items:flex-end;gap:4px;min-height:170px;height:170px">';
    keys.forEach(function(k,i){
      var sc=scores[i];
      var abs=Math.abs(sc);
      var hgt=abs===0?10:Math.max(16,Math.round((abs/maxS)*130));
      var color=sc>0?'#9B6DFF':(sc<0?'#E86A4A':'#E5E7EB');
      var isToday=false;
      try{ isToday = k===todayKey(); }catch(e){}
      var step=range<=7?1:(range<=14?2:5);
      var showLbl=isToday||i===0||i===keys.length-1||(i%step===0);
      var lbl='';
      if(isToday) lbl='امروز';
      else if(showLbl){
        try{ var p=String(k).split('-'); lbl=faNum(parseInt(p[2],10))+'/'+faNum(parseInt(p[1],10)); }
        catch(e){ lbl=''; }
      }
      h+='<div class="col" style="flex:1;min-width:'+(range>20?12:range>10?16:22)+'px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px">';
      if(sc!==0) h+='<span class="val" style="color:'+color+'">'+(sc>0?'+':'')+faNum(sc)+'</span>';
      else h+='<span class="val" style="opacity:.4">·</span>';
      h+='<div class="bar" style="height:'+hgt+'px;background:'+color+';width:70%;max-width:24px;border-radius:10px 10px 4px 4px;'+(isToday?'outline:2px solid #FFC94A;':'')+'"></div>';
      h+='<span class="lbl" style="color:'+(isToday?'#6B3FBF':'#8B7AA8')+'">'+lbl+'</span>';
      h+='</div>';
    });
    h+='</div>';
    if(!any) h+='<p class="chart-empty-msg">هنوز امتیازی در این بازه ثبت نشده — تسک یا رفتار را علامت بزنید ⭐</p>';
    else h+='<p class="muted" style="text-align:center;font-size:11px;margin:6px 0 0">🟣 مثبت · 🧡 منفی · حاشیه طلایی = امروز</p>';
    return h;
  }

  function patchReport(){
    if(typeof reportView!=='function') return;
    var _rv=reportView;
    reportView=function(){
      var html=_rv();
      var chart=buildChart(typeof reportRange!=='undefined'?reportRange:7);
      html=html.replace(/<div class="chart-kid"[\s\S]*?<\/div>(<p class="chart-empty-msg"[\s\S]*?<\/p>)?/g, '');
      html=html.replace(/<div class="chart-wrap"[\s\S]*?<\/div>/g, '');
      if(html.indexOf('range-btns')>=0){
        html=html.replace(/(<\/div>\s*<p class="muted"[^>]*>گذشته[\s\S]*?<\/p>)/, function(m){ return m+chart; });
        if(html.indexOf('chart-kid')<0){
          html=html.replace(/(class="range-btns"[\s\S]*?<\/div>)/, function(m){ return m+chart; });
        }
      }else{
        html=chart+html;
      }
      return html;
    };
  }

  function resetPanelHTML(){
    var h='<section class="card reset-box" id="dbResetPanel">';
    h+='<h3>⚠️ ریست داده‌ها (دو مرحله‌ای)</h3>';
    h+='<p class="muted">فقط ثبت‌های روزانه و مصرف سلامتی پاک می‌شود. لیست تسک‌ها و پاداش‌ها می‌ماند.</p>';
    h+='<button type="button" class="ghost" data-act="reset-today" style="width:100%;margin-bottom:8px">۱) فقط امروز را پاک کن</button>';
    h+='<button type="button" class="ghost" data-act="reset-health-logs" style="width:100%;margin-bottom:8px">ریست تاریخ مصرف سلامتی</button>';
    h+='<button type="button" class="btn" data-act="reset-all-1" style="width:100%;background:#DC2626;color:#fff">ریست همهٔ ثبت‌های گذشته…</button>';
    h+='<div id="resetConfirmBox">';
    h+='<p style="margin:0 0 8px;font-weight:800;color:#B91C1C;font-size:13px">مرحله ۲: مطمئنی؟ این کار برنمی‌گردد.</p>';
    h+='<button type="button" class="btn" data-act="reset-all-2" style="width:100%;background:#991B1B;color:#fff;margin-bottom:6px">بله، همه ثبت‌ها پاک شود</button>';
    h+='<button type="button" class="ghost" data-act="reset-all-cancel" style="width:100%">انصراف</button>';
    h+='</div></section>';
    return h;
  }

  function patchSettings(){
    if(typeof settingsView!=='function') return;
    var _sv=settingsView;
    settingsView=function(){
      var html=_sv();
      if(!isParentDevice()){
        html=html.replace(/<section[^>]*reset-box[\s\S]*?<\/section>/g,'');
        return html;
      }
      if(html.indexOf('dbResetPanel')<0 && html.indexOf('reset-box')<0){
        html+=resetPanelHTML();
      }else if(html.indexOf('dbResetPanel')<0){
        html=html.replace(/<section[^>]*class="[^"]*reset-box[^"]*"[\s\S]*?<\/section>/, resetPanelHTML());
      }
      return html;
    };
  }

  function doResetToday(){
    var k=todayKey();
    if(!S.days) S.days={};
    S.days[k]={tasks:{},notes:[],behaviors:{}};
    S._daysResetAt=S._daysResetAt||{};
    S._daysResetAt[k]=Date.now();
    if(typeof saveProfile==='function') saveProfile();
    if(typeof showToast==='function') showToast('ثبت‌های امروز پاک شد');
    render();
  }
  function doResetHealthLogs(){
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    if(typeof saveProfile==='function') saveProfile();
    if(typeof showToast==='function') showToast('تاریخ مصرف سلامتی ریست شد');
    render();
  }
  function doResetAllActivity(){
    S.days={};
    (S.healthItems||[]).forEach(function(it){ it.lastDate=''; });
    S._daysResetAt=S._daysResetAt||{};
    S._daysResetAt._all=Date.now();
    if(typeof saveProfile==='function') saveProfile();
    if(typeof showToast==='function') showToast('همهٔ ثبت‌ها پاک شد');
    render();
  }

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');
    if(a==='reset-today'){
      e.preventDefault(); e.stopPropagation();
      if(!isParentDevice()){ showToast('فقط والدین'); return; }
      if(confirm('ثبت‌های امروز پاک شود؟')) doResetToday();
    }
    if(a==='reset-health-logs'){
      e.preventDefault(); e.stopPropagation();
      if(!isParentDevice()){ showToast('فقط والدین'); return; }
      if(confirm('تاریخ مصرف همه آیتم‌های سلامتی ریست شود؟')) doResetHealthLogs();
    }
    if(a==='reset-all-1'){
      e.preventDefault(); e.stopPropagation();
      if(!isParentDevice()){ showToast('فقط والدین'); return; }
      var box=document.getElementById('resetConfirmBox');
      if(box) box.style.display='block';
      else if(confirm('همه ثبت‌ها پاک شود؟')) doResetAllActivity();
    }
    if(a==='reset-all-cancel'){
      e.preventDefault(); e.stopPropagation();
      var box2=document.getElementById('resetConfirmBox');
      if(box2) box2.style.display='none';
    }
    if(a==='reset-all-2'){
      e.preventDefault(); e.stopPropagation();
      if(!isParentDevice()){ showToast('فقط والدین'); return; }
      doResetAllActivity();
    }
  }, true);

  function boot(){
    patchReport();
    patchSettings();
    try{ if(typeof render==='function') render(); }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 400); });
  else setTimeout(boot, 400);

  console.log('fix-v28: chart + settings reset + dayStats');
})();
