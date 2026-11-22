const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:false});try{const c=await b.newContext();const p=await c.newPage();let sample;let variants=[];
p.on('request',q=>{if(q.url().includes('/users/current/carts/current?'))sample=q;});
p.on('response',async r=>{if(r.url().includes('/products/SM-S921BLGDEUB?')&&r.url().includes('baseOptions')){try{const j=await r.json();variants=j.baseOptions?.flatMap(x=>x.options||[]).map(x=>x.code)||[];console.log('VARIANTS',JSON.stringify(variants));}catch{}}});
await p.goto('https://stg3.shop.samsung.com/getcookie.html',{waitUntil:'domcontentloaded'});await p.goto('https://stg2.shop.samsung.com/es/p/SM-S921BLGDEUB',{waitUntil:'domcontentloaded'});await p.waitForTimeout(18000);
if(!sample)throw Error('No cart session request captured');const headers=await sample.allHeaders();for(const k of Object.keys(headers)){if(k.startsWith(':'))delete headers[k];}delete headers.host;delete headers['content-length'];headers['content-type']='application/json';
const root='https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
if(!variants.some(x=>x!=='SM-S921BLGDEUB')){const r=await c.request.get(root+'/products/SM-S921BLGDEUB?fields=FULL&lang=es&curr=EUR',{headers});const j=await r.json();variants=(j.baseOptions||[]).flatMap(x=>x.options||[]).map(x=>x.code);console.log('VARIANTS_FULL',JSON.stringify(variants)); fs.writeFileSync('.tmp/samsung-cart-check/product-full.json',JSON.stringify(j,null,2));}
const second='SM-S921BLBDEUB';if(!second)throw Error('No second verified SKU');const results=[];
for(const code of ['SM-S921BLGDEUB',second]){const r=await c.request.post(root+'/users/current/carts/current/entries?lang=es&curr=EUR',{headers,data:{quantity:1,product:{code}}});const body=await r.json();results.push({code,http:r.status(),body});console.log('ADD',JSON.stringify({code,http:r.status(),statusCode:body.statusCode,quantityAdded:body.quantityAdded,errors:body.errors}));}
headers['cache-control']='no-cache'; const r=await c.request.get(sample.url()+'&_='+Date.now(),{headers});const cart=await r.json();const summary={http:r.status(),totalItems:cart.totalItems,entries:cart.entries?.map(e=>({code:e.product?.code,quantity:e.quantity,entryNumber:e.entryNumber})),errors:cart.errors};console.log('CART',JSON.stringify(summary));fs.writeFileSync('.tmp/samsung-cart-check/two-products.json',JSON.stringify({results,cart:summary},null,2));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});



