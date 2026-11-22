const fs=require('node:fs');
let s=fs.readFileSync('.tmp/samsung-cart-check/visible-checkout.cjs','utf8');
s=s.replace("const SKU = 'RB33J3515S9/EF';", "const SKU = 'RB33J3515S9/EF';\nif(process.argv.includes('--help')){console.log('node console-order.cjs [--no-card]\\nMo Chrome, dung gio hien tai (gio trong thi them RB33J3515S9/EF), den buoc 3. Dang nhap trong Chrome neu duoc hoi. --no-card: khong dien the test.');process.exit(0);}");
s=s.replace("'visible-checkout-network.json'", "'console-order-network.json'");
s=s.replace("    if (cart.entries?.some(e=>e.product?.code!==SKU)) throw new Error('Gio dang co SKU khac. Hay xoa SKU khac va chay lai.');\n    if (!cart.entries?.some(e=>e.product?.code===SKU)) {", "    if (!cart.entries?.length) {");
const start=s.indexOf("    step('5. Chon giao hang mien phi');");
const end=s.indexOf("    step('SAN SANG:",start);
if(start<0||end<0)throw Error('Missing replacement markers');
s=s.slice(0,start)+`    step('5. Chon giao hang mien phi');
    const optionsResponse = await page.waitForResponse(r=>r.url().includes('/carts/current/deliverymodes?') && r.status()===200).catch(()=>null);
    const delivery = optionsResponse ? await optionsResponse.json() : await api('/users/current/carts/current/deliverymodes?postCode=08006');
    const groups = delivery.deliveryGroups || [];
    if (!groups.length) throw new Error('Khong co phuong thuc giao hang.');
    for (let i=0;i<groups.length;i++) {
      const mode = groups[i].deliveryModes?.find(m=>m.active && !m.grayedOut && !m.hideOnWebsite && !m.clickAndCollect && !m.shipToStore && m.deliveryCost?.value===0);
      if (!mode) throw new Error('Nhom '+i+' khong co giao tan nha mien phi.');
      await page.locator('label[for="group'+i+mode.code+'"]').click();
    }
    await page.getByRole('button',{name:/Continuar con los m/i}).click();
    await page.waitForURL(/step=CHECKOUT_STEP_PAYMENT/);
    step('6. Mo Credit Card');
    await page.getByText('Tarjeta Bancaria',{exact:true}).waitFor();
    if (!process.argv.includes('--no-card')) {
      await page.waitForTimeout(5000);
      const holder = page.locator('#input-holder-name');
      for(let attempt=0;attempt<8;attempt++) {
        if(await holder.isVisible()) break;
        const newCard=page.getByText('Nuevo método de pago',{exact:true});
        if(await newCard.isVisible()) {
          await newCard.click();
        } else if (!(await page.getByRole('button',{name:'Realizar pedido',exact:true}).isVisible())) {
          await page.getByText('Tarjeta Bancaria',{exact:true}).click();
        }
        await page.waitForTimeout(2000);
      }
      await holder.fill('Classic');
      const field = selector => page.frameLocator('iframe').locator(selector);
      // Adyen co nhieu iframe: tim frame chua tung input, khong phu thuoc ngon ngu title.
      async function fillSecure(id,value) {
        const deadline=Date.now()+45000;
        while(Date.now()<deadline) {
          for(const frame of page.frames()) {
            if(!frame.url().startsWith('https://checkoutshopper-test.adyen.com/')) continue;
            try { const input=frame.locator('#'+id); if(await input.isVisible()){await input.fill(value);return;} } catch(error) {if(!/detach|closed/i.test(error.message))throw error;}
          }
          await page.waitForTimeout(300);
        }
        throw new Error('Khong tim thay iframe Adyen TEST: '+id);
      }
      await fillSecure('encryptedCardNumber','4111111145551142');
      await fillSecure('encryptedExpiryDate','0330');
      await fillSecure('encryptedSecurityCode','737');
      await holder.focus();
    }
`+s.slice(end);
s=s.replace("console.log('Khong tu luu the", "console.log('Khong tu luu the");
s=s.replace("const optionsResponse = await page.waitForResponse(r=>r.url().includes('/carts/current/deliverymodes?') && r.status()===200).catch(()=>null);\n    const delivery = optionsResponse ? await optionsResponse.json() : await api('/users/current/carts/current/deliverymodes?postCode=08006');", "const delivery = await api('/users/current/carts/current/deliverymodes?postCode=08006');");
s=s.replace("      const field = selector => page.frameLocator('iframe').locator(selector);\n",'');
s=s.replace("step('SAN SANG: da dien the test ...1142. Ban tu kiem tra tong tien, tich dieu khoan va bam Realizar pedido.');", "step(process.argv.includes('--no-card') ? 'SAN SANG BUOC 3: ban tu chon the va xac nhan.' : 'SAN SANG: da dien the test ...1142. Ban tu kiem tra tong tien, tich dieu khoan va bam Realizar pedido.');");
fs.writeFileSync('.tmp/samsung-cart-check/console-order.cjs',s);
