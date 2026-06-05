const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('apietender')) {
      apiCalls.push({ method: req.method(), url });
    }
  });
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('apietender')) {
      try {
        const text = await response.text().catch(() => '');
        const existing = apiCalls.find(c => c.url === url);
        if (existing) existing.body = text.slice(0, 600);
      } catch(e) {}
    }
  });

  // Go directly to home, then navigate to lots
  await page.goto('https://etender.uzex.uz/', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // Dismiss popup
  try {
    await page.click('button:has-text("Boshqa")', { timeout: 3000 });
  } catch(e) {}

  // Click FAOL LOTLAR
  try {
    await page.click('a:has-text("FAOL LOTLAR")', { timeout: 5000 });
    await page.waitForTimeout(10000);
  } catch(e) {
    console.log('Nav click failed:', e.message);
    await page.goto('https://etender.uzex.uz/lots', { timeout: 20000 });
    await page.waitForTimeout(10000);
  }

  console.log('Current URL:', page.url());
  console.log('\n--- ALL API calls ---');
  apiCalls.forEach(c => {
    console.log(`\n[${c.method}] ${c.url}`);
    if (c.body) console.log('Body:', c.body);
  });

  await page.screenshot({ path: 'etender_lots2.png', fullPage: false });
  await browser.close();
})();
