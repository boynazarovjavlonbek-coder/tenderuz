const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // Test the correct URL format
  const testUrls = [
    'https://xt-xarid.uz/procedure/7454969/core',  // tender
    'https://xt-xarid.uz/procedure/7418039/core',  // auction we found earlier
    'https://xt-xarid.uz/procedure/7475176/core',  // store item that was 404
  ];

  for (const url of testUrls) {
    await page.goto(url, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '');
    const is404 = txt.includes('404') || txt.includes('NotFound');
    console.log(url);
    console.log('  404?', is404, '| text:', txt.replace(/\s+/g,' ').slice(0, 100));
  }

  await browser.close();
})();
