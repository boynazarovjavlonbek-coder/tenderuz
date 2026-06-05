const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // visible for debugging
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 900 });

  const allLots = [];
  pg.on('response', async res => {
    if (res.url().includes('GetMinimizedLotsList')) {
      try {
        const postData = JSON.parse(res.request().postData() || '{}');
        const data = await res.json();
        allLots.push(...data);
        console.log(`Got ${data.length} lots (from:${postData.from} to:${postData.to}), total so far: ${allLots.length}`);
      } catch(e) {}
    }
  });

  await pg.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await pg.waitForTimeout(8000);

  // Check page total counter in UI
  const counterText = await pg.$eval('body', el => {
    const allText = el.innerText;
    // Find numbers that could be total count
    return allText.slice(0, 2000);
  });
  console.log('\nPage text sample:', counterText.slice(0, 500));

  // Screenshot
  await pg.screenshot({ path: 'xarid_full.png' });
  console.log('Total lots fetched:', allLots.length);

  await browser.close();
})();
