const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();

  const responses = [];
  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const data = await res.json();
        responses.push({ url: res.url(), from: JSON.parse(res.request().postData()||'{}').from, count: data.length });
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(8000);

  console.log('Page 1 response:', responses);

  // Try to fetch page 2 from within browser
  const page2 = await pg.evaluate(async () => {
    const r = await fetch('https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region_ids: [], from: 21, to: 40 })
    });
    const data = await r.json();
    return { status: r.status, count: data.length, sample: data[0] };
  });
  console.log('Page 2 from browser:', page2);

  const page3 = await pg.evaluate(async () => {
    const r = await fetch('https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region_ids: [], from: 41, to: 60 })
    });
    const data = await r.json();
    return { status: r.status, count: data.length };
  });
  console.log('Page 3 from browser:', page3);

  // Get total count
  const total = await pg.evaluate(async () => {
    try {
      const r = await fetch('https://xarid-api-auction.uzex.uz/Common/GetLotsCount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region_ids: [] })
      });
      return await r.json();
    } catch(e) { return { error: e.message }; }
  });
  console.log('Total count:', total);

  await browser.close();
})();
