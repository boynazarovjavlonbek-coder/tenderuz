const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  // Try POST TradeList with various bodies
  const bodies = [
    {},
    { page: 1, pageSize: 20 },
    { PageNumber: 1, PageSize: 20 },
    { page: 1, pageSize: 20, status: 1 },
    { regionId: 0, categoryId: 0, page: 1, pageSize: 20 },
  ];

  for (const body of bodies) {
    try {
      const r = await axios.post(
        'https://apietender.uzex.uz/api/common/TradeList',
        body,
        { httpsAgent: agent, timeout: 10000, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
      );
      console.log('SUCCESS with body:', JSON.stringify(body));
      const data = r.data;
      if (Array.isArray(data)) {
        console.log('Count:', data.length);
        console.log('First item keys:', Object.keys(data[0] || {}));
        console.log('First item:', JSON.stringify(data[0]).slice(0, 400));
      } else {
        console.log('Response:', JSON.stringify(data).slice(0, 400));
      }
      break;
    } catch(e) {
      console.log('FAIL with body:', JSON.stringify(body), '->', e.response?.status || e.message);
    }
  }
})();
