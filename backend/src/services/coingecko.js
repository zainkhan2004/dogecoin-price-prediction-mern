const BASE_URL = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY?.trim();
const API_PLAN = (process.env.COINGECKO_API_PLAN || 'demo').toLowerCase();

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function authHeaders() {
  const headers = { accept: 'application/json' };
  if (API_KEY) {
    headers[API_PLAN === 'pro' ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = API_KEY;
  }
  return headers;
}

async function request(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CoinGecko request failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return response.json();
}

function fromCache(key) {
  const hit = cache.get(key);
  return hit && hit.expiresAt > Date.now() ? hit.data : null;
}

function saveCache(key, data) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return data;
}

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function aggregateOhlcToDaily(candles) {
  const grouped = new Map();

  for (const candle of candles || []) {
    const [timestamp, open, high, low, close] = candle.map(Number);
    if (![timestamp, open, high, low, close].every(Number.isFinite)) continue;
    const date = dayKey(timestamp);
    const current = grouped.get(date);

    if (!current) {
      grouped.set(date, { date, open, high, low, close });
    } else {
      current.high = Math.max(current.high, high);
      current.low = Math.min(current.low, low);
      current.close = close;
    }
  }

  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMarketData(days = 365) {
  const cacheKey = `market:${days}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  // CoinGecko's market_chart endpoint gives daily price/volume data for long windows.
  // The supplied ML model expects OHLCV, so the latest ~30 days are enriched with
  // CoinGecko OHLC candles when available, aggregated to UTC daily candles.
  const [marketChart, ohlc] = await Promise.all([
    request('/coins/dogecoin/market_chart', {
      vs_currency: 'usd',
      days,
      interval: 'daily',
      precision: 'full'
    }),
    request('/coins/dogecoin/ohlc', {
      vs_currency: 'usd',
      days: '30',
      precision: 'full'
    }).catch(() => [])
  ]);

  const priceMap = new Map((marketChart.prices || []).map(([timestamp, price]) => [
    dayKey(timestamp), Number(price)
  ]));
  const volumeMap = new Map((marketChart.total_volumes || []).map(([timestamp, volume]) => [
    dayKey(timestamp), Number(volume)
  ]));
  const capMap = new Map((marketChart.market_caps || []).map(([timestamp, cap]) => [
    dayKey(timestamp), Number(cap)
  ]));

  const ohlcByDate = new Map(aggregateOhlcToDaily(ohlc).map((row) => [row.date, row]));
  const dates = [...priceMap.keys()].sort();

  const rows = dates.map((date, index) => {
    const close = priceMap.get(date);
    const previousClose = index > 0 ? priceMap.get(dates[index - 1]) : close;
    const actual = ohlcByDate.get(date);

    return {
      date,
      close,
      open: actual?.open ?? previousClose,
      high: actual?.high ?? Math.max(close, previousClose),
      low: actual?.low ?? Math.min(close, previousClose),
      volume: volumeMap.get(date) ?? 0,
      marketCap: capMap.get(date) ?? null,
      ohlcSource: actual ? 'CoinGecko OHLC' : 'derived from price series'
    };
  }).filter((row) => Number.isFinite(row.close));

  return saveCache(cacheKey, { rows, days });
}

export async function getSimpleMarket() {
  const cached = fromCache('simple');
  if (cached) return cached;

  const data = await request('/simple/price', {
    ids: 'dogecoin',
    vs_currencies: 'usd',
    include_market_cap: 'true',
    include_24hr_vol: 'true',
    include_24hr_change: 'true',
    include_last_updated_at: 'true',
    precision: 'full'
  });

  return saveCache('simple', data);
}
