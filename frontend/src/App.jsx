import React,{ useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function compact(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })}`;
}

function percent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(2)}%`;
}

function formatUpdated(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function App() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/dashboard`, { params: { days } });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [days]);

  const chart = useMemo(() => data?.chart?.map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  })) || [], [data]);

  const signalClass = data?.prediction?.signal?.toLowerCase().replaceAll(' ', '-') || 'hold';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">ML • MERN • COINGECKO</div>
          <h1>Dogecoin Prediction</h1>
          <p>Market data, technical indicators, and a next-day model estimate.</p>
        </div>
        <div className="header-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="History range">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">365 days</option>
          </select>
          <button onClick={load} disabled={loading} type="button">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error" role="alert">
          <strong>Could not load market data.</strong>
          <span>{error}</span>
          <small>Check your CoinGecko API key, internet connection, and backend status.</small>
        </div>
      )}

      {loading && !data ? (
        <div className="loader">Loading CoinGecko market data…</div>
      ) : data && (
        <>
          <section className="stats-grid">
            <Stat label="DOGE price" value={money(data.market.currentPrice)} sub={`${percent(data.market.change24h)} 24h`} />
            <Stat label="Predicted next price" value={money(data.prediction.predictedPrice)} sub={`${percent(data.prediction.percentageDifference)} vs current`} />
            <Stat label="Market cap" value={compact(data.market.marketCap)} sub="CoinGecko" />
            <Stat label="24h volume" value={compact(data.market.volume24h)} sub="CoinGecko" />
          </section>

          <section className="grid-two">
            <div className="panel chart-panel">
              <div className="panel-head">
                <div><h2>Dogecoin trend</h2><p>{days}-day price history</p></div>
                <span className="source">CoinGecko</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="dogeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopOpacity={0.4} />
                        <stop offset="100%" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={40} />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `$${Number(v).toFixed(3)}`} width={70} />
                    <Tooltip formatter={(value) => [money(value), 'DOGE']} />
                    <Area type="monotone" dataKey="price" strokeWidth={2.5} fill="url(#dogeFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel prediction-panel">
              <div className="panel-head">
                <div><h2>Model signal</h2><p>Supplied Linear Regression model</p></div>
              </div>
              <div className={`signal signal-${signalClass}`}>
                <span>{data.prediction.signal}</span>
                <small>Next-day estimate • {data.prediction.date}</small>
              </div>
              <div className="prediction-values">
                <Value label="Current" value={money(data.prediction.currentPrice)} />
                <Value label="Predicted" value={money(data.prediction.predictedPrice)} />
                <Value label="Difference" value={money(data.prediction.difference)} />
              </div>
              <div className="feature-grid">
                <Metric name="RSI" value={Number(data.prediction.features.RSI).toFixed(2)} />
                <Metric name="MACD" value={Number(data.prediction.features.MACD).toFixed(5)} />
                <Metric name="MA 7" value={money(data.prediction.features.MA7)} />
                <Metric name="MA 30" value={money(data.prediction.features.MA30)} />
                <Metric name="BB High" value={money(data.prediction.features.BBHigh)} />
                <Metric name="BB Low" value={money(data.prediction.features.BBLow)} />
              </div>
            </div>
          </section>

          <section className="panel details-grid">
            <div>
              <h2>Data & model</h2>
              <p>The Express API fetches DOGE market history from CoinGecko, calculates the feature family used by the supplied model, and returns the prediction to React. Recent OHLC candles are taken from CoinGecko when available; older rows use the historical price series with derived OHLC values.</p>
            </div>
            <div className="detail-list">
              <div><span>Data source</span><strong>CoinGecko</strong></div>
              <div><span>Database</span><strong>MongoDB</strong></div>
              <div><span>Updated</span><strong>{formatUpdated(data.updatedAt)}</strong></div>
              <div><span>Prediction</span><strong>Educational only</strong></div>
            </div>
          </section>

          <footer className="footer">
            <span>Dogecoin Price Prediction • MERN</span>
            <span>Not financial advice.</span>
          </footer>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, sub }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function Value({ label, value }) {
  return <div className="value-card"><span>{label}</span><strong>{value}</strong></div>;
}

function Metric({ name, value }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}
