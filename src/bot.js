const TelegramBot = require('node-telegram-bot-api');
const parser = require('./parser');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log('TELEGRAM_BOT_TOKEN topilmadi, bot o\'chirildi');
  module.exports = { init: () => {}, checkNewTenders: async () => {} };
  return;
}

const bot = new TelegramBot(token, { polling: false });

// ─── Kategoriyalar ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'qurilish',   name: 'Qurilish',             emoji: '🏗' },
  { key: 'it',         name: 'IT',                   emoji: '💻' },
  { key: 'tibbiy',     name: 'Tibbiy',               emoji: '🏥' },
  { key: 'transport',  name: 'Transport',             emoji: '🚛' },
  { key: 'oziq_ovqat', name: 'Oziq-ovqat',           emoji: '🍎' },
  { key: 'mebel',      name: 'Mebel',                emoji: '🪑' },
  { key: 'elektr',     name: 'Elektr va energetika', emoji: '⚡️' },
  { key: 'xizmatlar',  name: 'Xizmatlar',            emoji: '🔧' },
  { key: 'metallurgiya', name: 'Metallurgiya',       emoji: '⚙️' },
  { key: 'kimyo',      name: 'Kimyo',                emoji: '🧪' },
];

const CAT_BY_KEY  = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
const CAT_BY_NAME = Object.fromEntries(CATEGORIES.map(c => [c.name, c]));

// ─── Obunalar ─────────────────────────────────────────────────────────────────
const SUBS_FILE = path.join(__dirname, 'subscriptions.json');
let subscriptions = {}; // { chatId: { categories: Set, regions: Set, keywords: [] } }

function loadSubs() {
  try {
    const raw = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
    subscriptions = {};
    for (const [id, data] of Object.entries(raw)) {
      // Eski format (Set) yoki yangi format (object)
      if (Array.isArray(data)) {
        subscriptions[id] = { categories: new Set(data), regions: new Set(), keywords: [] };
      } else {
        subscriptions[id] = {
          categories: new Set(data.categories || []),
          regions:    new Set(data.regions    || []),
          keywords:   data.keywords || [],
        };
      }
    }
  } catch { subscriptions = {}; }
}

function saveSubs() {
  try {
    const out = {};
    for (const [id, data] of Object.entries(subscriptions)) {
      out[id] = {
        categories: [...data.categories],
        regions:    [...data.regions],
        keywords:   data.keywords,
      };
    }
    fs.writeFileSync(SUBS_FILE, JSON.stringify(out, null, 2));
  } catch(e) { console.error('Subscriptions save error:', e.message); }
}

function getSub(chatId) {
  const id = chatId.toString();
  if (!subscriptions[id]) {
    subscriptions[id] = { categories: new Set(), regions: new Set(), keywords: [] };
  }
  return subscriptions[id];
}

loadSubs();

// ─── Yordamchi ────────────────────────────────────────────────────────────────
let lastTenderIds = new Set();

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatPrice(price, currency) {
  if (!price || price === '0') return '';
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return n.toLocaleString('uz-UZ') + ' ' + (currency || "so'm");
}

function formatTender(t, index) {
  const price    = t.price && t.price !== '0' ? `\n💰 <b>${formatPrice(t.price, t.currency)}</b>` : '';
  const location = t.location ? `\n📍 ${escHtml(t.location)}` : '';
  const cat      = t.category ? `\n📁 ${escHtml(t.category)}` : '';
  const days     = t.daysLeft !== undefined
    ? (t.daysLeft <= 0 ? '\n🔴 <b>Muddati tugagan</b>' :
       t.daysLeft <= 3 ? `\n🔴 <b>${t.daysLeft} kun qoldi!</b>` :
       t.daysLeft <= 7 ? `\n🟠 ${t.daysLeft} kun qoldi` :
                         `\n🟢 ${t.daysLeft} kun qoldi`)
    : '';
  const num = index !== undefined ? `${index}. ` : '';
  return `${num}📋 <b>${escHtml(t.title)}</b>\n🏢 ${escHtml(t.platformName || t.platform)}${price}${location}${cat}${days}\n🔗 <a href="${t.url}">Ko'rish →</a>`;
}

