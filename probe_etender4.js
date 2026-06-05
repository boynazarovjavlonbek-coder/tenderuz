const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  // 1. Try direct API with SSL bypass
  console.log('--- Direct API calls ---');
  const tryGet = async (url, params = {}) => {
    try {
      const r = await axios.get(url, { httpsAgent: agent, timeout: 8000, params });
      return JSON.stringify(r.data).slice(0, 400);
    } catch(e) {
      return `FAIL: ${e.response?.status || e.message}`;
    }
  };

  const endpoints = [
    ['https://apietender.uzex.uz/api/Lot/GetLotsList', { page: 1, pageSize: 10 }],
    ['https://apietender.uzex.uz/api/Lot/GetActiveLots', { page: 1, pageSize: 10 }],
    ['https://apietender.uzex.uz/api/Auction/GetList', {}],
    ['https://apietender.uzex.uz/api/Lot/GetList', { page: 1, pageSize: 10 }],
    ['https://apietender.uzex.uz/api/Lot/GetActiveList', {}],
    ['https://apietender.uzex.uz/api/Lot/GetLotsActiveList', {}],
    ['https://apietender.uzex.uz/api/Bid/GetBidList', {}],
    ['https://apietender.uzex.uz/api/Common/GetLots', {}],
  ];

  for (const [ep, params] of endpoints) {
    const res = await tryGet(ep, params);
    console.log(`\n${ep}\n-> ${res}`);
  }

  // 2. Playwright intercept - wait longer after popup close
  console.log('\n\n--- Playwright intercept ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('apietender') && !url.includes('Popup') && !url.includes('Notif') && !url.includes('Version')) {
      try {
        const text = await response.text().catch(() => '');
        if (text.length > 5) apiCalls.push({ url, body: text.slice(0, 500) });
      } catch(e) {}
    }
  });

  await page.goto('https://etender.uzex.uz/lots/list', { timeout: 30000 });
  // Close popup if present
  const closeBtn = await page.$('button:has-text("Boshqa")');
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(15000);

  apiCalls.forEach(c => console.log('\nURL:', c.url, '\nBody:', c.body));

  await page.screenshot({ path: 'etender_lots.png' });
  await browser.close();
})();
