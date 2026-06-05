const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('uzex') && (req.method() === 'POST' || url.includes('api'))) {
      apiCalls.push({ method: req.method(), url, body: (req.postData()||'').slice(0,300) });
    }
  });

  // 1. Asosiy sahifa
  console.log('=== 1. etender.uzex.uz saytini ochish ===');
  await page.goto('https://etender.uzex.uz', { timeout: 40000 });
  await page.waitForTimeout(12000);
  const title = await page.title();
  const txt = await page.evaluate(() => document.body.innerText.slice(0,800));
  console.log('Title:', title);
  console.log('Matn:', txt.replace(/\s+/g,' ').slice(0,400));
  console.log('\nAPI calllar (sahifa yuklanishida):');
  apiCalls.forEach(c => {
    console.log(' ', c.method, c.url.slice(0,120));
    if (c.body.length > 2) console.log('   body:', c.body.slice(0,150));
  });
  apiCalls.length = 0;

  // 2. Direct API testlar
  console.log('\n=== 2. Direct API testlar (loginsiz) ===');
  const tests = [
    ['POST', 'https://apietender.uzex.uz/api/common/TradeList',
      { sub_user_id:null, price_Min:null, price_Max:null, status_Id:null,
        provider_Tin:null, provider_Name:null, start_Date:null, end_Date:null,
        currency_Id:null, from:1, to:5, typeid:1, System_Id:0 }],
    ['GET',  'https://apietender.uzex.uz/api/common/GetStatuses', null],
    ['GET',  'https://apietender.uzex.uz/api/common/Statistic', null],
    ['GET',  'https://apietender.uzex.uz/api/lot/GetLot?id=1', null],
    ['GET',  'https://etender.uzex.uz/api/lots', null],
  ];

  for (const [method, url, body] of tests) {
    try {
      const r = method === 'POST'
        ? await axios.post(url, body, { httpsAgent, timeout:8000, headers:{'Content-Type':'application/json'} })
        : await axios.get(url, { httpsAgent, timeout:8000 });
      const preview = JSON.stringify(r.data).slice(0,200);
      const count = Array.isArray(r.data) ? r.data.length : (r.data?.total_count || '?');
      console.log('OK', method, url.replace('https://apietender.uzex.uz',''), '| status:', r.status, '| count:', count);
      console.log('  ', preview);
    } catch(e) {
      console.log('XX', method, url.replace('https://apietender.uzex.uz',''), '->', e.response?.status || e.message);
    }
  }

  // 3. Browser header capture bilan test
  console.log('\n=== 3. Browser orqali header capture ===');
  let capturedHeaders = null;
  let capturedData = null;
  await page.route('**/api/common/TradeList', async (route, request) => {
    capturedHeaders = { ...request.headers() };
    const res = await route.fetch();
    try { capturedData = await res.json(); } catch(e) {}
    await route.fulfill({ response: res });
  });
  await page.goto('https://etender.uzex.uz', { timeout:30000 });
  await page.waitForTimeout(12000);

  if (capturedHeaders) {
    console.log('Header kalitlari:', Object.keys(capturedHeaders).join(', '));
    const authHeaders = Object.entries(capturedHeaders).filter(([k]) =>
      k.toLowerCase().includes('auth') || k.toLowerCase().includes('token') ||
      k.toLowerCase().includes('valid') || k.toLowerCase().includes('session')
    );
    console.log('Auth headerlar:', authHeaders.map(([k,v]) => `${k}: ${v.slice(0,50)}`).join('\n  '));
    if (capturedData) {
      const count = Array.isArray(capturedData) ? capturedData.length : '?';
      console.log('Birinchi response:', count, 'ta yozuv');
      if (Array.isArray(capturedData) && capturedData[0]) {
        console.log('Birinchi yozuv kalitlari:', Object.keys(capturedData[0]).join(', '));
        console.log('total_count:', capturedData[0].total_count);
        console.log('status_id:', capturedData[0].status_id, '| status_name:', capturedData[0].status_name);
      }
    }

    // Captured headers bilan barcha sahifalarni yuklaymiz
    console.log('\n=== 4. Captured headers bilan barcha lotlar ===');
    try {
      const r = await axios.post('https://apietender.uzex.uz/api/common/TradeList',
        { sub_user_id:null, price_Min:null, price_Max:null, status_Id:null,
          provider_Tin:null, provider_Name:null, start_Date:null, end_Date:null,
          currency_Id:null, from:1, to:1, typeid:1, System_Id:0 },
        { httpsAgent, timeout:10000, headers: capturedHeaders }
      );
      const total = Array.isArray(r.data) && r.data[0] ? r.data[0].total_count : '?';
      console.log('Jami lotlar soni (total_count):', total);

      // Statuslar bo'yicha
      const statusR = await axios.post('https://apietender.uzex.uz/api/common/TradeList',
        { sub_user_id:null, price_Min:null, price_Max:null, status_Id:null,
          provider_Tin:null, provider_Name:null, start_Date:null, end_Date:null,
          currency_Id:null, from:1, to:100, typeid:1, System_Id:0 },
        { httpsAgent, timeout:10000, headers: capturedHeaders }
      );
      const statuses = {};
      (statusR.data || []).forEach(t => {
        const k = `${t.status_id}:${t.status_name}`;
        statuses[k] = (statuses[k]||0) + 1;
      });
      console.log('Statuslar (birinchi 100ta):', JSON.stringify(statuses));
    } catch(e) {
      console.log('Xato:', e.response?.status, e.message);
    }
  } else {
    console.log('Header capture ishlamadi');
  }

  await browser.close();
})();