async function send(chatId, text, opts = {}) {
  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...opts
    });
  } catch(e) {
    console.error('Send error:', chatId, e.message);
  }
}

// ─── Tugmalar ─────────────────────────────────────────────────────────────────
function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📋 Oxirgi tenderlar', callback_data: 'menu_tenders' },
        { text: '🔍 Qidirish',         callback_data: 'menu_search'  },
      ],
      [
        { text: '🔔 Obuna bo\'lish',   callback_data: 'menu_subscribe' },
        { text: '📊 Mening obunalarim', callback_data: 'menu_mysubs'  },
      ],
      [
        { text: '🌐 Saytga o\'tish',   url: 'https://tendermap.uz' },
      ],
    ]
  };
}

function categoryKeyboard(action = 'sub') {
  // 2 tadan qator
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    const row = [
      { text: `${CATEGORIES[i].emoji} ${CATEGORIES[i].name}`, callback_data: `${action}_${CATEGORIES[i].key}` }
    ];
    if (CATEGORIES[i+1]) {
      row.push({ text: `${CATEGORIES[i+1].emoji} ${CATEGORIES[i+1].name}`, callback_data: `${action}_${CATEGORIES[i+1].key}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '🔙 Orqaga', callback_data: 'menu_back' }]);
  return { inline_keyboard: rows };
}

function backKeyboard() {
  return {
    inline_keyboard: [[{ text: '🏠 Bosh menu', callback_data: 'menu_back' }]]
  };
}

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const name = escHtml(msg.from.first_name || 'Foydalanuvchi');
  await send(msg.chat.id,
    `👋 Salom, <b>${name}</b>!\n\n` +
    `Men <b>TenderMap</b> botiman — O'zbekiston davlat tenderlarini kuzataman.\n\n` +
    `📊 Hozir <b>3 ta platforma</b>dan tenderlarni jamlayapman:\n` +
    `• etender.uzex.uz\n• xarid.uzex.uz\n• xt-xarid.uz\n\n` +
    `Quyidagi tugmalardan foydalaning 👇`,
    { reply_markup: mainMenuKeyboard() }
  );
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  await send(msg.chat.id,
    `ℹ️ <b>TenderMap Bot — Yordam</b>\n\n` +
    `<b>Asosiy buyruqlar:</b>\n` +
    `/start — Bosh menu\n` +
    `/tenders — Oxirgi 5 tender\n` +
    `/subscribe — Kategoriyaga obuna\n` +
    `/mysubs — Mening obunalarim\n` +
    `/search [so\'z] — Tender qidirish\n` +
    `/unsubscribeall — Barcha obunalardan chiqish\n\n` +
    `<b>Misol:</b>\n` +
    `/search qurilish Toshkent\n\n` +
    `🌐 <a href="https://tendermap.uz">tendermap.uz</a> — to\'liq sayt`,
    { reply_markup: backKeyboard() }
  );
});

// ─── Callback tugmalar ────────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const data   = query.data;

  await bot.answerCallbackQuery(query.id);

  // Bosh menu
  if (data === 'menu_back') {
    await bot.editMessageText(
      `🏠 <b>Bosh menu</b>\n\nNimani xohlaysiz?`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  // Oxirgi tenderlar
  if (data === 'menu_tenders') {
    await bot.editMessageText(
      `⏳ Yuklanmoqda...`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
    );
    try {
      const all = await parser.getAllTenders();
      if (!all.length) {
        await bot.editMessageText('❌ Hozircha tenderlar yo\'q.', { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: backKeyboard() });
        return;
      }
      await bot.editMessageText(
        `📊 <b>Oxirgi ${Math.min(5, all.length)} tender:</b>`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: backKeyboard() }
      );
      for (const [i, t] of all.slice(0, 5).entries()) {
        await send(chatId, formatTender(t, i + 1));
      }
    } catch(e) {
      await bot.editMessageText('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.', { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: backKeyboard() });
    }
    return;
  }

  // Qidirish
  if (data === 'menu_search') {
    await bot.editMessageText(
      `🔍 <b>Qidirish</b>\n\nQidirish uchun yozing:\n<code>/search [so\'z]</code>\n\n<b>Misol:</b>\n/search qurilish\n/search kompyuter Toshkent`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: backKeyboard() }
    );
    return;
  }

  // Obuna — kategoriya tanlash
  if (data === 'menu_subscribe') {
    const sub = getSub(chatId);
    const activeCats = CATEGORIES.filter(c => sub.categories.has(c.name));
    const activeText = activeCats.length
      ? `\n\n✅ <b>Faol obunalar:</b> ${activeCats.map(c => c.emoji + c.name).join(', ')}`
      : '\n\n<i>Hali obuna yo\'q</i>';
    await bot.editMessageText(
      `🔔 <b>Kategoriya tanlang</b>\n\nObuna bo\'lmoqchi bo\'lgan kategoriyani bosing:${activeText}`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: categoryKeyboard('sub') }
    );
    return;
  }

  // Obunalarim
  if (data === 'menu_mysubs') {
    const sub = getSub(chatId);
    const cats = [...sub.categories];
    const kwds = sub.keywords;

    if (!cats.length && !kwds.length) {
      await bot.editMessageText(
        `📋 <b>Sizning obunalaringiz</b>\n\nHali hech qanday obuna yo\'q.\n\nObuna bo\'lish uchun "Obuna bo\'lish" tugmasini bosing.`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [
            [{ text: '🔔 Obuna bo\'lish', callback_data: 'menu_subscribe' }],
            [{ text: '🏠 Bosh menu',      callback_data: 'menu_back'      }],
          ]}
        }
      );
      return;
    }

    let text = `📋 <b>Sizning obunalaringiz:</b>\n\n`;
    if (cats.length) {
      text += `<b>Kategoriyalar:</b>\n`;
      cats.forEach(c => {
        const cat = CAT_BY_NAME[c];
        text += `• ${cat ? cat.emoji + ' ' : ''}${escHtml(c)}\n`;
      });
    }
    if (kwds.length) {
      text += `\n<b>Kalit so\'zlar:</b>\n`;
      kwds.forEach(k => { text += `• "${escHtml(k)}"\n`; });
    }
    text += `\nObunani bekor qilish uchun kategoriyani bosing:`;

    await bot.editMessageText(text, {
      chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
      reply_markup: categoryKeyboard('unsub')
    });
    return;
  }

  // Kategoriyaga obuna bo'lish
  if (data.startsWith('sub_')) {
    const key = data.replace('sub_', '');
    const cat = CAT_BY_KEY[key];
    if (!cat) return;
    const sub = getSub(chatId);
    const isSubscribed = sub.categories.has(cat.name);

    if (isSubscribed) {
      sub.categories.delete(cat.name);
      saveSubs();
      await bot.answerCallbackQuery(query.id, { text: `❌ ${cat.name} obunasi bekor qilindi` });
    } else {
      sub.categories.add(cat.name);
      saveSubs();
      await bot.answerCallbackQuery(query.id, { text: `✅ ${cat.name} obunasi qo'shildi!` });
    }

    // Yangilangan kategoriya menuini ko'rsatish
    const updatedSub = getSub(chatId);
    const activeCats = CATEGORIES.filter(c => updatedSub.categories.has(c.name));
    const activeText = activeCats.length
      ? `\n\n✅ <b>Faol obunalar:</b> ${activeCats.map(c => c.emoji + c.name).join(', ')}`
      : '\n\n<i>Hali obuna yo\'q</i>';

    await bot.editMessageText(
      `🔔 <b>Kategoriya tanlang</b>\n\nObuna bo\'lmoqchi bo\'lgan kategoriyani bosing:${activeText}`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: categoryKeyboard('sub') }
    );
    return;
  }

  // Obunadan chiqish
  if (data.startsWith('unsub_')) {
    const key = data.replace('unsub_', '');
    const cat = CAT_BY_KEY[key];
    if (!cat) return;
    const sub = getSub(chatId);
    sub.categories.delete(cat.name);
    if (!sub.categories.size && !sub.keywords.length) delete subscriptions[chatId.toString()];
    saveSubs();

    await bot.editMessageText(
      `✅ <b>${cat.emoji} ${cat.name}</b> obunasidan chiqdingiz.`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML', reply_markup: backKeyboard() }
    );
    return;
  }
});

