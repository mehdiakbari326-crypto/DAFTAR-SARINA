/* Sarina as main player — parents remain final judge
 * - Mascot + nickname (no approval)
 * - Daily 3-star mission
 * - Suggest reward / task / parent kindness (pending)
 * - Collection badges
 * - Weekly chance box after goal
 */
(function(){
  var MASCOTS=[
    {id:'unicorn', emoji:'🦄', name:'یونیکورن'},
    {id:'cat', emoji:'🐱', name:'گربه'},
    {id:'labubu', emoji:'🧸', name:'لابوبو'},
    {id:'butterfly', emoji:'🦋', name:'پروانه'},
    {id:'panda', emoji:'🐼', name:'پاندا'},
    {id:'bunny', emoji:'🐰', name:'خرگوش'},
    {id:'star', emoji:'⭐', name:'ستاره'},
    {id:'princess', emoji:'👸', name:'شاهزاده'}
  ];
  var NICKS=['شاهزاده خانم سارینا','ستاره درخشان','قهرمان کوچک','فرشته بنفش','یونیکورن طلایی','جادوگر مهربان'];

  try{
    var st=document.createElement('style');
    st.textContent=[
      '.play-hero{background:linear-gradient(145deg,#A78BFA,#C084FC 40%,#F472B6);border-radius:24px;padding:16px;color:#fff;margin-bottom:12px;box-shadow:0 10px 28px rgba(155,109,255,.2)}',
      '.play-top{display:flex;align-items:center;gap:12px}',
      '.play-mascot{font-size:52px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.15));cursor:pointer}',
      '.play-meta h2{margin:0;font-size:18px;font-weight:800}',
      '.play-meta .nick{opacity:.95;font-size:13px;font-weight:700;margin-top:2px}',
      '.play-meta .streak{font-size:12px;margin-top:4px;background:rgba(255,255,255,.25);display:inline-block;padding:2px 10px;border-radius:99px}',
      '.mission-card{background:linear-gradient(180deg,#FFF7ED,#FFEDD5);border:2px solid #FDBA74;border-radius:20px;padding:14px;margin:10px 0}',
      '.mission-card h3{margin:0 0 8px;font-size:15px;color:#9A3412}',
      '.mission-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-weight:700;font-size:13px;color:#7C2D12}',
      '.mission-item.done{opacity:.55;text-decoration:line-through}',
      '.mission-stars{font-size:20px;letter-spacing:2px}',
      '.badge-grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
      '.badge{width:72px;text-align:center;padding:10px 6px;border-radius:16px;background:#F3ECFF;border:2px solid #E9D5FF;font-size:11px;font-weight:700}',
      '.badge .be{font-size:28px;display:block;line-height:1.2}',
      '.badge.off{opacity:.35;filter:grayscale(1)}',
      '.badge.on{background:linear-gradient(180deg,#FEF3C7,#FDE68A);border-color:#FBBF24}',
      '.chance-box{background:linear-gradient(135deg,#FDE68A,#F9A8D4);border-radius:20px;padding:16px;text-align:center;margin:10px 0;border:2px solid #F472B6}',
      '.chance-box button{margin-top:8px;background:#fff;color:#9D174D;font-weight:800;border-radius:99px;padding:10px 20px;border:0}',
      '.suggest-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}',
      '.suggest-row button{min-height:44px;border-radius:14px;font-weight:700;border:2px dashed var(--line);background:var(--accent-soft);color:var(--accent-deep)}',
      '.mascot-pick{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}',
      '.mascot-pick button{width:56px;height:56px;border-radius:16px;border:2px solid transparent;background:#fff;font-size:28px}',
      '.mascot-pick button.on{border-color:var(--accent);background:var(--accent-soft);transform:scale(1.08)}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function ensurePlay(){
    S.play = S.play || {};
    if(!S.play.mascot) S.play.mascot='unicorn';
    if(!S.play.nickname) S.play.nickname='شاهزاده خانم سارینا';
    if(!S.play.chanceOpenedWeek) S.play.chanceOpenedWeek='';
    if(!S.play.badges) S.play.badges={};
  }

  function getMascot(){
    ensurePlay();
    return MASCOTS.find(function(m){return m.id===S.play.mascot}) || MASCOTS[0];
  }

  function todayMission(){
    // deterministic 3 tasks from current task list based on date
    var list=(S.tasks||[]).slice();
    if(!list.length) return [];
    var key=(typeof todayKey==='function'?todayKey():'')||'';
    var seed=0;
    for(var i=0;i<key.length;i++) seed+=key.charCodeAt(i);
    var picks=[], used={};
    for(var n=0;n<3 && n<list.length;n++){
      var idx=(seed*17+n*31)%list.length;
      var tries=0;
      while(used[idx]&&tries<list.length){ idx=(idx+1)%list.length; tries++; }
      used[idx]=true;
      picks.push(list[idx]);
    }
    return picks;
  }

  function missionProgress(){
    var picks=todayMission();
    var k=typeof todayKey==='function'?todayKey():'';
    var day=(S.days&&S.days[k])||{};
    var tasks=day.tasks||{};
    var done=0;
    picks.forEach(function(t){
      if(tasks[t.id]&&tasks[t.id].s==='done') done++;
    });
    return {picks:picks, done:done, total:picks.length};
  }

  function computeBadges(){
    ensurePlay();
    var badges={
      streak3: false,
      streak7: false,
      cleanWeek: false,
      firstStar: false,
      goalOnce: false,
      weightHero: false
    };
    var streak=S.streak||0;
    if(streak>=3) badges.streak3=true;
    if(streak>=7) badges.streak7=true;
    if((S.claims&&S.claims.length)|| (typeof totalScore==='function'&&totalScore()>0)) badges.firstStar=true;

    // clean week: last 7 days no neg notes and no neg behavior done
    try{
      var clean=true, any=false;
      for(var i=0;i<7;i++){
        var kk=typeof addDays==='function'?addDays(todayKey(),-i):null;
        if(!kk||!S.days||!S.days[kk]) continue;
        any=true;
        var d=S.days[kk];
        var notes=d.notes||[];
        if(notes.some(function(n){return n.type==='neg'})) clean=false;
        var beh=d.behaviors||{};
        Object.keys(beh).forEach(function(bk){
          if(bk.indexOf('neg:')===0 && beh[bk]==='done') clean=false;
        });
      }
      if(any&&clean) badges.cleanWeek=true;
    }catch(e){}

    // goal reached sometime this week
    try{
      if(typeof weekScore==='function' && weekScore()>=(S.goal||15)) badges.goalOnce=true;
    }catch(e){}

    // weight logged 3+ days
    try{
      var wc=0;
      Object.keys(S.days||{}).forEach(function(k){ if(S.days[k]&&S.days[k].weight!=null) wc++; });
      if(wc>=3) badges.weightHero=true;
    }catch(e){}

    S.play.badges=badges;
    return badges;
  }

  function badgeList(){
    var b=computeBadges();
    return [
      {id:'firstStar', on:b.firstStar, emoji:'⭐', title:'اولین ستاره'},
      {id:'streak3', on:b.streak3, emoji:'🔥', title:'۳ روز پشت‌سرهم'},
      {id:'streak7', on:b.streak7, emoji:'🏆', title:'۷ روز قهرمان'},
      {id:'cleanWeek', on:b.cleanWeek, emoji:'💚', title:'هفته تمیز'},
      {id:'goalOnce', on:b.goalOnce, emoji:'🎯', title:'رسیدن به هدف'},
      {id:'weightHero', on:b.weightHero, emoji:'⚖️', title:'ثبت وزن'}
    ];
  }

  function weekKey(){
    try{
      var k=todayKey();
      var d=fromKey(k);
      // ISO-ish week string
      var t=new Date(d.getTime());
      t.setHours(0,0,0,0);
      t.setDate(t.getDate()+(3-t.getDay()));
      var w1=new Date(t.getFullYear(),0,4);
      var week=1+Math.round(((t-w1)/86400000-3+((w1.getDay()+6)%7))/7);
      return t.getFullYear()+'-W'+week;
    }catch(e){ return todayKey().slice(0,7); }
  }

  function canOpenChance(){
    ensurePlay();
    try{
      if(typeof weekScore!=='function') return false;
      if(weekScore()<(S.goal||15)) return false;
      return S.play.chanceOpenedWeek!==weekKey();
    }catch(e){ return false; }
  }

  function openChance(){
    ensurePlay();
    if(!canOpenChance()){ showToast('هنوز به هدف نرسیدی یا قبلاً باز کردی'); return; }
    var prizes=['یک ستاره طلایی اضافه! ⭐','آفرین ویژه از مامان و بابا 💜','انتخاب بازی امشب با تو 🎲','یک برچسب جدید روی دفتر 🎀','۵ دقیقه وقت اضافه قصه 📚'];
    var pick=prizes[Math.floor(Math.random()*prizes.length)];
    S.play.chanceOpenedWeek=weekKey();
    // bonus +1 point style: add a positive note
    try{
      if(typeof mutDay==='function'){
        mutDay(todayKey(), function(day){
          day.notes=day.notes||[];
          day.notes.push({id:uid(), t:'جعبه شانس: '+pick, type:'pos', ts:Date.now()});
        });
      }else{
        if(typeof saveProfile==='function') saveProfile();
      }
    }catch(e){ if(typeof saveProfile==='function') saveProfile(); }
    if(typeof celebrate==='function') celebrate();
    showToast(pick);
    try{ render(); }catch(e){}
  }

  function playHeroHtml(){
    ensurePlay();
    var m=getMascot();
    var nick=S.play.nickname||'سارینا';
    var streak=S.streak||0;
    var h='<div class="play-hero">';
    h+='<div class="play-top">';
    h+='<div class="play-mascot" data-act="pick-mascot" title="عوض کردن ماسکوت">'+m.emoji+'</div>';
    h+='<div class="play-meta">';
    h+='<h2>'+esc(S.name||'سارینا')+'</h2>';
    h+='<div class="nick">'+esc(nick)+'</div>';
    h+='<div class="streak">🔥 استریک '+fa(streak)+' روز</div>';
    h+='</div></div>';
    h+='<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
    h+='<button type="button" class="ghost" style="background:rgba(255,255,255,.25);color:#fff;border-color:rgba(255,255,255,.4)" data-act="edit-nick">✏️ لقب</button>';
    h+='<button type="button" class="ghost" style="background:rgba(255,255,255,.25);color:#fff;border-color:rgba(255,255,255,.4)" data-act="pick-mascot">🎭 ماسکوت</button>';
    h+='</div></div>';
    return h;
  }

  function missionHtml(){
    var mp=missionProgress();
    if(!mp.total) return '';
    var stars='';
    for(var i=0;i<mp.total;i++) stars+=i<mp.done?'⭐':'☆';
    var h='<div class="mission-card"><h3>🎯 مأموریت ۳ ستاره‌ای امروز</h3>';
    h+='<div class="mission-stars">'+stars+'</div>';
    mp.picks.forEach(function(t){
      var k=typeof todayKey==='function'?todayKey():'';
      var st=((S.days&&S.days[k]&&S.days[k].tasks)||{})[t.id];
      var done=st&&st.s==='done';
      h+='<div class="mission-item'+(done?' done':'')+'">'+(done?'✅':'⬜')+' '+esc(t.title)+'</div>';
    });
    if(mp.done>=mp.total && mp.total>0){
      h+='<p style="margin:8px 0 0;font-weight:800;color:#9A3412">تمام! آفرین قهرمان 💜</p>';
    }
    h+='</div>';
    return h;
  }

  function badgesHtml(){
    var list=badgeList();
    var h='<section class="card"><div class="card-h"><h2>🏅 نشان‌های من</h2></div><div class="badge-grid">';
    list.forEach(function(b){
      h+='<div class="badge '+(b.on?'on':'off')+'"><span class="be">'+b.emoji+'</span>'+esc(b.title)+'</div>';
    });
    h+='</div></section>';
    return h;
  }

  function chanceHtml(){
    if(!canOpenChance()){
      // show locked teaser if close
      try{
        if(typeof weekScore==='function' && weekScore()<(S.goal||15)){
          return '<div class="chance-box" style="opacity:.85"><div style="font-size:28px">🎁</div><div style="font-weight:800">جعبه شانس هفتگی</div><div style="font-size:12px;margin-top:4px">بعد از رسیدن به هدف هفته باز می‌شود</div></div>';
        }
      }catch(e){}
      return '';
    }
    return '<div class="chance-box"><div style="font-size:36px">🎁✨</div><div style="font-weight:800;font-size:16px">جعبه شانس هفتگی آماده‌ست!</div><button type="button" data-act="open-chance">باز کردن جعبه</button></div>';
  }

  function suggestHtml(){
    // only for child device or when not in full parent lock - show for child role
    if(typeof deviceRole!=='undefined' && deviceRole==='parent' && typeof isParent!=='undefined' && isParent){
      // parents see approve queue elsewhere; still allow viewing
    }
    var h='<section class="card"><div class="card-h"><h2>💡 پیشنهادهای من</h2></div>';
    h+='<p class="muted">پیشنهاد می‌دهی؛ مامان و بابا تأیید می‌کنند</p>';
    h+='<div class="suggest-row">';
    h+='<button type="button" data-act="suggest-reward">🎁 پاداش جدید</button>';
    h+='<button type="button" data-act="suggest-task">✅ تسک جدید</button>';
    h+='</div>';
    // kindness for parents after goal
    try{
      if(typeof weekScore==='function' && weekScore()>=(S.goal||15)){
        h+='<button type="button" data-act="suggest-kindness" style="width:100%;margin-top:8px;min-height:44px;border-radius:14px;font-weight:700;border:2px solid var(--pink);background:var(--pink-soft);color:var(--accent-deep)">💜 کار محبت برای مامان/بابا</button>';
      }
    }catch(e){}
    h+='</section>';
    return h;
  }

  function mascotPickerHtml(){
    ensurePlay();
    var h='<div class="mascot-pick">';
    MASCOTS.forEach(function(m){
      h+='<button type="button" data-act="set-mascot" data-id="'+m.id+'" class="'+(S.play.mascot===m.id?'on':'')+'">'+m.emoji+'</button>';
    });
    h+='</div>';
    return h;
  }

  // Inject into today view for child experience (also ok for parents to see)
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      ensurePlay();
      var block=playHeroHtml()+missionHtml()+chanceHtml();
      // insert near top after hero/level if possible
      if(html.indexOf('play-hero')>=0) return html;
      if(html.indexOf('class="level-card"')>=0){
        html=html.replace(/(<section class="level-card"[\s\S]*?<\/section>)/, function(m){ return block+m; });
      }else if(html.indexOf('fun-hero')>=0||html.indexOf('class="hero"')>=0){
        html=html.replace(/(<section class="(?:fun-)?hero"[\s\S]*?<\/section>)/, function(m){ return m+block; });
      }else{
        html=block+html;
      }
      // badges + suggest before foot area — append before last section end roughly
      if(html.indexOf('نشان‌های من')<0){
        html+=badgesHtml()+suggestHtml();
      }
      return html;
    };
  }

  // Child settings: allow mascot + nick
  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      ensurePlay();
      if(typeof deviceRole!=='undefined'&&deviceRole==='child'){
        var extra='<section class="card"><div class="card-h"><h2>🎭 ماسکوت و لقب</h2></div>';
        extra+=mascotPickerHtml();
        extra+='<p class="muted">لقب فعلی: <b>'+esc(S.play.nickname||'')+'</b></p>';
        extra+='<button type="button" class="btn" style="width:100%" data-act="edit-nick">تغییر لقب</button>';
        extra+='</section>';
        extra+=badgesHtml();
        html+=extra;
      }
      return html;
    };
  }

  // Extend applyPending for suggestions
  if(typeof applyPending==='function'){
    var _applyPending=applyPending;
    applyPending=function(item){
      if(!item) return _applyPending(item);
      if(item.type==='suggest-reward' && item.payload){
        S.rewards=S.rewards||[];
        S.rewards.push({id:uid(), t:item.payload.t, c:item.payload.c||100});
        if(typeof saveProfile==='function') saveProfile();
        return;
      }
      if(item.type==='suggest-task' && item.payload){
        S.tasks=S.tasks||[];
        S.tasks.push({id:uid(), title:item.payload.title});
        if(typeof saveProfile==='function') saveProfile();
        return;
      }
      if(item.type==='suggest-kindness' && item.payload){
        S.parentTasks=S.parentTasks||[];
        S.parentTasks.unshift({id:uid(), t:item.payload.t, k:todayKey(), done:false});
        if(typeof saveProfile==='function') saveProfile();
        return;
      }
      return _applyPending(item);
    };
  }

  // Include play profile lightly in sync snapshot if saveProfile is used
  // Hook: when saving, keep S.play inside local + cloud via days-level is enough for badges computed
  // Persist play in S so sharedFrom can be extended
  var origShared=null;

  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]');
    if(!t) return;
    var a=t.getAttribute('data-act');

    if(a==='pick-mascot'){
      e.preventDefault(); e.stopPropagation();
      ensurePlay();
      // cycle or show toast with picker via render settings-like prompt
      var cur=MASCOTS.findIndex(function(m){return m.id===S.play.mascot});
      var next=MASCOTS[((cur<0?0:cur)+1)%MASCOTS.length];
      S.play.mascot=next.id;
      if(typeof saveProfile==='function') saveProfile();
      showToast('ماسکوت: '+next.emoji+' '+next.name);
      try{ render(); }catch(err){}
      return;
    }

    if(a==='set-mascot'){
      e.preventDefault(); e.stopPropagation();
      ensurePlay();
      S.play.mascot=t.getAttribute('data-id')||'unicorn';
      if(typeof saveProfile==='function') saveProfile();
      showToast('ماسکوت انتخاب شد '+getMascot().emoji);
      try{ render(); }catch(err){}
      return;
    }

    if(a==='edit-nick'){
      e.preventDefault(); e.stopPropagation();
      ensurePlay();
      var cur=S.play.nickname||'شاهزاده خانم سارینا';
      var n=prompt('لقب قهرمان:', cur);
      if(n===null) return;
      n=n.trim();
      if(!n){ showToast('لقب خالی نباشد'); return; }
      S.play.nickname=n.slice(0,40);
      if(typeof saveProfile==='function') saveProfile();
      showToast('لقب ذخیره شد ✨');
      try{ render(); }catch(err){}
      return;
    }

    if(a==='open-chance'){
      e.preventDefault(); e.stopPropagation();
      openChance();
      return;
    }

    if(a==='suggest-reward'){
      e.preventDefault(); e.stopPropagation();
      var title=prompt('چه پاداشی پیشنهاد می‌کنی؟');
      if(title===null) return;
      title=title.trim();
      if(!title) return;
      var cost=prompt('چند ستاره؟ (پیشنهاد)', '100');
      if(cost===null) return;
      cost=parseInt(String(cost).replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}),10)||100;
      if(typeof deviceRole!=='undefined'&&deviceRole==='child' || (typeof isParent!=='undefined'&&!isParent)){
        if(typeof addPending==='function'){
          addPending('suggest-reward',{t:title,c:cost},'پیشنهاد پاداش: '+title+' ('+cost+')');
          showToast('پیشنهاد پاداش برای والدین ارسال شد 🔔');
        }
      }else{
        S.rewards=S.rewards||[];
        S.rewards.push({id:uid(),t:title,c:cost});
        if(typeof saveProfile==='function') saveProfile();
        showToast('پاداش اضافه شد');
      }
      try{ render(); }catch(err){}
      return;
    }

    if(a==='suggest-task'){
      e.preventDefault(); e.stopPropagation();
      var title=prompt('چه تسک جدیدی پیشنهاد می‌کنی؟');
      if(title===null) return;
      title=title.trim();
      if(!title) return;
      if(typeof deviceRole!=='undefined'&&deviceRole==='child' || (typeof isParent!=='undefined'&&!isParent)){
        if(typeof addPending==='function'){
          addPending('suggest-task',{title:title},'پیشنهاد تسک: '+title);
          showToast('پیشنهاد تسک برای والدین ارسال شد 🔔');
        }
      }else{
        S.tasks=S.tasks||[];
        S.tasks.push({id:uid(),title:title});
        if(typeof saveProfile==='function') saveProfile();
        showToast('تسک اضافه شد');
      }
      try{ render(); }catch(err){}
      return;
    }

    if(a==='suggest-kindness'){
      e.preventDefault(); e.stopPropagation();
      try{
        if(typeof weekScore==='function' && weekScore()<(S.goal||15)){
          showToast('اول به هدف هفته برس');
          return;
        }
      }catch(err){}
      var title=prompt('چه کار محبتی برای مامان یا بابا؟','بازی مشترک ۱۵ دقیقه‌ای');
      if(title===null) return;
      title=title.trim();
      if(!title) return;
      if(typeof addPending==='function' && (typeof isParent==='undefined'||!isParent)){
        addPending('suggest-kindness',{t:title},'کار محبت: '+title);
        showToast('پیشنهاد محبت ارسال شد 💜');
      }else{
        S.parentTasks=S.parentTasks||[];
        S.parentTasks.unshift({id:uid(),t:title,k:todayKey(),done:false});
        if(typeof saveProfile==='function') saveProfile();
        showToast('ثبت شد');
      }
      try{ render(); }catch(err){}
      return;
    }
  }, true);

  // Patch sharedFrom in sync if available later
  setTimeout(function(){
    try{
      if(window.__sarinaSync){
        // ensure play state persists locally always
        ensurePlay();
      }
    }catch(e){}
  }, 500);

  // Persist play inside S to localStorage via existing lsSave
  ensurePlay();
  console.log('sarina-play.js loaded');
})();
