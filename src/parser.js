const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

let cachedTenders = [];
let lastFetch = null;
let isFetching = false;

function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (/kompyuter|компьютер|принтер|ноутбук|планшет|сервер|монитор|программ|ekran|printer|noutbuk|dasturiy|интернет|wifi|цифров|смартфон|телефон|axborot tizim|avtomatlashtiril|it xizmat|it infra/.test(t)) return 'IT';
  if (/медицин|лекарственн|стерилизац|поликлиник|больниц|tibbiy|dori-darmon|шприц|бинт|стоматол|хирург|рентген|ультразвук|томограф|фармацевт|вакцин|протез|скорая помощ/.test(t)) return 'Tibbiy';
  if (/автомобил|автобус|грузов|тягач|прицеп|локомотив|вагон|самолет|мотоцикл|yuk mashin|avtobus/.test(t)) return 'Transport';
  if (/питани|озиқ-овқат|oziq-ovqat|гўшт|тухум|сабзавот|рыбн|крупа|консерв|ovqatlantir|oshxona|столовая|приготовлени/.test(t)) return 'Oziq-ovqat';
  if (/мебель|мебел|стул|стол |шкаф|кресло|диван|mebel|тумба|жалюзи/.test(t)) return 'Mebel';
  if (/реклам|reklama|баннер|билборд|вывеск|полиграф|типограф|bosma materiallar/.test(t)) return 'Reklama';
  if (/строительн|монтаж|қурилиш|qurilish|бино|иморат|йўл|асфальт|вентиляц|сантехн|канализ|кровл|фундамент|бетон|реконструкц|капитальн|inshoot|qurish|tamirlash/.test(t)) return 'Qurilish';
  if (/электр|кабел|провод|трансформатор|генератор|подстанц|счетчик|энергет|elektr|energetika/.test(t)) return 'Elektr va energetika';
  if (/нефт|топлив|бензин|дизель|мазут|уголь|нефтепродукт|neft|yoqilgi/.test(t)) return 'Neft va gaz';
  if (/металлоконструкц|металл|сталь|алюминий|трубы|арматур|прокат/.test(t)) return 'Metallurgiya';
  if (/химия|растворит|кислот|щелочь|лакокрасоч|химикат|kimyo/.test(t)) return 'Kimyo';
  if (/охрана|безопасност|сигнализац|видеонаблюд|пожар|xavfsizlik|qorovul/.test(t)) return 'Xavfsizlik';
  if (/уборк|клининг|санитар|дезинфекц|tozalash|tozalik/.test(t)) return 'Tozalash xizmatlari';
  if (/текстил|форменн|спецодежд|uniform|kiyim|mato|швейн|одежд|костюм|обувь/.test(t)) return 'Kiyim va tekstil';
  if (/тренинг|семинар|конференц|ta.lim|o.qit|университет|академия|ilmiy|tadqiqot/.test(t)) return "Ta'lim";
  if (/сельск|агропром|ветеринар|ирригац|qishloq xo|dehqon|traktor|комбайн|суғориш|гербицид/.test(t)) return "Qishloq xo'jaligi";
  if (/запчаст|ehtiyot qism|запасн|деталь|агрегат|комплектующ/.test(t)) return 'Ehtiyot qismlar';
  if (/аудит|бухгалтер|юридич|консалтинг|audit|молия|финанс|страхован/.test(t)) return 'Moliyaviy xizmatlar';
  if (/китоб|книг|kitob|adabiyot|литератур|nashr/.test(t)) return 'Kitob va nashr';
  if (/лаборатор|laborator|испытани|тестирован/.test(t)) return 'Laboratoriya';
  if (/bojxona|таможн|импорт|экспорт/.test(t)) return 'Bojxona va logistika';
  if (/спортив|стадион|бассейн|sport zal|trenajer/.test(t)) return 'Sport';
  if (/хизмат|услуг|servis|xizmat ko.rsat|обслужив|аутсорсинг|аренда|ijara|pasport|ekspertiza|сопровожд|texnik xizmat/.test(t)) return 'Xizmatlar';
  return 'Boshqa';
}

