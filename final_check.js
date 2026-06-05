const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1400, height: 900 });
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(2000);

  const total = await p.$eval('#statTotal', el => el.textContent).catch(() => '?');
  const cards = (await p.$$('.card')).length;
  const banner = await p.$('#fetchBanner');
  const bannerVisible = banner ? await banner.isVisible() : false;
  console.log('Jami tender:', total, '| Kartochkalar:', cards, '| Banner:', bannerVisible);

  await p.screenshot({ path: 'done.png' });
  console.log('Screenshot: done.png');
  await b.close();
})();
