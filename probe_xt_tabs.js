const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 900 });

  const tabs = [
    { name: 'Тендер',          url: 'https://xt-xarid.uz/procedure/tender' },
    { name: 'Аукцион',         url: 'https://xt-xarid.uz/procedure/auction' },
    { name: 'Маҳаллий аукцион',url: 'https://xt-xarid.uz/procedure/local_auction' },
    { name: 'Дўкон',           url: 'https://xt-xarid.uz/procedure/store' },
    { name: 'Миллий дўкон',    url: 'https://xt-xarid.uz/procedure/national_store' },
    { name: 'Ҳадли келишув',   url: 'https://xt-xarid.uz/procedure/limited_agreement' },
    { name: 'Таклифлар сўрови',url: 'https://xt-xarid.uz/procedure/price_request' },
  ];

  for (const tab of tabs) {
    const apiCalls = [];
    const handler = async (req) => {
      if (req.url().includes('api.xt-xarid') && req.method() === 'POST') {
        const body = req.postData() || '';
        if (body.includes('"ref"') || body.includes('"method":"ref"')) {
          apiCalls.push(body.slice(0, 400));
        }
      }
    };
    pg.on('request', handler);

    await pg.goto(tab.url, { timeout: 20000, waitUntil: 'networkidle' }).catch(() => {});
    await pg.waitForTimeout(4000);
    pg.removeListener('request', handler);

    // Get count from page
    const txt = await pg.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => '');
    const countMatch = txt.match(/(\d+)\s*(та|нта|ta\b|шт|лот|тендер|аукцион)/i);

    console.log(`\n=== ${tab.name} ===`);
    console.log('Count text:', countMatch ? countMatch[0] : 'not found');
    console.log('API calls with ref:');
    apiCalls.forEach(c => {
      try {
        const p = JSON.parse(c).params;
        if (p && p.ref) console.log(' ref:', p.ref, '| filters:', JSON.stringify(p.filters || {}));
      } catch(e) { console.log(' raw:', c.slice(0, 100)); }
    });
  }

  await browser.close();
})();
