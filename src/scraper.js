const { chromium } = require('playwright');

let cachedTenders = [];
let lastFetch = null;

async function fetchFromXarid() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let lotsData = [];

  page.on('response', async (response) => {
    if (response.url().includes('GetMinimizedLotsList')) {
      try {
        const json = await response.json();
        lotsData = json;
      } catch(e) {}
    }
  });

  await page.goto('https://xarid.uzex.uz/auction/list', { timeout: 30000 });
  await page.waitForTimeout(8000);
  await browser.close();

  return lotsData.map(lot => {
    const deadline = new Date(lot.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    return {
      id: String(lot.id),
      title: lot.category_name || 'Noma\'lum',
      category: 'Umumiy',
      platform: 'xarid',
      platformName: 'xarid.uzex.uz',
      price: lot.start_cost?.toLocaleString('ru') || '0',
      currency: lot.currency_name || 'So\'m',
      customer: lot.customer_type || '',
      location: lot.region_name || '',
      district: lot.district_name || '',
      deadline: lot.end_date,
      daysLeft: daysLeft,
      url: `https://xarid.uzex.uz/auction/lot/${lot.id}`,
      isNew: daysLeft > 5,
      displayNo: lot.display_no
    };
  });
}

async function getAllTenders() {
  const now = Date.now();
  // Cache: 1 soat
  if (cachedTenders.length > 0 && lastFetch && (now - lastFetch) < 3600000) {
    console.log('Cache dan qaytarilmoqda:', cachedTenders.length, 'ta tender');
    return cachedTenders;
  }

  console.log('Yangi ma\'lumot olinmoqda...');
  try {
    const xaridLots = await fetchFromXarid();
    cachedTenders = xaridLots;
    lastFetch = now;
    console.log('Jami:', cachedTenders.length, 'ta tender olindi');
    return cachedTenders;
  } catch(err) {
    console.error('Xatolik:', err.message);
    return cachedTenders;
  }
}

module.exports = { getAllTenders };