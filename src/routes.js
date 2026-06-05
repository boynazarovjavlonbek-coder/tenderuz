const express = require('express');
const router = express.Router();
const parser = require('./parser');

router.get('/status', (req, res) => {
  res.json(parser.getCacheStatus());
});

router.post('/refresh', async (req, res) => {
  res.json({ success: true, message: 'Yangilanish boshlandi' });
  parser.refreshCache().catch(e => console.error('Refresh xatolik:', e.message));
});

router.get('/categories', async (req, res) => {
  try {
    const tenders = await parser.getAllTenders();
    const cats = {};

    tenders.forEach(t => {
      const cat = t.category || 'Boshqa';
      if (!cats[cat]) cats[cat] = { count: 0, customers: new Set(), totalSum: 0 };
      cats[cat].count++;
      if (t.customer) cats[cat].customers.add(t.customer);
      if (t.currency === "So'm") {
        const raw = (t.price || '0').replace(/[\s  ]/g, '');
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) cats[cat].totalSum += num;
      }
    });

    const data = Object.entries(cats).map(([name, d]) => ({
      name,
      count: d.count,
      customers: d.customers.size,
      totalSum: d.totalSum,
      totalSumMlrd: Math.round(d.totalSum / 1e9 * 10) / 10
    })).sort((a, b) => b.totalSum - a.totalSum);

    const totalMlrd = Math.round(data.reduce((s, d) => s + d.totalSumMlrd, 0) * 10) / 10;
    const totalCustomers = new Set(tenders.map(t => t.customer).filter(Boolean)).size;

    res.json({ success: true, total: totalMlrd, totalCustomers, data });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/counts', async (req, res) => {
  try {
    const tenders = await parser.getAllTenders();
    const platforms = {}, categories = {};
    tenders.forEach(t => {
      platforms[t.platform] = (platforms[t.platform] || 0) + 1;
      categories[t.category] = (categories[t.category] || 0) + 1;
    });
    res.json({ total: tenders.length, platforms, categories });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const tenders = await parser.getAllTenders();
    const platforms = {}, categories = {}, regions = {};
    const deadline = { today: 0, d3: 0, d7: 0, d30: 0, d60: 0, more: 0, none: 0 };

    tenders.forEach(t => {
      platforms[t.platform] = (platforms[t.platform] || 0) + 1;
      categories[t.category] = (categories[t.category] || 0) + 1;
      if (t.location) regions[t.location] = (regions[t.location] || 0) + 1;
      const d = t.daysLeft;
      if (d === 999) deadline.none++;
      else if (d <= 0)  deadline.today++;
      else if (d <= 3)  deadline.d3++;
      else if (d <= 7)  deadline.d7++;
      else if (d <= 30) deadline.d30++;
      else if (d <= 60) deadline.d60++;
      else              deadline.more++;
    });

    const topRegions = Object.entries(regions)
      .sort((a, b) => b[1] - a[1]).slice(0, 10);

    const status = parser.getCacheStatus();
    res.json({
      total: tenders.length,
      urgent: deadline.today + deadline.d3,
      platforms, categories,
      topRegions: Object.fromEntries(topRegions),
      deadline,
      lastFetch: status.lastFetch
    });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/tenders', async (req, res) => {
  try {
    const { search, category, platform, region, sort, page = 1, limit = 20 } = req.query;
    let tenders = await parser.getAllTenders();

    if (platform && platform !== 'all') {
      tenders = tenders.filter(t => t.platform === platform);
    }
    if (category && category !== 'all') {
      tenders = tenders.filter(t => t.category === category);
    }
    if (region && region !== 'all') {
      tenders = tenders.filter(t => t.location === region);
    }
    const { deadlineDays, minPrice, maxPrice } = req.query;
    if (deadlineDays) {
      const days = parseInt(deadlineDays);
      tenders = tenders.filter(t => t.daysLeft !== 999 && t.daysLeft <= days);
    }
    if (minPrice) {
      const min = parseFloat(minPrice);
      tenders = tenders.filter(t => parseFloat((t.price || '0').replace(/[\s ]/g, '')) >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      tenders = tenders.filter(t => parseFloat((t.price || '0').replace(/[\s ]/g, '')) <= max);
    }
    if (search) {
      const q = search.toLowerCase();
      tenders = tenders.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'price_desc') tenders.sort((a, b) => parseFloat(b.price.replace(/\s/g, '')) - parseFloat(a.price.replace(/\s/g, '')));
    else if (sort === 'price_asc') tenders.sort((a, b) => parseFloat(a.price.replace(/\s/g, '')) - parseFloat(b.price.replace(/\s/g, '')));
    else if (sort === 'deadline_asc') tenders.sort((a, b) => a.daysLeft - b.daysLeft);
    else tenders.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));

    const total = tenders.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = tenders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Unique regions for filter
    const allTenders = await parser.getAllTenders();
    const regions = [...new Set(allTenders.map(t => t.location).filter(Boolean))].sort();

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: paginated.length,
      regions,
      data: paginated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/tenders/:id', async (req, res) => {
  try {
    const tenders = await parser.getAllTenders();
    const tender = tenders.find(t => t.id === req.params.id);
    if (!tender) return res.status(404).json({ success: false, message: 'Tender topilmadi' });
    res.json({ success: true, data: tender });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
