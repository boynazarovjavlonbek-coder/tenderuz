const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Filter by etender platform
  await page.selectOption('#platformFilter', 'etender');
  await page.click('button:has-text("Qidirish")');
  await page.waitForTimeout(2000);

  const cards = await page.$$('.card');
  console.log('etender kartochkalar:', cards.length);
  const totalCount = await page.$eval('#totalCount', el => el.textContent);
  console.log('Stat counter:', totalCount);

  await page.screenshot({ path: 'verify_final.png' });
  console.log('Screenshot: verify_final.png');
  await browser.close();
})();
