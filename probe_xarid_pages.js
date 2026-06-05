const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();

  const allLots = [];
  const requests = [];

  pg.on('request', req => {
    if (req.url().includes('xarid-api') && req.method() === 'POST') {
      requests.push({ url: req.url(), body: req.postData() });
    }
  });
  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const data = await res.json();
        allLots.push(...data);
        console.log('Batch:', data.length, 'total:', allLots.length);
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(6000);

  // Close popup if present
  try { await pg.click('button:has-text("Больше")', { timeout: 2000 }); } catch(e) {}
  try { await pg.click('button:has-text("Отмена")', { timeout: 2000 }); } catch(e) {}
  await pg.waitForTimeout(1000);

  // Find and click next page
  const paginationBtns = await pg.$$('button, a');
  for (const btn of paginationBtns) {
    try {
      const txt = await btn.textContent();
      if (txt && (txt.includes('2') || txt.includes('>') || txt.includes('Next') || txt.includes('keyng'))) {
        console.log('Found btn:', txt.trim().slice(0,20));
      }
    } catch(e) {}
  }

  // Try scrolling to bottom
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(3000);

  // Try clicking pagination
  const pgBtn = await pg.$('[class*="pagination"] a:nth-child(2), [class*="page"] a:nth-child(3)');
  if (pgBtn) {
    await pgBtn.click();
    await pg.waitForTimeout(3000);
  }

  console.log('\nAll requests made:');
  requests.forEach(r => console.log(r.url, r.body?.slice(0,100)));
  console.log('\nTotal lots collected:', allLots.length);

  await pg.screenshot({ path: 'xarid_pg2.png' });
  await browser.close();
})();
