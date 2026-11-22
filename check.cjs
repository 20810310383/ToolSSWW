const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:false,channel:'chrome'});
 const context=await browser.newContext();const page=await context.newPage();
 page.on('response',async r=>{if(/tokocommercewebservices/.test(r.url()) && !/translation/.test(r.url())){console.log('CART_RESPONSE',r.status(),r.url(),r.request().method(),r.request().postData());try{console.log((await r.text()).slice(0,12000))}catch{}}});
 page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
 await page.goto('https://stg3.shop.samsung.com/getcookie.html');
 await page.goto('https://stg2.shop.samsung.com/es/p/RB38C600CS9/EF',{waitUntil:'domcontentloaded'});
 try{await page.getByText(/añadir|comprar|agotado|disponible/i).first().waitFor({timeout:60000})}catch{}
 await page.waitForTimeout(15000); console.log('BODY',(await page.locator('body').innerText()).slice(0,24000));
 console.log('BUTTONS',await page.getByRole('button').allTextContents());
 await page.screenshot({path:'.tmp/samsung-cart-check/page.png'});
 await browser.close();
})();