// ─── /tenders ─────────────────────────────────────────────────────────────────
bot.onText(/^\/tenders$/, async (msg) => {
  const chatId = msg.chat.id;
  const loadMsg = await bot.sendMessage(chatId, '⏳ Yuklanmoqda...', { parse_mode: 'HTML' });
  try {
    const all = await parser.getAllTenders();
    await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
    if (!all.length) return send(chatId, '❌ Hozircha tenderlar yo\'q.');
    await send(chatId, `📊 <b>Oxirgi ${Math.min(5, all.length)} tender:</b>`);
    for (const [i, t] of all.slice(0, 5).entries()) {
      await send(chatId, formatTender(t, i + 1));
    }
    await send(chatId, '🌐 <a href="https://tendermap.uz">Barchasini ko\'rish →</a>', { reply_markup: mainMenuKeyboard() });
  } catch {
    await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
    await send(chatId, '❌ Xatolik yuz berdi.');
  }
});

// ─── /search ──────────────────────────────────────────────────────────────────
bot.onText(/^\/search(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query  = (match[1] || '').trim();

  if (!query) {
    return send(chatId,
      `🔍 <b>Qidirish</b>\n\nQidirish so\'zini kiriting:\n<code>/search [so\'z]</code>\n\n<b>Misol:</b>\n/search qurilish\n/search mebel Samarqand`
    );
  }

  const loadMsg = await bot.sendMessage(chatId, `🔍 "<b>${escHtml(query)}</b>" qidirilmoqda...`, { parse_mode: 'HTML' });
  try {
    const all = await parser.getAllTenders();
    const q   = query.toLowerCase();
    const found = all.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.location || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );

    await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});

    if (!found.length) {
      return send(chatId,
        `❌ "<b>${escHtml(query)}</b>" bo\'yicha tender topilmadi.\n\nBoshqa so\'z bilan urinib ko\'ring.`,
        { reply_markup: backKeyboard() }
      );
    }

    await send(chatId, `✅ <b>${found.length} ta tender topildi</b> — dastlabki ${Math.min(5, found.length)} tasi:`);
    for (const [i, t] of found.slice(0, 5).entries()) {
      await send(chatId, formatTender(t, i + 1));
    }
    if (found.length > 5) {
      await send(chatId,
        `📋 Qolgan <b>${found.length - 5}</b> ta tenderni ko\'rish:\n🌐 <a href="https://tendermap.uz">tendermap.uz</a>`,
        { reply_markup: backKeyboard() }
      );
    }
  } catch {
    await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
    await send(chatId, '❌ Xatolik yuz berdi.');
  }
});

