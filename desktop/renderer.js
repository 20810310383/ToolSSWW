const $=s=>document.querySelector(s);let mode='checkout',completed=0,running=false,browserOpen=false,activeEnvironment=null,historyBusy=false;
function selectMode(next){mode=next;document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.mode===next));for(const name of ['checkout','history','cart','browser'])$('#'+name+'-view').hidden=next!==name;$('#heading').textContent={checkout:'Tự thêm giỏ + checkout',history:'Lịch sử đơn chi tiết',browser:'Trình duyệt trong app',cart:'Add to cart · một / nhiều SKU'}[next];$('#description').textContent={checkout:'Nhập môi trường, SKU và thẻ test trước khi bắt đầu.',history:'Mở tab lịch sử riêng, dùng song song với phiên checkout.',browser:'Tab Chromium trong app · các chức năng chạy theo trình duyệt đã chọn.',cart:'Nhập mã SKU và quantity chung, chỉ thêm giỏ hàng.'}[next];window.scrollTo(0,0);syncHistory();scheduleBrowserLayout();}
for(const btn of document.querySelectorAll('.nav'))btn.onclick=()=>selectMode(btn.dataset.mode);$('#go-history').onclick=()=>selectMode('history');
const logClock=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});let logQueue=[],logFrame=null;
function log(message,level='info'){
 logQueue.push({message,level,time:logClock.format(new Date())});
 if(logQueue.length>500)logQueue.splice(0,logQueue.length-500);
 if(logFrame===null)logFrame=requestAnimationFrame(flushLogs);
}
function flushLogs(){
 logFrame=null;const box=$('#logs');const follow=box.scrollHeight-box.scrollTop-box.clientHeight<32;
 const fragment=document.createDocumentFragment();
 for(const entry of logQueue){const row=document.createElement('div');row.className='log '+entry.level;const t=document.createElement('time');t.textContent=entry.time;row.append(t,document.createTextNode(entry.message));fragment.append(row);}
 logQueue=[];box.append(fragment);while(box.children.length>500)box.firstChild.remove();if(follow)box.scrollTop=box.scrollHeight;
}
function updateControls(){$('#browser-mode').disabled=running||historyBusy;for(const el of document.querySelectorAll('#form input,#form select,#form textarea,#cart-form input,#cart-form select,#cart-form textarea'))el.disabled=running;$('#start').disabled=running;$('#cart-start').disabled=running;$('#stop').disabled=!running&&!browserOpen;$('.status').classList.toggle('busy',running);$('.status').textContent=running?'● Đang chạy':browserOpen?'● Chrome đang mở':'● Sẵn sàng';cardControls();cartControls();}
function cardControls(){const on=$('#fillCard').checked;$('#card-fields').hidden=!on;for(const el of document.querySelectorAll('#card-fields input')){el.required=on;el.disabled=running||!on;}}
function endpoints(){return {browserMode:$('#browser-mode').value,root:$('#root').value.trim(),api:$('#api').value.trim()};}
function syncHistory(){const reuse=$('#reuse-environment').checked;$('#history-root').disabled=reuse||historyBusy;$('#history-api').disabled=reuse||historyBusy;if(reuse){const env=running&&activeEnvironment?activeEnvironment:endpoints();$('#history-root').value=env.root;$('#history-api').value=env.api;}}
$('#fillCard').onchange=cardControls;$('#reuse-environment').onchange=syncHistory;$('#root').oninput=syncHistory;$('#api').oninput=syncHistory;
try{const saved=JSON.parse(localStorage.getItem('endpoints'));if(saved){$('#root').value=saved.root;$('#api').value=saved.api;}}catch{}syncHistory();
$('#form').onsubmit=async e=>{e.preventDefault();const env=endpoints();const config={...env,mode:Number($('#rounds').value)>1?'loop':'checkout',skus:$('#skus').value,min:$('#min').value,max:$('#max').value,rounds:$('#rounds').value,quantityMode:$('#quantityMode').value,fillCard:$('#fillCard').checked,card:{number:$('#card-number').value,holder:$('#card-holder').value,expiry:$('#card-expiry').value,cvc:$('#card-cvc').value}};running=true;activeEnvironment=env;updateControls();completed=0;$('#completed').textContent='0';$('#orders').replaceChildren();try{await window.toolkit.start(config);browserOpen=true;localStorage.setItem('endpoints',JSON.stringify(env));log('Đã bắt đầu phiên checkout.');updateControls();}catch(err){log(err.message,'error');running=false;activeEnvironment=null;updateControls();}};
$('#history-form').onsubmit=async e=>{e.preventDefault();if(historyBusy)return;const env=$('#reuse-environment').checked?(running&&activeEnvironment?activeEnvironment:endpoints()):{root:$('#history-root').value.trim(),api:$('#history-api').value.trim(),browserMode:$('#browser-mode').value};historyBusy=true;updateControls();$('#open-history').disabled=true;syncHistory();try{await window.toolkit.history({...env,browserMode:$('#browser-mode').value});browserOpen=true;$('#history-status').textContent='TAB LỊCH SỬ ĐANG MỞ';log('Lịch sử đã mở ở tab riêng. Bấm nút Lịch sử đơn trên trang Samsung.','success');}catch(err){log(err.message,'error');$('#history-status').textContent='CHƯA MỞ ĐƯỢC';}finally{historyBusy=false;$('#open-history').disabled=false;syncHistory();updateControls();}};
$('#stop').onclick=async()=>{log('Đang dừng Chrome và lưu phiên…','warn');$('#stop').disabled=true;try{await window.toolkit.stop();browserOpen=false;}catch(err){log(err.message,'error');}finally{updateControls();}};
$('#clear').onclick=()=>{logQueue=[];if(logFrame!==null)cancelAnimationFrame(logFrame);logFrame=null;$('#logs').replaceChildren();};
window.toolkit.onEvent(event=>{if(event.type==='log')log(event.message,event.level);if(event.type==='browserClosed'){browserOpen=false;$('#history-status').textContent='CHƯA MỞ TAB';updateControls();}if(event.type==='idle'){running=false;activeEnvironment=null;updateControls();$('#progress').textContent='ĐÃ KẾT THÚC';}if(event.type==='round'){browserOpen=true;$('#current').textContent=event.round+'/'+event.total;$('#progress').textContent=event.status==='waiting'?'CHỜ XÁC NHẬN':'ĐANG XỬ LÝ';$('#items').textContent=event.items.map(x=>x.code+'  × '+x.quantity).join('\n');updateControls();}if(event.type==='complete'){$('#completed').textContent=String(++completed);const el=document.createElement('div');el.className='order';const b=document.createElement('b');b.textContent=event.orderCode;const p=document.createElement('p');p.textContent=event.items.map(x=>x.code+' × '+x.quantity).join(' | ');el.append(b,p);$('#orders').prepend(el);}});
window.toolkit.onEvent(event=>{if(event.type==='cartResult'){$('#cart-result').textContent=event.outcomes.map(x=>(x.ok?'✓ ':'! ')+x.code+' · yêu cầu +'+x.quantity+' · '+(x.ok?'đã xác nhận':x.error||'Chưa khớp quantity')).join('\n')+'\n\nGIỎ HIỆN TẠI\n'+event.items.map(x=>x.code+' × '+x.quantity).join('\n')+'\nTổng: '+(event.total||'—');}});
function cartCodes(){return [...new Set($('#cart-skus').value.split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean))];}
function cartControls(){$('#cart-common-quantity').disabled=running;$('#cart-reset').disabled=running||!browserOpen;}
try{const saved=JSON.parse(localStorage.getItem('cartEndpoints'));if(saved){$('#cart-root').value=saved.root;$('#cart-api').value=saved.api;}}catch{}
$('#cart-form').onsubmit=async e=>{e.preventDefault();if(running)return;const codes=cartCodes();if(!codes.length){$('#cart-result').textContent='Nhập ít nhất một SKU.';return;}const items=codes.map(code=>({code,quantity:Number($('#cart-common-quantity').value)}));if(items.some(x=>!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>1000)){$('#cart-result').textContent='Quantity phải là số nguyên từ 1 đến 1000.';return;}const env={browserMode:$('#browser-mode').value,root:$('#cart-root').value.trim(),api:$('#cart-api').value.trim()};running=true;activeEnvironment={root:new URL(env.root).origin,api:env.api};$('#cart-result').textContent='Đang thêm sản phẩm…';updateControls();try{await window.toolkit.start({...env,mode:'cart',items,fillCard:false,min:1,max:1});browserOpen=true;localStorage.setItem('cartEndpoints',JSON.stringify(env));log('Đã bắt đầu add to cart.');updateControls();}catch(err){log(err.message,'error');$('#cart-result').textContent=err.message;running=false;activeEnvironment=null;updateControls();}};

