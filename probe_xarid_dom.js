const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();

  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const b = JSON.parse(res.request().postData() || '{}');
        const d = await res.json();
        console.log(`API from:${b.from} to:${b.to} => ${d.length} items`);
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(6000);

  // Close popups
  for (const sel of ['button:has-text("Больше")', 'button:has-text("Отмена")', '.popup-close', '[data-dismiss]']) {
    try { await pg.click(sel, { timeout: 800 }); } catch(e) {}
  }
  await pg.waitForTimeout(500);

  // Find pagination HTML
  const paginationHTML = await pg.evaluate(() => {
    const pg = document.querySelector('[class*="pagination"], [class*="paging"], nav');
    return pg ? pg.outerHTML.slice(0, 800) : 'not found';
  });
  console.log('\nPagination HTML:', paginationHTML);

  // Find all clickable page-number-like elements near "Ko\'rsatilgan"
  const pageInfo = await pg.evaluate(() => {
    const allEls = [...document.querySelectorAll('*')];
    const found = allEls.filter(el => {
      const t = el.textContent.trim();
      return t.includes('Ko\'rsatilgan') || t.includes('528') || (t >= '2' && t <= '27' && t.length <= 3 && el.tagName.match(/A|BUTTON/));
    });
    return found.slice(0, 10).map(el => ({ tag: el.tagName, cls: el.className.slice(0,50), text: el.textContent.slice(0,30), html: el.outerHTML.slice(0,100) }));
  });
  console.log('\nPage elements:', JSON.stringify(pageInfo, null, 2));

  await pg.screenshot({ path: 'xarid_pg_dom.png', fullPage: false });
  await browser.close();
})();
