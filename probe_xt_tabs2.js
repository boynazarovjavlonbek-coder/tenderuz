const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 900 });

  // First load the page and find tab URLs
  await pg.goto('https://xt-xarid.uz/procedure/tender', { timeout: 30000 });
  await pg.waitForTimeout(5000);

  // Get all tab links
  const tabLinks = await pg.evaluate(() => {
    const links = [...document.querySelectorAll('a, [routerlink]')];
    return links
      .filter(l => l.href || l.getAttribute('routerlink'))
      .map(l => ({ text: l.textContent.trim().slice(0,30), href: l.href, routerlink: l.getAttribute('routerlink') }))
      .filter(l => l.text && (l.href.includes('procedure') || (l.routerlink && l.routerlink.includes('procedure'))));
  });
  console.log('Tab links found:');
  tabLinks.forEach(l => console.log(' ', l.text, '->', l.href || l.routerlink));

  // Intercept all RPC calls
  const rpcCalls = {};
  pg.on('request', async req => {
    if (req.url().includes('api.xt-xarid') && req.method() === 'POST') {
      const body = req.postData() || '';
      try {
        const parsed = JSON.parse(body);
        const key = parsed.method + '|' + JSON.stringify(parsed.params).slice(0, 100);
        if (!rpcCalls[key]) rpcCalls[key] = 0;
        rpcCalls[key]++;
      } catch(e) {}
    }
  });

  // Click each tab
  const tabTexts = ['Аукцион', 'Маҳаллий аукцион', 'Дўкон', 'Миллий дўкон', 'Ҳадли келишув', 'Таклифлар сўрови'];
  for (const tabText of tabTexts) {
    try {
      const tab = await pg.$(`a:has-text("${tabText}"), button:has-text("${tabText}")`);
      if (tab) {
        await tab.click();
        await pg.waitForTimeout(4000);
        console.log(`\n[${tabText}] URL: ${pg.url()}`);
      } else {
        console.log(`\n[${tabText}] - tab not found`);
      }
    } catch(e) {
      console.log(`\n[${tabText}] - error:`, e.message.slice(0,50));
    }
  }

  console.log('\n=== All RPC calls made ===');
  Object.entries(rpcCalls).forEach(([k, cnt]) => console.log(cnt + 'x', k));

  await browser.close();
})();
