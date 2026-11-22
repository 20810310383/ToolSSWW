const ui = require('./terminal-ui.cjs');
const { installDashboard } = require('./order-dashboard.cjs');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const ROOT = 'https://stg2.shop.samsung.com';
const API = 'https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
if (process.argv.includes('--help')) { console.log('node console-order.cjs [--no-card]\nMenu terminal: 1 SKU, nhieu SKU, hoac dung gio hien tai. Nhap SKU va tong so luong muon co trong gio; khong co SKU hardcode. Script them phan con thieu, khong tu xoa san pham. --no-card: khong dien the test.'); process.exit(0); }

async function askProducts() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    ui.title('CHECKOUT → BƯỚC 3'); ui.menu([['1', 'Order một SKU'], ['2', 'Order nhiều SKU'], ['3', 'Order giỏ hiện tại']]);
    let mode;
    while (!['1', '2', '3'].includes(mode)) mode = (await rl.question(ui.question('Chọn 1/2/3 [1]:'))).trim() || '1';
    if (mode === '3') return null;
    let codes = [];
    while (!codes.length) {
      const raw = (await rl.question(ui.question(mode === '1' ? 'Nhập SKU:' : 'Nhập các SKU, cách nhau bằng dấu phẩy:'))).trim();
      codes = [...new Set(raw.split(/[,;\s]+/).filter(Boolean))];
      if (mode === '1' && codes.length > 1) { ui.warn('Chế độ 1 chỉ nhập một SKU.'); codes = []; }
    }
    const products = [];
    for (const code of codes) {
      let quantity;
      while (quantity === undefined) {
        const raw = (await rl.question(ui.question('Tổng số lượng ' + code + ' trong giỏ [1]:'))).trim() || '1';
        const number = Number(raw);
        if (/^\d+$/.test(raw) && Number.isSafeInteger(number) && number > 0) quantity = number;
        else ui.warn('Nhập số nguyên dương.');
      }
      products.push({ code, quantity });
    }
    ui.section('Danh sách order'); for (const product of products) ui.product(product.code, product.quantity);
    return products;
  } finally { rl.close(); }
}