const REGION_MAP = {
  'город ташкент': 'Toshkent shahri',
  'г. ташкент': 'Toshkent shahri',
  'toshkent sh': 'Toshkent shahri',
  'toshkent sh.': 'Toshkent shahri',
  'toshkent shahri': 'Toshkent shahri',
  'ташкентская область': 'Toshkent viloyati',
  'toshkent viloyati': 'Toshkent viloyati',
  'toshkent oblast': 'Toshkent viloyati',
  'кашкадарьинская область': 'Qashqadaryo viloyati',
  'qashqadaryo viloyati': 'Qashqadaryo viloyati',
  'самаркандская область': 'Samarqand viloyati',
  'samarqand viloyati': 'Samarqand viloyati',
  'ферганская область': "Farg'ona viloyati",
  "farg'ona viloyati": "Farg'ona viloyati",
  'fergana viloyati': "Farg'ona viloyati",
  'андижанская область': 'Andijon viloyati',
  'andijon viloyati': 'Andijon viloyati',
  'наманганская область': 'Namangan viloyati',
  'namangan viloyati': 'Namangan viloyati',
  'сурхандарьинская область': 'Surxondaryo viloyati',
  'surxondaryo viloyati': 'Surxondaryo viloyati',
  'сырдарьинская область': 'Sirdaryo viloyati',
  'sirdaryo viloyati': 'Sirdaryo viloyati',
  'хорезмская область': 'Xorazm viloyati',
  'xorazm viloyati': 'Xorazm viloyati',
  'навоийская область': 'Navoiy viloyati',
  'navoiy viloyati': 'Navoiy viloyati',
  'джизакская область': 'Jizzax viloyati',
  'jizzax viloyati': 'Jizzax viloyati',
  'бухарская область': 'Buxoro viloyati',
  'buxoro viloyati': 'Buxoro viloyati',
  'республика каракалпакстан': "Qoraqalpog'iston",
  'karakalpakstan': "Qoraqalpog'iston",
  "qoraqalpog'iston respublikasi": "Qoraqalpog'iston",
  "qoraqalpog'iston": "Qoraqalpog'iston",
};

function normalizeRegion(name) {
  if (!name) return '';
  return REGION_MAP[name.toLowerCase()] || name;
}

function normalizeCurrency(name) {
  if (!name) return "So'm";
  if (/узбекск|so'm|сум|uzs/i.test(name)) return "So'm";
  if (/доллар|dollar|usd/i.test(name)) return 'USD';
  if (/евро|euro|eur/i.test(name)) return 'EUR';
  return name;
}

// ── XARID — to'g'ridan axios bilan (Playwright o'rniga) ──
async function fetchFromXarid() {
  const apiUrl = 'https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList';
  const pageSize = 20;
  const allLots = [];

  try {
    // Birinchi sahifani olish
    const firstRes = await axios.post(apiUrl,
      { region_ids: [], from: 1, to: pageSize },
      { httpsAgent, timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );
    const firstBatch = firstRes.data;
    if (!Array.isArray(firstBatch) || firstBatch.length === 0) {
      console.log('xarid: ma\'lumot olinmadi');
      return [];
    }
    allLots.push(...firstBatch);

    // Umumiy soni birinchi elementdan
    const totalCount = firstBatch[0]?.total_count || firstBatch.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    console.log(`xarid: jami ${totalCount} lot, ${totalPages} sahifa`);

    // Qolgan sahifalarni parallel olish
    for (let batchStart = 2; batchStart <= totalPages; batchStart += 5) {
      const batchEnd = Math.min(batchStart + 4, totalPages);
      const pageNums = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);

      const results = await Promise.allSettled(pageNums.map(async p => {
        const r = await axios.post(apiUrl,
          { region_ids: [], from: (p - 1) * pageSize + 1, to: p * pageSize },
          { httpsAgent, timeout: 15000, headers: { 'Content-Type': 'application/json' } }
        );
        return r.data;
      }));

      let gotData = false;
      for (const r of results) {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
          allLots.push(...r.value);
          gotData = true;
        }
      }
      if (!gotData) break;
    }
  } catch(e) {
    console.log('xarid: ma\'lumot olinmadi -', e.message);
    return [];
  }

  console.log(`xarid: ${allLots.length} lot olindi`);
  const now = new Date();
  return allLots.map(lot => {
    const deadline = new Date(lot.end_date);
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const title = lot.category_name || "Noma'lum";
    return {
      id: `xarid_${lot.id}`,
      title,
      category: detectCategory(title),
      platform: 'xarid',
      platformName: 'xarid.uzex.uz',
      price: lot.start_cost != null ? Math.round(lot.start_cost).toLocaleString('ru') : '0',
      currency: normalizeCurrency(lot.currency_name),
      customer: lot.customer_type || '',
      location: normalizeRegion(lot.region_name || ''),
      district: lot.district_name || '',
      deadline: lot.end_date,
      daysLeft,
      url: `https://xarid.uzex.uz/auction/detail/${lot.id}`,
      isNew: daysLeft >= 5,
      displayNo: lot.display_no
    };
  });
}

