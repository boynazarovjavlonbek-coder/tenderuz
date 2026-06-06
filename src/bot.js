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
const CAT_CMDS = {
  qurilish:   'Qurilish',
  it:         'IT',
  tibbiy:     'Tibbiy',
  transport:  'Transport',
  oziq_ovqat: 'Oziq-ovqat',
  mebel:      'Mebel',
  elektr:     'Elektr va energetika',
  xizmatlar:  'Xizmatlar',
};

// ─── Obunalar (fayl asosida) ──────────────────────────────────────────────────
const SUBS_FILE = path.join(__dirname, 'subscriptions.json');
let subscriptions = {};

function loadSubs() {
  try {
    const raw = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
    subscriptions = {};
    for (const [id, cats] of Object.entries(raw)) {
      subscriptions[id] = new Set(Array.isArray(cats) ? cats : []);
    }
  } catch { subscriptions = {}; }
}

function saveSubs() {
  try {
    const out = {};
    for (const [id, cats] of Object.entries(subscriptions)) out[id] = [...cats];
    fs.writeFileSync(SUBS_FILE, JSON.stringify(out, null, 2));
  } catch(e) { console.error('Subscriptions save error:', e.message); }
}

loadSubs();

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
let lastTenderIds = new Set();

function fmt(t) {
  const price = t.price && t.price !== '0' ? `\n💰 ${t.price} ${t.currency}` : '';
  const loc   = t.location ? `\n📍 ${t.location}` : '';
  return `📋 <b>${escHtml(t.title)}</b>\n🏢 ${t.platformName}${price}${loc}\n⏰ ${t.daysLeft} kun qoldi\n🔗 <a href="${t.url}">Batafsil</a>`;
}

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function send(chatId, text) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch(e) { console.error('Send error:', chatId, e.message); }
}

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const cmds = Object.keys(CAT_CMDS).map(k => `/${k}`).join('  ');
  await send(msg.chat.id,
    `👋 Salom! Men <b>TenderMap</b> botiman.\n` +
    `O'zbekiston davlat tenderlarini kuzataman.\n\n` +
    `📌 <b>Kategoriya buyruqlari:</b>\n${cmds}\n\n` +
    `📋 <b>Boshqa:</b>\n` +
    `/tenders — Oxirgi 5 tender\n` +
    `/subscribe [kat] — Obuna bo'lish\n` +
    `/mysubscriptions — Obunalarim\n` +
    `/unsubscribe [kat] — Obunadan chiqish\n\n` +
    `<i>Misol: /subscribe qurilish</i>`
  );
});

// ─── /tenders ─────────────────────────────────────────────────────────────────
bot.onText(/^\/tenders$/, async (msg) => {
  const chatId = msg.chat.id;
  await send(chatId, 'Yuklanmoqda...');
  try {
    const all = await parser.getAllTenders();
    if (!all.length) return send(chatId, 'Hozircha tenderlar yo\'q.');
    await send(chatId, `📊 <b>Oxirgi ${Math.min(5, all.length)} tender:</b>`);
    for (const t of all.slice(0, 5)) await send(chatId, fmt(t));
  } catch { await send(chatId, '❌ Xatolik yuz berdi.'); }
});

// ─── Kategoriya buyruqlari ────────────────────────────────────────────────────
for (const [cmd, catName] of Object.entries(CAT_CMDS)) {
  bot.onText(new RegExp(`^\\/${cmd}$`, 'i'), async (msg) => {
    const chatId = msg.chat.id;
    try {
      const all = await parser.getAllTenders();
      const list = all.filter(t => t.category === catName);
      if (!list.length) return send(chatId, `❌ <b>${escHtml(catName)}</b> kategoriyasida faol tender topilmadi.`);
      await send(chatId, `📂 <b>${escHtml(catName)}</b> — oxirgi ${Math.min(5, list.length)} tender:`);
      for (const t of list.slice(0, 5)) await send(chatId, fmt(t));
    } catch { await send(chatId, '❌ Xatolik yuz berdi.'); }
  });
}

