const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page loaded, title:', await page.title());

  // Wait for tenders to load (API call can take time due to Playwright scraping)
  await page.waitForTimeout(20000);

  // Check card count
  const cards = await page.$$('.card');
  console.log('Cards found:', cards.length);

  // Check for loading/error state
  const loadingEl = await page.$('.loading');
  const emptyEl = await page.$('.empty');
  console.log('Loading element visible:', loadingEl ? await loadingEl.isVisible() : false);
  console.log('Empty element visible:', emptyEl ? await emptyEl.isVisible() : false);

  // Get stats
  try {
    const totalCount = await page.$eval('#totalCount', el => el.textContent);
    const newCount = await page.$eval('#newCount', el => el.textContent);
    console.log('Total count:', totalCount);
    console.log('New count:', newCount);
  } catch(e) {
    console.log('Stats error:', e.message);
  }

  // Get first few card titles
  const titles = await page.$$eval('.card-title', els => els.slice(0,3).map(el => el.textContent.trim()));
  console.log('First 3 titles:', titles);

  await page.screenshot({ path: 'verify_screenshot.png', fullPage: false });
  console.log('Screenshot saved: verify_screenshot.png');

  await browser.close();
})();
