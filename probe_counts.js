const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  // 1. xarid.uzex.uz - how many auctions does GetMinimizedLotsList return?
  console.log('=== xarid.uzex.uz ===');
  const browser1 = await chromium.launch({ headless: true });
  const ctx1 = await browser1.newContext();
  const pg1 = await ctx1.newPage();
  let xaridData = [];
  pg1.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try { xaridData = await res.json(); } catch(e) {}
    }
  });
  await pg1.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg1.waitForTimeout(8000);
  await browser1.close();
  console.log('xarid lots returned:', xaridData.length);
  if (xaridData.length > 0) console.log('Sample:', JSON.stringify(xaridData[0]).slice(0, 150));

  // 2. etender.uzex.uz - total_count
  console.log('\n=== etender.uzex.uz ===');
  const browser2 = await chromium.launch({ headless: true });
  const ctx2 = await browser2.newContext({ ignoreHTTPSErrors: true });
  const pg2 = await ctx2.newPage();
  let etenderTotal = 0;
  await pg2.route('**/api/common/TradeList', async (route, req) => {
    const headers = req.headers();
    const res = await route.fetch();
    try {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) etenderTotal = data[0].total_count;
    } catch(e) {}
    await route.fulfill({ response: res });
  });
  await pg2.goto('https://etender.uzex.uz/', { timeout: 30000 });
  await pg2.waitForTimeout(12000);
  await browser2.close();
  console.log('etender total_count:', etenderTotal);

  // 3. xt-xarid.uz - count open tenders
  console.log('\n=== xt-xarid.uz ===');
  const xtStatuses = ['submitted', 'open', 'open_bids'];
  for (const status of xtStatuses) {
    try {
      const r = await axios.post('https://api.xt-xarid.uz/rpc',
        { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref: 'ref_tender_public', op: 'read', limit: 1, offset: 0, filters: { status: [status] } } },
        { httpsAgent: agent, timeout: 10000 }
      );
      // Get total by checking a larger fetch
      const r2 = await axios.post('https://api.xt-xarid.uz/rpc',
        { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref: 'ref_tender_public', op: 'read', limit: 200, offset: 0, filters: { status: [status] } } },
        { httpsAgent: agent, timeout: 15000 }
      );
      console.log(`status=${status}: returned ${r2.data.result?.length} items`);
    } catch(e) {
      console.log(`status=${status}: ERROR`, e.message);
    }
  }
})();
