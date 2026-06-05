const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('TradeList')) {
      console.log('\n=== TradeList REQUEST ===');
      console.log('Method:', req.method());
      console.log('URL:', url);
      console.log('Headers:', JSON.stringify(req.headers(), null, 2));
      console.log('PostData:', req.postData());
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('TradeList')) {
      const text = await response.text().catch(() => '');
      console.log('\n=== TradeList RESPONSE ===');
      console.log(text.slice(0, 1000));
    }
  });

  await page.goto('https://etender.uzex.uz/', { timeout: 30000 });
  await page.waitForTimeout(12000);

  await browser.close();
})();
