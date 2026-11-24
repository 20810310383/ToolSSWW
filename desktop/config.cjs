const {randomInt}=require('node:crypto');
function validate(raw){
 const url=(value,label)=>{let u;try{u=new URL(value)}catch{throw Error(label+' không hợp lệ.')}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!u.hostname.endsWith('.samsung.com'))throw Error(label+' phải là HTTPS Samsung, không chứa tài khoản/query/hash.');return u.href.replace(/\/$/,'')};
 const mode=raw.mode||'checkout'; const suppliedRoot=url(raw.root,'ROOT'),api=url(raw.api,'API'); const root=mode==='cart'?new URL(suppliedRoot).origin:suppliedRoot; const cartUrl=mode==='cart'?suppliedRoot:null;
 if(!/^stg\d*\.shop\.samsung\.com$/.test(new URL(root).hostname)||new URL(root).pathname!=='/')throw Error('ROOT phải là staging, ví dụ https://stg2.shop.samsung.com');
 if(!(mode==='cart'?/\/tokocommercewebservices\/v2\/[a-zA-Z0-9_-]+$/.test(new URL(api).pathname):new URL(api).pathname.endsWith('/tokocommercewebservices/v2/es')))throw Error('API phải kết thúc bằng /tokocommercewebservices/v2/es');
 if(!['cart','checkout','loop','orders'].includes(mode))throw Error('Chế độ không hợp lệ.');
 if(mode==='cart'&&!/^\/[^/]+\/cart$/.test(new URL(cartUrl).pathname))throw Error('ROOT cần là URL cart đầy đủ, ví dụ https://stg2.shop.samsung.com/es/cart');
 const browserMode=raw.browserMode||'embedded';if(!['embedded','external'].includes(browserMode))throw Error('Lựa chọn trình duyệt không hợp lệ.');
 const cartItems=[];
 if(mode==='cart'&&Array.isArray(raw.items)){for(const item of raw.items){const code=String(item.code||'').trim(),quantity=Number(item.quantity);if(!code||/[\s,;]/.test(code)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)throw Error('Mỗi SKU cần quantity nguyên từ 1 đến 1000.');const existing=cartItems.find(p=>p.code===code);if(existing){existing.quantity+=quantity;if(existing.quantity>1000)throw Error('Tổng quantity cho SKU trùng vượt 1000.');}else cartItems.push({code,quantity});}}
 const products=[...new Set(String(cartItems.length?cartItems.map(p=>p.code).join(','):raw.skus||'').split(/[,;\s]+/).filter(Boolean))];if(!products.length&&mode!=='orders')throw Error('Nhập ít nhất một SKU.');
 const integer=(v,label,max=1000)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error(label+' phải từ 1 đến '+max);return n};
 const min=integer(raw.min||1,'Quantity nhỏ nhất'),max=integer(raw.max||1,'Quantity lớn nhất');if(max<min)throw Error('Quantity max phải ≥ min');
 const quantityMode=raw.quantityMode||'fixed';if(!['fixed','ascending','alternate','random'].includes(quantityMode))throw Error('Cách đổi quantity không hợp lệ');
 let card=null;const fillCard=mode!=='orders'&&mode!=='cart'&&raw.fillCard!==false;
 if(fillCard){const input=raw.card||{number:'4111111145551142',holder:'Classic',expiry:'0330',cvc:'737'};
  const number=String(input.number||'').replace(/[ -]/g,''),holder=String(input.holder||'').trim(),expiry=String(input.expiry||'').replace(/[ /-]/g,''),cvc=String(input.cvc||'').trim();
  if(!/^\d{13,19}$/.test(number))throw Error('Số thẻ test phải có 13–19 chữ số.');
  if(!holder||holder.length>100)throw Error('Nhập tên chủ thẻ test.');
  if(!/^\d{4}$/.test(expiry)||Number(expiry.slice(0,2))<1||Number(expiry.slice(0,2))>12)throw Error('Hạn thẻ phải ở dạng MM/YY.');
  if(!/^\d{3,4}$/.test(cvc))throw Error('CVV/CVC phải có 3 hoặc 4 chữ số.');
  card={number,holder,expiry,cvc};
 }
 return {root,cartUrl,api,mode,browserMode,products,cartItems,min,max,quantityMode,rounds:mode==='loop'?integer(raw.rounds||1,'Số lượt'):1,fillCard,card};
}
function plan(config){if(config.mode==='cart'&&config.cartItems?.length)return [config.cartItems];const width=config.max-config.min+1;return Array.from({length:config.rounds},(_,round)=>{let n=round;return config.products.map((code,i)=>{let quantity=config.min;if(config.quantityMode==='ascending'){quantity+=n%width;n=Math.floor(n/width)}if(config.quantityMode==='alternate')quantity+=(round+i)%width;if(config.quantityMode==='random')quantity=randomInt(config.min,config.max+1);return{code,quantity}})});}
module.exports={validate,plan};
