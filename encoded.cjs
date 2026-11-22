const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:false,channel:'chrome'});const c=await b.newContext();const p=await c.newPage();
p.on('response',async r=>{if(/tokocommercewebservices/.test(r.url())&&(/RB38|\/entries|\/products/.test(r.url()))){console.log('API',r.status(),r.request().method(),r.url(),r.request().postData());if(r.status()>=400||r.request().method()!=='GET')console.log((await r.text()).slice(0,5000));}});
await p.goto('https://stg3.shop.samsung.com/getcookie.html');
await p.goto('https://stg2.shop.samsung.com/es/p/RB38C600CS9%2FEF');
await p.waitForTimeout(20000);console.log('BODY',(await p.locator('body').innerText()).slice(0,12000));console.log('BUTTONS',await p.getByRole('button').allTextContents());
const add=p.getByRole('button',{name:/añadir.*carrito|añadir.*cesta/i});if(await add.count()){await add.first().click();await p.waitForTimeout(10000);console.log('AFTER',(await p.locator('body').innerText()).slice(-14000));}
await b.close();})();
