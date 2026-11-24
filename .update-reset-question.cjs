const fs=require('fs');let s=fs.readFileSync('desktop/index.html','utf8');s=s.replace('</body>',`<dialog id="cart-readd-dialog" aria-labelledby="cart-readd-title"><h2 id="cart-readd-title">Thêm lại SKU vào giỏ?</h2><p>Đã xoá cookie cũ, lấy lại cookie và mở URL cart.</p><p>Thêm các SKU đang nhập với quantity chung vào phiên giỏ hiện tại?</p><pre id="cart-readd-items"></pre><p>Quantity sẽ cộng thêm vào giỏ hiện tại.</p><div class="buttons"><button type="button" id="cart-readd-no">Không, chỉ mở cart</button><button type="button" id="cart-readd-yes" class="primary">Có, thêm lại SKU</button></div></dialog></body>`);fs.writeFileSync('desktop/index.html',s);
s=fs.readFileSync('desktop/renderer.js','utf8');const at=s.indexOf("$('#cart-reset').onclick=");if(at<0)throw Error('Missing reset handler');s=s.slice(0,at)+`function askReaddCart(){
 const dialog=$('#cart-readd-dialog');
 $('#cart-readd-items').textContent=cartCodes().map(code=>code+' × '+$('#cart-common-quantity').value).join('\\n')||'Chưa nhập SKU. Chọn Có để quay lại nhập SKU.';
 return new Promise(resolve=>{let answer=false;$('#cart-readd-no').onclick=()=>dialog.close();$('#cart-readd-yes').onclick=()=>{answer=true;dialog.close();};dialog.onclose=()=>resolve(answer);dialog.showModal();});
}
$('#cart-reset').onclick=async()=>{
 if(running)return;
 running=true;updateControls();let readd=false;
 try{
  await window.toolkit.resetCookies({root:$('#cart-root').value.trim(),api:$('#cart-api').value.trim()});
  $('#cart-result').textContent='Đã xoá cookie, lấy lại cookie và mở URL cart. Chưa thêm lại SKU.';
  readd=await askReaddCart();
  if(!readd)log('Bạn chọn không thêm lại SKU. Giữ nguyên trang cart.');
 }catch(e){log(e.message,'error');}
 finally{running=false;updateControls();}
 if(readd)$('#cart-form').requestSubmit();
};
`;fs.writeFileSync('desktop/renderer.js',s);
fs.appendFileSync('desktop/style.css',`\n#cart-readd-dialog{color:#e7efff;background:#121e32;border:1px solid #334b70;border-radius:18px;max-width:560px;padding:28px;box-shadow:0 24px 90px #0009}#cart-readd-dialog::backdrop{background:#030917b8}#cart-readd-dialog p{line-height:1.6;color:#b9c8df}#cart-readd-items{white-space:pre-wrap;background:#091222;padding:16px;border-radius:10px;max-height:220px;overflow:auto;color:#70e6c5}\n`);
fs.appendFileSync('README.md',`\nSau khi **Xoá cookie & lấy lại** hoàn tất, desktop hỏi **Thêm lại SKU vào giỏ?**. Chọn **Có** để thêm danh sách SKU và quantity chung đang nhập; chọn **Không** (hoặc Esc) để chỉ giữ trang cart, không gọi API thêm hàng. Nếu reset lỗi sẽ không hỏi và không thêm SKU. Quantity cộng thêm vào giỏ của phiên mới, không khôi phục toàn bộ giỏ cũ.\n`);