// ── ETENDER ──
async function fetchFromEtender() {
  const apiUrl = 'https://apietender.uzex.uz/api/common/TradeList';
  const pageSize = 10;
  const headers = { 'Content-Type': 'application/json' };
  const body = (from, to) => ({
    sub_user_id: null, price_Min: null, price_Max: null, status_Id: null,
    provider_Tin: null, provider_Name: null, start_Date: null, end_Date: null,
    currency_Id: null, from, to, typeid: 1, System_Id: 0
  });

  let firstBatch = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const firstRes = await axios.post(apiUrl, body(1, pageSize),
        { httpsAgent, timeout: 30000, headers }
      );
      if (Array.isArray(firstRes.data) && firstRes.data.length > 0) {
        firstBatch = firstRes.data;
        break;
      }
    } catch(e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!firstBatch) return [];

  const totalCount = firstBatch[0].total_count || firstBatch.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  console.log(`etender: jami ${totalCount} tender, ${totalPages} sahifa`);

  const allTrades = [...firstBatch];

  for (let batchStart = 2; batchStart <= totalPages; batchStart += 10) {
    const batchEnd = Math.min(batchStart + 9, totalPages);
    const pageNums = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);

    const results = await Promise.allSettled(pageNums.map(p => {
      const from = (p - 1) * pageSize + 1;
      const to = p * pageSize;
      return axios.post(apiUrl, body(from, to),
        { httpsAgent, timeout: 30000, headers }
      ).then(r => r.data);
    }));

    let gotData = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        allTrades.push(...r.value);
        gotData = true;
      }
    }
    if (!gotData) break;
  }

  console.log(`etender: ${allTrades.length} tender olindi`);
  const now = new Date();
  return allTrades.map(trade => {
    const deadline = new Date(trade.end_date);
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const title = trade.name || "Noma'lum";
    return {
      id: `etender_${trade.id}`,
      title,
      category: detectCategory(title),
      platform: 'etender',
      platformName: 'etender.uzex.uz',
      price: trade.cost != null ? Math.round(trade.cost).toLocaleString('ru') : '0',
      currency: normalizeCurrency(trade.currency_name),
      customer: trade.seller_name || '',
      location: normalizeRegion(trade.region_name || ''),
      district: trade.district_name || '',
      deadline: trade.end_date,
      daysLeft,
      url: `https://etender.uzex.uz/lot/${trade.id}`,
      isNew: daysLeft >= 5,
      displayNo: trade.display_no
    };
  });
}

