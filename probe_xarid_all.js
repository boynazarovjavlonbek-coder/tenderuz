const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  // Try direct call with SSL bypass
  const url = 'https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList';

  // First page to see total
  try {
    const r = await axios.post(url,
      { region_ids: [], from: 1, to: 20 },
      { httpsAgent: agent, timeout: 10000, headers: { 'Content-Type': 'application/json', 'Origin': 'https://xarid.uzex.uz', 'Referer': 'https://xarid.uzex.uz/' } }
    );
    console.log('Direct API works! Count:', r.data.length);
    console.log('First item keys:', Object.keys(r.data[0] || {}));
    if (r.data[0]) console.log('has_total_count field:', r.data[0].total_count, r.data[0].has_active_notif);

    // Try to get page 2
    const r2 = await axios.post(url,
      { region_ids: [], from: 21, to: 40 },
      { httpsAgent: agent, timeout: 10000, headers: { 'Content-Type': 'application/json', 'Origin': 'https://xarid.uzex.uz', 'Referer': 'https://xarid.uzex.uz/' } }
    );
    console.log('Page 2 count:', r2.data.length);

    // Count endpoint?
    const r3 = await axios.post('https://xarid-api-auction.uzex.uz/Common/GetLotsCount',
      { region_ids: [] },
      { httpsAgent: agent, timeout: 5000, headers: { 'Content-Type': 'application/json', 'Origin': 'https://xarid.uzex.uz' } }
    ).catch(() => null);
    if (r3) console.log('GetLotsCount:', r3.data);

  } catch(e) {
    console.log('ERROR:', e.response?.status, e.message);
  }
})();
