(async () => {
  if (location.origin !== 'https://stg2.shop.samsung.com') {
    throw new Error('Mo https://stg2.shop.samsung.com/es/cart roi chay code.');
  }
  if (window.__samsungCheckoutRunning) return console.warn('Code dang chay.');
  window.__samsungCheckoutRunning = true;
  const API = 'https://s2-smn-api-cdn.ecom-stg.samsung.com/tokocommercewebservices/v2/es';
  const CART = '/users/current/carts/current';
  const SKU = 'RB33J3515S9/EF';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function api(path, method = 'GET', body) {
    const r = await fetch(API + path + (path.includes('?') ? '&' : '?') + 'lang=es&curr=EUR', {
      method, credentials: 'include', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const text = await r.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { throw new Error('API khong tra JSON: ' + r.status + ' ' + path); }
    console.log('[Samsung]', method, r.status, path);
    if (!r.ok || data?.errors?.length) throw new Error(JSON.stringify({ status: r.status, path, errors: data?.errors }));
    return data;
  }
  async function ensureProduct() {
    let cart = await api(CART + '?fields=FULL');
    if (!cart?.code && !cart?.guid) {
      await api('/users/current/carts', 'POST', {});
      cart = await api(CART + '?fields=FULL');
    }
    if (cart.entries?.some(e => e.product?.code !== SKU)) {
      throw new Error('Gio con SKU khac. Xoa san pham khac trong cart roi chay lai; code khong tu xoa.');
    }
    if (!cart.entries?.some(e => e.product?.code === SKU)) {
      const result = await api(CART + '/entries', 'POST', { quantity: 1, product: { code: SKU } });
      if (result?.statusCode !== 'success' || result.quantityAdded !== 1) throw new Error('Them san pham that bai: ' + JSON.stringify(result));
    }
  }
  try {
    await ensureProduct();
    let user = await api('/users/current');
    if (!user?.uid || user.uid === 'anonymous') {
      const login = window.open('/es/guestlogin/checkout', 'SamsungTestLogin', 'width=1100,height=850');
      if (!login) throw new Error('Popup bi chan. Dang nhap Samsung trong tab khac roi chay lai code nay.');
      console.warn('Trong cua so moi: bam Iniciar sesion va dang nhap Samsung. Code se tu tiep tuc.');
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await sleep(3000);
        user = await api('/users/current');
        if (user?.uid && user.uid !== 'anonymous') break;
      }
      if (!user?.uid || user.uid === 'anonymous') throw new Error('Chua dang nhap. Dang nhap xong va chay lai code.');
      await ensureProduct();
    }
    const contact = {
  "shippingAddress": {
    "id": "",
    "postalCode": "08006",
    "townCode": "",
    "ward": "",
    "isValid": true,
    "isUserWantTaxInvoice": false,
    "line1": "Carrer de Muntaner, 460",
    "line2": "",
    "town": "Barcelona",
    "regionIso": "ES-B",
    "editAddressHeader": "",
    "searchAddress": "",
    "saveInAddressBook": "",
    "isManualAddress": true,
    "region": {
      "isocode": "ES-B",
      "countryIso": "ES"
    },
    "country": {
      "isocode": "ES"
    },
    "phoneNumber2": ""
  },
  "billingAddress": {
    "action": "   ",
    "sameAsShipping": true,
    "editAddressHeader": false,
    "country": {
      "isocode": "ES"
    },
    "firstName": "samsung",
    "lastName": "test",
    "phonePrefix": "+34",
    "phone": "651234567",
    "searchAddress": null,
    "line1": "Carrer de Muntaner, 460",
    "line2": null,
    "postalCode": "08006",
    "town": "Barcelona",
    "regionIso": "ES-B",
    "saveInAddressBook": false,
    "isValid": true,
    "email": "tudotest321@gmail.com",
    "isUserWantTaxInvoice": false,
    "isManualAddress": true,
    "region": {
      "isocode": "ES-B",
      "countryIso": "ES"
    },
    "telephone": {
      "input": "651234567",
      "prefix": "+34",
      "value": "651234567"
    },
    "mobileNumber": {
      "countryIso": "ES",
      "input": "651234567",
      "prefix": "+34",
      "value": "651234567"
    },
    "identificationType": "NIF_NIE",
    "fiscalCode": "00045678T"
  },
  "checkoutOptions": {
    "generalTncPrivacyPolicy": false,
    "isValid": true
  },
  "customer": {
    "email": "tudotest321@gmail.com",
    "firstName": "samsung",
    "lastName": "test",
    "phonePrefix": "+34",
    "phone": "651234567",
    "dayOfBirth": "",
    "monthOfBirth": "",
    "yearOfBirth": "",
    "dobNoteNote": "",
    "isValid": true,
    "postalCode": "08006",
    "isUserWantTaxInvoice": false,
    "line1": "Carrer de Muntaner, 460",
    "town": "Barcelona",
    "regionIso": "ES-B",
    "isManualAddress": true,
    "telephone": {
      "countryIso": "ES",
      "input": "651234567",
      "prefix": "+34",
      "value": "651234567"
    },
    "mobileNumber": {
      "countryIso": "ES",
      "input": "651234567",
      "prefix": "+34",
      "value": "651234567"
    },
    "generalTncPrivacyPolicy": false
  }
};
    await api(CART + '/checkout/update', 'POST', contact);
    const available = await api(CART + '/deliverymodes?postCode=08006');
    const groups = available?.deliveryGroups;
    if (!groups?.length) throw new Error('Khong co nhom giao hang.');
    for (const group of groups) {
      const selected = group.deliveryModes?.find(m =>
        m.code === 'sesa-home-big-appliance-installation-tamdis' && m.active && !m.grayedOut && !m.hideOnWebsite && Number(m.deliveryCost?.value) === 0
      ) || group.deliveryModes?.find(m =>
        m.active && !m.grayedOut && !m.hideOnWebsite && !m.clickAndCollect && !m.shipToStore && Number(m.deliveryCost?.value) === 0
      );
      if (!selected) throw new Error('Khong co giao tan nha mien phi. Dung de kiem tra, khong tu chon phi giao hang.');
      for (const mode of group.deliveryModes) mode.selected = mode.code === selected.code;
      group.deliveryMode = selected;
    }
    await api(CART + '/deliverymodes/update', 'POST', groups);
    await api(CART + '/paymentmodes');
    const cart = await api(CART + '?fields=FULL');
    console.log('DA SAN SANG BUOC 3', {
      items: cart.entries?.map(e => ({ sku: e.product?.code, quantity: e.quantity })),
      total: cart.totalPrice?.formattedValue,
      shipping: cart.deliveryCost?.formattedValue
    });
    // Chuyen route trong cung tab, giu code dang chay de thao tac UI.
    const visible = el => el && el.getClientRects().length > 0;
    async function waitFor(find, label) {
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        const el = find();
        if (visible(el)) return el;
        await sleep(250);
      }
      throw new Error('Khong tim thay giao dien: ' + label + '. Tai lai trang va chay lai code.');
    }
    const paymentURL = '/es/checkout/one?step=CHECKOUT_STEP_PAYMENT';
    history.pushState(null, '', paymentURL);
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    const card = await waitFor(() => [...document.querySelectorAll('button, label, h2, h3, div, span')]
      .find(el => visible(el) && el.textContent.trim() === 'Tarjeta Bancaria'), 'Tarjeta Bancaria');
    const orderVisible = () => [...document.querySelectorAll('button')]
      .some(el => visible(el) && el.textContent.trim() === 'Realizar pedido');
    if (!orderVisible()) card.click();
    await waitFor(() => [...document.querySelectorAll('button')]
      .find(el => visible(el) && el.textContent.trim() === 'Realizar pedido'), 'form Credit Card');
    const newCard = [...document.querySelectorAll('label')]
      .find(el => visible(el) && el.textContent.trim() === 'Nuevo método de pago');
    if (newCard) newCard.click();
    const holder = await waitFor(() => document.querySelector('#input-holder-name'), 'ten chu the');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(holder, 'Classic');
    holder.dispatchEvent(new Event('input', { bubbles: true }));
    holder.dispatchEvent(new Event('change', { bubbles: true }));
    holder.focus();
    console.warn('DA MO FORM THE. Nhap the test vao iframe Adyen, sau do tu xac nhan dieu khoan va dat hang.');
  } catch (error) {
    console.error('DUNG:', error.message);
  } finally {
    window.__samsungCheckoutRunning = false;
  }
})();
