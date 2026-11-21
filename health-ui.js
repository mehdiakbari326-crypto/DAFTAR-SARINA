/* Health UI: emoji picker, big animated chips, task edit in settings */
(function(){
  var EMOJI_PRESETS=[
    '🍔','🍕','🍟','🌭','🍿','🍦','🧁','🍪','🍩','🍫',
    '🍬','🍭','🍰','🎂','🥤','🧃','☕','🧋','🍬','🍇',
    '🍓','🍉','🍌','🍎','🥗','🍱','🍜','🍣','🌮','🥙',
    '🥜','🧀','🥚','🥛','🫖','🍵','🍼','🍪','🧁','🍔'
  ];

  try{
    var st=document.createElement('style');
    st.textContent=[
      '.health-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:4px 0 8px}',
      '.health-chip{min-width:76px;padding:14px 12px 12px;border-radius:22px;background:linear-gradient(180deg,#fff,#F3ECFF);border:2px solid #E9D5FF;box-shadow:0 8px 18px rgba(155,109,255,.15);display:flex;flex-direction:column;align-items:center;gap:6px;transition:transform .2s}',
      '.health-chip .h-emoji{font-size:40px;line-height:1;filter:drop-shadow(0 3px 4px rgba(0,0,0,.12))}',
      '.health-chip .h-days{font-size:12px;font-weight:800;color:#6B3FBF}',
      '.health-chip .h-title{font-size:10px;font-weight:700;color:#8B7AA8;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.health-chip.ok{background:linear-gradient(180deg,#ECFDF5,#D1FAE5);border-color:#6EE7B7;animation:pulseOk 1.6s ease-in-out infinite}',
      '.health-chip.ok .h-days{color:#047857;font-size:13px}',
      '.health-chip.soon{background:linear-gradient(180deg,#FFF7ED,#FFEDD5);border-color:#FDBA74;animation:blinkSoon 1.1s ease-in-out infinite}',
      '.health-chip.soon .h-days{color:#C2410C}',
      '.health-chip.mid{background:linear-gradient(180deg,#EEF2FF,#E0E7FF);border-color:#A5B4FC}',
      '.health-chip.mid .h-days{color:#4338CA}',
      '@keyframes pulseOk{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '@keyframes blinkSoon{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,.4)}50%{box-shadow:0 0 0 8px rgba(251,146,60,0)}}',
      '.emoji-pick{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;max-height:120px;overflow:auto;padding:6px;background:#FBF7FF;border-radius:14px;border:1.5px solid #EDE4FF}',
      '.emoji-pick button{width:40px;height:40px;border-radius:12px;border:2px solid transparent;background:#fff;font-size:22px;padding:0}',
      '.emoji-pick button.on{border-color:var(--accent);background:var(--accent-soft);transform:scale(1.08)}',
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

  // Override todayView health strip if present in original HTML
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    var prev=_todayView;
    todayView=function(){
      var html=prev();
      // replace first health section strip on today
      var fancy=fancyHealthStrip();
      if(fancy){
        html=html.replace(/<section class="card"><div class="card-h"><h2>🥗 سلامتی[\s\S]*?<\/section>/, fancy);
      }
      return html;
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
        h+='<div class="txt"><strong>'+esc(it.title)+'</strong>';
        h+='<small>هر '+fa(it.cooldownDays||7)+' روز یک‌بار</small></div></div>';
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

  // Patch settingsView
  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(deviceRole==='child')return html;
      if(!isParent)return html;

      // Replace tasks section
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>[^<]*مدیریت تسک[^<]*<\/h2><\/div>[\s\S]*?<\/section>/,
        tasksSettingsHTML()
      );
      // common title variants
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>✅[^<]*<\/h2><\/div>[\s\S]*?<\/section>/,
        function(m){return m.indexOf('taskFormSet')>=0||m.indexOf('del-task')>=0?tasksSettingsHTML():m}
      );

      // Replace health section
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی[\s\S]*?<\/section>/,
        healthSettingsHTML()
      );

      return html;
    };
  }

  // Intercept health form submit to include selected emoji
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form.id==='healthFormSet'){
      // Let original handler run but inject emoji via patching after
      var emojiEl=document.getElementById('healthEmojiIn');
      var em=emojiEl?emojiEl.value:selectedEmoji;
      // After short delay, fix last added item emoji if missing
      setTimeout(function(){
        try{
          var items=S.healthItems||[];
          if(items.length){
            var last=items[items.length-1];
            if(last&&(!last.emoji||last.emoji==='🍱')){
              last.emoji=em||selectedEmoji||'🍔';
              saveProfile();
              render();
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
      var items=getHealthItems();
      var it=items.find(function(x){return x.id===t.dataset.id});
      if(!it)return;
      var nt=prompt('نام جدید:', it.title);
      if(nt===null)return;
      nt=nt.trim();
      if(!nt){showToast('نام خالی نباشد');return}
      var nd=prompt('هر چند روز یک‌بار؟', String(it.cooldownDays||7));
      if(nd===null)return;
      nd=parseInt(String(nd).replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-1776)}),10);
      if(isNaN(nd)||nd<1)nd=it.cooldownDays||7;
      var em=prompt('آیکون (یک اموجی):', it.emoji||'🍔');
      if(em===null)return;
      em=(em.trim()||it.emoji||'🍔').slice(0,4);
      it.title=nt;
      it.cooldownDays=nd;
      it.emoji=em;
      S.healthItems=items;
      saveProfile();
      showToast('ویرایش شد ✓');
      render();
      return;
    }
  },true);

  console.log('health-ui.js loaded');
})();
