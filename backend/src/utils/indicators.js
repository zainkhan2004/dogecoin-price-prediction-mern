export function sma(values, period) {
  return values.map((_, i) => {
    if (i + 1 < period) return null;
    const slice = values.slice(i + 1 - period, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function ema(values, period) {
  const out = Array(values.length).fill(null);
  if (!values.length) return out;

  // pandas/ta-style adjust=False EMA: initialize from the first observation,
  // then hide values until min_periods is reached.
  const multiplier = 2 / (period + 1);
  let previous = values[0];
  for (let i = 1; i < values.length; i++) {
    previous = ((values[i] - previous) * multiplier) + previous;
    if (i >= period - 1) out[i] = previous;
  }
  if (period === 1) out[0] = values[0];
  return out;
}

// RSI implementation aligned with the pandas `ewm(alpha=1/window,
// adjust=False, min_periods=window)` approach used by the `ta` package.
export function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;

  const gains = Array(values.length).fill(0);
  const losses = Array(values.length).fill(0);
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains[i] = Math.max(change, 0);
    losses[i] = Math.max(-change, 0);
  }

  const alpha = 1 / period;
  let avgGain = gains[0];
  let avgLoss = losses[0];

  for (let i = 1; i < values.length; i++) {
    avgGain = (1 - alpha) * avgGain + alpha * gains[i];
    avgLoss = (1 - alpha) * avgLoss + alpha * losses[i];
    if (i >= period) {
      out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
  }
  return out;
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, i) => (
    fastEma[i] == null || slowEma[i] == null ? null : fastEma[i] - slowEma[i]
  ));
  const valid = line.filter((x) => x != null);
  const signalValues = ema(valid, signal);
  let cursor = 0;
  const signalLine = line.map((x) => {
    if (x == null) return null;
    return signalValues[cursor++];
  });
  return { line, signalLine };
}

export function bollinger(values, period = 20, stdMultiplier = 2) {
  const middle = sma(values, period);
  const high = Array(values.length).fill(null);
  const low = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i + 1 - period, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / period;
    const sd = Math.sqrt(variance);
    high[i] = mean + stdMultiplier * sd;
    low[i] = mean - stdMultiplier * sd;
  }
  return { middle, high, low };
}
