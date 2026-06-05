const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  const rpc = async (method, params) => {
    const r = await axios.post('https://api.xt-xarid.uz/rpc', {
      id: 1, jsonrpc: '2.0', method, params
    }, { httpsAgent: agent, timeout: 10000, headers: { 'Content-Type': 'application/json' } });
    return r.data;
  };

  const res = await rpc('ref', {
    ref: 'ref_tender_public',
    op: 'read',
    limit: 10,
    offset: 0,
    filters: {},
    fields: ['id','publicated_at','status','name','good_count','close_at','budget','currency','region_name','customer_name','category_name','lot_count']
  });

  console.log('Result count:', res.result?.length);
  if (res.result?.[0]) {
    console.log('\nFirst item keys:', Object.keys(res.result[0]));
    console.log('First item:', JSON.stringify(res.result[0], null, 2));
  }
  if (res.error) console.log('RPC Error:', res.error);
})().catch(e => console.error('HTTP ERROR:', e.response?.data || e.message));
