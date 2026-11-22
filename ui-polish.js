/* UI polish: exciting day counters, hide duplicate strips */
(function(){
  try{
    var st=document.createElement('style');
    st.textContent=[
      /* Hide plain original stats strip if present */
      '.stats{display:none!important}',
      /* Exciting mood chips */
      '.mood-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 10px}',
      '.mood-chip{border-radius:20px;padding:12px 6px 10px;text-align:center;border:2px solid transparent;box-shadow:0 6px 16px rgba(0,0,0,.06);position:relative;overflow:hidden}',
      '.mood-chip .mc-emoji{font-size:26px;line-height:1;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.12))}',
      '.mood-chip .mc-num{font-size:20px;font-weight:800;line-height:1.2;margin-top:4px}',
      '.mood-chip .mc-lab{font-size:10px;font-weight:700;opacity:.9}',
      '.mood-chip.ok{background:linear-gradient(165deg,#ECFDF5,#A7F3D0);border-color:#6EE7B7}',
      '.mood-chip.ok .mc-num{color:#047857}',
      '.mood-chip.good{background:linear-gradient(165deg,#EEF2FF,#C7D2FE);border-color:#A5B4FC}',
      '.mood-chip.good .mc-num{color:#4338CA}',
      '.mood-chip.bad{background:linear-gradient(165deg,#FEF2F2,#FECACA);border-color:#FCA5A5}',
      '.mood-chip.bad .mc-num{color:#B91C1C}',
      '.mood-chip.warn{background:linear-gradient(165deg,#FFF7ED,#FED7AA);border-color:#FDBA74}',
      '.mood-chip.warn .mc-num{color:#C2410C}',
      /* Improve star-bank break items */
      '.sb-break{display:grid;grid-template-columns:repeat(4,1fr);gap:8px!important}',
      '.sb-item{border-radius:18px!important;padding:12px 4px!important;border-width:2px!important}',
      '.sb-item .n{font-size:22px!important}',
      '.sb-item .l{font-size:11px!important;font-weight:800!important}',
      '.sb-item.pos{background:linear-gradient(180deg,#fff,#ECFDF5)!important;border-color:#6EE7B7!important}',
      '.sb-item.neg{background:linear-gradient(180deg,#fff,#FEF2F2)!important;border-color:#FCA5A5!important}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}

  function moodRow(k){
    k=k||(typeof curKey!=='undefined'?curKey:todayKey());
    var st=dayStats(k);
    var done=st.done||0, missed=st.missed||0, pos=st.pos||0, neg=st.neg||0;
    var h='<div class="mood-row">';
    h+='<div class="mood-chip ok"><span class="mc-emoji">✅</span><div class="mc-num">'+fa(done)+'</div><div class="mc-lab">تسک انجام‌شده</div></div>';
    h+='<div class="mood-chip good"><span class="mc-emoji">💚</span><div class="mc-num">'+fa(pos)+'</div><div class="mc-lab">رفتار قشنگ</div></div>';
    h+='<div class="mood-chip warn"><span class="mc-emoji">⏳</span><div class="mc-num">'+fa(missed)+'</div><div class="mc-lab">تسک مانده</div></div>';
    h+='<div class="mood-chip bad"><span class="mc-emoji">🌧️</span><div class="mc-num">'+fa(neg)+'</div><div class="mc-lab">رفتار منفی</div></div>';
    h+='</div>';
    return h;
  }

  // Patch today view: remove plain stats, inject mood row near calendar
  var _todayView=typeof todayView==='function'?todayView:null;
  if(_todayView){
    todayView=function(){
      var html=_todayView();
      // remove sync leftovers if any
      html=html.replace(/<button[^>]*data-act="force-sync"[\s\S]*?<\/button>/g,'');
      html=html.replace(/<button[^>]*data-act="hard-sync"[\s\S]*?<\/button>/g,'');
      // remove weight on today
      html=html.replace(/<section class="weight-card"[\s\S]*?<\/section>/g,'');
      // inject mood chips after calendar
      if(html.indexOf('mood-row')<0){
        var chips=moodRow();
        if(html.indexOf('fun-cal')>=0){
          html=html.replace(/(<div class="cal-card fun-cal">[\s\S]*?<\/div>)/, function(m){ return m+chips; });
        }else if(html.indexOf('star-bank')>=0){
          html=html.replace('<section class="star-bank">', chips+'<section class="star-bank">');
        }else{
          html=chips+html;
        }
      }
      return html;
    };
  }

  console.log('ui-polish.js loaded');
})();
