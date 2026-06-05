const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 900 });

  const allLots = [];

  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const body = JSON.parse(res.request().postData() || '{}');
        const data = await res.json();
        allLots.push(...data);
        console.log(`Page from:${body.from} => ${data.length} items, total: ${allLots.length}`);
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(6000);

  // Close popup
  try { await pg.click('button:has-text("Больше")', { timeout: 1500 }); await pg.waitForTimeout(300); } catch(e) {}

  // Get total pages from "528 Lot" text
  const totalText = await pg.evaluate(() => {
    const all = document.body.innerText;
    const m = all.match(/Katalogda\s+(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const totalPages = Math.ceil(totalText / 20);
  console.log(`Total lots: ${totalText}, pages: ${totalPages}`);

  // Paginate through all pages
  for (let p = 2; p <= Math.min(totalPages, 30); p++) {
    // Find page link with this number
    const pageLinks = await pg.$$('.page-link');
    let clicked = false;
    for (const link of pageLinks) {
      const txt = (await link.textContent()).trim();
      if (txt === String(p)) {
        await link.click();
        await pg.waitForTimeout(2500);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Try next button (>)
      const nextBtn = await pg.$('.page-link:last-child, .page-item:last-child .page-link');
      if (nextBtn) {
        await nextBtn.click();
        await pg.waitForTimeout(2500);
      } else {
        console.log(`Page ${p}: no button found, stopping`);
        break;
      }
    }
  }

  console.log(`\nDone! Total unique lots: ${new Set(allLots.map(l=>l.id)).size}`);
  await browser.close();
})();
