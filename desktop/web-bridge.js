(() => {
 const listeners=new Set();let cursor=0,stopped=false,lastState='';
 const fragment=location.hash.slice(1);if(fragment){sessionStorage.setItem('tool-token',fragment);history.replaceState(null,'',location.pathname);}
 const token=sessionStorage.getItem('tool-token')||'';
 async function request(path,body){const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'X-Tool-Token':token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await res.json();if(!res.ok)throw Error(data.error||'HTTP '+res.status);return data;}
 const broadcast=event=>{for(const fn of listeners){try{fn(event)}catch(e){console.error(e)}}};
 window.toolkit={isWeb:true,start:config=>request('start',config),history:config=>request('history',config),resetCookies:config=>request('reset',config),stop:()=>request('stop',{}),browserLayout:async()=>({ok:true}),browserCommand:data=>request('browser',data),onEvent:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}};
 async function poll(){if(stopped)return;try{const data=await request('events?after='+cursor);for(const event of data.events){cursor=Math.max(cursor,event.id);broadcast(event)}const state={type:'webState',running:data.running,browserOpen:data.browserOpen,environment:data.environment};const signature=JSON.stringify(state);if(signature!==lastState){lastState=signature;broadcast(state)}}catch(e){if(!stopped){broadcast({type:'log',level:'error',message:'Kết nối web: '+e.message});if(/Phiên không hợp lệ/.test(e.message))stopped=true;}}if(!stopped)setTimeout(poll,700)}
 window.addEventListener('DOMContentLoaded',()=>{document.body.classList.add('web-mode');
  const select=document.querySelector('#browser-mode');select.replaceChildren();const option=document.createElement('option');option.value='external';option.textContent='Chrome / Edge trên máy';select.append(option);select.value='external';select.disabled=true;select.setAttribute('aria-label','Bản web dùng Chrome hoặc Edge');
  const surface=document.querySelector('#browser-surface');surface.classList.add('web-browser-surface');surface.textContent='Website Samsung mở trong tab Chrome/Edge riêng. Chọn tab bên trên để đưa website lên trước. Bạn cấu hình và xem nhật ký tại tab web này.';
  const footer=document.querySelector('footer');footer.textContent='by Khắc Tú · Web local · Chrome / Edge + VPN';
  const side=document.querySelector('.side-bottom');side.replaceChildren();side.textContent='Web local · Giữ terminal mở. Ctrl+C để dừng.';
  const nav=document.querySelector('[data-mode=browser] small');if(nav)nav.textContent='Quản lý tab Chrome / Edge';
  broadcast({type:'log',level:'info',message:'Bản web đã sẵn sàng. Checkout dừng ở bước 3 để bạn kiểm tra và xác nhận.'});poll();
 });
 window.addEventListener('beforeunload',()=>{stopped=true});
})();
