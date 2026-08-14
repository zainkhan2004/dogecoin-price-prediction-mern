import { bollinger, macd, rsi, sma } from '../utils/indicators.js';
import { predictFromFeatures } from './model.js';

function buildFeatureRows(rows) {
  const closes = rows.map((r) => r.close);
  const ma7 = sma(closes, 7);
  const ma30 = sma(closes, 30);
  const rsiValues = rsi(closes, 14);
  const macdValues = macd(closes);
  const bb = bollinger(closes, 20, 2);

  return rows.map((row, i) => {
    const d = new Date(`${row.date}T00:00:00Z`);
    return {
      ...row,
      Year: d.getUTCFullYear(),
      Month: d.getUTCMonth() + 1,
      Day: d.getUTCDate(),
      DayOfWeek: d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1,
      Price_Lag_1: i >= 1 ? closes[i - 1] : null,
      Price_Lag_7: i >= 7 ? closes[i - 7] : null,
      MA_7: ma7[i],
      MA_30: ma30[i],
      RSI: rsiValues[i],
      MACD: macdValues.line[i],
      BB_High: bb.high[i],
      BB_Low: bb.low[i]
    };
  });
}

export function makePrediction(rows) {
  const featureRows = buildFeatureRows(rows);
  const latest = featureRows[featureRows.length - 1];
  if (!latest || [latest.MA_30, latest.RSI, latest.MACD, latest.BB_High, latest.BB_Low, latest.Price_Lag_7].some((x) => x == null)) {
    throw new Error('Not enough CoinGecko history to build prediction features.');
  }

  const predictedPrice = predictFromFeatures({
    Close: latest.close,
    High: latest.high,
    Low: latest.low,
    Open: latest.open,
    Volume: latest.volume,
    Year: latest.Year,
    Month: latest.Month,
    Day: latest.Day,
    DayOfWeek: latest.DayOfWeek,
    Price_Lag_1: latest.Price_Lag_1,
    Price_Lag_7: latest.Price_Lag_7,
    MA_7: latest.MA_7,
    MA_30: latest.MA_30,
    RSI: latest.RSI,
    MACD: latest.MACD,
    BB_High: latest.BB_High,
    BB_Low: latest.BB_Low
  });

  const currentPrice = latest.close;
  const diff = predictedPrice - currentPrice;
  let signal = 'HOLD';
  if (diff > 0.02) signal = 'STRONG BUY';
  else if (diff > 0.005) signal = 'BUY';
  else if (diff < -0.02) signal = 'STRONG SELL';
  else if (diff < -0.005) signal = 'SELL';

  return {
    currentPrice,
    predictedPrice,
    difference: diff,
    percentageDifference: (diff / currentPrice) * 100,
    signal,
    features: {
      RSI: latest.RSI,
      MACD: latest.MACD,
      MA7: latest.MA_7,
      MA30: latest.MA_30,
      BBHigh: latest.BB_High,
      BBLow: latest.BB_Low
    },
    date: latest.date
  };
}