// ─── /subscribe (matn orqali ham ishlaydi) ────────────────────────────────────
bot.onText(/^\/subscribe(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const arg    = (match[1] || '').trim().toLowerCase().replace(/^\//, '');

  if (!arg) {
    const sub = getSub(chatId);
    const activeCats = CATEGORIES.filter(c => sub.categories.has(c.name));
    const activeText = activeCats.length
      ? `\n\n✅ <b>Faol:</b> ${activeCats.map(c => c.emoji + c.name).join(', ')}`
      : '';
    return send(chatId,
      `🔔 <b>Obuna bo\'lish</b>\n\nQaysi kategoriyani kuzatmoqchisiz?${activeText}`,
      { reply_markup: categoryKeyboard('sub') }
    );
  }

  const cat = CAT_BY_KEY[arg] || CATEGORIES.find(c => c.name.toLowerCase() === arg);
  if (!cat) {
    return send(chatId,
      `❌ Kategoriya topilmadi: <b>${escHtml(arg)}</b>\n\nMavjud kategoriyalar:`,
      { reply_markup: categoryKeyboard('sub') }
    );
  }

  const sub = getSub(chatId);
  sub.categories.add(cat.name);
  saveSubs();
  await send(chatId,
    `✅ <b>${cat.emoji} ${cat.name}</b> kategoriyasiga obuna bo\'ldingiz!\n\nYangi tender chiqqanda darhol xabar olasiz. 🔔`,
    { reply_markup: backKeyboard() }
  );
});

// ─── /mysubs ──────────────────────────────────────────────────────────────────
bot.onText(/^\/mysubs$/, async (msg) => {
  const chatId = msg.chat.id;
  const sub    = getSub(chatId);
  const cats   = [...sub.categories];

  if (!cats.length) {
    return send(chatId,
      `📋 <b>Obunalarim</b>\n\nHali obuna yo\'q.\n\nObuna bo\'lish uchun tugmani bosing:`,
      { reply_markup: { inline_keyboard: [[{ text: '🔔 Obuna bo\'lish', callback_data: 'menu_subscribe' }]] } }
    );
  }

  let text = `📋 <b>Sizning obunalaringiz:</b>\n\n`;
  cats.forEach(c => {
    const cat = CAT_BY_NAME[c];
    text += `• ${cat ? cat.emoji + ' ' : ''}${escHtml(c)}\n`;
  });
  text += `\nObunani boshqarish:`;

  await send(chatId, text, { reply_markup: categoryKeyboard('unsub') });
});

// ─── /unsubscribeall ──────────────────────────────────────────────────────────
bot.onText(/^\/unsubscribeall$/, async (msg) => {
  const chatId = msg.chat.id;
  delete subscriptions[chatId.toString()];
  saveSubs();
  await send(chatId, '✅ Barcha obunalardan chiqdingiz.', { reply_markup: backKeyboard() });
});

// ─── /stats (admin) ───────────────────────────────────────────────────────────
bot.onText(/^\/stats$/, async (msg) => {
  const total    = Object.keys(subscriptions).length;
  const catCount = {};
  for (const sub of Object.values(subscriptions)) {
    for (const cat of sub.categories || []) {
      catCount[cat] = (catCount[cat] || 0) + 1;
    }
  }
  const topCats = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => `• ${escHtml(c)}: ${n} ta`)
    .join('\n');

  await send(msg.chat.id,
    `📊 <b>Bot statistikasi</b>\n\n` +
    `👥 Jami obunchilar: <b>${total}</b>\n\n` +
    `🏆 Top kategoriyalar:\n${topCats || 'Hali yo\'q'}`
  );
});

