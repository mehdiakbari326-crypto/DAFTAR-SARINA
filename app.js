document.documentElement.setAttribute('dir','rtl');
const firebaseConfig={apiKey:"AIzaSyBvQEV428AMGvYa6Ztkqxzm3K_iLcZAqm0",authDomain:"sarina-daftar.firebaseapp.com",databaseURL:"https://sarina-daftar-default-rtdb.firebaseio.com",projectId:"sarina-daftar",storageBucket:"sarina-daftar.firebasestorage.app",messagingSenderId:"912685467959",appId:"1:912685467959:web:bef6f3cf3ee6f8f25432b2",measurementId:"G-LGLGCM8KWX"};
var db=null;
try{
  if(typeof firebase!=='undefined'){
    firebase.initializeApp(firebaseConfig);
    db=firebase.database();
  }
}catch(e){console.log('firebase init',e)}
const FAMILY_PATH='family/sarina';
function showBootError(msg){
  var el=document.getElementById('app');
  if(el) el.innerHTML='<div style="padding:40px 20px;text-align:center;font-family:Tahoma,sans-serif;direction:rtl"><div style="font-size:48px">💜</div><h2 style="color:#6B3FBF">دفتر سارینا</h2><p style="color:#666">'+msg+'</p><button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;background:#9B6DFF;color:#fff;border:0;border-radius:12px;font-size:16px">تلاش دوباره</button></div>';
}
var PRESET_POS=['کمک در کارهای خانه','مهربانی با دیگران','راستگویی','ادب و تشکر','تلاش و پشتکار'];
var PRESET_NEG=['دروغ گفتن','بی‌احترامی','لجبازی','دعوا کردن','حرف گوش نکردن'];
var PRESET_PARENT=['باهام قصه بخون','باهام بازی کن','منو ببر پارک','باهم فیلم ببینیم','بستنی بخوریم'];
var MOTIVATE=['آفرین سارینا! تو فوق‌العاده‌ای 💜','وای چه دختر زرنگی! ستاره گرفتی ✨','ادامه‌ش بده قهرمانم! 🌟','سارینا جون، عالی پیش میری 💕','اینم از تو! خیلی خوشحال شدم 🌸','تو ستاره منی! ⭐','چه دختر باهوشی! 🦄'];
var PRESET_HEALTH=[{t:'بستنی',e:'🍦',d:7},{t:'فست‌فود',e:'🍔',d:15},{t:'رستوران',e:'🍕',d:30},{t:'شکلات',e:'🍫',d:5},{t:'نوشابه',e:'🥤',d:7},{t:'چیپس',e:'🍟',d:10}];
var PRESET_REWARDS=[{t:'انتخاب فیلم شب',c:6},{t:'بستنی',c:8},{t:'یک ساعت بازی',c:10},{t:'گردش آخر هفته',c:25}];
var LEVELS=[{min:0,name:'ستاره کوچک',icon:'⭐',next:10},{min:10,name:'شاهزاده خانم',icon:'👑',next:25},{min:25,name:'قهرمان بنفش',icon:'🦄',next:50},{min:50,name:'فرشته مهربان',icon:'🧚',next:80},{min:80,name:'ملکه ستاره‌ها',icon:'🌟',next:120},{min:120,name:'افسانه سارینا',icon:'💎',next:9999}];
var THEMES=[{id:'unicorn',name:'یونیکورن',icon:'🦄'},{id:'princess',name:'شاهزاده',icon:'👑'},{id:'ocean',name:'اقیانوس',icon:'🐬'},{id:'forest',name:'جنگل',icon:'🌿'}];
var CHARACTERS=[{emoji:'🦄',name:'یونیکورن'},{emoji:'🐰',name:'خرگوش'},{emoji:'🐱',name:'گربه'},{emoji:'🐻',name:'تدی'},{emoji:'🦊',name:'روباه'},{emoji:'🐼',name:'پاندا'},{emoji:'🦋',name:'پروانه'},{emoji:'🌟',name:'ستاره'}];
function pad(n){return String(n).padStart(2,'0')}
function keyOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function fromKey(k){var p=k.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12)}
function addDays(k,n){var d=fromKey(k);d.setDate(d.getDate()+n);return keyOf(d)}
function todayKey(){return keyOf(new Date())}
function fa(n){return Number(n).toLocaleString('fa-IR')}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]})}
function mkFmt(o){try{return new Intl.DateTimeFormat('fa-IR-u-ca-persian',o)}catch(e){return new Intl.DateTimeFormat('fa-IR',o)}}
var fmtFull=mkFmt({weekday:'long',day:'numeric',month:'long',year:'numeric'});
var fmtShort=mkFmt({weekday:'short',day:'numeric'});
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function fmtSigned(n){return(n>0?'+':'')+fa(n)}
function toNum(s){var m=String(s||'').replace(/[۰-۹]/g,function(c){return c.charCodeAt(0)-1776}).replace(/[٠-٩]/g,function(c){return c.charCodeAt(0)-1632});var n=parseInt(m,10);return isNaN(n)?0:Math.max(0,Math.min(9999,n))}
function toEnDigits(s){return String(s||'').replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}).replace(/[٠-٩]/g,function(c){return String(c.charCodeAt(0)-1632)})}
var S={name:'سارینا',tasks:[],days:{},rewards:[],claims:[],goal:15,parentTasks:[],parentPin:'1234',posBehaviors:[],negBehaviors:[],streak:0,lastActive:'',theme:'unicorn',pendingChanges:[],healthItems:[]};
var deviceRole=localStorage.getItem('daftar-device-role-v2')||'';
var showRolePicker=!deviceRole;
var prevPendingIds={};var lastKnownDone=-1;
var view='today',curKey=todayKey(),draftType='pos',draftText='',isParent=false,showPinModal=false,toastMsg='',toastTimer=null,syncStatus='connecting',ignoreRemote=false,reportRange=7;
var app=document.getElementById('app');var LS='daftar-sarina-v9';
function applyTheme(){document.documentElement.setAttribute('data-theme',S.theme||'unicorn')}
function lsLoad(){try{var j=JSON.parse(localStorage.getItem(LS));if(j){Object.assign(S,{name:j.name||'سارینا',tasks:j.tasks||[],days:j.days||{},rewards:j.rewards||[],claims:j.claims||[],goal:j.goal||15,parentTasks:j.parentTasks||[],parentPin:j.parentPin||'1234',posBehaviors:j.posBehaviors||[],negBehaviors:j.negBehaviors||[],streak:j.streak||0,lastActive:j.lastActive||'',theme:j.theme||'unicorn',pendingChanges:j.pendingChanges||[],healthItems:j.healthItems||[]})}applyTheme()}catch(e){}}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
function saveProfile(){lsSave();if(!db){syncStatus='offline';updateSyncDot();return}ignoreRemote=true;db.ref(FAMILY_PATH).set(S).then(function(){ignoreRemote=false;syncStatus='online';updateSyncDot()}).catch(function(){ignoreRemote=false;syncStatus='offline';updateSyncDot()})}
function startFirebaseSync(){if(!db){syncStatus='offline';return}db.ref(FAMILY_PATH).on('value',function(snap){if(ignoreRemote)return;var r=snap.val();if(r){Object.assign(S,{name:r.name||S.name,tasks:r.tasks||S.tasks,days:r.days||S.days,rewards:r.rewards||S.rewards,claims:r.claims||S.claims,goal:r.goal||S.goal,parentTasks:r.parentTasks||S.parentTasks,parentPin:r.parentPin||S.parentPin,posBehaviors:r.posBehaviors||S.posBehaviors,negBehaviors:r.negBehaviors||S.negBehaviors,streak:r.streak||S.streak,lastActive:r.lastActive||S.lastActive,theme:r.theme||S.theme,pendingChanges:r.pendingChanges||S.pendingChanges||[],healthItems:r.healthItems||S.healthItems||[]});applyTheme();lsSave();
      var allPend=r.pendingChanges||[];
      var pend=allPend.filter(function(p){return p.status==='pending'});
      if(pend.length&&deviceRole!=='child'){notifyParentsPending(pend[0].label||'درخواست جدید')}
      if(deviceRole==='child'){
        allPend.forEach(function(p){
          if(p.status==='approved'&&p.id&&!prevPendingIds[p.id]){
            if(p.type==='mark'&&p.payload&&p.payload.s==='done'){
              showSarinaNotif('⭐ آفرین سارینا!','«'+(p.payload.title||'تسک')+'» تأیید شد و ستاره گرفتی!','ok-'+p.id);
            }else if(p.type==='note'&&p.payload&&p.payload.noteType==='pos'){
              showSarinaNotif('💜 آفرین!','رفتار خوبت ثبت شد','ok-'+p.id);
            }
          }
        });
      }
      prevPendingIds={};
      allPend.forEach(function(p){if(p.id)prevPendingIds[p.id]=p.status});
      if(deviceRole==='child'&&!isParent){
        var st=dayStats(todayKey());
        var nowDone=st.done||0;
        if(lastKnownDone>=0&&nowDone>lastKnownDone){
          showSarinaNotif('⭐ آفرین سارینا!','یکی از کارها انجام شد و ستاره گرفتی!','sync-done');
        }
        lastKnownDone=nowDone;
      }
      render()}syncStatus='online';updateSyncDot()},function(){syncStatus='offline';updateSyncDot()})
}
function updateSyncDot(){var el=document.getElementById('syncDot');if(el)el.className='sync-dot '+(syncStatus==='online'?'on':syncStatus==='offline'?'off':'')}
function getDay(k){return S.days[k]||{tasks:{},notes:[]}}
function mutDay(k,fn){var d=JSON.parse(JSON.stringify(getDay(k)));d.tasks=d.tasks||{};d.notes=d.notes||[];fn(d);S.days[k]=d;updateStreak();saveProfile();render()}
function dayTaskList(k){var rec=getDay(k).tasks||{};return S.tasks.map(function(t){return{id:t.id,title:t.title,s:rec[t.id]&&rec[t.id].s}})}
function dayStats(k){var list=dayTaskList(k);var d=getDay(k);var done=list.filter(function(t){return t.s==='done'}).length;var missed=list.filter(function(t){return t.s==='missed'}).length;var pos=(d.notes||[]).filter(function(n){return n.type==='pos'}).length;var neg=(d.notes||[]).filter(function(n){return n.type==='neg'}).length;return{done:done,missed:missed,pos:pos,neg:neg}}
function score(s){return (s.done||0)+(s.pos||0)-(s.missed||0)-(s.neg||0)}
function totalScore(){var t=0;Object.keys(S.days).forEach(function(k){t+=score(dayStats(k))});return t}
function weekScore(){var t=0;for(var i=0;i<7;i++)t+=score(dayStats(addDays(todayKey(),-i)));return t}
function availablePoints(){return Math.max(0,totalScore()-(S.claims||[]).reduce(function(a,c){return a+(c.c||0)},0))}
function getPosBehaviors(){return(S.posBehaviors&&S.posBehaviors.length)?S.posBehaviors:PRESET_POS.slice()}
function getNegBehaviors(){return(S.negBehaviors&&S.negBehaviors.length)?S.negBehaviors:PRESET_NEG.slice()}
function getLevel(){var pts=totalScore();var lvl=LEVELS[0];for(var i=0;i<LEVELS.length;i++){if(pts>=LEVELS[i].min)lvl=LEVELS[i]}var next=lvl.next;var progress=Math.min(100,Math.round(((pts-lvl.min)/(next-lvl.min||1))*100));return{name:lvl.name,icon:lvl.icon,pts:pts,next:next,progress:progress,min:lvl.min}}
function updateStreak(){var today=todayKey();var st=dayStats(today);if(st.done+st.pos>0){if(S.lastActive===today)return;if(S.lastActive===addDays(today,-1))S.streak=(S.streak||0)+1;else if(S.lastActive!==today)S.streak=1;S.lastActive=today}}
function hasCapNotif(){try{return !!(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications)}catch(e){return false}}
function cancelAllNotifs(){
  if(hasCapNotif()){
    try{Capacitor.Plugins.LocalNotifications.cancel({notifications:[{id:9001}]})}catch(e){}
    try{Capacitor.Plugins.LocalNotifications.getPending().then(function(r){
      var ids=(r&&r.notifications||[]).map(function(n){return{id:n.id}});
      if(ids.length)Capacitor.Plugins.LocalNotifications.cancel({notifications:ids});
    }).catch(function(){})}catch(e){}
  }
}
function isSarinaDevice(){return deviceRole==='child'}
function setDeviceRole(role){
  deviceRole=role;
  try{localStorage.setItem('daftar-device-role-v2',role)}catch(e){}
  showRolePicker=false;
  if(role==='parent'){isParent=true;cancelAllNotifs()}
  else{isParent=false;scheduleSarinaReminders()}
  render()
}
function notifSupported(){return hasCapNotif()||('Notification' in window)}
function requestNotifPermission(){
  if(hasCapNotif()){
    return Capacitor.Plugins.LocalNotifications.requestPermissions().then(function(r){
      var ok=(r&&r.display==='granted');
      try{localStorage.setItem('daftar-notif-ok',ok?'1':'0')}catch(e){}
      return ok;
    }).catch(function(){return false});
  }
  if(!('Notification' in window))return Promise.resolve(false);
  if(Notification.permission==='granted')return Promise.resolve(true);
  if(Notification.permission==='denied')return Promise.resolve(false);
  return Notification.requestPermission().then(function(p){return p==='granted'});
}
function showSarinaNotif(title,body,tag){
  if(deviceRole!=='child')return;
  if(isParent)return;
  if(hasCapNotif()){
    var id=Math.floor(Math.random()*100000)+1;
    Capacitor.Plugins.LocalNotifications.schedule({
      notifications:[{id:id,title:title,body:body,schedule:{at:new Date(Date.now()+800)},iconColor:'#9B6DFF'}]
    }).catch(function(e){console.log('notif',e)});
    return;
  }
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{var n=new Notification(title,{body:body,tag:tag||('sarina-'+Date.now()),dir:'rtl',lang:'fa'});n.onclick=function(){window.focus();n.close()}}catch(e){}
}
function dayChar(){return CHARACTERS[new Date().getDate()%CHARACTERS.length]}
function buildDailyNotifBody(){var ch=dayChar();var ws=weekScore(),g=S.goal||15,left=Math.max(0,g-ws);var pts=totalScore();var msgs=[ch.emoji+' سلام سارینا! امروز '+fa(pts)+' ستاره داری. تا هدف هفته '+fa(left)+' تا مونده ✨',ch.emoji+' '+ch.name+' می‌گه: کارهای امروزت رو انجام بده تا ستاره بگیری 💜',ch.emoji+' یادت نره! هنوز '+fa(left)+' امتیاز تا هدف هفته مونده. تو می‌تونی 🌟'];return msgs[new Date().getDate()%msgs.length]}
function scheduleSarinaReminders(){
  if(deviceRole!=='child')return;
  try{
    var last=localStorage.getItem('daftar-last-daily-notif')||'';
    var today=todayKey();
    if(last===today)return;
    requestNotifPermission().then(function(ok){
      if(!ok)return;
      var h=new Date().getHours();
      if(h>=9&&h<=21){
        showSarinaNotif('💜 دفتر روزانه سارینا',buildDailyNotifBody(),'sarina-daily');
        localStorage.setItem('daftar-last-daily-notif',today);
      }
      if(hasCapNotif()){
        var tomorrow=new Date();
        tomorrow.setDate(tomorrow.getDate()+1);
        tomorrow.setHours(9,0,0,0);
        Capacitor.Plugins.LocalNotifications.schedule({
          notifications:[{id:9001,title:'💜 صبح بخیر سارینا',body:buildDailyNotifBody(),schedule:{at:tomorrow},iconColor:'#9B6DFF'}]
        }).catch(function(){});
      }
    });
  }catch(e){}
}
function notifyTaskDone(title){if(deviceRole!=='child'||isParent)return;var ch=dayChar();showSarinaNotif(ch.emoji+' آفرین سارینا!','تسک «'+(title||'')+'» انجام شد. ستاره گرفتی ⭐','sarina-task')}
function getPending(){return (S.pendingChanges||[]).filter(function(p){return p.status==='pending'})}
function addPending(type,payload,label){S.pendingChanges=S.pendingChanges||[];var item={id:uid(),type:type,payload:payload,label:label||type,status:'pending',at:Date.now()};S.pendingChanges.unshift(item);saveProfile();notifyParentsPending(label);return item}
function notifyParentsPending(label){if(deviceRole==='child')return;if(hasCapNotif()){Capacitor.Plugins.LocalNotifications.schedule({notifications:[{id:Math.floor(Math.random()*100000)+1,title:'🔔 درخواست سارینا',body:(label||'یک تغییر جدید')+' — لطفاً تأیید یا رد کنید',schedule:{at:new Date(Date.now()+500)},iconColor:'#9B6DFF'}]}).catch(function(){});return}if(!('Notification' in window)||Notification.permission!=='granted')return;try{var n=new Notification('🔔 درخواست سارینا',{body:(label||'یک تغییر جدید')+' — لطفاً تأیید یا رد کنید',tag:'parent-pending',dir:'rtl',lang:'fa'});n.onclick=function(){window.focus();n.close()}}catch(e){}}
function applyPending(item){if(!item||item.status!=='pending')return;var p=item.payload||{};if(item.type==='mark'){mutDay(p.k,function(day){if(!day.tasks[p.id])day.tasks[p.id]={t:p.title||''};if(p.s)day.tasks[p.id].s=p.s;else if(day.tasks[p.id])delete day.tasks[p.id].s})}else if(item.type==='note'){mutDay(p.k,function(day){day.notes=day.notes||[];day.notes.push({id:p.noteId||uid(),t:p.t,type:p.noteType,ts:p.ts||Date.now()})})}}
function approvePending(id){var item=(S.pendingChanges||[]).find(function(p){return p.id===id});if(!item)return;item.status='approved';applyPending(item);saveProfile();showToast('تأیید شد ✅');render()}
function rejectPending(id){var item=(S.pendingChanges||[]).find(function(p){return p.id===id});if(!item)return;item.status='rejected';saveProfile();showToast('رد شد');render()}
function getHealthItems(){return S.healthItems||[]}
function daysUntilHealth(item){if(!item||!item.lastDate)return 0;var last=fromKey(item.lastDate);var next=new Date(last.getTime());next.setDate(next.getDate()+(item.cooldownDays||7));var today=fromKey(todayKey());var diff=Math.ceil((next-today)/(24*60*60*1000));return Math.max(0,diff)}
function isHealthAvailable(item){return daysUntilHealth(item)===0}
function logHealth(id){var items=getHealthItems();var item=items.find(function(x){return x.id===id});if(!item)return;if(!isHealthAvailable(item)&&!isParent){showToast('هنوز زود است! '+fa(daysUntilHealth(item))+' روز مانده');return}item.lastDate=todayKey();S.healthItems=items;saveProfile();var left=item.cooldownDays||7;if(deviceRole==='child'&&!isParent){showSarinaNotif((item.emoji||'💜')+' سلامتی','سارینا جان امروز «'+item.title+'» ثبت شد 💜 حدود '+fa(left)+' روز دیگه می‌تونیم دوباره بریم!','health-'+item.id)}showToast((item.emoji||'')+' ثبت شد — '+fa(left)+' روز بعد');render()}
function healthDashboard(){var items=getHealthItems();if(!items.length)return '';var h='<section class="card"><div class="card-h"><h2>🥗 سلامتی</h2></div><div class="health-row">';items.forEach(function(it){var left=daysUntilHealth(it);var avail=left===0;h+='<div class="health-chip'+(avail?' ok':'')+'"><span class="h-emoji">'+(it.emoji||'🍱')+'</span>';if(avail)h+='<span class="h-days">آزاد</span>';else h+='<span class="h-days">'+fa(left)+' روز</span>';h+='</div>'});return h+'</div></section>'}
function healthView(){var items=getHealthItems();var h=levelCard()+'<section class="card"><div class="card-h"><h2>🥗 سلامتی و محدودیت‌ها</h2></div><p class="muted">وقتی چیزی ثبت شود، تا پایان دورهٔ انتظار دوباره مجاز نیست.</p>';if(!items.length)h+='<div class="empty-fun"><div class="big">🍦</div><p class="muted">والدین از تنظیمات آیتم اضافه کنند</p></div>';else items.forEach(function(it){var left=daysUntilHealth(it);var avail=left===0;h+='<div class="health-item'+(avail?'':' wait')+'"><div class="hi-top"><span class="hi-emoji">'+(it.emoji||'🍱')+'</span><div><strong>'+esc(it.title)+'</strong><small>هر '+fa(it.cooldownDays||7)+' روز یک‌بار</small></div></div>';if(avail){h+='<p class="muted" style="color:var(--pos);font-weight:700">✅ الان می‌تونی</p>';if(isParent)h+='<button type="button" class="btn" style="width:100%" data-act="log-health" data-id="'+esc(it.id)+'">ثبت مصرف امروز</button>';else h+='<p class="muted" style="font-size:12px">والدین مصرف را ثبت می‌کنند</p>'}else{h+='<div class="hi-countdown"><span>'+fa(left)+'</span><small>روز مانده</small></div>';if(it.lastDate)h+='<p class="muted" style="font-size:12px">آخرین بار: '+esc(fmtShort.format(fromKey(it.lastDate)))+'</p>'}h+='</div>'});return h+'</section>'}
function showToast(msg){toastMsg=msg;clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastMsg='';render()},2800);render()}
function celebrate(){var el=document.createElement('div');el.className='celeb';var emojis=['⭐','💜','✨','🦄','🌸','💖','🌟','👑'];for(var i=0;i<18;i++){var s=document.createElement('span');s.textContent=emojis[Math.floor(Math.random()*emojis.length)];s.style.left=Math.random()*100+'%';s.style.animationDelay=(Math.random()*0.6)+'s';s.style.fontSize=(16+Math.random()*18)+'px';el.appendChild(s)}document.body.appendChild(el);setTimeout(function(){el.remove()},2200)}
function greetMsg(){var h=new Date().getHours();var name=S.name||'سارینا';if(h<12)return 'صبح بخیر '+name+' ☀️ امروز هم روز قهرمانانه‌ات رو شروع کن!';if(h<17)return 'سلام '+name+' 🌸 داری عالی پیش میری، ادامه بده!';return 'عصر بخیر '+name+' ✨ کارهای امروزت رو تموم کردی؟'}
function header(){return '<header class="hero"><div class="hero-top"><div><h1>دفتر روزانه سارینا <span id="syncDot" class="sync-dot"></span></h1><p class="sub">هر کار خوب = یک ستاره بنفش ✨</p></div><div class="mascot">'+(isParent?'👨‍👩‍👧':dayChar().emoji)+'</div></div>'+(isParent?'':'<div class="greet">'+greetMsg()+'</div>')+'<input id="nameIn" class="name" value="'+esc(S.name)+'" '+(isParent?'':'readonly')+'><div class="tabs" id="mainTabs"><button type="button" data-act="view" data-v="today" aria-selected="'+(view==='today')+'">امروز</button><button type="button" data-act="view" data-v="health" aria-selected="'+(view==='health')+'">سلامتی</button><button type="button" data-act="view" data-v="report" aria-selected="'+(view==='report')+'">گزارش</button><button type="button" data-act="view" data-v="rewards" aria-selected="'+(view==='rewards')+'">پاداش</button><button type="button" data-act="view" data-v="parent" aria-selected="'+(view==='parent')+'">مامان‌بابا</button><button type="button" data-act="view" data-v="settings" aria-selected="'+(view==='settings')+'">تنظیمات</button></div></header>'}
function levelCard(){var L=getLevel();var streak=S.streak||0;return '<div class="level-card"><div class="level-row"><div class="level-badge"><span class="level-icon">'+L.icon+'</span><div class="level-info"><strong>'+L.name+'</strong><span>'+fa(L.pts)+' امتیاز • تا سطح بعد: '+fa(Math.max(0,L.next-L.pts))+'</span></div></div>'+(streak>0?'<div class="streak">🔥 '+fa(streak)+' روز</div>':'')+'</div><div class="xp-bar"><i style="width:'+L.progress+'%"></i></div></div>'}
function weekBox(){var ws=weekScore(),g=S.goal||15,p=Math.min(100,Math.round(ws/g*100));var h='<div class="week"><div class="rate-h"><span>امتیاز این هفته</span><b>'+fa(ws)+' از '+fa(g)+'</b></div><div class="bar"><i style="width:'+p+'%"></i></div>';if(ws>=g)h+='<p style="color:var(--pos);font-weight:700;margin:8px 0 0;text-align:center">🎉 آفرین! هدف هفته کامل شد</p>';return h+'</div>'}
function todayView(){var k=curKey,isToday=k===todayKey(),list=dayTaskList(k),d=getDay(k),st=dayStats(k),h='';h+=levelCard();h+=healthDashboard();if(isParent){var pend=getPending();if(pend.length)h+='<section class="card" style="border-color:var(--gold);text-align:center"><strong>🔔 '+fa(pend.length)+' درخواست در انتظار تأیید</strong><p class="muted">از تب مامان‌بابا بررسی کنید</p></section>'}h+='<div class="datebar"><button type="button" class="icon" data-act="day" data-n="-1">›</button><div style="text-align:center"><strong>'+fmtFull.format(fromKey(k))+'</strong>'+(isToday?'<div class="badge">امروز</div>':'')+'</div><button type="button" class="icon" data-act="day" data-n="1"'+(isToday?' disabled':'')+'>‹</button></div>';h+='<section class="stats"><div><span class="lab">✓ تسک</span><b style="color:var(--pos)">'+fa(st.done)+'</b></div><div><span class="lab">✕ تسک</span><b style="color:var(--neg)">'+fa(st.missed||0)+'</b></div><div class="p"><span class="lab">+ رفتار</span><b>'+fa(st.pos)+'</b></div><div class="n"><span class="lab">− رفتار</span><b>'+fa(st.neg)+'</b></div><div class="s"><span class="lab">امتیاز</span><b>'+fmtSigned(score(st))+'</b></div></section>'+weekBox();h+='<section class="card"><div class="card-h"><h2>✅ تسک‌های روز</h2></div>';if(!list.length)h+='<div class="empty-fun"><div class="big">🦄</div><p class="muted">از تنظیمات تسک اضافه کن!</p></div>';else h+='<ul>'+list.map(function(t){var cls=t.s==='done'?' s-done':t.s==='missed'?' s-missed':'';return '<li class="task'+cls+'"><div class="task-t"><span>'+esc(t.title)+'</span></div><div class="seg"><button type="button" class="ok" data-act="mark" data-s="done" data-id="'+esc(t.id)+'" aria-pressed="'+(t.s==='done')+'">✓ انجام شد</button><button type="button" class="no" data-act="mark" data-s="missed" data-id="'+esc(t.id)+'" aria-pressed="'+(t.s==='missed')+'">✕ انجام نشد</button></div></li>'}).join('')+'</ul>';h+='</section>';h+='<section class="card"><div class="card-h"><h2>🌸 رفتارهای امروز</h2></div><div class="type"><button type="button" class="tp" data-act="type" data-t="pos" aria-pressed="'+(draftType==='pos')+'">مثبت 💚</button><button type="button" class="tn" data-act="type" data-t="neg" aria-pressed="'+(draftType==='neg')+'">منفی 🧡</button></div>';var chips=draftType==='pos'?getPosBehaviors():getNegBehaviors();h+='<div class="chips">'+chips.map(function(c){return '<button type="button" class="chip" data-act="chip" data-t="'+esc(c)+'">'+esc(c)+'</button>'}).join('')+'</div>';h+='<form class="add" id="noteForm"><input id="noteIn" class="inp" placeholder="رفتار دیگر..." value="'+esc(draftText)+'"><button class="btn" type="submit">ثبت</button></form>';var notes=(d.notes||[]).slice().reverse();if(notes.length)h+='<div>'+notes.map(function(n){return '<div class="note"><span class="pill '+(n.type==='pos'?'p':'n')+'">'+(n.type==='pos'?'+':'−')+'</span><div>'+esc(n.t)+'</div><button type="button" class="del" data-act="del-note" data-id="'+esc(n.id)+'">×</button></div>'}).join('')+'</div>';return h+'</section>'}
function reportView(){var range=reportRange||7;var keys=[];for(var i=range-1;i>=0;i--)keys.push(addDays(todayKey(),-i));var scores=keys.map(function(k){return score(dayStats(k))});var maxS=Math.max(1,Math.max.apply(null,scores.map(function(s){return Math.abs(s)})));var h=levelCard()+'<section class="card"><div class="card-h"><h2>📊 گزارش روند</h2></div><div class="range-btns">';[7,14,30].forEach(function(r){h+='<button type="button" data-act="range" data-n="'+r+'" class="'+(range===r?'active':'')+'">'+fa(r)+' روز گذشته</button>'});h+='</div><p class="muted" style="text-align:center;margin:4px 0 8px">گذشته ← امروز</p><div class="chart-wrap" style="direction:ltr">';keys.forEach(function(k,i){var sc=scores[i];var abs=Math.abs(sc);var hgt=abs===0?4:Math.max(14,Math.round((abs/maxS)*100));var color=sc>0?'var(--accent)':(sc<0?'var(--neg)':'var(--line)');var isToday=k===todayKey();var showLbl=range<=7||(range<=14&&(i%2===0||isToday))||(i%5===0||isToday||i===0);var lbl=isToday?'امروز':(showLbl?fmtShort.format(fromKey(k)).split(' ')[0]:'');h+='<div class="chart-col"><div class="chart-bar" style="height:'+hgt+'%;background:'+color+(isToday?';box-shadow:0 0 0 2px var(--gold)':'')+'"></div><span class="chart-lbl">'+lbl+'</span></div>'});h+='</div>';var totDone=0,totMissed=0,totPos=0,totNeg=0;keys.forEach(function(k){var st=dayStats(k);totDone+=st.done;totMissed+=st.missed||0;totPos+=st.pos;totNeg+=st.neg});h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px"><div style="background:var(--pos-soft);border-radius:14px;padding:12px;text-align:center"><div style="font-size:11px;color:var(--muted)">تسک انجام‌شده</div><b style="font-size:20px;color:var(--pos)">'+fa(totDone)+'</b></div><div style="background:var(--neg-soft);border-radius:14px;padding:12px;text-align:center"><div style="font-size:11px;color:var(--muted)">تسک انجام‌نشده</div><b style="font-size:20px;color:var(--neg)">'+fa(totMissed)+'</b></div><div style="background:var(--pos-soft);border-radius:14px;padding:12px;text-align:center"><div style="font-size:11px;color:var(--muted)">رفتار مثبت</div><b style="font-size:20px;color:var(--pos)">'+fa(totPos)+'</b></div><div style="background:var(--neg-soft);border-radius:14px;padding:12px;text-align:center"><div style="font-size:11px;color:var(--muted)">رفتار منفی</div><b style="font-size:20px;color:var(--neg)">'+fa(totNeg)+'</b></div></div>';h+='<p class="muted" style="margin-top:10px">امتیاز کل: <b>'+fa(totalScore())+'</b> • این هفته: <b>'+fa(weekScore())+'</b></p></section>';return h}
function rewardsView(){var pts=availablePoints(),h=levelCard()+'<section class="card"><div class="card-h"><h2>🎁 پاداش‌ها</h2></div><p class="muted">امتیاز قابل استفاده: <strong style="color:var(--accent)">'+fa(pts)+'</strong></p>';if(!S.rewards.length)h+='<div class="empty-fun"><div class="big">🎁</div><p class="muted">از تنظیمات پاداش اضافه کن!</p></div>';else h+=S.rewards.map(function(r){return '<div class="reward"><div class="r-t">'+esc(r.t)+'<small>'+fa(r.c)+' امتیاز</small></div><button type="button" class="claim-btn" data-act="claim" data-id="'+esc(r.id)+'" '+(pts<r.c?'disabled':'')+'>دریافت</button></div>'}).join('');return h+'</section>'}
function parentView(){var ws=weekScore(),g=S.goal||15,unlocked=ws>=g,h=levelCard();var pending=getPending();if(isParent&&pending.length){h+='<section class="card" style="border-color:var(--gold)"><div class="card-h"><h2>🔔 درخواست‌های سارینا</h2></div>';pending.forEach(function(p){h+='<div style="padding:12px 0;border-top:1px solid var(--line)"><div style="font-weight:700;margin-bottom:8px">'+esc(p.label||p.type)+'</div><div style="display:flex;gap:8px"><button type="button" class="btn" style="flex:1;background:var(--pos)" data-act="approve-pending" data-id="'+esc(p.id)+'">تأیید ✅</button><button type="button" class="btn" style="flex:1;background:var(--neg)" data-act="reject-pending" data-id="'+esc(p.id)+'">رد ✕</button></div></div>'});h+='</section>'}if(!unlocked)h+='<div class="unlock-banner"><strong>🔒 هنوز قفل است</strong><p>وقتی امتیاز هفته به <b>'+fa(g)+'</b> برسد باز می‌شود.</p><p style="font-size:22px;font-weight:800;color:var(--accent)">'+fa(ws)+' / '+fa(g)+'</p></div>';else{h+='<div class="unlock-banner" style="border-color:var(--pos)"><strong>🎉 باز شد!</strong></div>';if(!isParent)h+='<section class="card"><div class="card-h"><h2>💝 کار برای والدین</h2></div><div class="chips">'+PRESET_PARENT.map(function(p){return '<button type="button" class="chip" data-act="chip-parent" data-t="'+esc(p)+'">+ '+esc(p)+'</button>'}).join('')+'</div><form class="add" id="parentForm"><input id="parentIn" class="inp" placeholder="کار دلخواه..."><button class="btn pink" type="submit">ثبت</button></form></section>'}h+='<section class="card"><div class="card-h"><h2>👨‍👩‍👧 کارهای مامان و بابا</h2></div>';if(!S.parentTasks.length)h+='<p class="muted">هنوز کاری نیست.</p>';else h+='<ul>'+S.parentTasks.map(function(pt){return '<li class="parent-task'+(pt.done?' done':'')+'"><div style="font-weight:700">'+(pt.done?'✅ ':'⏳ ')+esc(pt.t)+'</div>'+(isParent&&!pt.done?'<button type="button" class="btn" style="margin-top:8px" data-act="done-parent" data-id="'+esc(pt.id)+'">انجام دادم</button>':'')+'</li>'}).join('')+'</ul>';return h+'</section>'}
function settingsView(){
if(deviceRole==='child'){
  var h='<section class="card"><div class="card-h"><h2>🦄 تبلت سارینا</h2></div>';
  h+='<p class="muted">این دستگاه مخصوص ساریناست. مدیریت تسک و پاداش فقط از گوشی والدین انجام می‌شود.</p>';
  h+='<button type="button" class="btn" style="width:100%;margin-top:12px;background:var(--pos)" data-act="enable-notif">فعال‌سازی نوتیفیکیشن 💜</button>';
  h+='<p class="muted" style="margin-top:10px;font-size:12px">یادآوری کارها و تشویق ستاره‌ها اینجا می‌آید</p></section>';
  h+='<section class="card"><div class="card-h"><h2>🎨 تم</h2></div><div class="theme-grid">';
  THEMES.forEach(function(t){h+='<button type="button" class="theme-btn'+(S.theme===t.id?' active':'')+'" data-act="theme" data-t="'+t.id+'"><span class="t-icon">'+t.icon+'</span>'+t.name+'</button>'});
  h+='</div></section>';
  return h;
}
if(!isParent){var h='<section class="card"><div class="card-h"><h2>⚙️ تنظیمات</h2></div><p class="muted">برای مدیریت وارد حالت والدین شوید.</p><button type="button" class="btn" data-act="enter-parent" style="width:100%;margin-top:12px">ورود والدین</button></section>';return h}
var h='<section class="card"><div class="card-h"><h2>🎨 تم اپ</h2></div><div class="theme-grid">';THEMES.forEach(function(t){h+='<button type="button" class="theme-btn'+(S.theme===t.id?' active':'')+'" data-act="theme" data-t="'+t.id+'"><span class="t-icon">'+t.icon+'</span>'+t.name+'</button>'});h+='</div></section>';h+='<section class="card"><div class="card-h"><h2>✅ مدیریت تسک‌ها</h2></div>';if(S.tasks.length)h+='<ul>'+S.tasks.map(function(t){return '<li class="task" style="padding:10px"><div class="task-t"><span>'+esc(t.title)+'</span><button type="button" class="del" data-act="del-task-perm" data-id="'+esc(t.id)+'">حذف</button></div></li>'}).join('')+'</ul>';else h+='<p class="muted">تسکی نیست.</p>';h+='<form class="add" id="taskFormSet" style="margin-top:10px"><input id="taskInSet" class="inp" placeholder="تسک جدید..."><button class="btn" type="submit">افزودن</button></form></section>';h+='<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی</h2></div>';var hi=getHealthItems();if(hi.length){hi.forEach(function(it){h+='<div class="reward"><div class="r-t">'+(it.emoji||'')+' '+esc(it.title)+'<small>هر '+fa(it.cooldownDays||7)+' روز</small></div><button type="button" class="del" data-act="del-health" data-id="'+esc(it.id)+'">حذف</button></div>'})}else h+='<p class="muted">آیتمی نیست.</p>';h+='<form class="add3" id="healthFormSet" style="margin-top:10px"><input class="inp" id="healthTitleIn" placeholder="نام"><input class="inp" id="healthDaysIn" placeholder="روز" inputmode="numeric"><button class="btn" type="submit">+</button></form>';h+='<div class="chips" style="margin-top:8px">';PRESET_HEALTH.forEach(function(p){if(!hi.some(function(x){return x.title===p.t}))h+='<button type="button" class="chip" data-act="chip-health" data-t="'+esc(p.t)+'" data-e="'+esc(p.e)+'" data-d="'+p.d+'">'+p.e+' '+esc(p.t)+'</button>'});h+='</div></section>';h+='<section class="card"><div class="card-h"><h2>🎁 مدیریت پاداش‌ها</h2></div>';if(S.rewards.length)h+=S.rewards.map(function(r){return '<div class="reward"><div class="r-t">'+esc(r.t)+'<small>'+fa(r.c)+' امتیاز</small></div><button type="button" class="del" data-act="del-reward" data-id="'+esc(r.id)+'">حذف</button></div>'}).join('');else h+='<p class="muted">پاداشی نیست.</p>';h+='<form class="add3" id="rewardFormSet" style="margin-top:10px"><input class="inp" id="rewInSet" placeholder="نام"><input class="inp" id="costInSet" placeholder="امتیاز" inputmode="numeric"><button class="btn" type="submit">+</button></form></section>';h+='<section class="card"><div class="card-h"><h2>🎯 هدف هفتگی</h2></div><form class="add" id="goalFormSet"><input class="inp" id="goalInSet" type="number" min="5" max="100" value="'+(S.goal||15)+'"><button class="btn" type="submit">ذخیره</button></form></section>';h+='<section class="card"><div class="card-h"><h2>🔐 رمز والدین</h2></div><p class="muted">رمز: <b>'+esc(String(S.parentPin||'1234'))+'</b></p><button type="button" class="btn" data-act="change-pin" style="width:100%">تغییر رمز</button></section>';return h}
function rolePickerHtml(){
  if(!showRolePicker)return '';
  return '<div class="modal-backdrop" style="z-index:9999"><div class="modal" style="text-align:center;max-width:340px">'
    +'<div style="font-size:48px;margin-bottom:8px">💜</div>'
    +'<h3 style="margin:0 0 8px">نصب دفتر سارینا</h3>'
    +'<p class="muted" style="margin:0 0 16px">یک‌بار انتخاب کنید. این دستگاه مال کیست؟</p>'
    +'<button type="button" class="btn" data-act="pick-role" data-r="child" style="width:100%;margin-bottom:10px;background:var(--pos);font-size:16px">👧 تبلت سارینا</button>'
    +'<p class="muted" style="font-size:11px;margin:0 0 14px">بدون ورود والدین • فقط تشویق و کار روزانه</p>'
    +'<button type="button" class="btn" data-act="pick-role" data-r="parent" style="width:100%;font-size:16px">👨‍👩‍👧 گوشی والدین</button>'
    +'<p class="muted" style="font-size:11px;margin:8px 0 0">مدیریت کامل • تأیید درخواست‌ها</p>'
    +'</div></div>';
}
function pinModal(){if(!showPinModal)return '';return '<div class="modal-backdrop" id="pinBackdrop"><div class="modal"><h3>🔒 ورود والدین</h3><p>رمز ۴ رقمی<br><small style="color:var(--muted)">پیش‌فرض: ۱۲۳۴</small></p><div class="pin-row"><input id="pin1" maxlength="1" inputmode="numeric" autocomplete="off"><input id="pin2" maxlength="1" inputmode="numeric" autocomplete="off"><input id="pin3" maxlength="1" inputmode="numeric" autocomplete="off"><input id="pin4" maxlength="1" inputmode="numeric" autocomplete="off"></div><p id="pinErr" style="color:var(--neg);display:none;margin:0"></p><button type="button" class="btn" id="pinSubmit" style="width:100%">ورود</button><button type="button" class="ghost" id="pinCancel">انصراف</button></div></div>'}
