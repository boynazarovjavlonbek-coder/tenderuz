const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // intercept API calls to verify they return real data
  const apiResults = {};
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/')) {
      try {
        const json = await res.json().catch(() => null);
        if (json) apiResults[url.replace('http://localhost:3000','')]=json;
      } catch(e) {}
    }
  });

  await page.goto('http://localhost:3000', { timeout: 20000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: 'dashboard_final.png', fullPage: false });

  // scroll down
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'dashboard_bottom.png', fullPage: false });

  console.log('\n=== API javoblari ===');
  for (const [url, data] of Object.entries(apiResults)) {
    if (url.includes('stats')) {
      console.log('\n/api/stats:');
      console.log('  total:', data.total);
      console.log('  urgent:', data.urgent);
      console.log('  platforms:', JSON.stringify(data.platforms));
      console.log('  categories:', JSON.stringify(data.categories));
      console.log('  deadline:', JSON.stringify(data.deadline));
      const top3 = Object.entries(data.topRegions||{}).slice(0,3).map(([k,v])=>`${k}:${v}`).join(', ');
      console.log('  topRegions (3ta):', top3);
    }
    if (url.includes('tenders?')) {
      console.log('\n/api/tenders:');
      console.log('  total:', data.total, '| page:', data.page, '| count:', data.count);
      if (data.data?.[0]) {
        const t = data.data[0];
        console.log('  birinchi:', t.title, '|', t.price, t.currency, '|', t.platformName);
      }
    }
  }

  await browser.close();
})();
