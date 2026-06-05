const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const pages = [
    { url: 'http://localhost:3000/tenders.html', name: 'tenders' },
    { url: 'http://localhost:3000/statistics.html', name: 'statistics' },
  ];
  for (const p of pages) {
    const page = await browser.newPage();
    const errs = [];
    page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,80)); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(p.url, { timeout: 20000 });
    await page.waitForTimeout(4000);
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 150).replace(/\s+/g,' '));
    console.log('\n=== ' + p.name.toUpperCase() + ' ===');
    console.log('  Title:', title);
    console.log('  Body:', bodyText);
    console.log('  Xatoliklar:', errs.length ? errs.join('; ') : 'YOQ');
    await page.screenshot({ path: p.name + '_check.png' });
    await page.close();
  }

  // Mobil ko'rinish
  const mob = await browser.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto('http://localhost:3000/', { timeout: 20000 });
  await mob.waitForTimeout(3000);
  const overflowX = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const navVisible = await mob.$eval('nav', el => getComputedStyle(el).display).catch(()=>'not found');
  console.log('\n=== MOBIL ===');
  console.log('  Gorizontal scroll:', overflowX ? 'BROR (xato)' : 'YOQ (yaxshi)');
  console.log('  Nav display:', navVisible);
  await mob.screenshot({ path: 'mobile_check.png' });

  await browser.close();
})();
