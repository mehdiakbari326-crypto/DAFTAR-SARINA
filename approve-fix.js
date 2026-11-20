/* Hotfix: approve pending applies correctly + weight */
(function(){
  function applyPendingFixed(item){
    if(!item)return;
    var p=item.payload||{};
    if(item.type==='mark'){
      var k=p.k||todayKey();
      var d=JSON.parse(JSON.stringify(getDay(k)));
      d.tasks=d.tasks||{};
      if(!d.tasks[p.id])d.tasks[p.id]={t:p.title||''};
      if(p.s)d.tasks[p.id].s=p.s;
      else if(d.tasks[p.id])delete d.tasks[p.id].s;
      S.days[k]=d;
    }else if(item.type==='note'){
      var k2=p.k||todayKey();
      var d2=JSON.parse(JSON.stringify(getDay(k2)));
      d2.notes=d2.notes||[];
      var exists=d2.notes.some(function(n){return n.id===(p.noteId||'')});
      if(!exists)d2.notes.push({id:p.noteId||uid(),t:p.t,type:p.noteType,ts:p.ts||Date.now()});
      S.days[k2]=d2;
    }else if(item.type==='weight'){
      var k3=p.k||todayKey();
      var d3=JSON.parse(JSON.stringify(getDay(k3)));
      var w=parseFloat(p.w);
      if(!isNaN(w)&&w>0){
        d3.weight=Math.round(w*10)/10;
        S.days[k3]=d3;
      }
    }
    if(typeof updateStreak==='function')updateStreak();
  }
  function approvePendingFixed(id){
    var item=(S.pendingChanges||[]).find(function(p){return p.id===id});
    if(!item||item.status!=='pending')return;
    applyPendingFixed(item);
    item.status='approved';
    saveProfile();
    showToast('تأیید شد ✅');
    render();
  }
  applyPending=applyPendingFixed;
  approvePending=approvePendingFixed;
  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-act="approve-pending"]');
    if(!t)return;
    e.preventDefault();
    e.stopPropagation();
    approvePendingFixed(t.dataset.id);
  },true);
})();
