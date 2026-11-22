const { chromium } = require('playwright');
const { plan } = require('./config.cjs');
const { ordersPopup } = require('../orders-popup.cjs');
const { accountEmail } = require('./account.cjs');
class Runner {
    constructor(profile, emit) { this.profile = profile; this.emit = emit; this.context = null; this.cancelled = false; this.active = false; this.opening = null; this.environment = null; this.historyPage = null; }
    log(message, level = 'info') { this.emit({ type: 'log', message, level, time: new Date().toISOString() }); }
    async browser(config) {
        if (this.opening) await this.opening;
        if (this.context) { if (this.environment.root !== config.root || this.environment.api !== config.api) throw Error('Phiên Chrome hiện tại dùng ROOT/API khác. Dừng phiên rồi đổi môi trường.'); return this.context; }
        this.opening = chromium.launchPersistentContext(this.profile, { channel: 'chrome', headless: false, viewport: null, slowMo: 100 }).then(c => { this.context = c; this.environment = { root: config.root, api: config.api }; c.once('close', () => { if (this.context === c) { this.context = null; this.historyPage = null; this.environment = null; } this.emit({ type: 'browserClosed' }); }); return c; });
        try { return await this.opening; } finally { this.opening = null; }
    }
    async openHistory(config) {
        const c = await this.browser(config);
        if (this.historyPage && !this.historyPage.isClosed()) { await this.historyPage.bringToFront(); return; }
        const p = this.historyPage = await c.newPage();
        await p.addInitScript(ordersPopup, { root: config.root, api: config.api });
        await p.goto('https://stg3.shop.samsung.com/getcookie.html', { waitUntil: 'domcontentloaded' });
        await p.goto(config.root + '/es/mypage/orders', { waitUntil: 'domcontentloaded' });
        await p.bringToFront(); this.log('Tab lịch sử đã mở. Bấm nút Lịch sử đơn góc phải dưới để xem, tìm kiếm và mở chi tiết.', 'success');
    }
    async stop() { this.cancelled = true; if (this.opening) await this.opening.catch(() => { }); if (this.context) await this.context.close().catch(() => { }); }
    async run(config) {
        if (this.active) throw Error('Một phiên đang chạy.'); this.active = true; this.cancelled = false;
        try {
            const cases = plan(config); this.emit({ type: 'plan', cases }); this.log('Đang mở Chrome…');
            const c = await this.browser(config); const p = await c.newPage(); p.setDefaultTimeout(30000);
            const api = async (endpoint, method = 'GET', body) => { if (this.cancelled) throw Error('Đã dừng'); return p.evaluate(async ({ url, method, body }) => { const r = await fetch(url, { method, credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); const text = await r.text(); let j; try { j = text ? JSON.parse(text) : null } catch { throw Error('HTTP ' + r.status + ' không trả JSON') } if (!r.ok || j?.errors?.length) throw Error('HTTP ' + r.status + ': ' + JSON.stringify(j?.errors)); return j; }, { url: config.api + endpoint + (endpoint.includes('?') ? '&' : '?') + 'lang=es&curr=EUR', method, body }); };
            const CART = '/users/current/carts/current'; const count = (cart, sku) => (cart.entries || []).filter(e => e.product?.code === sku).reduce((a, e) => a + Number(e.quantity || 0), 0);
            const check = (cart, items) => { if ((cart.entries || []).some(e => !items.some(x => x.code === e.product?.code)) || items.some(x => count(cart, x.code) !== x.quantity)) throw Error('Giỏ khác kế hoạch. Hãy kiểm tra cart trước khi chạy lại.'); };
            await p.goto('https://stg3.shop.samsung.com/getcookie.html', { waitUntil: 'domcontentloaded' });
            if (config.mode === 'orders') {
                await p.goto(config.root + '/es/mypage/orders', { waitUntil: 'domcontentloaded' }); this.log('Đã mở lịch sử đơn. Đăng nhập trên website nếu cần.', 'success'); await new Promise(r => c.once('close', r)); return;
            }
            for (let round = 0; round < cases.length; round++) {
                const items = cases[round]; this.emit({ type: 'round', round: round + 1, total: cases.length, items, status: 'running' }); this.log('Lượt ' + (round + 1) + '/' + cases.length + ' · ' + items.map(x => x.code + ' × ' + x.quantity).join(' | '));
                await p.goto(config.root + '/es/cart', { waitUntil: 'domcontentloaded' });
                let cart = await api(CART + '?fields=FULL'); if (round > 0 && cart.entries?.length) throw Error('Giỏ lượt trước chưa trống.');
                if ((cart.entries || []).some(e => !items.some(x => x.code === e.product?.code))) throw Error('Giỏ có SKU ngoài danh sách; kiểm tra trên Chrome.');
                for (const x of items) if (count(cart, x.code) > x.quantity) throw Error(x.code + ' đã có quantity vượt kế hoạch.');
                if (!cart.code && !cart.guid) await api('/users/current/carts', 'POST', {});
                for (const x of items) { const quantity = x.quantity - count(cart, x.code); if (!quantity) continue; const result = await api(CART + '/entries', 'POST', { quantity, product: { code: x.code } }); if (result.statusCode !== 'success' || result.quantityAdded !== quantity) throw Error('Không thêm đủ ' + x.code); this.log('Đã thêm ' + x.code + ' × ' + quantity, 'success'); }
                check(await api(CART + '?fields=FULL'), items); await p.reload({ waitUntil: 'domcontentloaded' });
                if (config.mode === 'cart') { this.log('Giỏ đã sẵn sàng. Đóng Chrome hoặc bấm Dừng khi xong.', 'success'); await new Promise(r => c.once('close', r)); return; }
                this.log('Mở Tramitar pedido…'); await p.getByRole('button', { name: /Tramitar pedido/i }).first().click(); await p.waitForURL(/\/es\/(guestlogin\/checkout|checkout\/one)/);
                if (p.url().includes('/guestlogin/checkout')) { this.log('Đăng nhập Samsung trong Chrome. App chờ tối đa 10 phút.', 'warn'); await p.getByText(/Iniciar sesi/i).first().click(); await p.waitForURL(u => u.origin === config.root && u.pathname.includes('/checkout/one'), { timeout: 600000 }); }
                check(await api(CART + '?fields=FULL'), items);
                const email = accountEmail(await api('/users/current'));
                this.log('Lưu thông tin liên hệ và địa chỉ test…');
                const phone = { countryIso: 'ES', input: '651234567', prefix: '+34', value: '651234567' };
                const address = { firstName: 'samsung', lastName: 'test', email, phonePrefix: '+34', phone: '651234567', line1: 'Carrer de Muntaner, 460', line2: '', postalCode: '08006', town: 'Barcelona', regionIso: 'ES-B', region: { isocode: 'ES-B', countryIso: 'ES' }, country: { isocode: 'ES' }, isManualAddress: true, isValid: true, isUserWantTaxInvoice: false, telephone: phone, mobileNumber: phone };
                await api(CART + '/checkout/update', 'POST', { shippingAddress: { ...address, id: '', townCode: '', ward: '', saveInAddressBook: false }, billingAddress: { ...address, sameAsShipping: true, saveInAddressBook: false, identificationType: 'NIF_NIE', fiscalCode: '00045678T' }, customer: { ...address, dayOfBirth: '', monthOfBirth: '', yearOfBirth: '', generalTncPrivacyPolicy: false }, checkoutOptions: { generalTncPrivacyPolicy: false, isValid: true } });
                const delivery = await api(CART + '/deliverymodes?postCode=08006'); if (!delivery.deliveryGroups?.length) throw Error('Không có nhóm giao hàng'); for (const group of delivery.deliveryGroups) { const selected = group.deliveryModes?.find(m => m.active && !m.grayedOut && !m.hideOnWebsite && !m.clickAndCollect && !m.shipToStore && m.deliveryCost?.value === 0); if (!selected) throw Error('Có nhóm không được giao tận nhà miễn phí'); for (const m of group.deliveryModes) m.selected = m.code === selected.code; group.deliveryMode = selected; }
                await api(CART + '/deliverymodes/update', 'POST', delivery.deliveryGroups); await api(CART + '/paymentmodes');
                await p.goto(config.root + '/es/checkout/one?step=CHECKOUT_STEP_PAYMENT', { waitUntil: 'domcontentloaded' }); await p.getByText('Tarjeta Bancaria', { exact: true }).waitFor();
                if (config.fillCard) {
                    this.log('Điền thẻ Adyen test…'); await p.waitForTimeout(4000); const holder = p.locator('#input-holder-name'); for (let i = 0; i < 8 && !await holder.isVisible(); i++) { const n = p.getByText('Nuevo método de pago', { exact: true }); if (await n.isVisible()) await n.click(); else if (!await p.getByRole('button', { name: 'Realizar pedido', exact: true }).isVisible()) await p.getByText('Tarjeta Bancaria', { exact: true }).click(); await p.waitForTimeout(1500); }
                    await holder.fill(config.card.holder); for (const [id, value] of [['encryptedCardNumber', config.card.number], ['encryptedExpiryDate', config.card.expiry], ['encryptedSecurityCode', config.card.cvc]]) { let filled = false; for (let tries = 0; tries < 100 && !filled; tries++) { for (const frame of p.frames()) { if (!frame.url().startsWith('https://checkoutshopper-test.adyen.com/')) continue; try { if (await frame.locator('#' + id).isVisible()) { await frame.locator('#' + id).fill(value); filled = true; break; } } catch (e) { if (!/detach|closed/i.test(e.message)) throw e; } } if (!filled) await p.waitForTimeout(300); } if (!filled) throw Error('Không tìm được iframe Adyen TEST: ' + id); }
                }
                // Only scroll/focus; final consent and purchase remain manual.
                const confirmation = p.locator('#es-adyenCcPaymentModeOptin-input');
                await p.locator('#es-adyenCcPaymentModeOptin-input').click();
                await p.locator('button[data-an-la="payment:pay now:credit card"]').click();
                if (await confirmation.isVisible()) { await confirmation.scrollIntoViewIfNeeded(); await confirmation.focus(); }
                this.emit({ type: 'round', round: round + 1, total: cases.length, items, status: 'waiting' }); this.log('Sẵn sàng bước 3. Bạn kiểm tra tổng tiền, xác nhận điều khoản và đặt hàng trong Chrome.', 'success');
                await p.waitForURL(u => u.origin === config.root && u.pathname.startsWith('/es/orderConfirmation'), { timeout: 1800000 }); const u = new URL(p.url()); const code = u.searchParams.get('orderCode') || /orderCode=([^;?&#/]+)/.exec(u.pathname)?.[1]; if (!code) throw Error('Chưa có mã đơn trên trang xác nhận');
                await p.goto(config.root + '/es/cart', { waitUntil: 'domcontentloaded' }); if ((await api(CART + '?fields=FULL')).entries?.length) throw Error('Có mã đơn nhưng giỏ chưa trống');
                this.emit({ type: 'complete', round: round + 1, items, orderCode: decodeURIComponent(code) }); this.log('Lượt ' + (round + 1) + ' · mã đơn ' + code + ' · giỏ trống', 'success');
            }
            this.log('Hoàn tất. Đóng Chrome hoặc bấm Dừng để kết thúc phiên.', 'success'); await new Promise(r => c.once('close', r));
        } catch (e) { if (!this.cancelled) this.log(e.message, 'error'); } finally { this.active = false; this.emit({ type: 'idle' }); }
    }
}
module.exports = { Runner };