// ── XT-XARID ──
async function fetchFromXT() {
  const XTTypes = [
    { name: 'Тендер', ref: 'ref_tender_public', filters: {}, active: new Set(['submitted','open','open_bids','check_docs','docs_objections','commercial_checking']), urlPath: 'tender' },
    { name: 'Аукцион', ref: 'ref_reduction_object_public', filters: { local_reduction: false }, active: new Set(['publicated']), urlPath: 'procedure/auction' },
    { name: 'Маҳаллий аукцион', ref: 'ref_reduction_object_public', filters: { local_reduction: true }, active: new Set(['publicated']), urlPath: 'procedure/local_auction' },
    { name: 'Таклифлар сўрови', ref: 'ref_request_proposals_public', filters: {}, active: new Set(['open','check_proposals']), urlPath: 'procedure/price_request' },
  ];

  const limit = 100;
  const allTrades = [];

  for (const type of XTTypes) {
    try {
      let typeCount = 0;
      for (let offset = 0; offset < 5000; offset += limit) {
        const r = await axios.post('https://api.xt-xarid.uz/rpc',
          { id: 1, jsonrpc: '2.0', method: 'ref', params: { ref: type.ref, op: 'read', limit, offset, filters: type.filters } },
          { httpsAgent, timeout: 20000, headers: { 'Content-Type': 'application/json' } }
        );
        const batch = r.data.result;
        if (!batch || batch.length === 0) break;
        const active = batch.filter(t => type.active.has(t.status));
        active.forEach(t => { t._xtType = type.name; t._urlPath = type.urlPath; });
        allTrades.push(...active);
        typeCount += active.length;
        if (batch.length < limit) break;
      }
      console.log(`xt-xarid [${type.name}]: ${typeCount} faol`);
    } catch(e) {
      console.error(`xt-xarid [${type.name}] xatolik:`, e.message);
    }
  }

  console.log(`xt-xarid: ${allTrades.length} faol jami`);
  const now = new Date();
  return allTrades.map(t => {
    const meta = t.meta || {};
    const goodMaps = meta.good_maps || [];
    const title = t.product_name || (goodMaps.length > 0 ? goodMaps[0].name : '') || t.name || t.category_name || "Noma'lum";
    const areaPath = meta.area_path || [];
    const oblast = areaPath.find(a => a.path && a.path.split('.').length === 3);
    const location = normalizeRegion(oblast ? oblast.name : (t.region_name || ''));
    const rawDeadline = t.close_at || t.end_date || null;
    const deadline = rawDeadline ? new Date(rawDeadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : 999;
    const price = t.totalcost ?? t.start_price ?? t.price ?? null;
    return {
      id: `xt_${t._xtType}_${t.id}`,
      title,
      category: detectCategory(title),
      platform: 'xt',
      platformName: 'xt-xarid.uz',
      price: price != null ? Math.round(price).toLocaleString('ru') : '0',
      currency: normalizeCurrency(t.currency || t.currency_name || 'UZS'),
      customer: t.company_name || meta.company_name || '',
      location,
      district: t.district_name || '',
      deadline: rawDeadline,
      daysLeft,
      url: `https://xt-xarid.uz/procedure/${t.id}/core`,
      isNew: daysLeft >= 5,
      displayNo: String(t.id),
      procedureType: t._xtType
    };
  });
}

async function doFetch() {
  isFetching = true;
  try {
    const [xaridRes, etenderRes, xtRes] = await Promise.allSettled([
      fetchFromXarid(),
      fetchFromEtender(),
      fetchFromXT()
    ]);

    const xarid   = xaridRes.status   === 'fulfilled' ? xaridRes.value   : [];
    const etender = etenderRes.status === 'fulfilled' ? etenderRes.value : [];
    const xt      = xtRes.status      === 'fulfilled' ? xtRes.value      : [];

    if (xaridRes.status   === 'rejected') console.error('xarid xatolik:',   xaridRes.reason?.message);
    if (etenderRes.status === 'rejected') console.error('etender xatolik:', etenderRes.reason?.message);
    if (xtRes.status      === 'rejected') console.error('xt-xarid xatolik:', xtRes.reason?.message);

    cachedTenders = [...etender, ...xarid, ...xt];
    lastFetch = Date.now();
    console.log(`Jami: ${cachedTenders.length} (etender: ${etender.length}, xarid: ${xarid.length}, xt: ${xt.length})`);
    return cachedTenders;
  } finally {
    isFetching = false;
  }
}

async function getAllTenders() {
  if (cachedTenders.length > 0 && lastFetch && (Date.now() - lastFetch) < 21600000) {
    return cachedTenders;
  }
  if (isFetching) {
    if (cachedTenders.length > 0) return cachedTenders;
    while (isFetching) await new Promise(r => setTimeout(r, 500));
    return cachedTenders;
  }
  console.log("Ma'lumot olinmoqda...");
  return doFetch();
}

async function refreshCache() {
  console.log('Cache yangilanmoqda...');
  return doFetch();
}

function getCacheStatus() {
  return {
    ready: cachedTenders.length > 0,
    count: cachedTenders.length,
    isFetching,
    lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
    nextFetch: lastFetch ? new Date(lastFetch + 21600000).toISOString() : null
  };
}

module.exports = { getAllTenders, refreshCache, getCacheStatus };
