/* Settings UI: readable labels + edit for health items and behaviors */
(function(){
  try{
    var st=document.createElement('style');
    st.textContent=[
      '.set-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid var(--line)}',
      '.set-row:first-of-type{border-top:0}',
      '.set-info{flex:1;min-width:0;display:flex;align-items:center;gap:10px}',
      '.set-info .emoji{font-size:22px;flex-shrink:0}',
      '.set-info .txt{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.set-info .txt strong{font-size:14px;font-weight:800;line-height:1.4;word-spacing:normal}',
      '.set-info .txt small{font-size:12px;color:var(--muted);font-weight:600}',
      '.set-actions{display:flex;gap:6px;flex-shrink:0}',
      '.set-actions button{min-height:36px;border-radius:10px;padding:4px 12px;font-size:12px;font-weight:700}',
      '.set-actions .edit-btn{border:1.5px solid var(--accent);color:var(--accent-deep);background:var(--accent-soft)}',
      '.set-actions .del{border:1.5px solid var(--neg);color:var(--neg);background:transparent}',
      '.chip-edit{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:99px;padding:6px 10px;font-size:13px;font-weight:600;margin:4px;background:#fff;max-width:100%}',
      '.chip-edit .chip-label{line-height:1.4}',
      '.chip-edit .chip-btns{display:inline-flex;gap:4px}',
      '.chip-edit .chip-btns button{border-radius:8px;padding:2px 8px;font-size:12px;font-weight:700;min-height:28px}',
      '.chip-edit .chip-btns .edit-btn{border:1.5px solid var(--accent);color:var(--accent-deep);background:var(--accent-soft)}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function healthSettingsHTML(){
    var hi=getHealthItems();
    var h='<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی</h2></div>';
    if(hi.length){
      hi.forEach(function(it){
        h+='<div class="set-row">';
        h+='<div class="set-info">';
        h+='<span class="emoji">'+(it.emoji||'🍱')+'</span>';
        h+='<div class="txt"><strong>'+esc(it.title)+'</strong>';
        h+='<small>هر '+fa(it.cooldownDays||7)+' روز یک‌بار</small></div>';
        h+='</div>';
        h+='<div class="set-actions">';
        h+='<button type="button" class="edit-btn" data-act="edit-health" data-id="'+esc(it.id)+'">ویرایش</button>';
        h+='<button type="button" class="del" data-act="del-health" data-id="'+esc(it.id)+'">حذف</button>';
        h+='</div></div>';
      });
    }else{
      h+='<p class="muted">آیتمی نیست.</p>';
    }
    h+='<form class="add3" id="healthFormSet" style="margin-top:10px">';
    h+='<input class="inp" id="healthTitleIn" placeholder="نام">';
    h+='<input class="inp" id="healthDaysIn" placeholder="روز" inputmode="numeric">';
    h+='<button class="btn" type="submit">+</button></form>';
    // preset chips
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

  function behaviorsSettingsHTML(){
    var pos=getPosBehaviors();
    var neg=getNegBehaviors();
    var h='<section class="card"><div class="card-h"><h2>🌸 مدیریت رفتارهای امروز</h2></div>';
    h+='<p class="muted" style="margin:0 0 6px">مثبت</p><div class="chips">';
    pos.forEach(function(c,i){
      h+='<span class="chip-edit"><span class="chip-label">'+esc(c)+'</span>';
      h+='<span class="chip-btns">';
      h+='<button type="button" class="edit-btn" data-act="edit-pos-beh" data-i="'+i+'">ویرایش</button>';
      h+='<button type="button" class="del" data-act="del-pos-beh" data-i="'+i+'">×</button>';
      h+='</span></span>';
    });
    h+='</div>';
    h+='<form class="add" id="posBehForm" style="margin-top:8px"><input class="inp" id="posBehIn" placeholder="رفتار مثبت جدید..."><button class="btn" type="submit">+</button></form>';
    h+='<p class="muted" style="margin:12px 0 6px">منفی</p><div class="chips">';
    neg.forEach(function(c,i){
      h+='<span class="chip-edit"><span class="chip-label">'+esc(c)+'</span>';
      h+='<span class="chip-btns">';
      h+='<button type="button" class="edit-btn" data-act="edit-neg-beh" data-i="'+i+'">ویرایش</button>';
      h+='<button type="button" class="del" data-act="del-neg-beh" data-i="'+i+'">×</button>';
      h+='</span></span>';
    });
    h+='</div>';
    h+='<form class="add" id="negBehForm" style="margin-top:8px"><input class="inp" id="negBehIn" placeholder="رفتار منفی جدید..."><button class="btn" type="submit">+</button></form>';
    h+='</section>';
    return h;
  }

  // Replace broken health section + inject behaviors in settings
  var _settingsView=typeof settingsView==='function'?settingsView:null;
  if(_settingsView){
    settingsView=function(){
      var html=_settingsView();
      if(deviceRole==='child')return html;
      if(!isParent)return html;

      // Replace entire health management section with readable version
      html=html.replace(
        /<section class="card"><div class="card-h"><h2>🥗 مدیریت سلامتی[\s\S]*?<\/section>/,
        healthSettingsHTML()
      );

      // Replace or inject behaviors section
      if(html.indexOf('مدیریت رفتار')>=0){
        html=html.replace(
          /<section class="card"><div class="card-h"><h2>🌸 مدیریت رفتارهای امروز[\s\S]*?<\/section>/,
          behaviorsSettingsHTML()
        );
      }else{
        // insert before rewards if present
        if(html.indexOf('مدیریت پاداش')>=0){
          html=html.replace(
            /(<section class="card"><div class="card-h"><h2>🎁)/,
            behaviorsSettingsHTML()+'$1'
          );
        }else{
          html+=behaviorsSettingsHTML();
        }
      }
      return html;
    };
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(!t)return;
    var a=t.getAttribute('data-act');

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
      it.title=nt;
      it.cooldownDays=nd;
      S.healthItems=items;
      saveProfile();
      showToast('ویرایش شد ✓');
      render();
      return;
    }

    if(a==='edit-pos-beh'){
      e.preventDefault();e.stopPropagation();
      var pos=getPosBehaviors().slice();
      var i=+t.dataset.i;
      if(i<0||i>=pos.length)return;
      var nv=prompt('متن رفتار مثبت:', pos[i]);
      if(nv===null)return;
      nv=nv.trim();
      if(!nv){showToast('متن خالی نباشد');return}
      pos[i]=nv;
      S.posBehaviors=pos;
      saveProfile();
      showToast('ویرایش شد ✓');
      render();
      return;
    }

    if(a==='edit-neg-beh'){
      e.preventDefault();e.stopPropagation();
      var neg=getNegBehaviors().slice();
      var j=+t.dataset.i;
      if(j<0||j>=neg.length)return;
      var nv2=prompt('متن رفتار منفی:', neg[j]);
      if(nv2===null)return;
      nv2=nv2.trim();
      if(!nv2){showToast('متن خالی نباشد');return}
      neg[j]=nv2;
      S.negBehaviors=neg;
      saveProfile();
      showToast('ویرایش شد ✓');
      render();
      return;
    }

    if(a==='del-pos-beh'){
      e.preventDefault();e.stopPropagation();
      var pos2=getPosBehaviors().slice();
      pos2.splice(+t.dataset.i,1);
      S.posBehaviors=pos2;
      saveProfile();render();
      return;
    }
    if(a==='del-neg-beh'){
      e.preventDefault();e.stopPropagation();
      var neg2=getNegBehaviors().slice();
      neg2.splice(+t.dataset.i,1);
      S.negBehaviors=neg2;
      saveProfile();render();
      return;
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

  console.log('settings-ui.js loaded');
})();
