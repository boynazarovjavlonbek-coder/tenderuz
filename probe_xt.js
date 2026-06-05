const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.woff') && !url.includes('.svg')) {
      apiCalls.push({ method: req.method(), url, post: req.postData()?.slice(0,200) });
    }
  });
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api') || url.includes('json') || url.includes('lot') || url.includes('tender')) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const text = await response.text().catch(()=>'');
          const existing = apiCalls.find(c => c.url === url);
          if (existing) existing.body = text.slice(0, 400);
        }
      } catch(e) {}
    }
  });

  await page.goto('https://xt-xarid.uz', { timeout: 30000 });
  await page.waitForTimeout(8000);

  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  apiCalls.forEach(c => {
    if (c.body || c.post) console.log(`\n[${c.method}] ${c.url}\nPOST: ${c.post||''}\nBODY: ${c.body||''}`);
    else console.log(`[${c.method}] ${c.url}`);
  });

  await page.screenshot({ path: 'xt_probe.png' });
  await browser.close();
})();
