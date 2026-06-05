const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const apiCalls = [];
  page.on('request', req => {
    if (req.method() === 'POST' || req.url().includes('api') || req.url().includes('tender') || req.url().includes('trade')) {
      apiCalls.push({ method: req.method(), url: req.url().slice(0, 150), body: (req.postData() || '').slice(0, 200) });
    }
  });

  await page.goto('https://trade.saby.uz/page/tenders-statistics-category?backButtonId=main-page', { timeout: 40000 });
  await page.waitForTimeout(8000);

  await page.screenshot({ path: 'saby_1.png', fullPage: false });

  const title = await page.title();
  const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log('Title:', title);
  console.log('\nPage text:\n', text.slice(0, 2000));

  console.log('\n=== API calls ===');
  apiCalls.slice(0, 20).forEach(c => {
    console.log(c.method, c.url);
    if (c.body) console.log('  body:', c.body.slice(0, 100));
  });

  // scroll down
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'saby_2.png', fullPage: false });

  await browser.close();
})();
