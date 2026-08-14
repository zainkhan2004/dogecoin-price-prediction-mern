import { Router } from 'express';
import MarketSnapshot from '../models/MarketSnapshot.js';
import { getMarketData, getSimpleMarket } from '../services/coingecko.js';
import { makePrediction } from '../services/prediction.js';

const router = Router();

router.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'dogecoin-prediction-api',
  timestamp: new Date().toISOString()
}));

function parseDays(value) {
  const days = Number(value) || 365;
  return Math.min(Math.max(Math.trunc(days), 30), 365);
}

async function buildDashboard(days = 365) {
  const [{ rows }, simple] = await Promise.all([getMarketData(days), getSimpleMarket()]);
  const prediction = makePrediction(rows);
  const market = simple.dogecoin || {};

  return {
    coin: 'Dogecoin',
    symbol: 'DOGE',
    source: 'CoinGecko',
    updatedAt: market.last_updated_at
      ? new Date(market.last_updated_at * 1000).toISOString()
      : new Date().toISOString(),
    market: {
      currentPrice: market.usd ?? prediction.currentPrice,
      marketCap: market.usd_market_cap ?? null,
      volume24h: market.usd_24h_vol ?? null,
      change24h: market.usd_24h_change ?? null
    },
    prediction,
    chart: rows.map((r) => ({
      date: r.date,
      price: r.close,
      volume: r.volume
    }))
  };
}

router.get('/dashboard', async (req, res) => {
  try {
    const days = parseDays(req.query.days);
    const dashboard = await buildDashboard(days);

    if (process.env.MONGODB_URI) {
      await MarketSnapshot.create({
        currentPrice: dashboard.market.currentPrice,
        predictedPrice: dashboard.prediction.predictedPrice,
        signal: dashboard.prediction.signal,
        change24h: dashboard.market.change24h,
        marketCap: dashboard.market.marketCap,
        volume24h: dashboard.market.volume24h
      }).catch((error) => console.warn('Snapshot save skipped:', error.message));
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(502).json({
      message: error.message || 'Unable to build dashboard.'
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const days = parseDays(req.query.days);
    const { rows } = await getMarketData(days);
    res.json(rows.map((r) => ({ date: r.date, price: r.close, volume: r.volume })));
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
});

router.get('/prediction', async (_req, res) => {
  try {
    const { rows } = await getMarketData(365);
    res.json(makePrediction(rows));
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
});

router.get('/snapshots', async (_req, res) => {
  if (!process.env.MONGODB_URI) return res.json([]);
  try {
    const snapshots = await MarketSnapshot.find()
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();
    res.json(snapshots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
