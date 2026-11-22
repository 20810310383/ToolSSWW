const fs=require('fs');const p='samsung-cart-check/desktop/config.cjs';let s=fs.readFileSync(p,'utf8');const marker=" return {root,api,mode,products,min,max,quantityMode,rounds:mode==='loop'?integer(raw.rounds||1,'Số lượt'):1,fillCard:raw.fillCard!==false};";if(!s.includes(marker))throw Error('config marker');s=s.replace(marker,` let card=null;const fillCard=mode!=='orders'&&raw.fillCard!==false;
 if(fillCard){const input=raw.card||{number:'4111111145551142',holder:'Classic',expiry:'0330',cvc:'737'};
  const number=String(input.number||'').replace(/[ -]/g,''),holder=String(input.holder||'').trim(),expiry=String(input.expiry||'').replace(/[ /-]/g,''),cvc=String(input.cvc||'').trim();
  if(!/^\\d{13,19}$/.test(number))throw Error('Số thẻ test phải có 13–19 chữ số.');
  if(!holder||holder.length>100)throw Error('Nhập tên chủ thẻ test.');
  if(!/^\\d{4}$/.test(expiry)||Number(expiry.slice(0,2))<1||Number(expiry.slice(0,2))>12)throw Error('Hạn thẻ phải ở dạng MM/YY.');
  if(!/^\\d{3,4}$/.test(cvc))throw Error('CVV/CVC phải có 3 hoặc 4 chữ số.');
  card={number,holder,expiry,cvc};
 }
 return {root,api,mode,products,min,max,quantityMode,rounds:mode==='loop'?integer(raw.rounds||1,'Số lượt'):1,fillCard,card};`);fs.writeFileSync(p,s);
const r='samsung-cart-check/desktop/runner.cjs';s=fs.readFileSync(r,'utf8');s=s.replace("const {plan}=require('./config.cjs');","const {plan}=require('./config.cjs');\nconst {ordersPopup}=require('../orders-popup.cjs');");s=s.replace("this.active=false;}\n log", "this.active=false;this.opening=null;this.environment=null;this.historyPage=null;}\n log");s=s.replace(" async stop(){this.cancelled=true;if(this.context)await this.context.close().catch(()=>{});}",` async browser(config){
  if(this.opening)await this.opening;
  if(this.context){if(this.environment.root!==config.root||this.environment.api!==config.api)throw Error('Phiên Chrome hiện tại dùng ROOT/API khác. Dừng phiên rồi đổi môi trường.');return this.context;}
  this.opening=chromium.launchPersistentContext(this.profile,{channel:'chrome',headless:false,viewport:null,slowMo:100}).then(c=>{this.context=c;this.environment={root:config.root,api:config.api};c.once('close',()=>{if(this.context===c){this.context=null;this.historyPage=null;this.environment=null;}this.emit({type:'browserClosed'});});return c;});
  try{return await this.opening;}finally{this.opening=null;}
 }
 async openHistory(config){
  const c=await this.browser(config);
  if(this.historyPage&&!this.historyPage.isClosed()){await this.historyPage.bringToFront();return;}
  const p=this.historyPage=await c.newPage();
  await p.addInitScript(ordersPopup,{root:config.root,api:config.api});
  await p.goto('https://stg3.shop.samsung.com/getcookie.html',{waitUntil:'domcontentloaded'});
  await p.goto(config.root+'/es/mypage/orders',{waitUntil:'domcontentloaded'});
  await p.bringToFront();this.log('Tab lịch sử đã mở. Bấm nút Lịch sử đơn góc phải dưới để xem, tìm kiếm và mở chi tiết.','success');
 }
 async stop(){this.cancelled=true;if(this.opening)await this.opening.catch(()=>{});if(this.context)await this.context.close().catch(()=>{});}`);
s=s.replace("const c=this.context=await chromium.launchPersistentContext(this.profile,{channel:'chrome',headless:false,viewport:null,slowMo:100});const p=c.pages()[0]||await c.newPage();", "const c=await this.browser(config);const p=await c.newPage();");
s=s.replace("await holder.fill('Classic');for(const [id,value]of [['encryptedCardNumber','4111111145551142'],['encryptedExpiryDate','0330'],['encryptedSecurityCode','737']])", "await holder.fill(config.card.holder);for(const [id,value]of [['encryptedCardNumber',config.card.number],['encryptedExpiryDate',config.card.expiry],['encryptedSecurityCode',config.card.cvc]])");
s=s.replace("finally{if(this.context)await this.context.close().catch(()=>{});this.context=null;this.active=false;this.emit({type:'idle'});}","finally{this.active=false;this.emit({type:'idle'});}");fs.writeFileSync(r,s);
