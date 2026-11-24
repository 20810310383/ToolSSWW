const count=(cart,code)=>(cart.entries||[]).filter(e=>e.product?.code===code).reduce((n,e)=>n+Number(e.quantity||0),0);
const stockError=error=>/\bnoStock\b|\bInsufficientStockError\b/i.test(String(error?.message||error));
async function prepareCheckoutCart({api,cart,items,log=()=>{},cancelled=()=>false}){
 const base='/users/current/carts/current';
 if((cart.entries||[]).some(e=>!items.some(x=>x.code===e.product?.code)))throw Error('Giỏ có SKU ngoài danh sách; kiểm tra trên trình duyệt.');
 for(const item of items)if(count(cart,item.code)>item.quantity)throw Error(item.code+' đã có quantity vượt kế hoạch.');
 if(!cart.code&&!cart.guid)await api('/users/current/carts','POST',{});
 const skipped=[];
 for(const item of items){
  if(cancelled())throw Error('Đã dừng');
  const quantity=item.quantity-count(cart,item.code);if(!quantity)continue;
  try{
   const response=await api(base+'/entries','POST',{quantity,product:{code:item.code}});
   if(response.statusCode==='noStock'){skipped.push(item.code);log(item.code+' · hết hàng, bỏ qua phần chưa thêm.','warn');continue;}
   if(!['success','lowStock'].includes(response.statusCode))throw Error('Không thêm được '+item.code+': '+(response.statusCode||'API không có trạng thái'));
   log(item.code+' · API phản hồi; đang xác nhận giỏ.','info');
  }catch(error){if(!stockError(error))throw error;skipped.push(item.code);log(item.code+' · hết hàng, bỏ qua phần chưa thêm.','warn');}
 }
 const after=await api(base+'?fields=FULL');
 if((after.entries||[]).some(e=>!items.some(x=>x.code===e.product?.code)))throw Error('Giỏ xuất hiện SKU ngoài kế hoạch.');
 const accepted=[];
 for(const item of items){const quantity=count(after,item.code);if(!Number.isSafeInteger(quantity)||quantity<0||quantity>item.quantity)throw Error('Quantity không hợp lệ trong giỏ: '+item.code);if(!quantity){log(item.code+' · không có trong giỏ, bỏ qua.','warn');continue;}accepted.push({code:item.code,quantity});log(item.code+' · đã xác nhận '+quantity+'/'+item.quantity+' trong giỏ.',quantity===item.quantity?'success':'warn');}
 return {items:accepted,cart:after,skipped};
}
module.exports={prepareCheckoutCart};
