const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 900 });

  const apiCalls = [];
  pg.on('request', req => {
    if (req.url().includes('api.xt-xarid') && req.method() === 'POST') {
      apiCalls.push({ url: req.url(), body: req.postData()?.slice(0, 300) });
    }
  });
  pg.on('response', async res => {
    if (res.url().includes('api.xt-xarid') && res.request().method() === 'POST') {
      try {
        const text = await res.text().catch(() => '');
        const existing = apiCalls.find(c => c.url === res.url() && !c.response);
        if (existing) existing.response = text.slice(0, 500);
      } catch(e) {}
    }
  });

  await pg.goto('https://xt-xarid.uz/procedure/tender', { timeout: 30000 });
  await pg.waitForTimeout(8000);

  console.log('Title:', await pg.title());
  console.log('URL:', pg.url());

  // Get page text to see count
  const txt = await pg.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log('\nPage text:\n', txt.slice(0, 1000));

  console.log('\n=== API calls ===');
  apiCalls.forEach(c => {
    console.log('\nPOST:', c.url);
    console.log('Body:', c.body);
    console.log('Response:', c.response?.slice(0, 400));
  });

  await pg.screenshot({ path: 'xt_tender_page.png' });
  await browser.close();
})();
