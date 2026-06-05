const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Sahifa yuklandi, scraping kutilmoqda...');

  // Wait longer since both xarid + etender are scraped in parallel
  await page.waitForTimeout(35000);

  const cards = await page.$$('.card');
  console.log('Kartochkalar soni:', cards.length);

  const totalCount = await page.$eval('#totalCount', el => el.textContent).catch(() => 'N/A');
  const newCount = await page.$eval('#newCount', el => el.textContent).catch(() => 'N/A');
  console.log('Jami:', totalCount, '| Yangi:', newCount);

  // Count by platform badge
  const xaridBadges = await page.$$('.badge-xarid');
  const etenderBadges = await page.$$('.badge-etender');
  console.log('xarid.uzex.uz:', xaridBadges.length, 'ta');
  console.log('etender.uzex.uz:', etenderBadges.length, 'ta');

  // Check error state
  const emptyEl = await page.$('.empty');
  if (emptyEl && await emptyEl.isVisible()) {
    const txt = await emptyEl.textContent();
    console.log('ERROR state:', txt);
  }

  await page.screenshot({ path: 'verify_etender.png', fullPage: false });
  console.log('Screenshot: verify_etender.png');
  await browser.close();
})();
