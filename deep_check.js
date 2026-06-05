const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000', { timeout: 20000 });
  await page.waitForTimeout(4000);

  // Barcha kartalarni o'qib chiqamiz
  const cards = await page.$$eval('.card', els => els.map(el => ({
    title:    el.querySelector('.card-title')?.textContent?.trim() || '',
    platform: el.querySelector('.badge')?.textContent?.trim() || '',
    customer: el.querySelector('.meta-item')?.textContent?.trim() || '',
    price:    el.querySelector('.price')?.textContent?.trim() || '',
    deadline: el.querySelector('.deadline-chip')?.textContent?.trim() || '',
    chips:    [...el.querySelectorAll('.cat-chip,.proc-chip')].map(c => c.textContent.trim()),
    url:      el.getAttribute('href') || ''
  })));

  console.log('=== BIRINCHI 20 TA KARTA ===\n');
  cards.forEach((c, i) => {
    console.log(`[${i+1}] ${c.platform}`);
    console.log(`  Sarlavha: ${c.title}`);
    console.log(`  Mijoz: ${c.customer}`);
    console.log(`  Narx: ${c.price}`);
    console.log(`  Muddat: ${c.deadline}`);
    console.log(`  Chips: ${c.chips.join(', ')}`);
    console.log(`  URL: ${c.url}`);
    console.log();
  });

  await page.screenshot({ path: 'deep_main.png', fullPage: false });

  // etender ga o'tamiz
  await page.click('.platform-etender');
  await page.waitForTimeout(3000);
  const etenderCards = await page.$$eval('.card', els => els.slice(0,5).map(el => ({
    title: el.querySelector('.card-title')?.textContent?.trim() || '',
    customer: el.querySelector('.meta-item')?.textContent?.trim() || '',
    price: el.querySelector('.price')?.textContent?.trim() || '',
    deadline: el.querySelector('.deadline-chip')?.textContent?.trim() || '',
    url: el.getAttribute('href') || ''
  })));
  console.log('=== ETENDER (5 ta) ===');
  etenderCards.forEach((c,i) => console.log(`[${i+1}] "${c.title}" | ${c.price} | ${c.deadline} | ${c.customer}`));
  await page.screenshot({ path: 'deep_etender.png' });

  // xarid ga o'tamiz
  await page.click('.platform-xarid');
  await page.waitForTimeout(3000);
  const xaridCards = await page.$$eval('.card', els => els.slice(0,5).map(el => ({
    title: el.querySelector('.card-title')?.textContent?.trim() || '',
    customer: el.querySelector('.meta-item')?.textContent?.trim() || '',
    price: el.querySelector('.price')?.textContent?.trim() || '',
    deadline: el.querySelector('.deadline-chip')?.textContent?.trim() || '',
    url: el.getAttribute('href') || ''
  })));
  console.log('\n=== XARID.UZEX.UZ (5 ta) ===');
  xaridCards.forEach((c,i) => console.log(`[${i+1}] "${c.title}" | ${c.price} | ${c.deadline} | ${c.customer}`));
  await page.screenshot({ path: 'deep_xarid.png' });

  // xt ga o'tamiz
  await page.click('.platform-xt');
  await page.waitForTimeout(3000);
  const xtCards = await page.$$eval('.card', els => els.slice(0,5).map(el => ({
    title: el.querySelector('.card-title')?.textContent?.trim() || '',
    customer: el.querySelector('.meta-item')?.textContent?.trim() || '',
    price: el.querySelector('.price')?.textContent?.trim() || '',
    deadline: el.querySelector('.deadline-chip')?.textContent?.trim() || '',
    chips: [...el.querySelectorAll('.cat-chip,.proc-chip')].map(c => c.textContent.trim()),
    url: el.getAttribute('href') || ''
  })));
  console.log('\n=== XT-XARID.UZ (5 ta) ===');
  xtCards.forEach((c,i) => console.log(`[${i+1}] "${c.title}" | ${c.price} | ${c.deadline} | ${c.chips.join(',')} | ${c.customer}`));
  await page.screenshot({ path: 'deep_xt.png' });

  await browser.close();
})();
