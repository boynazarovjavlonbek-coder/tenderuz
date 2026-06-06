const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

const XARID_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgH8lx9sqVlIPIPvXSzzMOM1a0QjQ
7oFbQKNntR4ckpa5pczfsLDDb0fzVz0FvImpgncTZLSJHAlaU4S/6EVmgPSgMm8n
6pjKBGKQKlKQ6AHgVK3aaZ95fvsXezIETlIfP2YITMhbtlwV2uUvqlwGc2xrBrsd
uscHPwmkfEiflDJ/AgMBAAE=
-----END PUBLIC KEY-----`;

function generateXaridValidation(url) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const message = `${url}~${dd}.${mm}.${d.getFullYear()}`;
  return crypto.publicEncrypt(
    { key: XARID_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(message)
  ).toString('base64');
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

let cachedTenders = [];
let lastFetch = null;
let isFetching = false;

function detectCategory(title) {
  const t = (title || '').toLowerCase();

  // IT
  if (/kompyuter|компьютер|принтер|ноутбук|планшет|сервер|монитор|программ|ekran|printer|noutbuk|dasturiy|интернет|wifi|цифров|смартфон|телефон|axborot tizim|avtomatlashtiril|it xizmat|it infra|картридж|kartridj|smm|media.xat|автоматлашт|ахборот тизим|дастурий таъм|иш станция|арм\b|rfid|gps trek|светофор|svetofor|optik tola|optik kabel|оптик кабел|оптический кабел|swift.*tizim|tizim.*swift|biznes.analitik|bi report|telekommunikat|телекоммуникат|raqamli fortepiano/.test(t)) return 'IT';

  // Tibbiy
  if (/медицин|лекарственн|стерилизац|поликлиник|больниц|tibbiy|dori-darmon|шприц|бинт|стоматол|хирург|рентген|ультразвук|томограф|фармацевт|вакцин|протез|скорая помощ|гастроскоп|эндоскоп|sekvenator|sekvenserlar|секвенс|videogastroskop|rengen apparat|raqamli.*rengen/.test(t)) return 'Tibbiy';

  // Transport
  if (/автомобил|автобус|грузов|тягач|прицеп|локомотив|вагон|самолет|мотоцикл|yuk mashin|avtobus|yuk tashish|юк ташиш|авиац|самосвал|samosvol|konteyner tashish|контейнер.*ташиш|yarim vagon|temir yo.l.*tashish|temir yo.l.*xizmat|lizing.*avto|tashish xizmat/.test(t)) return 'Transport';

  // Oziq-ovqat
  if (/питани|озиқ-овқат|oziq-ovqat|гўшт|тухум|сабзавот|рыбн|крупа|консерв|ovqatlantir|oshxona|столовая|приготовлени|taomlarni|маккажохори|кукуруза|резепт|resept|овкат\b|ovqat\b|овқат\b|issiq ovqat|иссиқ овқат|иссик овкат|завтрак|пархез|parhez|ovqatlan|сог.лом тао|soğlom tao|uch mahal|уч маҳал|иссик ов|parchali|пар.хез/.test(t)) return 'Oziq-ovqat';

  // Mebel
  if (/мебель|мебел|стул|стол |шкаф|кресло|диван|mebel|тумба|жалюзи/.test(t)) return 'Mebel';

  // Reklama
  if (/реклам|reklama|баннер|билборд|вывеск|полиграф|типограф|bosma materiallar|matbaa|матбаа|стенд\b|stend\b|marketing|маркетинг|videorolik|видеоролик|brend\b|бренд\b|targ.ib|тарғиб|kommunikatsiya.*plat|televizion.*loyiha/.test(t)) return 'Reklama';

  // Neft va gaz (Qurilishdan oldin, chunki burg'ilash va quduq ham bor)
  if (/нефт|топлив|бензин|дизель|мазут|нефтепродукт|neft|yoqilgi|антрацит|odorant|одорант|кокс\b|геофизик|geofizik|burg.ilash.*quduq|quduq.*burg.ilash|машъала|mashala|мaш.ал\b|mash.al\b|скважин|skvajin|нгкчб|шнгкчб|ngqchb|shngqchb|oltingugurt|олтингугурт|neft.*rezervu|gaz.*rezervuar|антикоррозион.*труб|yoqilgi.*rezerv/.test(t)) return 'Neft va gaz';

  // Qurilish
  if (/строительн|монтаж|қурилиш|qurilish|бино|иморат|йўл|асфальт|вентиляц|сантехн|канализ|кровл|фундамент|бетон|реконструкц|капитальн|inshoot|qurish|tamirlash|suv tarmog|ichimlik suvi|дарё\b|daryo|портлатиш|portlatish|взрыв.раб|дамба\b|damba\b|тўғон\b|to.g.on\b|шпор\b|obodonlashtirish|smeta hujjat|лойиха.смета|soy o.zan|o.zan.*uchastka|yer osti.*suvini|artezian|ёғоч бар|yog.och bar|yog.och.*quti/.test(t)) return 'Qurilish';

  // Elektr va energetika
  if (/электр|кабел|провод|трансформатор|генератор|подстанц|счетчик|энергет|elektr|energetika|quyosh panel|солнечн.*панел|аккумулятор.*батар|alkalin.*batar/.test(t)) return 'Elektr va energetika';

  // Metallurgiya
  if (/металлоконструкц|металл|сталь|алюминий|трубы|арматур|прокат|профиль|задвижк|отвод\b|зулфин|қайрилма|profil\b|temir profil|metal profil|вал.шестерн|о.тга чидамли|otga chidamli|огнеупор|футеровк|futerovka|kumush\b|кумуш\b|po.lat quyish|пўлат қуйиш/.test(t)) return 'Metallurgiya';

  // Kimyo
  if (/химия|растворит|кислот|щелочь|лакокрасоч|химикат|kimyo|баллон|ballonlar|нейтрализующ.*амин|нейтрализ.*амин|antikorroz|антикоррозион|pH.*ростлаш|pH.*регулир|реагент|reagent/.test(t)) return 'Kimyo';

  // Xavfsizlik
  if (/охрана|безопасност|сигнализац|видеонаблюд|пожар|xavfsizlik|qorovul|qo.riqlash|kuzatish postlari|kirish post|sanoat xavfsizligi|саноат хавфсизлиги|diagnostika.*xavfsizl/.test(t)) return 'Xavfsizlik';

  // Tozalash xizmatlari
  if (/уборк|клининг|санитар|дезинфекц|tozalash|tozalik|kir yuvish|кир йувиш|dazmol|дазмол/.test(t)) return 'Tozalash xizmatlari';

  // Kiyim va tekstil
  if (/текстил|форменн|спецодежд|uniform|kiyim|mato|швейн|одежд|костюм|обувь|kurtka|куртка|шим\b|demi.mavsumli|qalin kurtka|махсус кийим/.test(t)) return 'Kiyim va tekstil';

  // Ta'lim
  if (/тренинг|семинар|конференц|ta.lim|o.qit|университет|академия|ilmiy|tadqiqot|o.quv kurs|kasbiy.*kurs|kurslarni tashkil|mehnat muhofaza.*o.qi|qisqa muddatli.*kurs/.test(t)) return "Ta'lim";

  // Qishloq xo'jaligi
  if (/сельск|агропром|ветеринар|ирригац|qishloq xo|dehqon|traktor|комбайн|суғориш|гербицид|issiqxona|иссиқхона|биологик фаоллик|зараркунанда|uzumchilik|uzum.*voyish|uzumzor|ko.chatlar.*ekish|ko.chat.*yetkazib|yashil makon|plantatsiya.*uzum|ko.chat.*ekish/.test(t)) return "Qishloq xo'jaligi";

  // Ehtiyot qismlar
  if (/запчаст|ehtiyot qism|запасн|деталь|агрегат|комплектующ|насос|nasos|grundfos|kompressor|компрессор|klapan|клапан|станок|stanok|dastgoh|дастгох|prujina.*butlov|parmalash stanogi|tokarlik stanogi|balanslash dastgohi|ta.mirlash to.plami|ремонтный комплект|repair kit/.test(t)) return 'Ehtiyot qismlar';

  // Moliyaviy xizmatlar
  if (/аудит|бухгалтер|юридич|консалтинг|audit|молия|финанс|страхован|baholash|baxolash|баҳолаш|оценк|sugurta|суғурта|пластик карт|plastik kart|hisobot|bahosini aniqla|baxolash xizmati|master.reja|topografik xarita|топографик хари|yer uchastka.*baho|yer uchastkalarining.*tay/.test(t)) return 'Moliyaviy xizmatlar';

  // Kitob va nashr
  if (/китоб|книг|kitob|adabiyot|литератур|nashr|chop etish|чоп этиш|журнал.*чоп|журнал.*нашр/.test(t)) return 'Kitob va nashr';

  // Laboratoriya
  if (/лаборатор|laborator|испытани|тестирован|пирометр|pirometr|sekvenator|секвенсер|ftir|spektrometr|ускунал.*aniqlash|laboratoriya uskuna|leak tester|измерительн.*прибор/.test(t)) return 'Laboratoriya';

  // Bojxona va logistika
  if (/bojxona|таможн|импорт|экспорт/.test(t)) return 'Bojxona va logistika';

  // Sport
  if (/спортив|стадион|бассейн|sport zal|trenajer|ot sporti|drone soccer/.test(t)) return 'Sport';

  // Xizmatlar
  if (/хизмат|услуг|servis|xizmat ko.rsat|обслужив|аутсорсинг|аренда|ijara|pasport|ekspertiza|сопровожд|texnik xizmat|tadbirni|bayram tadbi|tashkil qilish/.test(t)) return 'Xizmatlar';

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
  'farg`ona viloyati': "Farg'ona viloyati",
  'fergana viloyati': "Farg'ona viloyati",
  'андижанская область': 'Andijon viloyati',
  'andijon viloyati': 'Andijon viloyati',
  'наманганская область': 'Namangan viloyati',
  'namangan viloyati': 'Namangan viloyati',
  'сурхандарьинская область': 'Surxondaryo viloyati',
  'surxondaryo viloyati': 'Surxondaryo viloyati',
  'surxandaryo viloyati': 'Surxondaryo viloyati',
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
  "qoraqalpog`iston respublikasi": "Qoraqalpog'iston",
  "qoraqalpog'iston": "Qoraqalpog'iston",
  "qoraqalpog`iston": "Qoraqalpog'iston",
};

