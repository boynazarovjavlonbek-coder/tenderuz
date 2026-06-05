const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  // === xarid.uzex.uz: check pagination ===
  console.log('=== xarid.uzex.uz pagination ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const xaridResponses = [];
  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const data = await res.json();
        xaridResponses.push({ url: res.url(), count: data.length });
      } catch(e) {}
    }
  });
  pg.on('request', req => {
    if (req.url().includes('xarid') && !req.url().includes('.js') && !req.url().includes('.css')) {
      if (req.url().includes('auction') || req.url().includes('lot')) {
        console.log('[REQ]', req.method(), req.url().slice(0, 100), req.postData()?.slice(0,100)||'');
      }
    }
  });
  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(10000);
  // Try scrolling to trigger more loads
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(3000);
  await browser.close();
  console.log('xarid responses:', xaridResponses);

  // === xt-xarid.uz: try without filters ===
  console.log('\n=== xt-xarid.uz without filters ===');
  try {
    const r = await axios.post('https://api.xt-xarid.uz/rpc',
      { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref: 'ref_tender_public', op: 'read', limit: 50, offset: 0, filters: {} } },
      { httpsAgent: agent, timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    console.log('No filter count:', r.data.result?.length);
    const statuses = {};
    (r.data.result || []).forEach(t => { statuses[t.status] = (statuses[t.status]||0)+1; });
    console.log('Statuses:', statuses);
  } catch(e) { console.log('ERROR:', e.response?.status, e.response?.data?.error?.message || e.message); }

  // Try with string filter
  try {
    const r = await axios.post('https://api.xt-xarid.uz/rpc',
      { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref: 'ref_tender_public', op: 'read', limit: 200, offset: 0, filters: { status: 'open' } } },
      { httpsAgent: agent, timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    console.log('filter status=open count:', r.data.result?.length);
  } catch(e) { console.log('string filter ERROR:', e.response?.status); }
})();
