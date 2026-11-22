/* Health UI v2: spacing, edit consumption date, child requests only */
(function(){
  var EMOJI_PRESETS=[
    '🍔','🍕','🍟','🌭','🍿','🍦','🧁','🍪','🍩','🍫',
    '🍬','🍭','🍰','🎂','🥤','🧃','☕','🧋','🍇','🍓',
    '🍉','🍌','🍎','🥗','🍱','🍜','🍣','🌮','🥙','🥜'
  ];

  try{
    var st=document.createElement('style');
    st.textContent=[
      '.health-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:4px 0 8px}',
      '.health-chip{min-width:76px;padding:14px 12px 12px;border-radius:22px;background:linear-gradient(180deg,#fff,#F3ECFF);border:2px solid #E9D5FF;box-shadow:0 8px 18px rgba(155,109,255,.15);display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.health-chip .h-emoji{font-size:40px;line-height:1}',
      '.health-chip .h-days{font-size:12px;font-weight:800;color:#6B3FBF}',
      '.health-chip .h-title{font-size:11px;font-weight:700;color:#8B7AA8;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.health-chip.ok{background:linear-gradient(180deg,#ECFDF5,#D1FAE5);border-color:#6EE7B7}',
      '.health-chip.soon{background:linear-gradient(180deg,#FFF7ED,#FFEDD5);border-color:#FDBA74}',
      '.health-chip.mid{background:linear-gradient(180deg,#EEF2FF,#E0E7FF);border-color:#A5B4FC}',
      /* Fix stuck text in health list */
      '.health-item{padding:14px;border:2px solid var(--line);border-radius:18px;margin-bottom:10px;background:#fff}',
      '.health-item .hi-top{display:flex;align-items:flex-start;gap:12px}',
      '.health-item .hi-emoji{font-size:32px;line-height:1;flex-shrink:0}',
      '.health-item .hi-text{flex:1;min-width:0}',
      '.health-item .hi-text strong{display:block;font-size:15px;font-weight:800;margin-bottom:4px;line-height:1.4}',
      '.health-item .hi-text small{display:block;font-size:12px;color:var(--muted);font-weight:600;line-height:1.5}',
      '.health-item .hi-meta{display:block;font-size:12px;color:var(--muted);margin-top:6px}',
      '.health-item .hi-countdown{display:inline-flex;align-items:baseline;gap:4px;font-weight:800;color:var(--accent-deep);margin:6px 0}',
      '.health-item .hi-countdown span{font-size:22px}',
      '.health-item .hi-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.health-item .hi-actions .btn,.health-item .hi-actions .ghost{min-height:40px}',
      '.emoji-pick{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;max-height:120px;overflow:auto;padding:6px;background:#FBF7FF;border-radius:14px;border:1.5px solid #EDE4FF}',
      '.emoji-pick button{width:40px;height:40px;border-radius:12px;border:2px solid transparent;background:#fff;font-size:22px;padding:0}',
      '.emoji-pick button.on{border-color:var(--accent);background:var(--accent-soft)}',
      '.set-row .emoji{font-size:28px}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  var selectedEmoji='🍔';

  function chipClass(left){
    if(left===0)return 'ok';
    if(left<=3)return 'soon';
    if(left<=10)return 'mid';
    return '';
  }

  function fmtDateFa(key){
    try{
      if(!key) return '—';
      if(typeof fmtFull==='function') return fmtFull.format(fromKey(key));
      return key;
    }catch(e){ return key||'—'; }
  }

  function fancyHealthStrip(){
    var items=getHealthItems();
    if(!items.length)return '';
    var h='<section class="card"><div class="card-h"><h2>🥗 سلامتی</h2></div><div class="health-row">';
    items.forEach(function(it){
      var left=daysUntilHealth(it);
      var cls=chipClass(left);
      h+='<div class="health-chip '+cls+'">';
      h+='<span class="h-emoji">'+(it.emoji||'🍱')+'</span>';
      h+='<span class="h-title">'+esc(it.title||'')+'</span>';
      if(left===0)h+='<span class="h-days">🎁 آزاد</span>';
      else if(left<=3)h+='<span class="h-days">⚡ '+fa(left)+' روز</span>';
      else h+='<span class="h-days">'+fa(left)+' روز</span>';
      h+='</div>';
    });
    h+='</div></section>';
    return h;
  }

  function healthListHTML(){
    var items=getHealthItems();
    var h='<section class="card"><div class="card-h"><h2>🥗 سلامتی و محدودیت‌ها</h2></div>';
    h+='<p class="muted">وقتی چیزی ثبت شود، تا پایان دورهٔ انتظار دوباره مجاز نیست.</p>';
    if(!items.length){
      h+='<div class="empty-fun"><div class="big">🍦</div><p class="muted">والدین از تنظیمات آیتم اضافه کنند</p></div>';
      return h+'</section>';
    }
    items.forEach(function(it){
      var left=daysUntilHealth(it);
      var avail=left===0;
      h+='<div class="health-item'+(avail?'':' wait')+'">';
      h+='<div class="hi-top">';
      h+='<span class="hi-emoji">'+(it.emoji||'🍱')+'</span>';
      h+='<div class="hi-text">';
      h+='<strong>'+esc(it.title)+'</strong>';
      h+='<small>هر '+fa(it.cooldownDays||7)+' روز یک‌بار</small>';
      if(it.lastDate){
        h+='<span class="hi-meta">آخرین بار: '+esc(fmtDateFa(it.lastDate))+'</span>';
      }else{
        h+='<span class="hi-meta">هنوز ثبت نشده</span>';
      }
      h+='</div></div>';

      if(avail){
        h+='<p class="muted" style="color:var(--pos);font-weight:700;margin:8px 0 0">✅ الان می‌تونی</p>';
      }else{
        h+='<div class="hi-countdown"><span>'+fa(left)+'</span><small> روز مانده</small></div>';
      }

      h+='<div class="hi-actions">';
      if(typeof isParent!=='undefined' && isParent){
        h+='<button type="button" class="btn" data-act="log-health" data-id="'+esc(it.id)+'">ثبت مصرف امروز</button>';
        h+='<button type="button" class="ghost" data-act="edit-health-date" data-id="'+esc(it.id)+'">✏️ ویرایش تاریخ</button>';
        if(it.lastDate){
          h+='<button type="button" class="ghost" data-act="clear-health-date" data-id="'+esc(it.id)+'">پاک کردن تاریخ</button>';
        }
      }else{
        // Child / non-parent: only request
        if(avail){
          h+='<button type="button" class="btn" data-act="request-health" data-id="'+esc(it.id)+'">درخواست ثبت مصرف</button>';
        }else{
          h+='<p class="muted" style="font-size:12px;margin:0">تا آزاد شدن، والدین می‌توانند تاریخ را اصلاح کنند</p>';
        }
      }
      h+='</div></div>';
    });
    h+='</section>';
    return h;
  }

  // Override healthView body list
  var _healthView=typeof healthView==='function'?healthView:null;
  if(_healthView){
    healthView=function(){
      var html=_healthView();
      // Replace the health&limits card with fixed version
      var fixed=healthListHTML();
      var re=/<section class="card"><div class="card-h"><h2>[^<]*سلامتی و محدودیت[\s\S]*?<\/section>/;
      if(re.test(html)){
        html=html.replace(re, fixed);
      }else{
        // keep weight panel if any, append/replace generically
        html=html.replace(/<section class="card"><div class="card-h"><h2>🥗[\s\S]*?<\/section>/, fixed);
      }
      return html;
    };
  }

  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    var prevToday=_todayView;
    todayView=function(){
      var html=prevToday();
      var fancy=fancyHealthStrip();
      if(fancy){
        html=html.replace(/<section class="card"><div class="card-h"><h2>🥗 سلامتی[\s\S]*?<\/section>/, fancy);
      }
      return html;
    };
  }

  // Child cannot directly log — request only
  if(typeof logHealth==='function'){
    var _logHealth=logHealth;
    logHealth=function(id){
      if(typeof isParent!=='undefined' && !isParent){
        // force request path
        var items=getHealthItems();
        var item=items.find(function(x){return x.id===id});
        if(!item)return;
        if(typeof addPending==='function'){
          addPending('health-log',{id:id,title:item.title,emoji:item.emoji||'🍱',date:todayKey()},'ثبت مصرف: '+(item.title||''));
          showToast('درخواست مصرف برای والدین ارسال شد 🔔');
          try{render()}catch(e){}
        }
        return;
      }
      return _logHealth(id);
    };
  }

  // Apply pending health-log
  if(typeof applyPending==='function'){
    var _applyPending=applyPending;
    applyPending=function(item){
      if(item && item.type==='health-log' && item.payload){
        var p=item.payload;
        var items=getHealthItems();
        var it=items.find(function(x){return x.id===p.id});
        if(it){
          it.lastDate=p.date||todayKey();
          S.healthItems=items;
          saveProfile();
        }
        return;
      }
      if(item && item.type==='health-date' && item.payload){
        var p2=item.payload;
        var items2=getHealthItems();
        var it2=items2.find(function(x){return x.id===p2.id});
        if(it2){
          if(p2.date) it2.lastDate=p2.date;
          else delete it2.lastDate;
          S.healthItems=items2;
          saveProfile();
        }
        return;
      }
      return _applyPending(item);
    };
  }

  function emojiPickerHTML(selected){
    selected=selected||selectedEmoji||'🍔';
    var h='<div class="emoji-pick" id="emojiPick">';
    EMOJI_PRESETS.forEach(function(em){
      h+='<button type="button" data-act="pick-emoji" data-e="'+em+'" class="'+(em===selected?'on':'')+'">'+em+'</button>';
    });
    h+='</div>';
    return h;
  }

  function healthSettingsHTML(){
    var hi=getHealthItems();
    var h='<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی</h2></div>';
    if(hi.length){
      hi.forEach(function(it){
        h+='<div class="set-row">';
        h+='<div class="set-info">';
        h+='<span class="emoji">'+(it.emoji||'🍱')+'</span>';
        h+='<div class="txt"><strong style="display:block;margin-bottom:2px">'+esc(it.title)+'</strong>';
        h+='<small style="display:block">هر '+fa(it.cooldownDays||7)+' روز یک‌بار</small>';
        if(it.lastDate) h+='<small style="display:block">آخرین: '+esc(it.lastDate)+'</small>';
        h+='</div></div>';
        h+='<div class="set-actions">';
        h+='<button type="button" class="edit-btn" data-act="edit-health" data-id="'+esc(it.id)+'">ویرایش</button>';
        h+='<button type="button" class="del" data-act="del-health" data-id="'+esc(it.id)+'">حذف</button>';
        h+='</div></div>';
      });
    }else h+='<p class="muted">آیتمی نیست.</p>';

    h+='<p class="muted" style="margin:10px 0 4px">انتخاب آیکون</p>';
    h+=emojiPickerHTML(selectedEmoji);
    h+='<form class="add3" id="healthFormSet" style="margin-top:8px">';
    h+='<input class="inp" id="healthTitleIn" placeholder="نام">';
    h+='<input class="inp" id="healthDaysIn" placeholder="روز" inputmode="numeric">';
    h+='<button class="btn" type="submit">+</button></form>';
    h+='<input type="hidden" id="healthEmojiIn" value="'+selectedEmoji+'">';

    if(typeof PRESET_HEALTH!=='undefined'){
      h+='<div class="chips" style="margin-top:8px">';
      PRESET_HEALTH.forEach(function(p){
        var exists=(S.healthItems||[]).some(function(x){return x.title===p.t});
        if(!exists){
          h+='<button type="button" class="chip" data-act="chip-health" data-t="'+esc(p.t)+'" data-e="'+esc(p.e)+'" data-d="'+p.d+'">'+p.e+' '+esc(p.t)+'</button>';
        }
      });
      h+='</div>';
    }
    h+='</section>';
    return h;
  }

  function tasksSettingsHTML(){
    var tasks=S.tasks||[];
    var h='<section class="card"><div class="card-h"><h2>✅ مدیریت تسک‌های روزانه</h2></div>';
    if(tasks.length){
      tasks.forEach(function(t){
        h+='<div class="set-row">';
        h+='<div class="set-info"><div class="txt"><strong>'+esc(t.title)+'</strong></div></div>';
        h+='<div class="set-actions">';
        h+='<button type="button" class="edit-btn" data-act="edit-task" data-id="'+esc(t.id)+'">ویرایش</button>';
        h+='<button type="button" class="del" data-act="del-task-perm" data-id="'+esc(t.id)+'">حذف</button>';
        h+='</div></div>';
      });
    }else h+='<p class="muted">تسکی نیست.</p>';
    h+='<form class="add" id="taskFormSet" style="margin-top:10px">';
    h+='<input id="taskInSet" class="inp" placeholder="تسک جدید...">';
    h+='<button class="btn" type="submit">افزودن</button></form></section>';
    return h;
  }

  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(typeof deviceRole!=='undefined'&&deviceRole==='child')return html;
      if(typeof isParent!=='undefined'&&!isParent)return html;
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی[\s\S]*?<\/section>/,
        healthSettingsHTML()
      );
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>✅[^<]*مدیریت تسک[\s\S]*?<\/section>/,
        tasksSettingsHTML()
      );
      return html;
    };
  }

  function parseDateInput(raw){
    if(!raw) return null;
    raw=String(raw).trim();
    // accept YYYY-MM-DD or relative: 0 / -1 / -2
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var n=parseInt(raw.replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}),10);
    if(!isNaN(n)){
      // 0=today, 1=yesterday, 2=two days ago...
      return addDays(todayKey(), -Math.abs(n));
    }
    return null;
  }

  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form.id==='healthFormSet'){
      var emojiEl=document.getElementById('healthEmojiIn');
      var em=emojiEl?emojiEl.value:selectedEmoji;
      setTimeout(function(){
        try{
          var items=S.healthItems||[];
          if(items.length){
            var last=items[items.length-1];
            if(last&&(!last.emoji||last.emoji==='🍱')){
              last.emoji=em||selectedEmoji||'🍔';
              saveProfile(); render();
            }
          }
        }catch(err){}
      },80);
    }
  },false);

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t)return;
    var a=t.getAttribute('data-act');

    if(a==='pick-emoji'){
      e.preventDefault();e.stopPropagation();
      selectedEmoji=t.getAttribute('data-e')||'🍔';
      var hidden=document.getElementById('healthEmojiIn');
      if(hidden)hidden.value=selectedEmoji;
      document.querySelectorAll('#emojiPick button').forEach(function(b){
        b.classList.toggle('on',b.getAttribute('data-e')===selectedEmoji);
      });
      return;
    }

    if(a==='request-health'){
      e.preventDefault();e.stopPropagation();
      var items=getHealthItems();
      var item=items.find(function(x){return x.id===t.dataset.id});
      if(!item)return;
      if(typeof addPending==='function'){
        addPending('health-log',{id:item.id,title:item.title,emoji:item.emoji||'🍱',date:todayKey()},'ثبت مصرف: '+item.title);
        showToast('درخواست برای والدین ارسال شد 🔔');
        try{render()}catch(err){}
      }
      return;
    }

    if(a==='edit-health-date'){
      e.preventDefault();e.stopPropagation();
      if(typeof isParent==='undefined'||!isParent){
        showToast('فقط والدین');
        return;
      }
      var items=getHealthItems();
      var it=items.find(function(x){return x.id===t.dataset.id});
      if(!it)return;
      var hint='تاریخ آخرین مصرف\nفرمت: 2026-11-20\nیا عدد: 0=امروز، 1=دیروز، 2=دو روز پیش';
      var cur=it.lastDate||todayKey();
      var raw=prompt(hint, cur);
      if(raw===null)return;
      var parsed=parseDateInput(raw);
      if(!parsed){ showToast('تاریخ نامعتبر'); return; }
      // don't allow future
      if(parsed>todayKey()){ showToast('تاریخ آینده مجاز نیست'); return; }
      it.lastDate=parsed;
      S.healthItems=items;
      saveProfile();
      showToast('تاریخ مصرف به‌روز شد ✓');
      render();
      return;
    }

    if(a==='clear-health-date'){
      e.preventDefault();e.stopPropagation();
      if(typeof isParent==='undefined'||!isParent){ showToast('فقط والدین'); return; }
      var items2=getHealthItems();
      var it2=items2.find(function(x){return x.id===t.dataset.id});
      if(!it2)return;
      if(!confirm('تاریخ آخرین مصرف پاک شود؟'))return;
      delete it2.lastDate;
      S.healthItems=items2;
      saveProfile();
      showToast('تاریخ پاک شد');
      render();
      return;
    }

    if(a==='edit-task'){
      e.preventDefault();e.stopPropagation();
      var tasks=S.tasks||[];
      var task=tasks.find(function(x){return x.id===t.dataset.id});
      if(!task)return;
      var nt=prompt('عنوان تسک:', task.title);
      if(nt===null)return;
      nt=nt.trim();
      if(!nt){showToast('عنوان خالی نباشد');return}
      task.title=nt;
      saveProfile();
      showToast('تسک ویرایش شد ✓');
      render();
      return;
    }

    if(a==='edit-health'){
      e.preventDefault();e.stopPropagation();
      var items3=getHealthItems();
      var it3=items3.find(function(x){return x.id===t.dataset.id});
      if(!it3)return;
      var nt3=prompt('نام جدید:', it3.title);
      if(nt3===null)return;
      nt3=nt3.trim();
      if(!nt3){showToast('نام خالی نباشد');return}
      var nd=prompt('هر چند روز یک‌بار؟', String(it3.cooldownDays||7));
      if(nd===null)return;
      nd=parseInt(String(nd).replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}),10);
      if(isNaN(nd)||nd<1)nd=it3.cooldownDays||7;
      var em=prompt('آیکون (یک اموجی):', it3.emoji||'🍔');
      if(em===null)return;
      em=(em.trim()||it3.emoji||'🍔').slice(0,4);
      it3.title=nt3;
      it3.cooldownDays=nd;
      it3.emoji=em;
      S.healthItems=items3;
      saveProfile();
      showToast('ویرایش شد ✓');
      render();
      return;
    }
  },true);

  console.log('health-ui.js v2');
})();
