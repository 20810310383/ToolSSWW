// Read-only browser dashboard. Never clicks checkout controls.
async function installDashboard(context, getState) {
  await context.exposeBinding('__samsungRunDashboardState', () => getState());
  await context.addInitScript(() => {
    if (window !== window.top || location.origin !== 'https://stg2.shop.samsung.com') return;
    let root, content, badge, minimized = false, busy = false;
    const labels = { running:'Đang xử lý', awaiting_manual_order:'Chờ bạn xác nhận', confirmation_seen:'Đã thấy mã đơn', confirmed_cart_empty:'Hoàn thành', stopped:'Đã dừng' };
    function mount() {
      if (!document.body || document.getElementById('samsung-run-dashboard')) return;
      const host = document.createElement('div'); host.id = 'samsung-run-dashboard';
      host.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483646;width:min(370px,calc(100vw - 36px));';
      root = host.attachShadow({mode:'open'});
      root.innerHTML = `<style>
        *{box-sizing:border-box} .panel{font:13px/1.5 system-ui,sans-serif;color:#e2e8f0;background:#10182a;border:1px solid #334765;border-radius:18px;box-shadow:0 14px 50px #0006;overflow:hidden}
        header{display:flex;gap:8px;align-items:center;padding:14px 16px;background:linear-gradient(115deg,#3730a3,#075985)}header strong{flex:1;font-size:14px;color:white}button{cursor:pointer;border:1px solid #ffffff40;border-radius:8px;background:#ffffff18;color:white;padding:3px 9px;font-size:18px}
        .content{padding:14px;max-height:55vh;overflow:auto}.stats{display:flex;gap:8px;margin-bottom:12px}.stat{flex:1;background:#1b2940;border:1px solid #30425e;border-radius:12px;padding:10px}.stat b{display:block;font-size:25px;color:#67e8f9}.stat:first-child b{color:#6ee7b7}.muted{color:#94a3b8;font-size:11px}.row{background:#18243a;border:1px solid #2b3d59;border-radius:11px;padding:10px;margin-top:8px}.top{display:flex;justify-content:space-between;gap:8px}.pill{font-size:10px;border-radius:20px;padding:2px 8px;background:#334155;color:#cbd5e1}.confirmed_cart_empty{color:#6ee7b7;background:#064e3b}.awaiting_manual_order{color:#fde68a;background:#713f12}.stopped{color:#fda4af;background:#881337}.code{font-weight:700;color:#93c5fd;overflow-wrap:anywhere}.item{display:flex;gap:8px;justify-content:space-between;margin-top:6px;font-size:12px}.qty{color:#67e8f9;font-weight:700;white-space:nowrap}.error{color:#fda4af;font-size:11px;overflow-wrap:anywhere}.badge{font-size:12px;color:#a7f3d0}.foot{font-size:10px;color:#94a3b8;margin-top:12px}
        </style><section class="panel"><header><strong>Samsung · Order monitor</strong><span class="badge"></span><button type="button" aria-label="Thu gọn / mở rộng">−</button></header><div class="content"></div></section>`;
      badge=root.querySelector('.badge');content=root.querySelector('.content');
      root.querySelector('button').onclick=()=>{minimized=!minimized;content.hidden=minimized;root.querySelector('button').textContent=minimized?'+':'−';};
      document.body.append(host);
    }
    function el(tag, text, cls) { const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n; }
    async function refresh() {
      if(busy)return;busy=true;
      try {
        mount();if(!content)return;
        const state=await window.__samsungRunDashboardState();const records=state.records||[];
        const done=records.filter(r=>r.status==='confirmed_cart_empty').length;
        badge.textContent=done+' đơn xong';content.replaceChildren();
        const stats=el('div',undefined,'stats');
        for(const [value,label]of [[done,'ĐƠN HOÀN THÀNH'],[records.length+' / '+(state.total||1),'LƯỢT ĐÃ BẮT ĐẦU']]){const stat=el('div',undefined,'stat');stat.append(el('b',String(value)),el('span',label,'muted'));stats.append(stat);}content.append(stats);
        if(!records.length)content.append(el('div','Đang chuẩn bị giỏ hàng…','muted'));
        for(const r of [...records].reverse()){
          const row=el('div',undefined,'row');const top=el('div',undefined,'top');top.append(el('strong','Lượt '+r.round),el('span',labels[r.status]||r.status,'pill '+r.status));row.append(top);
          if(r.orderCode)row.append(el('div',r.orderCode,'code'));
          for(const p of r.items||[]){const item=el('div',undefined,'item');item.append(el('span',p.code),el('span','× '+p.quantity,'qty'));row.append(item);}
          if(r.error)row.append(el('div',r.error,'error'));content.append(row);
        }
        content.append(el('div','Chỉ đếm hoàn thành khi có mã đơn và giỏ đã trống. Phiên chạy hiện tại.','foot'));
      }catch{}finally{busy=false;}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
    const timer=setInterval(refresh,1500);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  });
}
module.exports = { installDashboard };
