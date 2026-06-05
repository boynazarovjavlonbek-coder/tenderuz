const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

const rpc = async (params) => {
  const r = await axios.post('https://api.xt-xarid.uz/rpc',
    { id: 1, jsonrpc: '2.0', method: 'ref', params },
    { httpsAgent: agent, timeout: 20000, headers: { 'Content-Type': 'application/json' } }
  );
  return r.data.result || [];
};

const countAll = async (ref, filters = {}) => {
  const statusCount = {};
  let total = 0;
  for (let offset = 0; offset < 5000; offset += 100) {
    const batch = await rpc({ ref, op: 'read', limit: 100, offset, filters });
    if (!batch || batch.length === 0) break;
    batch.forEach(t => { statusCount[t.status || 'unknown'] = (statusCount[t.status || 'unknown'] || 0) + 1; });
    total += batch.length;
    if (batch.length < 100) break;
  }
  return { total, statusCount };
};

(async () => {
  const types = [
    { name: 'Тендер',            ref: 'ref_tender_public',          filters: {} },
    { name: 'Аукцион',           ref: 'ref_reduction_object_public', filters: { local_reduction: false } },
    { name: 'Маҳаллий аукцион',  ref: 'ref_reduction_object_public', filters: { local_reduction: true } },
    { name: 'Ҳадли келишув',     ref: 'ref_master_agreement_public', filters: {} },
    { name: 'Таклифлар сўрови',  ref: 'ref_request_proposals_public',filters: {} },
    { name: 'Дўкон',             ref: 'ref_online_shop_public',      filters: { is_national: false } },
    { name: 'Миллий дўкон',      ref: 'ref_online_shop_public',      filters: { is_national: true } },
  ];

  for (const t of types) {
    try {
      const { total, statusCount } = await countAll(t.ref, t.filters);
      console.log(`\n${t.name} (${t.ref}): ${total} jami`);
      console.log('  Statuslar:', statusCount);
    } catch(e) {
      console.log(`\n${t.name}: XATO -`, e.response?.status || e.message);
    }
  }
})();