(async () => {
  const products = await askProducts();
  const context = await chromium.launchPersistentContext(path.join(__dirname, 'checkout-profile'), {
    channel: 'chrome', headless: false, slowMo: 180, viewport: null
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(45000);
  const network = [];
  page.on('response', response => {
    if (!response.url().startsWith(API)) return;
    network.push({ time: new Date().toISOString(), method: response.request().method(), status: response.status(), url: response.url() });
    fs.writeFileSync(path.join(__dirname, 'console-order-network.json'), JSON.stringify(network, null, 2));
  });
  const step = text => /^SAN SANG/.test(text) ? ui.success(text) : ui.step(text);
  async function api(endpoint, method = 'GET', body) {
    return page.evaluate(async ({ url, method, body }) => {
      const response = await fetch(url, {
        method, credentials: 'include', cache: 'no-store',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok || data?.errors?.length) throw new Error('HTTP ' + response.status + ': ' + JSON.stringify(data?.errors));
      return data;
    }, { url: API + endpoint + (endpoint.includes('?') ? '&' : '?') + 'lang=es&curr=EUR', method, body });
  }
  const dashboardRecords=[];
  let checkingConfirmation=false;
  await installDashboard(context,async()=>{
    const record=dashboardRecords[0];const url=new URL(page.url());
    if(record && url.origin===ROOT && url.pathname.startsWith('/es/orderConfirmation') && record.status!=='confirmed_cart_empty' && !checkingConfirmation){
      const code=url.searchParams.get('orderCode') || /orderCode=([^;?&#/]+)/.exec(url.pathname)?.[1];
      if(code){checkingConfirmation=true;record.orderCode=decodeURIComponent(code);record.status='confirmation_seen';
        try{const cart=await api('/users/current/carts/current?fields=FULL');if(Array.isArray(cart?.entries)&&!cart.entries.length)record.status='confirmed_cart_empty';}catch{}finally{checkingConfirmation=false;}
      }
    }
    return {total:1,records:dashboardRecords};
  });
  try {
    step('1. Mo trang lay cookie');
    await page.goto('https://stg3.shop.samsung.com/getcookie.html', { waitUntil: 'domcontentloaded' });
    step('2. Mo cart va kiem tra SKU');
    await page.goto(ROOT + '/es/cart', { waitUntil: 'domcontentloaded' });
    await page.locator('app-root').waitFor();
    const reject = page.getByRole('button', { name: 'Rechazar Opcionales', exact: true });
    if (await reject.isVisible()) await reject.click();
    let cart = await api('/users/current/carts/current?fields=FULL');
    if (products) {
      const extras = (cart.entries || []).filter(e => !products.some(p => p.code === e.product?.code));
      if (extras.length) throw new Error('Gio con SKU ngoai danh sach: ' + extras.map(e => e.product?.code).join(', ') + '. Xoa chung hoac chon menu 3 de order gio hien tai.');
      if (!cart.code && !cart.guid) await api('/users/current/carts', 'POST', {});
      const count = (data, code) => (data.entries || []).filter(e => e.product?.code === code).reduce((total, e) => total + Number(e.quantity || 0), 0);
      // Kiem tra toan bo truoc khi them de tranh thay doi mot phan do so luong da vuot.
      for (const product of products) {
        if (count(cart, product.code) > product.quantity) throw new Error(product.code + ' trong gio nhieu hon so luong yeu cau. Hay giam so luong trong cart roi chay lai.');
      }
      for (const product of products) {
        const quantity = product.quantity - count(cart, product.code);
        if (!quantity) continue;
        const added = await api('/users/current/carts/current/entries', 'POST', { quantity, product: { code: product.code } });
        if (added.statusCode !== 'success' || added.quantityAdded !== quantity) throw new Error('Them ' + product.code + ' khong du so luong: ' + JSON.stringify(added));
      }
      cart = await api('/users/current/carts/current?fields=FULL');
      for (const product of products) {
        if (count(cart, product.code) !== product.quantity) throw new Error('Chua xac nhan dung so luong ' + product.code + ' trong gio. Kiem tra cart truoc khi chay lai.');
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    if (!cart.entries?.length) throw new Error('Gio dang trong. Chay lai va nhap SKU o menu 1 hoac 2.');
    dashboardRecords.push({round:1,status:'running',items:(cart.entries||[]).map(e=>({code:e.product?.code,quantity:e.quantity}))});
    step('3. Bam Tramitar pedido');
    await page.getByRole('button', { name: /Tramitar pedido/i }).first().click();
    await page.waitForURL(/\/es\/(guestlogin\/checkout|checkout\/one)/);
    if (page.url().includes('/guestlogin/checkout')) {
      step('Dang nhap Samsung trong cua so Chrome. Script cho toi 10 phut, tu tiep tuc sau dang nhap.');
      await page.getByText(/Iniciar sesi/i, { exact: false }).first().click();
      await page.waitForURL(url => url.origin === ROOT && url.pathname.includes('/checkout/one'), { timeout: 600000 });
    }
    step('4. Dien thong tin lien he va dia chi test');
    // Checkout co the khoi phuc buoc delivery/payment. Cac input cua buoc 1
    // van con trong DOM nhung bi an; khong dung .first() tren toan trang.
    const contactURL = ROOT + '/es/checkout/one?step=CHECKOUT_STEP_CONTACT_INFO';
    const phone = page.locator('form.customer-form-v2:visible input[name=phone]:visible').first();
    if (new URL(page.url()).searchParams.get('step') !== 'CHECKOUT_STEP_CONTACT_INFO' || !(await phone.isVisible())) {
      await page.goto(contactURL, { waitUntil: 'domcontentloaded' });
    }
    await phone.waitFor({ state: 'visible', timeout: 15000 });
    await phone.fill('651234567', { timeout: 15000 });
    const fiscal = page.locator('input[name=fiscalCode]:visible').first();
    await fiscal.fill('00045678T', { timeout: 15000 });
    await page.locator('mat-radio-button:visible').filter({ hasText: /Nueva direcci/ }).first().click();
    const manual = page.getByRole('button', { name: /Introduzca la direcci/i });
    if (await manual.isVisible()) await manual.click();
    for (const [name, value] of Object.entries({ line1: 'Carrer de Muntaner, 460', postalCode: '08006', town: 'Barcelona' })) {
      await page.locator('input[name=' + name + ']:visible').first().fill(value, { timeout: 15000 });
    }
    await page.locator('mat-form-field:visible').filter({ hasText: /Regi.n \/ Provincia/ }).locator('mat-select:visible').first().click();
    await page.getByRole('option', { name: 'Barcelona', exact: true }).click();
    await fiscal.press('Tab');
    await page.getByRole('button', { name: /Continuar con el m/i }).click();
    step('5. Chon giao hang mien phi');
    const delivery = await api('/users/current/carts/current/deliverymodes?postCode=08006');
    const groups = delivery.deliveryGroups || [];
    if (!groups.length) throw new Error('Khong co phuong thuc giao hang.');
    for (let i = 0; i < groups.length; i++) {
      const mode = groups[i].deliveryModes?.find(m => m.active && !m.grayedOut && !m.hideOnWebsite && !m.clickAndCollect && !m.shipToStore && m.deliveryCost?.value === 0);
      if (!mode) throw new Error('Nhom ' + i + ' khong co giao tan nha mien phi.');
      await page.locator('label[for="group' + i + mode.code + '"]').click();
    }
    await page.getByRole('button', { name: /Continuar con los m/i }).click();
    await page.waitForURL(/step=CHECKOUT_STEP_PAYMENT/);
    step('6. Mo Credit Card');
    await page.getByText('Tarjeta Bancaria', { exact: true }).waitFor();
    if (!process.argv.includes('--no-card')) {
      await page.waitForTimeout(5000);
      const holder = page.locator('#input-holder-name');
      for (let attempt = 0; attempt < 8; attempt++) {
        if (await holder.isVisible()) break;
        const newCard = page.getByText('Nuevo método de pago', { exact: true });
        if (await newCard.isVisible()) {
          await newCard.click();
        } else if (!(await page.getByRole('button', { name: 'Realizar pedido', exact: true }).isVisible())) {
          await page.getByText('Tarjeta Bancaria', { exact: true }).click();
        }
        await page.waitForTimeout(2000);
      }
      await holder.fill('Classic');
      // Adyen co nhieu iframe: tim frame chua tung input, khong phu thuoc ngon ngu title.
      async function fillSecure(id, value) {
        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
          for (const frame of page.frames()) {
            if (!frame.url().startsWith('https://checkoutshopper-test.adyen.com/')) continue;
            try { const input = frame.locator('#' + id); if (await input.isVisible()) { await input.fill(value); return; } } catch (error) { if (!/detach|closed/i.test(error.message)) throw error; }
          }
          await page.waitForTimeout(300);
        }
        throw new Error('Khong tim thay iframe Adyen TEST: ' + id);
      }
      await fillSecure('encryptedCardNumber', '4111111145551142');
      await fillSecure('encryptedExpiryDate', '0330');
      await fillSecure('encryptedSecurityCode', '737');
      await holder.focus();
    }
    // Chi cuon, danh dau va focus; khong click/check hay thay doi checked.
    if(dashboardRecords[0])dashboardRecords[0].status='awaiting_manual_order';
    const confirmation = page.locator('#es-adyenCcPaymentModeOptin-input');
    await page.locator('#es-adyenCcPaymentModeOptin-input').click();
    await page.locator('button[data-an-la="payment:pay now:credit card"]').click();
    if (await confirmation.isVisible()) {
      await confirmation.scrollIntoViewIfNeeded();
      await confirmation.evaluate(el => {
        const target = el.closest('mat-checkbox') || el;
        target.style.outline = '3px solid #ffb300';
        target.style.outlineOffset = '6px';
        target.style.borderRadius = '6px';
      });
      await confirmation.focus();
      ui.info('Đã focus ô xác nhận và đánh dấu màu vàng; bạn tự tích khi sẵn sàng.');
    }
    step(process.argv.includes('--no-card') ? 'SAN SANG BUOC 3: ban tu chon the va xac nhan.' : 'SAN SANG: da dien the test ...1142. Ban tu kiem tra tong tien, tich dieu khoan va bam Realizar pedido.');
    ui.info('Đóng Chrome này để kết thúc script.');
  } catch (error) {
    if(dashboardRecords[0]){dashboardRecords[0].status='stopped';dashboardRecords[0].error=error.message;}
    ui.error('DỪNG: ' + error.message);
    ui.info('Giữ Chrome mở để kiểm tra. Đóng Chrome này để kết thúc.');
  }
  if (context.pages().length) await new Promise(resolve => context.once('close', resolve));
})().catch(error => { ui.error(error.message); process.exitCode = 1; });

