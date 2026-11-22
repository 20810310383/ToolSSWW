const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = 'https://stg2.shop.samsung.com';
const API = 'https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
const SKU = 'RB33J3515S9/EF';

(async () => {
  const context = await chromium.launchPersistentContext(path.join(__dirname, 'checkout-profile'), {
    channel: 'chrome', headless: false, slowMo: 180, viewport: null
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(45000);
  const network = [];
  page.on('response', response => {
    if (!response.url().startsWith(API)) return;
    network.push({ time: new Date().toISOString(), method: response.request().method(), status: response.status(), url: response.url() });
    fs.writeFileSync(path.join(__dirname, 'visible-checkout-network.json'), JSON.stringify(network, null, 2));
  });
  const step = text => console.log('\n[CHECKOUT] ' + text);
  async function api(endpoint, method = 'GET', body) {
    return page.evaluate(async ({url, method, body}) => {
      const response = await fetch(url, {
        method, credentials: 'include', cache: 'no-store',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : {'Content-Type':'application/json'}) },
        ...(body === undefined ? {} : {body:JSON.stringify(body)})
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok || data?.errors?.length) throw new Error('HTTP ' + response.status + ': ' + JSON.stringify(data?.errors));
      return data;
    }, { url: API + endpoint + (endpoint.includes('?') ? '&' : '?') + 'lang=es&curr=EUR', method, body });
  }
  try {
    step('1. Mo trang lay cookie');
    await page.goto('https://stg3.shop.samsung.com/getcookie.html', {waitUntil:'domcontentloaded'});
    step('2. Mo cart va kiem tra SKU');
    await page.goto(ROOT + '/es/cart', {waitUntil:'domcontentloaded'});
    await page.locator('app-root').waitFor();
    const reject = page.getByRole('button', {name:'Rechazar Opcionales',exact:true});
    if (await reject.isVisible()) await reject.click();
    let cart = await api('/users/current/carts/current?fields=FULL');
    if (cart.entries?.some(e=>e.product?.code!==SKU)) throw new Error('Gio dang co SKU khac. Hay xoa SKU khac va chay lai.');
    if (!cart.entries?.some(e=>e.product?.code===SKU)) {
      if (!cart.code && !cart.guid) await api('/users/current/carts','POST',{});
      const added = await api('/users/current/carts/current/entries','POST',{quantity:1,product:{code:SKU}});
      if (added.statusCode!=='success') throw new Error('Them SKU that bai: '+JSON.stringify(added));
      await page.reload({waitUntil:'domcontentloaded'});
    }
    step('3. Bam Tramitar pedido');
    await page.getByRole('button',{name:/Tramitar pedido/i}).first().click();
    await page.waitForURL(/\/es\/(guestlogin\/checkout|checkout\/one)/);
    if (page.url().includes('/guestlogin/checkout')) {
      step('Dang nhap Samsung trong cua so Chrome. Script cho toi 10 phut, tu tiep tuc sau dang nhap.');
      await page.getByText(/Iniciar sesi/i,{exact:false}).first().click();
      await page.waitForURL(url=>url.origin===ROOT && url.pathname.includes('/checkout/one'),{timeout:600000});
    }
    step('4. Dien thong tin lien he va dia chi test');
    await page.locator('input[name=phone]').first().fill('651234567');
    await page.locator('input[name=fiscalCode]').fill('00045678T');
    await page.locator('mat-radio-button').filter({hasText:/Nueva direcci/}).first().click();
    const manual = page.getByRole('button',{name:/Introduzca la direcci/i});
    if (await manual.isVisible()) await manual.click();
    for (const [name,value] of Object.entries({line1:'Carrer de Muntaner, 460',postalCode:'08006',town:'Barcelona'})) {
      await page.locator('input[name='+name+']').first().fill(value);
    }
    await page.locator('mat-form-field').filter({hasText:/Regi.n \/ Provincia/}).locator('mat-select').first().click();
    await page.getByRole('option',{name:'Barcelona',exact:true}).click();
    await page.locator('input[name=fiscalCode]').press('Tab');
    await page.getByRole('button',{name:/Continuar con el m/i}).click();
    step('5. Chon giao hang mien phi');
    await page.locator('label[for=group0sesa-home-big-appliance-installation-tamdis]').click();
    await page.getByRole('button',{name:/Continuar con los m/i}).click();
    await page.waitForURL(/step=CHECKOUT_STEP_PAYMENT/);
    step('6. Mo Credit Card'); await page.waitForTimeout(7000);
    await page.getByText('Tarjeta Bancaria',{exact:true}).waitFor();
    // Cho API thanh toan hoan thanh truoc khi kiem tra panel tu mo.
    await page.waitForFunction(()=>!!document.querySelector('app-payment-modes-v2') || document.body.innerText.includes('Tarjeta Bancaria'));
    if (!(await page.getByRole('button',{name:'Realizar pedido',exact:true}).isVisible())) {
      await page.getByText('Tarjeta Bancaria',{exact:true}).click();
    }
    const newCard = page.getByText('Nuevo método de pago',{exact:true});
    await page.getByRole('button',{name:'Realizar pedido',exact:true}).waitFor(); await Promise.race([newCard.waitFor({state:'visible'}),page.locator('#input-holder-name').waitFor({state:'visible'})]); if (await newCard.isVisible()) await newCard.click();
    await page.locator('#input-holder-name').fill('Classic');
    const cardNumber = page.frameLocator('iframe[title="Utilice Iframe para el número de tarjeta"]').locator('#encryptedCardNumber');
    await cardNumber.fill('4111111145551142');
    await page.frameLocator('iframe[title="Utilice iframe para la fecha de caducidad"]').locator('#encryptedExpiryDate').fill('0330');
    await page.frameLocator('iframe[title="Utilice iframe para el código de seguridad #1"]').locator('#encryptedSecurityCode').fill('737');
    await page.locator('#input-holder-name').focus();
    step('SAN SANG: da dien the test ...1142. Ban tu kiem tra tong tien, tich dieu khoan va bam Realizar pedido.');
    console.log('Khong tu luu the, khong tu tich dieu khoan, khong tu tao don. Dong Chrome nay de ket thuc script.');
  } catch (error) {
    console.error('\nDUNG: '+error.message);
    console.log('Giu Chrome mo de ban kiem tra. Dong Chrome nay de ket thuc.');
  }
  if (context.pages().length) await new Promise(resolve=>context.once('close',resolve));
})().catch(error=>{console.error(error.message);process.exitCode=1;});

