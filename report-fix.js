/* Fix report chart layout with inline styles (no broken CSS dependency) */
(function(){
  function buildChart(range){
    range=range||reportRange||7;
    var keys=[];
    for(var i=range-1;i>=0;i--) keys.push(addDays(todayKey(),-i));
    var scores=keys.map(function(k){return score(dayStats(k))});
    var maxS=Math.max(1,Math.max.apply(null,scores.map(function(s){return Math.abs(s)||0})));

    var h='<div style="display:flex;align-items:flex-end;gap:4px;height:160px;overflow-x:auto;padding:8px 4px 0;direction:ltr;background:linear-gradient(180deg,#FBF7FF,#fff);border-radius:16px;border:1.5px solid var(--line)">';
    keys.forEach(function(k,i){
      var sc=scores[i];
      var abs=Math.abs(sc);
      var hgt=abs===0?6:Math.max(16,Math.round((abs/maxS)*120));
      var color=sc>0?'#9B6DFF':(sc<0?'#E86A4A':'#E5E7EB');
      var isToday=k===todayKey();
      var showLbl=range<=7||(range<=14&&(i%2===0||isToday))||isToday||i===0||i===keys.length-1;
      var lbl='';
      if(isToday) lbl='امروز';
      else if(showLbl){
        try{lbl=fmtShort.format(fromKey(k)).split(' ')[0]}catch(e){lbl=''}
      }
      h+='<div style="flex:1;min-width:'+(range>14?12:18)+'px;max-width:36px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px">';
      if(sc!==0)h+='<span style="font-size:9px;font-weight:800;color:'+color+'">'+(sc>0?'+':'')+fa(sc)+'</span>';
      h+='<div style="width:70%;max-width:22px;height:'+hgt+'px;border-radius:8px 8px 4px 4px;background:'+color+';'+(isToday?'box-shadow:0 0 0 2px #FFC94A;':'')+'"></div>';
      h+='<span style="font-size:9px;font-weight:700;color:'+(isToday?'#6B3FBF':'#8B7AA8')+';white-space:nowrap">'+lbl+'</span>';
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  var _reportView=typeof reportView==='function'?reportView:null;
  if(_reportView){
    reportView=function(){
      var html=_reportView();
      // Replace broken chart-wrap block with fixed chart
      var chart=buildChart(reportRange||7);
      html=html.replace(/<div class="chart-wrap"[\s\S]*?<\/div>\s*(?=<div style="display:grid|<\/section>)/, chart);
      // fallback: if chart-wrap still there without proper structure
      if(html.indexOf('chart-wrap')>=0){
        html=html.replace(/<div class="chart-wrap"[\s\S]*?<\/div>/, chart);
      }
      return html;
    };
  }

  console.log('report-fix.js loaded');
})();
