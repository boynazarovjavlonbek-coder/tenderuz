const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { timeout: 15000 });
  await page.waitForTimeout(5000);

  const firstCard = await page.$('.card');
  if (!firstCard) { console.log('Card topilmadi!'); await browser.close(); return; }

  const href = await firstCard.getAttribute('href');
  const title = await firstCard.$eval('.card-title', el => el.textContent.trim()).catch(() => '');
  console.log('URL:', href);
  console.log('Title:', title);

  // Open in new tab to see what the external site shows
  const newPage = await browser.newContext({ ignoreHTTPSErrors: true }).then(c => c.newPage());
  await newPage.goto(href, { timeout: 20000 }).catch(e => console.log('Goto error:', e.message));
  await newPage.waitForTimeout(5000);

  const pageTitle = await newPage.title().catch(() => '');
  const bodyText = await newPage.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => '');
  const currentUrl = newPage.url();

  console.log('\n=== External page ===');
  console.log('Title:', pageTitle);
  console.log('URL:', currentUrl);
  console.log('Body text:', bodyText.slice(0, 300));

  await newPage.screenshot({ path: 'lot_detail.png' });
  console.log('\nScreenshot: lot_detail.png');
  await browser.close();
})();
