const axios = require('axios');
const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const rpc = async (ref, filters = {}) => {
  let total = 0;
  const statuses = {};
  for (let offset = 0; offset < 10000; offset += 100) {
    const r = await axios.post('https://api.xt-xarid.uz/rpc',
      { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref, op: 'read', limit: 100, offset, filters } },
      { httpsAgent, timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );
    const batch = r.data.result || [];
    if (!batch.length) break;
    batch.forEach(t => { statuses[t.status] = (statuses[t.status] || 0) + 1; });
    total += batch.length;
    if (batch.length < 100) break;
  }
  return { total, statuses };
};

(async () => {
  console.log('=== xt-xarid.uz — barcha protsedura turlari ===\n');

  const xtTypes = [
    { name: 'Тендер',           ref: 'ref_tender_public',           filters: {} },
    { name: 'Аукцион',          ref: 'ref_reduction_object_public',  filters: { local_reduction: false } },
    { name: 'Маҳаллий аукцион', ref: 'ref_reduction_object_public',  filters: { local_reduction: true } },
    { name: 'Таклифлар сўрови', ref: 'ref_request_proposals_public', filters: {} },
    { name: 'Дўкон',            ref: 'ref_online_shop_public',       filters: {} },
    { name: 'Ҳадли келишув',    ref: 'ref_master_agreement_public',  filters: {} },
  ];

  const activeStatuses = {
    'ref_tender_public':          new Set(['submitted','open','open_bids','check_docs','docs_objections','commercial_checking']),
    'ref_reduction_object_public': new Set(['publicated']),
    'ref_request_proposals_public': new Set(['open','check_proposals']),
    'ref_online_shop_public':      new Set(['publicated','open','active']),
    'ref_master_agreement_public': new Set(['open','publicated','active']),
  };

  let xtTotal = 0;
  for (const t of xtTypes) {
    try {
      const { total, statuses } = await rpc(t.ref, t.filters);
      const active = activeStatuses[t.ref];
      const activeCount = active
        ? Object.entries(statuses).filter(([s]) => active.has(s)).reduce((a, [,v]) => a+v, 0)
        : total;
      xtTotal += activeCount;
      console.log(`${t.name}: jami=${total}, faol=${activeCount}`);
      console.log(`  Statuslar: ${JSON.stringify(statuses)}`);
    } catch(e) {
      console.log(`${t.name}: XATO — ${e.message}`);
    }
  }
  console.log(`\nxt-xarid JAMI faol: ${xtTotal}`);
  console.log(`Bizdagi: 3330`);

  // xarid.uzex.uz
  console.log('\n=== xarid.uzex.uz ===');
  try {
    const r = await axios.post(
      'https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList',
      { region_ids: [], from: 1, to: 1 },
      { httpsAgent, timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Direct API response status:', r.status);
  } catch(e) {
    console.log('Direct API (headersiz):', e.response?.status || e.message);
    console.log('(Bu normal — browser session kerak)');
  }
  console.log('Bizdagi xarid: 492 (browser orqali yig\'ilgan)');
})();
