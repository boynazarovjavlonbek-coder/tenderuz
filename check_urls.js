const { chromium } = require('playwright');

const types = [
  { name: 'Tender', url: 'https://xt-xarid.uz/procedure/tender' },
  { name: 'Auction', url: 'https://xt-xarid.uz/procedure/auction' },
  { name: 'Store', url: 'https://xt-xarid.uz/procedure/store' },
  { name: 'Price request', url: 'https://xt-xarid.uz/procedure/price_request' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });

  for (const t of types) {
    const page = await ctx.newPage();
    try {
      await page.goto(t.url, { timeout: 20000, waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(4000);

      // Find first clickable item card/link
      const links = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll('a[href]')];
        return anchors
          .map(a => a.href)
          .filter(h => h && !h.includes('/procedure/') || (h.includes('/procedure/') && h.split('/').length > 5))
          .filter(h => h.includes('xt-xarid'))
          .slice(0, 5);
      });
      console.log(`\n[${t.name}] (${t.url})`);
      console.log('Links found:', links);

      // Also try clicking first list item
      const firstItem = await page.$('app-lot-item a, .lot-card a, .tender-item a, .card a, [class*="lot"] a, [class*="tender"] a').catch(() => null);
      if (firstItem) {
        const href = await firstItem.getAttribute('href').catch(() => '');
        console.log('First item href:', href);
      }
    } catch(e) {
      console.log(`[${t.name}] Error:`, e.message.slice(0, 80));
    }
    await page.close();
  }

  await browser.close();
})();
