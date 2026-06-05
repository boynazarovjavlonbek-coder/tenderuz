const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('apietender')) {
      try {
        const ct = response.headers()['content-type'] || '';
        let bodyPreview = '';
        if (ct.includes('json')) {
          const text = await response.text().catch(() => '');
          bodyPreview = text.slice(0, 600);
        }
        apiCalls.push({ url, status: response.status(), bodyPreview });
      } catch(e) {}
    }
  });

  await page.goto('https://etender.uzex.uz/lots/list', { timeout: 30000 });
  await page.waitForTimeout(12000);

  console.log('\n--- apietender.uzex.uz API calls ---');
  apiCalls.forEach(c => console.log('\nURL:', c.url, '\nStatus:', c.status, '\nBody:', c.bodyPreview));

  // Try direct API calls to find lots endpoint
  console.log('\n--- Trying direct API ---');
  const axios = require('axios');
  const endpoints = [
    'https://apietender.uzex.uz/api/Lot/GetLotsList',
    'https://apietender.uzex.uz/api/Lot/GetActiveLots',
    'https://apietender.uzex.uz/api/Auction/GetList',
    'https://apietender.uzex.uz/api/Lot/GetList',
  ];
  for (const ep of endpoints) {
    try {
      const r = await axios.get(ep, { timeout: 5000, params: { page: 1, pageSize: 5 } });
      console.log('OK:', ep, '->', JSON.stringify(r.data).slice(0, 200));
    } catch(e) {
      console.log('FAIL:', ep, e.response?.status || e.message);
    }
  }

  await browser.close();
})();
