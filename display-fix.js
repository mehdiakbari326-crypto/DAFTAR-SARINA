/* display-fix v2.5 — green/orange states + prize cards + layout */
(function(){
  try{
    var st=document.createElement('style');
    st.id='display-fix-v25';
    st.textContent = [
      '.task, li.task{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:18px;background:var(--accent-soft,#F3ECFF);border:2px solid transparent;margin:0 0 10px;list-style:none;flex-wrap:wrap}',
      'li.task .task-t, .task .task-t{flex:1;font-weight:800;font-size:14px;min-width:120px}',
      'li.task.s-done, .task.s-done, .task.done{background:var(--pos-soft,#E0F5EB)!important;border-color:var(--pos,#2E9E6A)!important}',
      'li.task.s-missed, .task.s-missed, .task.missed{background:var(--neg-soft,#FDE8E2)!important;border-color:var(--neg,#E86A4A)!important}',
      '.seg{display:flex;gap:6px;flex-wrap:wrap}',
      '.seg button, button.ok, button.no{min-height:40px;padding:8px 12px;border-radius:12px;font-weight:800;font-size:12px;border:2px solid var(--line,#EDE4FF);background:#fff;color:var(--ink,#2D1B4E)}',
      '.seg button.ok[aria-pressed="true"], button.ok[aria-pressed="true"]{background:var(--pos,#2E9E6A)!important;color:#fff!important;border-color:var(--pos,#2E9E6A)!important}',
      '.seg button.no[aria-pressed="true"], button.no[aria-pressed="true"]{background:var(--neg,#E86A4A)!important;color:#fff!important;border-color:var(--neg,#E86A4A)!important}',
      '.beh-item{display:grid;gap:8px;padding:14px;border:2px solid var(--line,#EDE4FF);border-radius:18px;background:#fff;margin-bottom:10px}',
      '.beh-item.s-done{border-color:var(--pos,#2E9E6A)!important;background:var(--pos-soft,#E0F5EB)!important}',
      '.beh-item.s-missed{border-color:var(--neg,#E86A4A)!important;background:var(--neg-soft,#FDE8E2)!important}',
      '.beh-item.kind-neg.s-done{border-color:var(--neg,#E86A4A)!important;background:var(--neg-soft,#FDE8E2)!important}',
      '.beh-item.kind-neg.s-missed{border-color:var(--pos,#2E9E6A)!important;background:var(--pos-soft,#E0F5EB)!important}',
      '.reward{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-radius:18px;background:linear-gradient(135deg,#FBF7FF,#FFF5F8);border:2px solid #E9D5FF;margin-bottom:10px}',
      '.reward .r-t{font-weight:800;font-size:14px;flex:1}',
      '.reward .r-t small{display:block;font-size:12px;color:var(--accent-deep,#6B3FBF);font-weight:700;margin-top:2px}',
      '.claim-btn{background:linear-gradient(90deg,#9B6DFF,#F472B6);color:#fff;border:0;border-radius:14px;padding:10px 16px;font-weight:800;min-height:42px;flex-shrink:0}',
      '.claim-btn:disabled{opacity:.45}',
      '.name-wrap{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.92);border-radius:16px;padding:4px 12px;margin:10px 0 12px;border:2px solid rgba(255,255,255,.6)}',
      'input.name,.name-wrap input.name{flex:1;border:0!important;background:transparent!important;padding:10px 4px!important;font-weight:800;font-size:16px;color:var(--ink,#2D1B4E);outline:none;width:auto;min-width:0}',
      '.fun-tabs,.tabs{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:4px!important;overflow:visible!important}',
      '.fun-tabs button,.tabs button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 2px!important;min-width:0!important;border-radius:14px;background:rgba(255,255,255,.9)!important;color:var(--accent-deep,#6B3FBF)!important;font-weight:800;font-size:10px;line-height:1.2;border:0}',
      '.fun-tabs button[aria-selected="true"],.tabs button[aria-selected="true"]{background:#fff!important;box-shadow:0 4px 12px rgba(107,63,191,.2)}',
      '.tab-icon{font-size:18px;line-height:1;display:block}',
      '.tab-lab{font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '.mascot{font-size:42px;line-height:1}',
      '.level-card{background:linear-gradient(145deg,#F3ECFF,#FFEAF4);border:2px solid #E9D5FF;border-radius:24px;padding:14px;margin-bottom:4px}',
      '.mood-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}',
      '.mood-chip{background:#fff;border:2px solid var(--line,#EDE4FF);border-radius:16px;padding:10px 6px;text-align:center}',
      '.mood-chip .mc-num{font-size:18px;font-weight:800;color:var(--accent-deep,#6B3FBF)}',
      '.mood-chip .mc-lab{font-size:10px;font-weight:700;color:var(--muted,#8B7AA8)}',
      'ul{padding:0;margin:0}',
      'li.task.s-done .task-t span::before{content:"✅ ";}',
      'li.task.s-missed .task-t span::before{content:"❌ ";}',
      '.prizes-card .prize-tabs, .prize-tabs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin-top:10px}',
      '.prize-box{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:12px 8px;border-radius:18px;border:2px solid #E9D5FF;background:linear-gradient(180deg,#fff,#FBF7FF);min-height:110px}',
      '.prize-box.day{border-color:#FDE68A;background:linear-gradient(180deg,#fff,#FFFBEB)}',
      '.prize-box.week{border-color:#C4B5FD;background:linear-gradient(180deg,#fff,#F5F3FF)}',
      '.prize-box.month{border-color:#F9A8D4;background:linear-gradient(180deg,#fff,#FDF2F8)}',
      '.pb-icon{font-size:28px;line-height:1.2}',
      '.pb-label{font-weight:800;font-size:13px;color:var(--ink,#2D1B4E)}',
      '.pb-val{font-weight:800;font-size:14px;color:var(--accent-deep,#6B3FBF)}',
      '.pb-empty,.pb-list{font-size:11px;font-weight:700;color:var(--muted,#8B7AA8);line-height:1.4}',
      '.week{background:linear-gradient(145deg,#F3ECFF,#FFEAF4);border:2px solid #E9D5FF;border-radius:20px;padding:12px 14px;margin:8px 0;font-weight:800}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}
  try{ if(typeof render==='function') setTimeout(function(){ try{render()}catch(e){} }, 200); }catch(e){}
  console.log('display-fix v2.5 active');
})();
