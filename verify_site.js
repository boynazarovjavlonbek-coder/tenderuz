const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 1. Asosiy sahifa
  await page.goto('http://localhost:3000', { timeout: 20000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'verify_1_main.png', fullPage: false });

  const cardCount = await page.$$eval('.card', els => els.length);
  const resultText = await page.$eval('#resultInfo', el => el.textContent.trim()).catch(() => '');
  const cntAll = await page.$eval('#cnt-all', el => el.textContent.trim()).catch(() => '');
  const cntEtender = await page.$eval('#cnt-etender', el => el.textContent.trim()).catch(() => '');
  const cntXarid = await page.$eval('#cnt-xarid', el => el.textContent.trim()).catch(() => '');
  const cntXt = await page.$eval('#cnt-xt', el => el.textContent.trim()).catch(() => '');
  console.log('=== Asosiy sahifa ===');
  console.log('Kartalar:', cardCount);
  console.log('Result info:', resultText);
  console.log('Sidebar counts - Jami:', cntAll, '| etender:', cntEtender, '| xarid:', cntXarid, '| xt:', cntXt);

  // 2. Birinchi karta ma'lumotlari
  const firstCard = await page.$('.card');
  const cardTitle = await firstCard.$eval('.card-title', el => el.textContent.trim()).catch(() => '');
  const cardPrice = await firstCard.$eval('.price', el => el.textContent.trim()).catch(() => '');
  const cardDeadline = await firstCard.$eval('.deadline-chip', el => el.textContent.trim()).catch(() => '');
  const cardUrl = await firstCard.getAttribute('href');
  const cardPlatform = await firstCard.$eval('.badge', el => el.textContent.trim()).catch(() => '');
  console.log('\n=== Birinchi karta ===');
  console.log('Sarlavha:', cardTitle);
  console.log('Narx:', cardPrice);
  console.log('Muddat:', cardDeadline);
  console.log('Platforma:', cardPlatform);
  console.log('URL:', cardUrl);

  // 3. Karta URL ga kir (yangi tab)
  console.log('\n=== Lot sahifasiga kirish ===');
  const page2 = await ctx.newPage();
  await page2.goto(cardUrl, { timeout: 25000 }).catch(e => console.log('Xato:', e.message));
  await page2.waitForTimeout(5000);
  const extTitle = await page2.title().catch(() => '');
  const extText = await page2.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => '');
  const is404 = extText.includes('404') || extText.toLowerCase().includes('pagenotfound');
  console.log('Sahifa sarlavhasi:', extTitle);
  console.log('404?', is404);
  console.log('Matn:', extText.replace(/\s+/g,' ').slice(0, 200));
  await page2.screenshot({ path: 'verify_2_lot.png' });
  await page2.close();

  // 4. Platforma filtri — xarid.uzex.uz
  console.log('\n=== Platforma filtri: xarid ===');
  await page.click('.platform-xarid');
  await page.waitForTimeout(3000);
  const xaridCount = await page.$eval('#resultInfo', el => el.textContent.trim()).catch(() => '');
  const xaridCard = await page.$('.card');
  const xaridBadge = xaridCard ? await xaridCard.$eval('.badge', el => el.textContent.trim()).catch(() => '') : '';
  console.log('Natija:', xaridCount);
  console.log('Birinchi karta platforma:', xaridBadge);
  await page.screenshot({ path: 'verify_3_xarid.png' });

  // 5. Qidiruv
  console.log('\n=== Qidiruv: kompyuter ===');
  await page.click('.platform-all');
  await page.waitForTimeout(1000);
  await page.fill('#searchInput', 'kompyuter');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  const searchResult = await page.$eval('#resultInfo', el => el.textContent.trim()).catch(() => '');
  console.log('Qidiruv natijasi:', searchResult);
  await page.screenshot({ path: 'verify_4_search.png' });

  // 6. Muddat filtri
  console.log('\n=== 7 kun filtr ===');
  await page.fill('#searchInput', '');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const btn7 = await page.$('.dl-btn:nth-child(4)');
  if (btn7) { await btn7.click(); await page.waitForTimeout(2500); }
  const deadlineResult = await page.$eval('#resultInfo', el => el.textContent.trim()).catch(() => '');
  console.log('7 kun filtr natijasi:', deadlineResult);

  await browser.close();
  console.log('\nScreenshotlar: verify_1_main.png, verify_2_lot.png, verify_3_xarid.png, verify_4_search.png');
})();