function askReaddCart(){
 const dialog=$('#cart-readd-dialog');
 $('#cart-readd-items').textContent=cartCodes().map(code=>code+' × '+$('#cart-common-quantity').value).join('\n')||'Chưa nhập SKU. Chọn Có để quay lại nhập SKU.';
 return new Promise(resolve=>{let answer=false;$('#cart-readd-no').onclick=()=>dialog.close();$('#cart-readd-yes').onclick=()=>{answer=true;dialog.close();};dialog.onclose=()=>resolve(answer);dialog.showModal();});
}
$('#cart-reset').onclick=async()=>{
 if(running)return;
 running=true;updateControls();let readd=false;
 try{
  await window.toolkit.resetCookies({browserMode:$('#browser-mode').value,root:$('#cart-root').value.trim(),api:$('#cart-api').value.trim()});
  $('#cart-result').textContent='Đã xoá cookie, lấy lại cookie và mở URL cart. Chưa thêm lại SKU.';
  selectMode('cart');readd=await askReaddCart();
  if(!readd)log('Bạn chọn không thêm lại SKU. Giữ nguyên trang cart.');
 }catch(e){log(e.message,'error');}
 finally{running=false;updateControls();}
 if(readd)$('#cart-form').requestSubmit();
};

let browserLayoutFrame=null,addressTab=null,addressDirty=false;
async function browserCommand(data){try{$('#browser-error').textContent='';await window.toolkit.browserCommand(data);return true;}catch(e){$('#browser-error').textContent=e.message;log(e.message,'error');scheduleBrowserLayout();return false;}}
$('#browser-new').onclick=async()=>{if(await browserCommand({action:'new'})){$('#browser-address').focus();$('#browser-address').select();}};
$('#browser-address').oninput=()=>{addressDirty=true;};
$('#browser-address').onkeydown=async e=>{if(e.key!=='Enter')return;e.preventDefault();const url=e.currentTarget.value.trim();if(!url)return;addressDirty=false;await browserCommand({action:'navigate',id:addressTab,url});};
function scheduleBrowserLayout(){if(browserLayoutFrame!==null)return;browserLayoutFrame=requestAnimationFrame(()=>{browserLayoutFrame=null;const r=$('#browser-surface').getBoundingClientRect();window.toolkit.browserLayout({visible:mode==='browser',bounds:{x:Math.round(r.x),y:Math.round(r.y),width:Math.max(1,Math.round(r.width)),height:Math.max(1,Math.round(r.height))}}).catch(e=>log(e.message,'error'));});}
new ResizeObserver(scheduleBrowserLayout).observe($('#browser-surface'));window.addEventListener('resize',scheduleBrowserLayout);window.addEventListener('scroll',scheduleBrowserLayout,{passive:true});
for(const action of ['back','forward','reload'])$('#browser-'+action).onclick=()=>browserCommand({action});
window.toolkit.onEvent(e=>{if(e.type==='embeddedFocus'){browserOpen=true;selectMode('browser');updateControls();}if(e.type==='embeddedState'){const box=$('#browser-tabs');box.replaceChildren();for(const tab of e.tabs){const group=document.createElement('div');group.className='browser-tab'+(tab.id===e.selected?' selected':'');const b=document.createElement('button');b.textContent=(tab.loading?'◌ ':'')+tab.title;b.onclick=()=>browserCommand({action:'select',id:tab.id});const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Đóng tab '+tab.title);close.onclick=()=>browserCommand({action:'close',id:tab.id});group.append(b,close);box.append(group);}if(addressTab!==e.selected||!addressDirty){addressTab=e.selected;addressDirty=false;$('#browser-address').value=e.tabs.find(t=>t.id===e.selected)?.url||'';}scheduleBrowserLayout();}});

try{const saved=localStorage.getItem('browserMode');if(['embedded','external'].includes(saved))$('#browser-mode').value=saved;}catch{}$('#browser-mode').onchange=()=>{localStorage.setItem('browserMode',$('#browser-mode').value);log('Đã chọn '+($('#browser-mode').value==='embedded'?'trình duyệt trong app':'Chrome bên ngoài')+'. Hai trình duyệt có cookie riêng.');};