function normalizeRegion(name) {
  if (!name) return '';
  const key = name.trim().toLowerCase();
  return REGION_MAP[key] || name.trim();
}

function normalizeCurrency(name) {
  if (!name) return "So'm";
  if (/узбекск|so'm|сум|uzs/i.test(name)) return "So'm";
  if (/доллар|dollar|usd/i.test(name)) return 'USD';
  if (/евро|euro|eur/i.test(name)) return 'EUR';
  return name;
}

// ── XARID ──
async function fetchFromXarid() {
  const apiUrl   = 'https://xarid-api-auction.uzex.uz/Common/GetMinimizedLotsList';
  const pageSize = 20;

  function makeHeaders() {
    return {
      'Accept':               'application/json',
      'Accept-Language':      'ru,uz;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type':         'application/json; charset=UTF-8',
      'Language':             'uz',
      'Origin':               'https://xarid.uzex.uz',
      'Referer':              'https://xarid.uzex.uz/',
      'User-Agent':           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Validation':           generateXaridValidation(apiUrl),
      'sec-ch-ua':            '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile':     '?0',
      'sec-ch-ua-platform':   '"Windows"',
      'sec-fetch-dest':       'empty',
      'sec-fetch-mode':       'cors',
      'sec-fetch-site':       'same-site',
    };
  }

  // 1. Birinchi sahifa (3 urinish)
  let firstBatch = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(apiUrl,
        { region_ids: [], from: 1, to: pageSize },
        { httpsAgent, timeout: 25000, headers: makeHeaders() }
      );
      if (Array.isArray(res.data) && res.data.length > 0) { firstBatch = res.data; break; }
    } catch(e) {
      const status = e.response?.status || e.message;
      const body   = e.response?.data ? JSON.stringify(e.response.data).slice(0, 300) : '';
      console.log(`xarid: 1-sahifa (${attempt}-urinish) - ${status}${body ? ' | ' + body : ''}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (!firstBatch) return [];

  const allLots    = [...firstBatch];
  const totalCount = firstBatch[0]?.total_count;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 100;
  console.log(`xarid: jami ${totalCount} lot, ${totalPages} sahifa`);

  // 2. Qolgan sahifalar parallel (5 lik partiyalarda)
  for (let start = 2; start <= totalPages; start += 5) {
    const nums    = Array.from({ length: Math.min(5, totalPages - start + 1) }, (_, i) => start + i);
    const results = await Promise.allSettled(nums.map(p =>
      axios.post(apiUrl,
        { region_ids: [], from: (p - 1) * pageSize + 1, to: p * pageSize },
        { httpsAgent, timeout: 15000, headers: makeHeaders() }
      ).then(r => r.data)
    ));
    let got = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        allLots.push(...r.value); got = true;
      }
    }
    if (!got) break;
  }

  console.log(`xarid: ${allLots.length} lot olindi`);
  const now = new Date();
  return allLots.map(lot => {
    const deadline = new Date(lot.end_date);
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const title    = lot.category_name || "Noma'lum";
    return {
      id:           `xarid_${lot.id}`,
      title,
      category:     detectCategory(title),
      platform:     'xarid',
      platformName: 'xarid.uzex.uz',
      price:        lot.start_cost != null ? Math.round(lot.start_cost).toLocaleString('ru') : '0',
      currency:     normalizeCurrency(lot.currency_name),
      customer:     lot.customer_type || '',
      location:     normalizeRegion(lot.region_name || ''),
      district:     lot.district_name || '',
      deadline:     lot.end_date,
      daysLeft,
      url:          `https://xarid.uzex.uz/auction/detail/${lot.id}`,
      isNew:        daysLeft >= 5,
      displayNo:    lot.display_no,
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

