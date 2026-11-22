/* Behaviors as task-like done/missed with correct scoring
 * Positive behavior: done=+1, missed=-1
 * Negative behavior: done=-1, missed=+1 (avoiding bad = good)
 */
(function(){
  try{
    var st=document.createElement('style');
    st.textContent=[
      '.beh-list{display:grid;gap:10px}',
      '.beh-item{display:grid;gap:8px;padding:14px;border:2px solid var(--line);border-radius:18px;background:#fff}',
      '.beh-item.s-done{border-color:var(--pos);background:var(--pos-soft)}',
      '.beh-item.s-missed{border-color:var(--neg);background:var(--neg-soft)}',
      '.beh-item.kind-neg.s-done{border-color:var(--neg);background:var(--neg-soft)}',
      '.beh-item.kind-neg.s-missed{border-color:var(--pos);background:var(--pos-soft)}',
      '.beh-title{font-weight:800;font-size:14px;display:flex;align-items:center;gap:8px}',
      '.beh-title .tag{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px}',
      '.beh-title .tag.pos{background:#D1FAE5;color:#047857}',
      '.beh-title .tag.neg{background:#FEE2E2;color:#B91C1C}',
      '.beh-hint{font-size:11px;color:var(--muted);margin:0}',
      '.beh-section-h{font-weight:800;font-size:13px;margin:8px 0 4px;color:var(--accent-deep)}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function behKey(kind,title){ return kind+':'+title; }

  function getBehStatus(k, kind, title){
    var d=getDay(k);
    var b=d.behaviors||{};
    return b[behKey(kind,title)]||null;
  }

  function setBehStatus(k, kind, title, s){
    mutDay(k, function(day){
      day.behaviors = day.behaviors || {};
      var key=behKey(kind,title);
      if(day.behaviors[key]===s) delete day.behaviors[key];
      else day.behaviors[key]=s;
    });
  }

  // Override dayStats so score() includes behavior task outcomes
  var _dayStats = typeof dayStats==='function' ? dayStats : null;
  dayStats = function(k){
    var base = _dayStats ? _dayStats(k) : {done:0,missed:0,pos:0,neg:0};
    try{
      var d=getDay(k);
      var beh=d.behaviors||{};
      var posDone=0, posMiss=0, negDone=0, negMiss=0;
      (typeof getPosBehaviors==='function'?getPosBehaviors():[]).forEach(function(title){
        var s=beh[behKey('pos',title)];
        if(s==='done') posDone++;
        if(s==='missed') posMiss++;
      });
      (typeof getNegBehaviors==='function'?getNegBehaviors():[]).forEach(function(title){
        var s=beh[behKey('neg',title)];
        if(s==='done') negDone++;
        if(s==='missed') negMiss++;
      });
      // freeform notes still count
      var notePos=(d.notes||[]).filter(function(n){return n.type==='pos'}).length;
      var noteNeg=(d.notes||[]).filter(function(n){return n.type==='neg'}).length;
      // Map into pos/neg used by score():
      // pos contributes + : posDone + negMiss + notes
      // neg contributes - : posMiss + negDone + notes
      base.pos = posDone + negMiss + notePos;
      base.neg = posMiss + negDone + noteNeg;
      base.behPosDone=posDone; base.behPosMiss=posMiss;
      base.behNegDone=negDone; base.behNegMiss=negMiss;
    }catch(e){}
    return base;
  };

  function behCard(kind, title, status){
    var isPos = kind==='pos';
    var cls = 'beh-item kind-'+kind;
    if(status==='done') cls+=' s-done';
    if(status==='missed') cls+=' s-missed';
    var hint = isPos
      ? (status==='done'?'آفرین! +۱ ستاره':status==='missed'?'انجام نشد · −۱':'انجام شد = +۱ / نشد = −۱')
      : (status==='missed'?'دوری از بدی! +۱ ستاره':status==='done'?'انجام شد · −۱':'اجتناب = +۱ / انجام = −۱');
    var h='<div class="'+cls+'">';
    h+='<div class="beh-title">';
    h+='<span class="tag '+(isPos?'pos':'neg')+'">'+(isPos?'مثبت 💚':'منفی 🧡')+'</span>';
    h+='<span>'+esc(title)+'</span></div>';
    h+='<p class="beh-hint">'+hint+'</p>';
    h+='<div class="seg">';
    h+='<button type="button" class="ok" data-act="mark-beh" data-kind="'+kind+'" data-title="'+esc(title)+'" data-s="done" aria-pressed="'+(status==='done')+'">✓ انجام شد</button>';
    h+='<button type="button" class="no" data-act="mark-beh" data-kind="'+kind+'" data-title="'+esc(title)+'" data-s="missed" aria-pressed="'+(status==='missed')+'">✕ انجام نشد</button>';
    h+='</div></div>';
    return h;
  }

  function behaviorsPanel(k){
    k=k||curKey||todayKey();
    var pos=typeof getPosBehaviors==='function'?getPosBehaviors():[];
    var neg=typeof getNegBehaviors==='function'?getNegBehaviors():[];
    var h='<section class="card"><div class="card-h"><h2>🌸 رفتارهای امروز</h2></div>';
    h+='<p class="muted">مثل تسک‌ها علامت بزن. اجتناب از رفتار منفی هم ستاره می‌دهد!</p>';
    if(pos.length){
      h+='<div class="beh-section-h">💚 رفتارهای خوب</div><div class="beh-list">';
      pos.forEach(function(t){ h+=behCard('pos', t, getBehStatus(k,'pos',t)); });
      h+='</div>';
    }
    if(neg.length){
      h+='<div class="beh-section-h">🧡 رفتارهای بد (اگر انجام نشد = امتیاز مثبت)</div><div class="beh-list">';
      neg.forEach(function(t){ h+=behCard('neg', t, getBehStatus(k,'neg',t)); });
      h+='</div>';
    }
    // keep freeform note entry for extra behaviors
    h+='<form class="add" id="noteForm" style="margin-top:10px">';
    h+='<input id="noteIn" class="inp" placeholder="رفتار دیگر (آزاد)...">';
    h+='<button class="btn" type="submit">ثبت</button></form>';
    var d=getDay(k);
    var notes=(d.notes||[]).slice().reverse();
    if(notes.length){
      h+='<div style="margin-top:8px">';
      notes.forEach(function(n){
        h+='<div class="note"><span class="pill '+(n.type==='pos'?'p':'n')+'">'+(n.type==='pos'?'+':'−')+'</span>';
        h+='<span>'+esc(n.t)+'</span>';
        if(typeof isParent!=='undefined'&&isParent){
          h+='<button type="button" class="del" data-act="del-note" data-id="'+esc(n.id)+'">×</button>';
        }
        h+='</div>';
      });
      h+='</div>';
    }
    h+='</section>';
    return h;
  }

  // Replace behaviors section inside todayView
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      var panel=behaviorsPanel(curKey);
      // replace old behaviors card
      var re=/<section class="card"><div class="card-h"><h2>[^<]*رفتارهای امروز[\s\S]*?<\/section>/;
      if(re.test(html)){
        html=html.replace(re, panel);
      }else if(html.indexOf('beh-list')<0){
        // insert after tasks if possible
        if(html.indexOf('تسک')>=0){
          html=html.replace(/(<section class="card"><div class="card-h"><h2>[^<]*تسک[\s\S]*?<\/section>)/, function(m){return m+panel});
        }else{
          html+=panel;
        }
      }
      return html;
    };
  }

  // Extend applyPending for mark-beh
  var _applyPending=typeof applyPending==='function'?applyPending:null;
  if(_applyPending){
    applyPending=function(item){
      if(item && item.type==='mark-beh' && item.payload){
        var p=item.payload;
        mutDay(p.k||todayKey(), function(day){
          day.behaviors=day.behaviors||{};
          var key=behKey(p.kind,p.title);
          if(!p.s) delete day.behaviors[key];
          else day.behaviors[key]=p.s;
        });
        return;
      }
      return _applyPending(item);
    };
  }

  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act="mark-beh"]');
    if(!t) return;
    e.preventDefault();
    e.stopPropagation();
    var kind=t.getAttribute('data-kind');
    var title=t.getAttribute('data-title');
    var s=t.getAttribute('data-s');
    var k=typeof curKey!=='undefined'?curKey:todayKey();
    var prev=getBehStatus(k,kind,title);
    var nextS=(prev===s)?null:s;

    if(typeof isParent!=='undefined' && !isParent){
      if(typeof addPending==='function'){
        var label=(nextS==='done'?'انجام شد: ':'انجام نشد: ')+title+(kind==='neg'?' (منفی)':'');
        addPending('mark-beh',{k:k,kind:kind,title:title,s:nextS},label);
        showToast('درخواست برای والدین ارسال شد 🔔');
      }
      return;
    }

    setBehStatus(k, kind, title, nextS===null?prev:nextS);
    // toggle off if same
    if(nextS===null){
      mutDay(k, function(day){
        day.behaviors=day.behaviors||{};
        delete day.behaviors[behKey(kind,title)];
      });
    }

    if(nextS==='done' && kind==='pos'){
      if(typeof deviceRole!=='undefined'&&deviceRole==='child'){
        showToast('آفرین! رفتار خوب ثبت شد ⭐');
        if(typeof celebrate==='function')celebrate();
      }else showToast('ثبت شد ✓');
    }else if(nextS==='missed' && kind==='neg'){
      showToast('عالی! از رفتار بد دوری کردی +۱ 💜');
    }else{
      showToast('ثبت شد');
    }
  },true);

  console.log('behavior-tasks.js loaded');
})();
