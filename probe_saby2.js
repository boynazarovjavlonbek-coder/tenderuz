const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('saby') && (req.method() === 'POST' || url.includes('api') || url.includes('trade') || url.includes('tender') || url.includes('stat'))) {
      apiCalls.push({ method: req.method(), url: url.slice(0, 200), body: (req.postData() || '').slice(0, 300) });
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('trade.saby') && res.request().method() === 'POST') {
      try {
        const text = await res.text().catch(() => '');
        if (text.length > 10 && text.length < 5000) {
          console.log('\nRESPONSE from', url.slice(0, 100));
          console.log(text.slice(0, 500));
        }
      } catch(e) {}
    }
  });

  // 1. Avval asosiy sahifani ochamiz
  await page.goto('https://trade.saby.uz', { timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'saby_main.png' });

  const mainText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log('Main page text:', mainText.slice(0, 500));

  // 2. Har qanday "kirmasdan ko'rish" tugmasi bormi?
  const guestBtn = await page.$('text=Без регистрации, text=Гость, text=Guest, text=Войти как гость, text=Продолжить без');
  if (guestBtn) {
    console.log('Guest tugma topildi!');
    await guestBtn.click();
    await page.waitForTimeout(3000);
  }

  // 3. Statistics sahifasiga to'g'ridan to'g'ri o'tish
  await page.goto('https://trade.saby.uz/page/tenders-statistics-category', { timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'saby_stat.png' });

  const statText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log('\nStatistics page text:', statText.slice(0, 1000));

  console.log('\n=== API calls ===');
  apiCalls.forEach(c => {
    console.log(c.method, c.url.slice(0, 120));
    if (c.body && c.body.length > 2) console.log('  body:', c.body.slice(0, 150));
  });

  await browser.close();
})();
