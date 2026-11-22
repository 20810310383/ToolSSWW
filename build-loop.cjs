const fs=require('node:fs');
const source=fs.readFileSync('samsung-cart-check/console-order.cjs','utf8');
const start=source.indexOf("    step('4.");const end=source.indexOf('    // Chi cuon',start);
if(start<0||end<0)throw Error('Cannot locate checkout UI steps');
const checkout=source.slice(start,end).replaceAll("process.argv.includes('--no-card')","noCard");
const prefix=String.raw`const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { randomInt } = require('node:crypto');
const ui = require('./terminal-ui.cjs');
const ROOT = 'https://stg2.shop.samsung.com';
const API = 'https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
const CART = '/users/current/carts/current';
const noCard = process.argv.includes('--no-card');
if (process.argv.includes('--help')) {
  console.log('node checkout-loop.cjs [--no-card] [--dry-run]\nNhap SKU, so luot, cach doi quantity. Moi luot dung o buoc 3 de ban tu dat hang.\n--dry-run: chi xem ke hoach, khong mo Chrome. --no-card: khong dien the test.');
  process.exit(0);
}

async function main() {
  const rl = readline.createInterface({input:process.stdin,output:process.stdout});
  let context;
  const ask = async (text, fallback='') => (await rl.question(ui.question(text))).trim() || fallback;
  async function number(text, fallback, low=1, high=10000) {
    while(true) {
      const raw=await ask(text,String(fallback));const n=Number(raw);
      if(/^\d+$/.test(raw)&&Number.isSafeInteger(n)&&n>=low&&n<=high)return n;
      ui.warn('Nhap so nguyen tu '+low+' den '+high+'.');
    }
  }
  const records=[];
  const report=path.join(__dirname,'checkout-loop-results.json');
  const save=()=>fs.writeFileSync(report,JSON.stringify(records,null,2));
  try {
    ui.title('ADD TO CART → CHECKOUT · NHIỀU LƯỢT');
    let codes=[];
    while(!codes.length)codes=[...new Set((await ask('Nhập một/nhiều SKU, cách nhau dấu phẩy:')).split(/[,;\s]+/).filter(Boolean))];
    const rounds=await number('Số lượt chạy [1]:',1);
    ui.menu([['1','Cố định: nhập quantity riêng cho từng SKU'],['2','Tăng dần: duyệt các tổ hợp quantity từ min đến max'],['3','Xen kẽ: xoay quantity giữa các SKU'],['4','Ngẫu nhiên trong khoảng min–max']]);
    let mode;while(!['1','2','3','4'].includes(mode))mode=await ask('Chọn chế độ [1]:','1');
    let low=1,high=1;const fixed={};
    if(mode==='1') {for(const code of codes)fixed[code]=await number('Quantity '+code+' [1]:',1);}
    else {low=await number('Quantity nhỏ nhất [1]:',1);high=await number('Quantity lớn nhất [2]:',Math.max(low,2),low);}
    const width=high-low+1;
    const plan=Array.from({length:rounds},(_,i)=>{
      let counter=i;
      return codes.map((code,index)=>{
        let quantity;
        if(mode==='1')quantity=fixed[code];
        if(mode==='2'){quantity=low+counter%width;counter=Math.floor(counter/width);}
        if(mode==='3')quantity=low+(i+index)%width;
        if(mode==='4')quantity=randomInt(low,high+1);
        return {code,quantity};
      });
    });
    ui.section('Kế hoạch (tối đa 10 lượt đầu)');
    plan.slice(0,10).forEach((items,i)=>ui.info('Lượt '+(i+1)+': '+items.map(p=>p.code+' × '+p.quantity).join(' | ')));
    if(rounds>10)ui.info('Còn '+(rounds-10)+' lượt.');
    ui.info('Sau bước 3 bạn tự tích điều khoản và đặt hàng; tool chờ trang xác nhận và giỏ trống để tiếp tục.');
    if(process.argv.includes('--dry-run'))return;
    if((await ask('Bắt đầu? y/n [y]:','y')).toLowerCase()!=='y')return;
    const {chromium}=require('playwright');
    context=await chromium.launchPersistentContext(path.join(__dirname,'checkout-profile'),{channel:'chrome',headless:false,slowMo:120,viewport:null});
    const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(30000);
    const step=text=>ui.step(text);
    async function api(endpoint,method='GET',body) {
      return page.evaluate(async({url,method,body})=>{
        const r=await fetch(url,{method,credentials:'include',cache:'no-store',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
        const text=await r.text();let data;try{data=text?JSON.parse(text):null;}catch{throw Error('API khong tra JSON: '+r.status);}
        if(!r.ok||data?.errors?.length)throw Error('HTTP '+r.status+': '+JSON.stringify(data?.errors));return data;
      },{url:API+endpoint+(endpoint.includes('?')?'&':'?')+'lang=es&curr=EUR',method,body});
    }
    const count=(cart,code)=>(cart.entries||[]).filter(e=>e.product?.code===code).reduce((n,e)=>n+Number(e.quantity||0),0);
    function verify(cart,items){
      if((cart.entries||[]).some(e=>!items.some(p=>p.code===e.product?.code))||items.some(p=>count(cart,p.code)!==p.quantity))throw Error('Gio khong khop ke hoach. Dung de tranh order nham; kiem tra cart truoc khi chay lai.');
    }
    await page.goto('https://stg3.shop.samsung.com/getcookie.html',{waitUntil:'domcontentloaded'});
    for(let round=0;round<plan.length;round++) {
      const items=plan[round];const record={round:round+1,items,startedAt:new Date().toISOString(),status:'running'};records.push(record);save();
      try {
        ui.title('LƯỢT '+(round+1)+' / '+rounds);items.forEach(p=>ui.product(p.code,p.quantity));
        await page.goto(ROOT+'/es/cart',{waitUntil:'domcontentloaded'});
        const reject=page.getByRole('button',{name:'Rechazar Opcionales',exact:true});if(await reject.isVisible())await reject.click();
        let cart=await api(CART+'?fields=FULL');
        if(round>0&&cart.entries?.length)throw Error('Gio luot truoc chua trong. Khong tu xoa hoac cong them.');
        if((cart.entries||[]).some(e=>!items.some(p=>p.code===e.product?.code)))throw Error('Gio co SKU ngoai ke hoach. Hay xoa thu cong truoc khi chay.');
        for(const p of items)if(count(cart,p.code)>p.quantity)throw Error(p.code+' da co quantity vuot ke hoach.');
        if(!cart.code&&!cart.guid)await api('/users/current/carts','POST',{});
        for(const p of items){const quantity=p.quantity-count(cart,p.code);if(!quantity)continue;const added=await api(CART+'/entries','POST',{quantity,product:{code:p.code}});if(added.statusCode!=='success'||added.quantityAdded!==quantity)throw Error('Them '+p.code+' that bai/khong du quantity.');ui.success('Đã thêm '+p.code+' × '+quantity);}
        verify(await api(CART+'?fields=FULL'),items);
        await page.reload({waitUntil:'domcontentloaded'});
        await page.getByRole('button',{name:/Tramitar pedido/i}).first().click();
        await page.waitForURL(/\/es\/(guestlogin\/checkout|checkout\/one)/);
        if(page.url().includes('/guestlogin/checkout')){
          ui.info('Đăng nhập Samsung trong Chrome; script chờ tối đa 10 phút.');
          await page.getByText(/Iniciar sesi/i).first().click();
          await page.waitForURL(url=>url.origin===ROOT&&url.pathname.includes('/checkout/one'),{timeout:600000});
        }
        verify(await api(CART+'?fields=FULL'),items);
`;
const suffix=String.raw`
        // ===== FOCUS BƯỚC 3 — TỰ XÁC NHẬN TRONG CHROME =====
        const confirmation=page.locator('#es-adyenCcPaymentModeOptin-input');
        if(await confirmation.isVisible()){
          await confirmation.scrollIntoViewIfNeeded();
          await confirmation.evaluate(el=>{const target=el.closest('mat-checkbox')||el;target.style.outline='3px solid #ffb300';target.style.outlineOffset='6px';});
          await confirmation.focus();
        }
        record.status='awaiting_manual_order';save();
        ui.success('Đến bước 3. Bạn tự kiểm tra tổng tiền, tích điều khoản và đặt hàng trong Chrome.');
        ui.info('Chờ tối đa 30 phút. Tool không tự tích, lưu thẻ hoặc bấm đặt hàng.');
        await page.waitForURL(url=>url.origin===ROOT&&url.pathname.startsWith('/es/orderConfirmation'),{timeout:1800000});
        const confirmedURL=new URL(page.url());
        const orderCode=confirmedURL.searchParams.get('orderCode') || /orderCode=([^;?&#/]+)/.exec(confirmedURL.pathname)?.[1];
        if(!orderCode)throw Error('Trang xac nhan chua co orderCode. Khong bat dau luot moi.');
        record.orderCode=decodeURIComponent(orderCode);record.confirmationURL=page.url();record.status='confirmation_seen';save();
        await page.goto(ROOT+'/es/cart',{waitUntil:'domcontentloaded'});
        if((await api(CART+'?fields=FULL')).entries?.length)throw Error('Da thay trang xac nhan nhung gio chua trong. Dung de kiem tra.');
        record.status='confirmed_cart_empty';record.finishedAt=new Date().toISOString();save();
        ui.success('Lượt '+(round+1)+' · mã đơn '+record.orderCode+' · giỏ đã trống.');
      }catch(error){record.status='stopped';record.error=error.message;record.finishedAt=new Date().toISOString();save();throw error;}
    }
    ui.success('Hoàn thành '+rounds+' lượt. Log: '+report);
  } catch(error){process.exitCode=1;ui.error(error.message);ui.warn('Không tự retry để tránh thêm trùng/tạo sai giỏ.');}
  finally{
    if(context&&context.pages().length){try{await rl.question(ui.question('Enter để đóng Chrome và lưu phiên:'));}catch{}await context.close();}
    rl.close();
  }
}
main().catch(error=>{ui.error(error.message);process.exitCode=1;});
`;
const output=prefix+checkout+suffix;
if(/Optin-input'\)\.click|payment:pay now:credit card/.test(output))throw Error('Unexpected final action');
fs.writeFileSync('samsung-cart-check/checkout-loop.cjs',output);
