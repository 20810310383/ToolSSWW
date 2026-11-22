const ui=require('./terminal-ui.cjs');
﻿const {chromium}=require('playwright');
const path=require('node:path');
const readline=require('node:readline/promises');
const {stdin:input,stdout:output}=require('node:process');
const ROOT='https://stg2.shop.samsung.com';
const API='https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
if(process.argv.includes('--help')){console.log('node addtocart.cjs\nMenu: 1 SKU hoac nhieu SKU; nhap ma va so luong. Chrome dung profile chung voi console-order.cjs.');process.exit(0);}
(async()=>{
  const rl=readline.createInterface({input,output});let context;
  const ask=async(text,fallback)=>((await rl.question(ui.question(text))).trim()||fallback);
  async function positive(text,fallback=1){while(true){const raw=await ask(text,String(fallback));if(/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))&&Number(raw)>0)return Number(raw);ui.warn('Nhập số nguyên dương.');}}
  try{
    ui.title('ADD TO CART');ui.menu([['1','Thêm một SKU'],['2','Thêm nhiều SKU']]);
    let mode;while(!['1','2'].includes(mode))mode=await ask('Chon 1/2 [1]: ','1');
    const count=mode==='1'?1:await positive('So SKU khac nhau [2]: ',2);
    const products=new Map();
    for(let i=0;i<count;i++){
      const sku=await ask('SKU '+(i+1)+(i===0?' [RB33J3515S9/EF]':'')+': ',i===0?'RB33J3515S9/EF':'');
      if(!sku){i--;ui.warn('SKU không được trống.');continue;}
      const quantity=await positive('So luong them cho '+sku+' [1]: ');
      const combined=(products.get(sku)||0)+quantity;
      if(!Number.isSafeInteger(combined))throw new Error('So luong qua lon.');
      products.set(sku,combined);
    }
    ui.section('Sản phẩm sẽ cộng thêm vào giỏ');for(const [sku,quantity]of products)ui.product(sku,quantity);
    if((await ask('Tiep tuc? y/n [y]: ','y')).toLowerCase()!=='y')return;
    ui.step('1/4 · Mở Chrome và lấy cookie');
    context=await chromium.launchPersistentContext(path.join(__dirname,'checkout-profile'),{channel:'chrome',headless:false,viewport:null});
    const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(45000);
    await page.goto('https://stg3.shop.samsung.com/getcookie.html',{waitUntil:'domcontentloaded'});
    await page.goto(ROOT+'/es/cart',{waitUntil:'domcontentloaded'});
    async function api(endpoint,method='GET',body){return page.evaluate(async({url,method,body})=>{
      const r=await fetch(url,{method,credentials:'include',cache:'no-store',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const t=await r.text();let data;try{data=t?JSON.parse(t):null;}catch{throw new Error('API khong tra JSON: HTTP '+r.status);}
      if(!r.ok||data?.errors?.length)throw new Error('HTTP '+r.status+': '+JSON.stringify(data?.errors));return data;
    },{url:API+endpoint+(endpoint.includes('?')?'&':'?')+'lang=es&curr=EUR',method,body});}
    ui.step('2/4 · Đọc giỏ hàng hiện tại');
    let before=await api('/users/current/carts/current?fields=FULL');
    if(!before.code&&!before.guid){await api('/users/current/carts','POST',{});before=await api('/users/current/carts/current?fields=FULL');}
    ui.step('3/4 · Gửi API thêm sản phẩm');
    const outcomes=[];
    for(const [sku,quantity]of products){
      try{
        const data=await api('/users/current/carts/current/entries','POST',{quantity,product:{code:sku}});
        const ok=data?.statusCode==='success'&&data?.quantityAdded===quantity;
        outcomes.push({sku,quantity,ok,status:data?.statusCode,added:data?.quantityAdded});
        ui[ok?'success':'warn'](sku+' · '+data?.statusCode+' · đã thêm '+data?.quantityAdded+'/'+quantity);
      }catch(error){outcomes.push({sku,quantity,ok:false,error:error.message});ui.error(sku+': '+error.message);}
    }
    const after=await api('/users/current/carts/current?fields=FULL');
    ui.step('4/4 · Kiểm tra giỏ hàng sau khi thêm');for(const e of after.entries||[])ui.product(e.product?.code,e.quantity);
    for(const result of outcomes){if(!result.ok)continue;const sum=c=>(c.entries||[]).filter(e=>e.product?.code===result.sku).reduce((n,e)=>n+Number(e.quantity||0),0);const actual=sum(after),expected=sum(before)+result.quantity;if(actual!==expected){process.exitCode=1;ui.warn('CHƯA XÁC NHẬN '+result.sku+': mong doi '+expected+', GET gio tra '+actual+'. Khong tu gui lai de tranh them trung.');}}
    if(outcomes.some(x=>!x.ok))process.exitCode=1;
    ui.total(after.totalPrice?.formattedValue||'Chưa có');
    await page.reload({waitUntil:'domcontentloaded'});
    await rl.question(ui.question('Enter để đóng Chrome, lưu phiên và kết thúc:'));
  }catch(error){process.exitCode=1;ui.error('DỪNG: '+error.message);ui.info('Nếu profile đang được sử dụng, đóng Chrome của script trước rồi chạy lại.');}
  finally{rl.close();if(context)await context.close();}
})().catch(error=>{ui.error(error.message);process.exitCode=1;});