// ─── /subscribe ───────────────────────────────────────────────────────────────
bot.onText(/^\/subscribe(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const arg = (match[1] || '').trim().toLowerCase().replace(/^\//, '');

  if (!arg) {
    const list = Object.entries(CAT_CMDS)
      .map(([k, v]) => `  /subscribe ${k} — <b>${escHtml(v)}</b>`)
      .join('\n');
    return send(chatId, `🔔 <b>Obuna bo'lish:</b>\n\n${list}`);
  }

  const catName = CAT_CMDS[arg];
  if (!catName) {
    return send(chatId, `❌ Noto'g'ri kategoriya: <b>${escHtml(arg)}</b>\n\nMavjud: ${Object.keys(CAT_CMDS).join(', ')}`);
  }

  const id = chatId.toString();
  if (!subscriptions[id]) subscriptions[id] = new Set();
  subscriptions[id].add(catName);
  saveSubs();

  await send(chatId,
    `✅ <b>${escHtml(catName)}</b> kategoriyasiga obuna bo'ldingiz!\n` +
    `Yangi tender chiqqanda darhol xabar olasiz.\n\n` +
    `/mysubscriptions — barcha obunalarni ko'rish`
  );
});

// ─── /unsubscribe ─────────────────────────────────────────────────────────────
bot.onText(/^\/unsubscribe(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = chatId.toString();
  const arg = (match[1] || '').trim().toLowerCase().replace(/^\//, '');

  if (!subscriptions[id] || !subscriptions[id].size) {
    return send(chatId, 'Siz hech qaysi kategoriyaga obuna emassiz.');
  }

  if (!arg) {
    subscriptions[id] = new Set();
    delete subscriptions[id];
    saveSubs();
    return send(chatId, '✅ Barcha obunalardan chiqdingiz.');
  }

  const catName = CAT_CMDS[arg];
  if (!catName) {
    return send(chatId, `❌ Noto'g'ri kategoriya: <b>${escHtml(arg)}</b>`);
  }

  subscriptions[id].delete(catName);
  if (!subscriptions[id].size) delete subscriptions[id];
  saveSubs();
  await send(chatId, `✅ <b>${escHtml(catName)}</b> obunasidan chiqdingiz.`);
});

// ─── /mysubscriptions ─────────────────────────────────────────────────────────
bot.onText(/^\/mysubscriptions$/, async (msg) => {
  const chatId = msg.chat.id;
  const cats = subscriptions[chatId.toString()];
  if (!cats || !cats.size) {
    return send(chatId, 'Siz hech qaysi kategoriyaga obuna emassiz.\n\n/subscribe qurilish — misol');
  }
  const list = [...cats].map(c => `• ${escHtml(c)}`).join('\n');
  await send(chatId,
    `📋 <b>Sizning obunalaringiz:</b>\n\n${list}\n\n` +
    `/unsubscribe [kategoriya] — obunadan chiqish\n` +
    `/unsubscribe — hammasidan chiqish`
  );
});

// ─── Yangi tenderlarni tekshirish (cron tomonidan chaqiriladi) ────────────────
async function checkNewTenders() {
  try {
    const tenders = await parser.getAllTenders();
    const newTenders = tenders.filter(t => !lastTenderIds.has(t.id));

    if (lastTenderIds.size > 0 && newTenders.length > 0) {
      // Kategoriya bo'yicha guruhlash
      const byCategory = {};
      for (const t of newTenders) {
        if (!byCategory[t.category]) byCategory[t.category] = [];
        byCategory[t.category].push(t);
      }

      // Har bir obunachiga tegishli yangi tenderlarni yuborish
      for (const [id, cats] of Object.entries(subscriptions)) {
        for (const cat of cats) {
          const items = byCategory[cat];
          if (!items || !items.length) continue;
          await send(id, `🔔 <b>${escHtml(cat)}</b> da ${items.length} yangi tender!`);
          for (const t of items.slice(0, 3)) await send(id, fmt(t));
        }
      }

      console.log(`Bot: ${newTenders.length} yangi tender topildi, ${Object.keys(subscriptions).length} obunachi xabardor qilindi`);
    }

    lastTenderIds = new Set(tenders.map(t => t.id));
  } catch(e) { console.error('checkNewTenders error:', e.message); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  bot.startPolling();
  console.log('TenderMap bot ishga tushdi!');
  // Birinchi yuklashda lastTenderIds ni to'ldirish
  parser.getAllTenders().then(t => {
    lastTenderIds = new Set(t.map(x => x.id));
  }).catch(() => {});
}

module.exports = { init, checkNewTenders };
