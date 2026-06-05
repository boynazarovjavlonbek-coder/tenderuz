const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000', { timeout: 15000 });
  await page.waitForTimeout(4000);

  // Click first card
  const cards = await page.$$('.card');
  console.log('Kartalar soni:', cards.length);

  if (cards.length > 0) {
    const href = await cards[0].getAttribute('href');
    const title = await cards[0].$eval('.card-title', el => el.textContent.trim()).catch(() => '');
    const price = await cards[0].$eval('.price', el => el.textContent.trim()).catch(() => '');
    const deadline = await cards[0].$eval('.deadline-chip', el => el.textContent.trim()).catch(() => '');
    console.log('\nBirinchi karta:');
    console.log('  Sarlavha:', title);
    console.log('  Narx:', price);
    console.log('  Muddat:', deadline);
    console.log('  URL:', href);

    // Open the link
    const page2 = await ctx.newPage();
    await page2.goto(href, { timeout: 25000 }).catch(e => console.log('Xato:', e.message));
    await page2.waitForTimeout(5000);
    const txt = await page2.evaluate(() => document.body.innerText.slice(0, 600)).catch(() => '');
    const is404 = txt.includes('404') || txt.toLowerCase().includes('not found');
    console.log('\nTashqi sahifa:');
    console.log('  404?', is404);
    console.log('  Matn:', txt.replace(/\s+/g,' ').slice(0, 200));
    await page2.screenshot({ path: 'final_check.png' });
  }

  await browser.close();
  console.log('\nScreenshot: final_check.png');
})();
