const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  const rpc = async (method, params) => {
    const r = await axios.post('https://api.xt-xarid.uz/rpc', {
      id: 1, jsonrpc: '2.0', method, params
    }, { httpsAgent: agent, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
    return r.data;
  };

  // Try with all=true to get all fields
  const res = await rpc('ref', {
    ref: 'ref_tender_public',
    op: 'read',
    limit: 5,
    offset: 0,
    filters: { status: ['submitted','open','open_bids','open_results'] },
  });

  console.log('Result count:', res.result?.length);
  if (res.result?.[0]) {
    console.log('\nAll keys:', Object.keys(res.result[0]));
    console.log('First 3 items:');
    res.result.slice(0,3).forEach((t,i) => console.log(`\n[${i}]`, JSON.stringify(t, null, 2)));
  }
  if (res.error) console.log('RPC Error:', JSON.stringify(res.error));

  // Also try count
  const cnt = await rpc('ref', {
    ref: 'ref_tender_public',
    op: 'count',
    filters: {},
  });
  console.log('\nTotal count:', cnt.result);
})().catch(e => console.error('ERROR:', e.response?.data || e.message));
