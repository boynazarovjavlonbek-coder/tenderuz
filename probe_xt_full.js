const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

const rpc = async (params) => {
  const r = await axios.post('https://api.xt-xarid.uz/rpc',
    { id: 1, jsonrpc: '2.0', method: 'ref', params },
    { httpsAgent: agent, timeout: 20000, headers: { 'Content-Type': 'application/json' } }
  );
  return r.data;
};

(async () => {
  // Scan all pages to understand total distribution
  const statusCount = {};
  let totalFetched = 0;
  const limit = 100;

  for (let offset = 0; offset < 3000; offset += limit) {
    try {
      const res = await rpc({ ref: 'ref_tender_public', op: 'read', limit, offset, filters: {} });
      const batch = res.result || [];
      if (batch.length === 0) { console.log(`offset ${offset}: empty, stopping`); break; }

      batch.forEach(t => { statusCount[t.status] = (statusCount[t.status] || 0) + 1; });
      totalFetched += batch.length;
      console.log(`offset ${offset}: ${batch.length} items, total: ${totalFetched}, statuses so far:`, statusCount);

      if (batch.length < limit) { console.log('Last page reached'); break; }
    } catch(e) {
      console.log(`offset ${offset}: ERROR ${e.response?.status || e.message}`);
      break;
    }
  }

  console.log('\n=== FINAL ===');
  console.log('Total fetched:', totalFetched);
  console.log('Status distribution:', statusCount);
})();
