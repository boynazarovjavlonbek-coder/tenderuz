const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const cards = await page.$$('.card');
  const total = await page.$eval('#statTotal', el => el.textContent).catch(() => '?');
  const pages = await page.$eval('.pg-btn', el => el ? 'yes' : 'no').catch(() => 'no pg');

  console.log('Cards visible:', cards.length);
  console.log('Stat total:', total);
  console.log('Pagination:', pages);

  await page.screenshot({ path: 'final_ui.png' });
  console.log('Screenshot: final_ui.png');

  // Also screenshot with xt filter
  await page.click('.platform-xt');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'final_xt.png' });
  console.log('XT screenshot: final_xt.png');

  await browser.close();
})();
