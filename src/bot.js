const TelegramBot = require('node-telegram-bot-api');
const parser = require('./parser');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.log('TELEGRAM_BOT_TOKEN topilmadi'); module.exports = { init: () => {} }; return; }

const bot = new TelegramBot(token, { polling: false });

let lastTenderIds = new Set();

async function checkNewTenders() {
  try {
    const tenders = await parser.getAllTenders();
    const newTenders = tenders.filter(t => !lastTenderIds.has(t.id));
    
    if (lastTenderIds.size > 0 && newTenders.length > 0) {
      for (const t of newTenders.slice(0, 5)) {
        const msg = ?? Yangi tender!\n\n?? \n??  \n?? \n?  kun qoldi\n\n?? ;
        // Subscribers ga yuborish (keyinroq qo'shamiz)
        console.log('Yangi tender:', t.title);
      }
    }
    
    lastTenderIds = new Set(tenders.map(t => t.id));
  } catch(e) {
    console.error('Bot xatolik:', e.message);
  }
}

async function sendToChat(chatId, message) {
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch(e) {
    console.error('Xabar yuborishda xatolik:', e.message);
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await sendToChat(chatId, Salom! ??\n\nMen <b>TenderMap</b> botiman.\n\nO'zbekiston davlat tenderlarini kuzatib boraman.\n\n/tenders - Oxirgi tenderlar\n/subscribe - Xabarnomaga yozilish);
});

bot.onText(/\/tenders/, async (msg) => {
  const chatId = msg.chat.id;
  await sendToChat(chatId, 'Tenderlar yuklanmoqda...');
  
  try {
    const tenders = await parser.getAllTenders();
    const top5 = tenders.slice(0, 5);
    
    for (const t of top5) {
      const msg2 = ?? <b></b>\n??  \n?? \n?  kun qoldi\n?? \n\n?? <a href="">Batafsil</a>;
      await sendToChat(chatId, msg2);
    }
  } catch(e) {
    await sendToChat(chatId, 'Xatolik yuz berdi');
  }
});

function init() {
  if (!token) return;
  bot.startPolling();
  console.log('TenderMap bot ishga tushdi!');
}

module.exports = { init, checkNewTenders };
