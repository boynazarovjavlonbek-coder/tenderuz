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
          bodyPreview = text.slice(0, 500);
        }
        apiCalls.push({ url, status: response.status(), bodyPreview });
      } catch(e) {}
    }
  });

  await page.goto('https://etender.uzex.uz/lots/list', { timeout: 30000 });
  await page.waitForTimeout(10000);

  // Click "FAOL LOTLAR" if needed
  const lots = await page.$('text=FAOL LOTLAR');
  if (lots) { await lots.click(); await page.waitForTimeout(5000); }

  console.log('\n--- apietender.uzex.uz API calls ---');
  apiCalls.forEach(c => console.log('\nURL:', c.url, '\nStatus:', c.status, '\nBody:', c.bodyPreview));

  await browser.close();
})();
