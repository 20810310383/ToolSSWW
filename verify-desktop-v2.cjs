const { _electron } = require('playwright'); const path = require('path'); const assert = require('assert/strict');
(async () => {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE; const app = await _electron.launch({ args: [path.resolve('.')], executablePath: require('electron'), env, timeout: 30000 }); try {
        const w = await app.firstWindow(); await w.locator('#start').waitFor(); assert.equal(await w.locator('.nav').count(), 2); assert.equal(await w.locator('.signature').innerText(), 'by Khắc Tú');
        await w.locator('[data-mode=history]').click(); assert.equal(await w.locator('#history-view').isVisible(), true); assert.equal(await w.locator('#checkout-view').isVisible(), false); assert.equal(await w.locator('#card-number').isVisible(), false);
        await w.locator('[data-mode=checkout]').click(); await w.locator('#card-holder').fill('Custom Tester'); await w.locator('#card-expiry').fill('04/31'); await w.locator('#card-cvc').fill('123');
        await app.evaluate(({ ipcMain }) => { ipcMain.removeHandler('run:start'); ipcMain.removeHandler('history:open'); ipcMain.handle('run:start', (_, raw) => { globalThis.__testConfig = raw; return { ok: true } }); ipcMain.handle('history:open', (_, raw) => { globalThis.__testHistory = raw; return { ok: true } }); });
        await w.locator('#start').click(); await w.waitForFunction(() => document.querySelector('#start').disabled); const card = await app.evaluate(() => globalThis.__testConfig.card); assert.equal(card.holder, 'Custom Tester'); assert.equal(card.expiry, '04/31'); assert.equal(card.cvc, '123');
        await w.locator('[data-mode=history]').click(); assert.equal(await w.locator('#history-view').isVisible(), true); assert.equal(await w.locator('#open-history').isEnabled(), true); await w.locator('#open-history').click(); await w.waitForFunction(() => document.querySelector('#history-status').textContent.includes('TAB LỊCH SỬ')); const history = await app.evaluate(() => globalThis.__testHistory); assert.equal(history.root, 'https://stg2.shop.samsung.com'); assert.equal(history.card, undefined);
        await w.screenshot({ path: 'desktop-history-v1.1.png' }); await w.locator('[data-mode=checkout]').click(); await w.screenshot({ path: 'desktop-checkout-v1.1.png' });
        console.log('PASS 2 distinct screens, by Khắc Tú, custom card IPC, history accessible while checkout active, no card data passed to history. Test handlers only; no checkout executed.');
    } finally { await app.close() }
})().catch(e => { console.error(e.message); process.exitCode = 1 });
