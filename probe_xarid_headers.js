const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const pg = await ctx.newPage();

  let capturedHeaders = null;
  let firstBatch = [];

  await pg.route('**/GetMinimizedLotsList', async (route, req) => {
    capturedHeaders = { ...req.headers() };
    const res = await route.fetch();
    try { firstBatch = await res.json(); } catch(e) {}
    await route.fulfill({ response: res });
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(8000);
  await browser.close();

  console.log('First batch:', firstBatch.length);
  if (!capturedHeaders) { console.log('No headers'); return; }

  const apiUrl = 'https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList';

  // Test page 2 with captured headers
  try {
    const r = await axios.post(apiUrl,
      { region_ids: [], from: 21, to: 40 },
      { httpsAgent: agent, timeout: 10000, headers: capturedHeaders }
    );
    console.log('Page 2 with headers:', r.data.length);
    console.log('First item:', JSON.stringify(r.data[0]).slice(0,100));
  } catch(e) {
    console.log('Page 2 FAIL:', e.response?.status, e.message);
  }

  // Test parallel fetch of all pages
  const total = 532;
  const pageSize = 20;
  const pages = Math.ceil(total / pageSize);
  console.log(`\nFetching all ${pages} pages in parallel...`);

  const start = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: pages - 1 }, (_, i) => {
      const from = (i + 1) * pageSize + 1;
      const to = (i + 2) * pageSize;
      return axios.post(apiUrl, { region_ids: [], from, to },
        { httpsAgent: agent, timeout: 15000, headers: capturedHeaders }
      ).then(r => r.data);
    })
  );

  const allExtra = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`Time: ${Date.now()-start}ms, extra lots: ${allExtra.length}, failed: ${failed}`);
})();