// ─── Yangi tenderlarni tekshirish ─────────────────────────────────────────────
async function checkNewTenders() {
  try {
    const tenders   = await parser.getAllTenders();
    const newTenders = tenders.filter(t => !lastTenderIds.has(t.id));

    if (lastTenderIds.size > 0 && newTenders.length > 0) {
      const byCategory = {};
      for (const t of newTenders) {
        if (!byCategory[t.category]) byCategory[t.category] = [];
        byCategory[t.category].push(t);
      }

      for (const [id, sub] of Object.entries(subscriptions)) {
        const toSend = [];

        // Kategoriya bo'yicha
        for (const cat of sub.categories || []) {
          const items = byCategory[cat];
          if (items?.length) toSend.push(...items);
        }

        // Kalit so'z bo'yicha
        for (const kw of sub.keywords || []) {
          const q = kw.toLowerCase();
          const kwMatches = newTenders.filter(t =>
            !toSend.includes(t) &&
            ((t.title || '').toLowerCase().includes(q) ||
             (t.description || '').toLowerCase().includes(q))
          );
          toSend.push(...kwMatches);
        }

        if (!toSend.length) continue;

        await send(id,
          `🔔 <b>${toSend.length} ta yangi tender!</b>\n\nSizning obuna kategoriyalaringizda yangi tenderlar paydo bo\'ldi:`,
          { reply_markup: { inline_keyboard: [[{ text: '📋 Ko\'rish', callback_data: 'menu_tenders' }]] } }
        );
        for (const t of toSend.slice(0, 3)) {
          await send(id, formatTender(t));
        }
        if (toSend.length > 3) {
          await send(id, `📋 Yana <b>${toSend.length - 3}</b> ta tender bor.\n🌐 <a href="https://tendermap.uz">Barchasini ko\'rish →</a>`);
        }
      }

      console.log(`Bot: ${newTenders.length} yangi tender, ${Object.keys(subscriptions).length} obunachi`);
    }

    lastTenderIds = new Set(tenders.map(t => t.id));
  } catch(e) {
    console.error('checkNewTenders error:', e.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  bot.startPolling();
  console.log('TenderMap bot ishga tushdi!');
  parser.getAllTenders().then(t => {
    lastTenderIds = new Set(t.map(x => x.id));
    console.log(`Bot: ${lastTenderIds.size} tender yuklandi`);
  }).catch(() => {});
}

module.exports = { init, checkNewTenders };

// ─── Har qanday matnni ushlash (buyruq bo'lmagan) ─────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  const text   = msg.text.trim();

  // Kategoriya nomini tekshirish
  const cat = CATEGORIES.find(c =>
    c.name.toLowerCase() === text.toLowerCase() ||
    c.key === text.toLowerCase()
  );
  if (cat) {
    const loadMsg = await bot.sendMessage(chatId, `⏳ ${cat.emoji} ${cat.name} tenderlar yuklanmoqda...`, { parse_mode: 'HTML' });
    try {
      const all   = await parser.getAllTenders();
      const found = all.filter(t => t.category === cat.name);
      await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
      if (!found.length) {
        return send(chatId, `❌ <b>${cat.emoji} ${cat.name}</b> kategoriyasida faol tender topilmadi.`, { reply_markup: backKeyboard() });
      }
      await send(chatId, `${cat.emoji} <b>${cat.name}</b> — ${Math.min(5, found.length)} ta tender:`);
      for (const [i, t] of found.slice(0, 5).entries()) {
        await send(chatId, formatTender(t, i + 1));
      }
      if (found.length > 5) {
        await send(chatId, `📋 Yana <b>${found.length - 5}</b> ta bor → <a href="https://tendermap.uz">tendermap.uz</a>`, { reply_markup: backKeyboard() });
      }
    } catch {
      await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
      await send(chatId, '❌ Xatolik yuz berdi.');
    }
    return;
  }

  // Qisqa matnni qidiruv sifatida qabul qilish
  if (text.length >= 2) {
    const loadMsg = await bot.sendMessage(chatId, `🔍 "<b>${escHtml(text)}</b>" qidirilmoqda...`, { parse_mode: 'HTML' });
    try {
      const all   = await parser.getAllTenders();
      const q     = text.toLowerCase();
      const found = all.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.location || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
      await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
      if (!found.length) {
        return send(chatId,
          `❌ "<b>${escHtml(text)}</b>" bo\'yicha tender topilmadi.`,
          { reply_markup: backKeyboard() }
        );
      }
      await send(chatId, `✅ <b>${found.length} ta tender topildi</b> — dastlabki ${Math.min(5, found.length)} tasi:`);
      for (const [i, t] of found.slice(0, 5).entries()) {
        await send(chatId, formatTender(t, i + 1));
      }
      if (found.length > 5) {
        await send(chatId,
          `📋 Qolgan <b>${found.length - 5}</b> ta → <a href="https://tendermap.uz">tendermap.uz</a>`,
          { reply_markup: backKeyboard() }
        );
      }
    } catch {
      await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
      await send(chatId, '❌ Xatolik yuz berdi.');
    }
    return;
  }

  // Tushunarsiz matn
  await send(chatId,
    `🤔 Tushunmadim. Quyidagi tugmalardan foydalaning:`,
    { reply_markup: mainMenuKeyboard() }
  );
});
