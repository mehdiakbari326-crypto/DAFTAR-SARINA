/* Enhancements: fun hero, calendar, behaviors, health report, 80% party, prizes */
(function(){
  // inject missing keyframes if CSS typo
  try{
    var st=document.createElement('style');
    st.textContent='@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes twinkle{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.25);opacity:1}}';
    document.head.appendChild(st);
  }catch(e){}

  function taskMax(){return Math.max(1,(S.tasks||[]).length)}
  function taskDone(k){return (dayStats(k).done||0)}
  function taskPct(k){return Math.min(100,Math.round(taskDone(k)/taskMax()*100))}
  function dayTotal(k){return score(dayStats(k))}

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
    if(taskPct(k)>=80){
      celebratedDays[k]=1;
      saveCeleb();
      balloonParty('🎈 وای چه عالی! بیش از ۸۰٪ تسک‌های امروز انجام شد!');
    }
  }

  function funGreet(){
    var h=new Date().getHours();
    var name=S.name||'سارینا';
    var msgs;
    if(h<11) msgs=['صبح بخیر '+name+' ☀️ امروز ستاره‌هات رو جمع کن!','سلام قهرمان صبحگاهی 🦄 آماده ماجراجویی؟'];
    else if(h<17) msgs=['هی '+name+' 🌈 کارهای امروز چطوره؟','آفرین تا اینجا! ادامه بده ستاره ⭐'];
    else msgs=['عصر بخیر '+name+' 💜 هنوز وقت ستاره گرفتن هست!','شب نزدیکه؛ کارها رو تموم کن تا جشن بگیریم 🎉'];
    return msgs[new Date().getDate()%msgs.length];
  }

  function funHeader(){
    var mascot=isParent?'👨‍👩‍👧':(typeof dayChar==='function'?dayChar().emoji:'🦄');
    var pct=taskPct(todayKey());
    var stars='⭐'.repeat(Math.min(5,Math.max(1,Math.ceil(pct/20))));
    var tabs=[
      {v:'today',icon:'🌟',lab:'امروز'},
      {v:'health',icon:'🥗',lab:'سلامتی'},
      {v:'reports',icon:'📊',lab:'گزارش'},
      {v:'rewards',icon:'🎁',lab:'پاداش'},
      {v:'parent',icon:'💝',lab:'مامان‌بابا'},
      {v:'settings',icon:'⚙️',lab:'تنظیمات'}
    ];
    var h='<header class="hero fun-hero">';
    h+='<div class="sparkle s1">✨</div><div class="sparkle s2">💜</div><div class="sparkle s3">🌸</div>';
    h+='<div class="hero-top">';
    h+='<div class="hero-titles">';
    h+='<div class="hero-badge">'+stars+' باشگاه ستاره‌ها</div>';
    h+='<h1>دفتر جادویی سارینا <span id="syncDot" class="sync-dot"></span></h1>';
    h+='<p class="sub">هر کار خوب = یک ستاره بنفش ✨</p>';
    h+='</div>';
    h+='<div class="mascot bounce">'+mascot+'</div>';
    h+='</div>';
    if(!isParent){
      h+='<div class="greet fun-greet">'+funGreet()+'</div>';
    }
    h+='<div class="name-wrap"><span class="name-star">⭐</span>';
    h+='<input id="nameIn" class="name" value="'+esc(S.name)+'" '+(isParent?'':'readonly')+'>';
    h+='</div>';
    h+='<div class="tabs fun-tabs" id="mainTabs">';
    tabs.forEach(function(t){
      var sel=view===t.v?'true':'false';
      h+='<button type="button" data-view="'+t.v+'" aria-selected="'+sel+'">';
      h+='<span class="tab-icon">'+t.icon+'</span><span class="tab-lab">'+t.lab+'</span>';
      h+='</button>';
    });
    h+='</div></header>';
    return h;
  }

  if(typeof header==='function'){
    header=funHeader;
  }

  function prettyDatebar(){
    var k=curKey, isToday=k===todayKey();
    var rest=fmtFull.format(fromKey(k));
    var done=taskDone(k), max=taskMax(), pct=taskPct(k), total=dayTotal(k);
    var cheer=pct>=80?'🎈 عالیه!':pct>=50?'💪 ادامه بده!':'🌱 شروع کن!';
    return '<div class="cal-card fun-cal">'
      +'<button type="button" class="cal-nav" data-act="day" data-n="-1" aria-label="روز قبل">›</button>'
      +'<div class="cal-mid">'
      +'<div class="cal-emoji">'+(isToday?'🌟':'📅')+'</div>'
      +'<div class="cal-date">'+esc(rest)+'</div>'
      +(isToday?'<span class="cal-badge">'+cheer+' امروز</span>':'')
      +'<div class="cal-points">تسک‌ها: <b>'+fa(done)+'</b> از <b>'+fa(max)+'</b>'
      +' <span class="cal-pct">('+fa(pct)+'٪)</span></div>'
      +'<div class="cal-points" style="margin-top:2px">امتیاز کل: <b>'+fa(total)+'</b>'
      +(total>max?' <span class="cal-pct">(+ رفتارها)</span>':'')+'</div>'
      +'<div class="cal-bar"><i style="width:'+pct+'%"></i></div>'
      +'</div>'
      +'<button type="button" class="cal-nav" data-act="day" data-n="1"'+(isToday?' disabled':'')+' aria-label="روز بعد">‹</button>'
      +'</div>';
  }

  function prizesPanel(){
    var today=todayKey();
    var weekKeys=[];for(var i=0;i<7;i++)weekKeys.push(addDays(today,-i));
    var monthKeys=[];for(var m=0;m<30;m++)monthKeys.push(addDays(today,-m));
    var dayPts=dayTotal(today);
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
    if(monthClaims.length)h+='<div class="pb-list">'+fa(monthClaims.length)+' جایزه</div>';
    else h+='<div class="pb-empty">به جمع ستاره‌ها ادامه بده</div>';
    h+='</div></div>';
    h+='<div class="badge-row">';
    if(taskPct(today)>=80)h+='<span class="ach">🎈 قهرمان امروز</span>';
    if((S.streak||0)>=3)h+='<span class="ach">🔥 '+fa(S.streak)+' روز پشت‌سرهم</span>';
    if(weekPts>=(S.goal||15))h+='<span class="ach">🎯 هدف هفته</span>';
    if(monthPts>=50)h+='<span class="ach">💎 ستاره ماه</span>';
    h+='</div></section>';
    return h;
  }

  function healthReportBlock(){
    var items=getHealthItems();
    if(!items.length)return '';
    var h='<section class="card"><div class="card-h"><h2>🥗 گزارش مصرف</h2></div>';
    h+='<p class="muted">چند بار در بازه‌های اخیر ثبت شده</p>';
    items.forEach(function(it){
      var count30=0,count60=0;
      if(it.lastDate){
        var daysAgo=Math.ceil((fromKey(todayKey())-fromKey(it.lastDate))/(24*60*60*1000));
        var cd=it.cooldownDays||7;
        if(daysAgo<=60){
          count60=Math.max(1,Math.floor((60-daysAgo)/cd)+1);
          count30=daysAgo<=30?Math.max(1,Math.floor((30-daysAgo)/cd)+1):0;
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

  var _todayView = typeof todayView==='function' ? todayView : null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      html=html.replace(/<div class="datebar">[\s\S]*?<\/div>/, prettyDatebar());
      var prizes=prizesPanel();
      if(html.indexOf('prizes-card')<0){
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
      html+='<section class="card"><div class="card-h"><h2>🎯 ظرفیت امتیاز روزانه</h2></div>';
      html+='<p>تعداد تسک فعال: <b>'+fa(S.tasks.length)+'</b> ← حداکثر امتیاز از <b>تسک‌ها</b>: <b>'+fa(taskMax())+'</b></p>';
      html+='<p class="muted">رفتارهای مثبت امتیاز جداگانه می‌دهند. با افزودن/حذف تسک، سقف به‌روز می‌شود.</p></section>';
      return html;
    };
  }

  var _settingsView = typeof settingsView==='function' ? settingsView : null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(deviceRole==='child')return html;
      if(!isParent)return html;
      if(html.indexOf('مدیریت رفتار')<0){
        html=html.replace(/(<section class="card"><div class="card-h"><h2>🎁)/, behaviorsSettingsBlock()+'$1');
        if(html.indexOf('مدیریت رفتار')<0) html+=behaviorsSettingsBlock();
      }
      return html;
    };
  }

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

  var _render = typeof render==='function' ? render : null;
  if(_render){
    render=function(){
      _render.apply(this,arguments);
      try{checkDayParty()}catch(e){}
    };
  }

  setTimeout(function(){try{checkDayParty()}catch(e){}},600);
  console.log('enhance.js loaded');
})();
