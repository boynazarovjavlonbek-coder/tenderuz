const express = require('express');
const path = require('path');
const cron = require('node-cron');
const routes = require('./routes');
const parser = require('./parser');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err.message); });
app.listen(PORT, () => {
  console.log(`TenderMap server ishga tushdi: http://localhost:${PORT}`);

  // Server ishga tushganda darhol cache to'ldirish (background)
  console.log('Cache to\'ldirilmoqda (background)...');
  bot.init();
parser.getAllTenders().then(t => {
    console.log(`Cache tayyor: ${t.length} ta tender`);
  }).catch(e => {
    console.error('Cache xatolik:', e.message);
  });
});

// Har 6 soatda yangilanish
cron.schedule('0 */6 * * *', () => {
  console.log('Cron: yangilanish boshlandi...');
  parser.refreshCache().then(t => {
    console.log(`Cron: ${t.length} ta tender yangilandi`);
  }).catch(e => {
    console.error('Cron xatolik:', e.message);
  });
});
