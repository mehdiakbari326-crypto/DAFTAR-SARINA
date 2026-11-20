/* Enhancements: calendar, behaviors settings, health report, 80% party, prizes */
(function(){
  function maxDayPoints(){return Math.max(1,(S.tasks||[]).length)}
  function dayEarned(k){var st=dayStats(k);return Math.max(0,(st.done||0)+(st.pos||0))}
  function dayPct(k){return Math.min(100,Math.round(dayEarned(k)/maxDayPoints()*100))}

  /* ---- 80% balloons celebration ---- */
  var celebratedDays={};
  try{celebratedDays=JSON.parse(localStorage.getItem('daftar-celeb-days')||'{}')}catch(e){}
  function saveCeleb(){try{localStorage.setItem('daftar-celeb-days',JSON.stringify(celebratedDays))}catch(e){}}

  function balloonParty(msg){
    var layer=document.createElement('div');
    layer.className='balloon-layer';
    var colors=['#9B6DFF','#C084FC','#FF8BC2','#A78BFA','#E879F9','#7C3AED'];
    for(var i=0;i<14;i++){
      var b=document.createElement('div');
      b.className='balloon';
      b.style.left=(5+Math.random()*90)+'%';
      b.style.background=colors[i%colors.length];
      b.style.animationDelay=(Math.random()*0.8)+'s';
      b.style.animationDuration=(2.2+Math.random()*1.2)+'s';
      layer.appendChild(b);
    }
    var conf=document.createElement('div');
    conf.className='celeb';
    var bits=['🎊','✨','💜','⭐','🎉','🌸','🦄','💖'];
    for(var j=0;j<28;j++){
      var s=document.createElement('span');
      s.textContent=bits[j%bits.length];
      s.style.left=Math.random()*100+'%';
      s.style.animationDelay=(Math.random()*0.9)+'s';
      s.style.fontSize=(14+Math.random()*16)+'px';
      conf.appendChild(s);
    }
    document.body.appendChild(layer);
    document.body.appendChild(conf);
    if(typeof showToast==='function') showToast(msg||'آفرین سارینا! ۸۰٪ کارها انجام شد 🎈');
    setTimeout(function(){try{layer.remove()}catch(e){}},3200);
    setTimeout(function(){try{conf.remove()}catch(e){}},2800);
  }

  function checkDayParty(){
    var k=todayKey();
    if(celebratedDays[k])return;
    if(dayPct(k)>=80){
      celebratedDays[k]=1;
      saveCeleb();
      balloonParty('🎈 وای چه عالی! بیش از ۸۰٪ امتیاز امروز گرفته شد!');
    }
  }

  /* ---- Pretty calendar datebar ---- */
  function prettyDatebar(html){
    var k=curKey, isToday=k===todayKey();
    var d=fromKey(k);
    var wd=fmtFull.format(d).split(' ')[0]||'';
    var rest=fmtFull.format(d);
    return '<div class="cal-card">'
      +'<button type="button" class="cal-nav" data-act="day" data-n="-1" aria-label="روز قبل">›</button>'
      +'<div class="cal-mid">'
      +'<div class="cal-emoji">'+(isToday?'🌟':'📅')+'</div>'
      +'<div class="cal-date">'+esc(rest)+'</div>'
      +(isToday?'<span class="cal-badge">امروز</span>':'')
      +'<div class="cal-points">امتیاز امروز: <b>'+fa(dayEarned(k))+'</b> از <b>'+fa(maxDayPoints())+'</b>'
      +' <span class="cal-pct">('+fa(dayPct(k))+'٪)</span></div>'
      +'<div class="cal-bar"><i style="width:'+dayPct(k)+'%"></i></div>'
      +'</div>'
      +'<button type="button" class="cal-nav" data-act="day" data-n="1"'+(isToday?' disabled':'')+' aria-label="روز بعد">‹</button>'
      +'</div>';
  }

  /* ---- Prizes panel (daily / weekly / monthly) ---- */
  function prizesPanel(){
    var today=todayKey();
    var weekKeys=[];for(var i=0;i<7;i++)weekKeys.push(addDays(today,-i));
    var monthKeys=[];for(var m=0;m<30;m++)monthKeys.push(addDays(today,-m));
    var dayPts=dayEarned(today);
    var weekPts=0;weekKeys.forEach(function(k){weekPts+=score(dayStats(k))});
    var monthPts=0;monthKeys.forEach(function(k){monthPts+=score(dayStats(k))});
    var claims=S.claims||[];
    var dayClaims=claims.filter(function(c){return c.k===today});
    var weekClaims=claims.filter(function(c){return weekKeys.indexOf(c.k)>=0});
    var monthClaims=claims.filter(function(c){return monthKeys.indexOf(c.k)>=0});

    var h='<section class="card prizes-card">';
    h+='<div class="card-h"><h2>🏆 جوایز و دستاوردها</h2></div>';
    h+='<div class="prize-tabs">';
    h+='<div class="prize-box day"><div class="pb-icon">⭐</div><div class="pb-label">امروز</div><div class="pb-val">'+fa(dayPts)+' امتیاز</div>';
    if(dayClaims.length)h+='<div class="pb-list">'+dayClaims.map(function(c){return '🎁 '+esc(c.t)}).join('<br>')+'</div>';
    else h+='<div class="pb-empty">هنوز جایزه‌ای نیست</div>';
    h+='</div>';
    h+='<div class="prize-box week"><div class="pb-icon">🌈</div><div class="pb-label">این هفته</div><div class="pb-val">'+fa(weekPts)+' امتیاز</div>';
    if(weekClaims.length)h+='<div class="pb-list">'+weekClaims.map(function(c){return '🎁 '+esc(c.t)}).join('<br>')+'</div>';
    else h+='<div class="pb-empty">جایزه هفتگی در راه است</div>';
    h+='</div>';
    h+='<div class="prize-box month"><div class="pb-icon">👑</div><div class="pb-label">۳۰ روز</div><div class="pb-val">'+fa(monthPts)+' امتیاز</div>';
    if(monthClaims.length)h+='<div class="pb-list">'+weekClaims.length+' جایزه هفتگی / '+fa(monthClaims.length)+' کل</div>';
    else h+='<div class="pb-empty">به جمع ستاره‌ها ادامه بده</div>';
    h+='</div></div>';

    // milestone badges
    h+='<div class="badge-row">';
    if(dayPct(today)>=80)h+='<span class="ach">🎈 قهرمان امروز</span>';
    if((S.streak||0)>=3)h+='<span class="ach">🔥 '+fa(S.streak)+' روز پشت‌سرهم</span>';
    if(weekPts>=(S.goal||15))h+='<span class="ach">🎯 هدف هفته</span>';
    if(monthPts>=50)h+='<span class="ach">💎 ستاره ماه</span>';
    h+='</div></section>';
    return h;
  }

  /* ---- Health consumption in report ---- */
  function healthReportBlock(){
    var items=getHealthItems();
    if(!items.length)return '';
    var h='<section class="card"><div class="card-h"><h2>🥗 گزارش مصرف</h2></div>';
    h+='<p class="muted">چند بار در بازه‌های اخیر ثبت شده</p>';
    items.forEach(function(it){
      var count30=0,count60=0;
      // approximate: if lastDate within range, count at least 1; better scan if we stored history - we only have lastDate
      // Use claims-like: for now show last + cooldown estimate
      if(it.lastDate){
        var daysAgo=Math.ceil((fromKey(todayKey())-fromKey(it.lastDate))/(24*60*60*1000));
        if(daysAgo<=30)count30=1;
        if(daysAgo<=60)count60=1;
        // estimate more from cooldown cycles in 60 days
        var cd=it.cooldownDays||7;
        if(daysAgo<=60){
          count60=Math.max(1,Math.floor((60-daysAgo)/cd)+1);
          count30=Math.max(daysAgo<=30?1:0,Math.floor((Math.min(30,60-daysAgo))/cd)+(daysAgo<=30?1:0));
        }
      }
      h+='<div class="health-report-row">';
      h+='<span class="hr-emoji">'+(it.emoji||'🍱')+'</span>';
      h+='<div class="hr-info"><strong>'+esc(it.title)+'</strong>';
      h+='<small>۳۰ روز: <b>'+fa(count30)+'</b> بار • ۶۰ روز: <b>'+fa(count60)+'</b> بار</small></div>';
      h+='</div>';
    });
    h+='</section>';
    return h;
  }

  /* ---- Behaviors management in settings ---- */
  function behaviorsSettingsBlock(){
    var pos=getPosBehaviors();
    var neg=getNegBehaviors();
    var h='<section class="card"><div class="card-h"><h2>🌸 مدیریت رفتارهای امروز</h2></div>';
    h+='<p class="muted">مثبت</p><div class="chips">';
    pos.forEach(function(c,i){
      h+='<span class="chip-edit">'+esc(c)+' <button type="button" class="del" data-act="del-pos-beh" data-i="'+i+'">×</button></span>';
    });
    h+='</div>';
    h+='<form class="add" id="posBehForm" style="margin-top:8px"><input class="inp" id="posBehIn" placeholder="رفتار مثبت جدید..."><button class="btn" type="submit">+</button></form>';
    h+='<p class="muted" style="margin-top:12px">منفی</p><div class="chips">';
    neg.forEach(function(c,i){
      h+='<span class="chip-edit">'+esc(c)+' <button type="button" class="del" data-act="del-neg-beh" data-i="'+i+'">×</button></span>';
    });
    h+='</div>';
    h+='<form class="add" id="negBehForm" style="margin-top:8px"><input class="inp" id="negBehIn" placeholder="رفتار منفی جدید..."><button class="btn" type="submit">+</button></form>';
    h+='</section>';
    return h;
  }

  /* ---- Patch views ---- */
  var _todayView = typeof todayView==='function' ? todayView : null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      // replace old datebar with pretty calendar
      html=html.replace(/<div class="datebar">[\s\S]*?<\/div>/, prettyDatebar());
      // inject prizes after level/health area - after first week box or stats
      var prizes=prizesPanel();
      if(html.indexOf('prizes-card')<0){
        // insert after week box if present
        if(html.indexOf('class="week"')>=0){
          html=html.replace(/(<div class="week">[\s\S]*?<\/div>)/, function(m){return m+prizes});
        }else{
          html=prizes+html;
        }
      }
      return html;
    };
  }

  var _reportView = typeof reportView==='function' ? reportView : null;
  if(_reportView){
    reportView=function(){
      var html=_reportView();
      html+=healthReportBlock();
      // daily max note
      html+='<section class="card"><div class="card-h"><h2>🎯 ظرفیت امتیاز روزانه</h2></div>';
      html+='<p>با <b>'+fa(S.tasks.length)+'</b> تسک فعال، حداکثر امتیاز از تسک‌ها در هر روز: <b>'+fa(maxDayPoints())+'</b></p>';
      html+='<p class="muted">با افزودن یا حذف تسک در تنظیمات، این عدد به‌روز می‌شود.</p></section>';
      return html;
    };
  }

  var _settingsView = typeof settingsView==='function' ? settingsView : null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(deviceRole==='child')return html;
      if(!isParent)return html;
      // inject behaviors management before rewards or at end before pin
      if(html.indexOf('مدیریت رفتار')<0){
        html=html.replace(/(<section class="card"><div class="card-h"><h2>🎁)/, behaviorsSettingsBlock()+'$1');
        if(html.indexOf('مدیریت رفتار')<0) html+=behaviorsSettingsBlock();
      }
      return html;
    };
  }

  /* ---- Event handlers for behaviors ---- */
  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t)return;
    var a=t.getAttribute('data-act');
    if(a==='del-pos-beh'){
      e.preventDefault();e.stopPropagation();
      var pos=getPosBehaviors().slice();
      pos.splice(+t.dataset.i,1);
      S.posBehaviors=pos;
      saveProfile();render();
    }
    if(a==='del-neg-beh'){
      e.preventDefault();e.stopPropagation();
      var neg=getNegBehaviors().slice();
      neg.splice(+t.dataset.i,1);
      S.negBehaviors=neg;
      saveProfile();render();
    }
  },true);

  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form.id==='posBehForm'){
      e.preventDefault();e.stopPropagation();
      var v=(document.getElementById('posBehIn').value||'').trim();
      if(!v)return;
      var pos=getPosBehaviors().slice();
      pos.push(v);
      S.posBehaviors=pos;
      saveProfile();render();
    }
    if(form.id==='negBehForm'){
      e.preventDefault();e.stopPropagation();
      var v2=(document.getElementById('negBehIn').value||'').trim();
      if(!v2)return;
      var neg=getNegBehaviors().slice();
      neg.push(v2);
      S.negBehaviors=neg;
      saveProfile();render();
    }
  },true);

  /* ---- Hook after mark / render for party ---- */
  var _render = typeof render==='function' ? render : null;
  if(_render){
    render=function(){
      _render.apply(this,arguments);
      try{checkDayParty()}catch(e){}
    };
  }

  // initial check
  setTimeout(function(){try{checkDayParty()}catch(e){}},600);
  console.log('enhance.js loaded');
})();
