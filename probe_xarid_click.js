const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();

  const allLots = [];
  const allRequests = [];

  pg.on('request', req => {
    if (req.url().includes('GetMinimizedLotsList')) {
      allRequests.push({ body: req.postData() });
      console.log('REQ:', req.postData());
    }
  });
  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const data = await res.json();
        allLots.push(...data);
        console.log('Got batch:', data.length, 'total:', allLots.length);
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(6000);

  // Close popup
  try { await pg.click('button:has-text("Больше")', { timeout: 2000 }); await pg.waitForTimeout(500); } catch(e) {}
  try { await pg.click('.modal button', { timeout: 2000 }); await pg.waitForTimeout(500); } catch(e) {}

  // Scroll to bottom first
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(2000);

  // Find page 2 button and click
  const page2 = await pg.$('button:has-text("2"), a:has-text("2")');
  if (page2) {
    console.log('Clicking page 2...');
    await page2.click();
    await pg.waitForTimeout(4000);
  } else {
    // Try evaluating to find and click
    await pg.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a')];
      const btn2 = btns.find(b => b.textContent.trim() === '2');
      if (btn2) { console.log('clicking', btn2.textContent); btn2.click(); }
    });
    await pg.waitForTimeout(4000);
  }

  console.log('\nFinal total lots:', allLots.length);
  console.log('Unique lots (by id):', new Set(allLots.map(l=>l.id)).size);
  await browser.close();
})();
