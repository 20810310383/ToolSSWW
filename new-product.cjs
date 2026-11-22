const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({headless:false,channel:'chrome'});try{const c=await b.newContext();const p=await c.newPage();const events=[];
p.on('response',async r=>{const q=r.request();if(/tokocommercewebservices/.test(r.url())&&(/cms\/pages|\/products\/|\/carts|\/entries/.test(r.url()))){const e={status:r.status(),method:q.method(),url:r.url(),payload:q.postData()};if((q.method()!=='GET' && /entries/.test(r.url()))||r.status()>=400){try{e.body=(await r.text()).slice(0,16000)}catch{}}events.push(e);console.log('API',JSON.stringify(e));}});
await p.goto('https://stg3.shop.samsung.com/getcookie.html',{waitUntil:'domcontentloaded',timeout:45000});console.log('COOKIE_OK');
const r=await p.goto('https://stg2.shop.samsung.com/es/p/SM-S921BLGDEUB',{waitUntil:'domcontentloaded',timeout:45000});console.log('PAGE_STATUS',r.status());
await p.waitForTimeout(18000);console.log('BUTTONS',JSON.stringify(await p.getByRole('button').allTextContents()));
fs.writeFileSync('.tmp/samsung-cart-check/new-events.json',JSON.stringify(events,null,2));await p.screenshot({path:'.tmp/samsung-cart-check/new-page.png'});
const add=p.getByRole('button',{name:/^\s*Precompra\s*$/i});console.log('ADD_MATCHES',await add.count());
if(await add.count()){await add.first().click();await p.waitForTimeout(12000);console.log('AFTER',(await p.locator('body').innerText()).slice(-18000));console.log('AFTER_BUTTONS',JSON.stringify(await p.getByRole('button').allTextContents()));fs.writeFileSync('.tmp/samsung-cart-check/new-events.json',JSON.stringify(events,null,2));}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

