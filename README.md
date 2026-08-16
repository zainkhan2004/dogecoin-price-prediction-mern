# Dogecoin Price Prediction — MERN + CoinGecko

A portfolio-ready MERN application that turns the supplied Dogecoin machine-learning project into a web dashboard.

The original project was a Streamlit/Python app that loaded a trained scikit-learn `LinearRegression` model, downloaded DOGE-USD market data, built date/lag/moving-average/RSI/MACD/Bollinger Band features, generated a next-price estimate, and displayed a trading signal. The MERN version keeps that feature flow while moving the application layer to React + Express and replacing Yahoo Finance with CoinGecko market data.

## Features

- Live Dogecoin price, market cap, 24h volume and 24h change
- 30 / 90 / 365-day price chart
- RSI, MACD, MA7, MA30 and Bollinger Bands
- Next-day Linear Regression estimate based on the supplied model
- BUY / SELL / HOLD signal based on the original threshold logic
- MongoDB prediction snapshots when MongoDB is configured
- CoinGecko API key kept on the backend
- Responsive React dashboard
- Health, history, prediction and dashboard API routes

## Tech stack

- **Frontend:** React 19, Vite, Recharts, Axios
- **Backend:** Node.js, Express 5
- **Database:** MongoDB + Mongoose
- **Market data:** CoinGecko API
- **Model:** supplied scikit-learn Linear Regression coefficients executed in Node.js

## Model and data note

The supplied model has 17 features in this order:

`Close, High, Low, Open, Volume, Year, Month, Day, DayOfWeek, Price_Lag_1, Price_Lag_7, MA_7, MA_30, RSI, MACD, BB_High, BB_Low`

The model coefficients were extracted directly from the supplied `dogecoin_model.pkl`; the Python file is kept in `reference/` for provenance.

CoinGecko's historical chart endpoint provides price, market cap and total volume. CoinGecko's OHLC endpoint provides Open/High/Low/Close candles, but its granularity depends on the plan and requested range. The backend therefore uses CoinGecko OHLC candles for the recent window when available and falls back to a transparent derived OHLC construction for older rows. This is a practical MERN adaptation, not a claim that the new data pipeline is identical to the original Yahoo Finance training data.

**The prediction is for educational/project demonstration purposes and is not financial advice.**

## Requirements

- Node.js 20.19+ (Node 22 LTS is recommended)
- npm
- MongoDB Atlas account or local MongoDB (optional for dashboard; required for snapshot persistence)
- CoinGecko API key

The current backend uses Node's built-in `fetch`, so no separate HTTP library is required on the server.

## 1. Install dependencies

From the project root:

```bash
npm run install:all
```

Or install each app separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 2. Configure the backend

Copy the example environment file:

### Windows PowerShell

```powershell
Copy-Item backend/.env.example backend/.env
```

### macOS / Linux

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/dogecoin_prediction
COINGECKO_API_KEY=YOUR_COINGECKO_DEMO_KEY
COINGECKO_API_PLAN=demo
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```

If you do not want MongoDB persistence, leave `MONGODB_URI` empty. The dashboard can still run.

## 3. Configure the frontend

The frontend defaults to:

`http://localhost:5000/api`

If your backend uses another URL, copy `frontend/.env.example` to `frontend/.env` and set:

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Run the complete project

From the root:

```bash
npm run dev
```

This starts both:

- API: `http://localhost:5000`
- React/Vite: `http://localhost:5173`

Or run them separately:

```bash
npm run start:api
```

and in another terminal:

```bash
cd frontend
npm run dev
```

## 5. Verify the API

Open:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "dogecoin-prediction-api"
}
```

Then test:

```text
http://localhost:5000/api/dashboard?days=365
```

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/dashboard?days=365` | Full dashboard payload |
| GET | `/api/history?days=365` | Historical chart data |
| GET | `/api/prediction` | Prediction and indicators |
| GET | `/api/snapshots` | Recent MongoDB prediction snapshots |

## MongoDB Atlas setup

1. Create a free Atlas cluster.
2. Create a database user.
3. Allow your development IP in Network Access.
4. Copy the Node.js connection string.
5. Put it in `MONGODB_URI` in `backend/.env`.
6. Start the backend.

The backend stores a prediction snapshot when `/api/dashboard` is requested and MongoDB is configured.

## GitHub checklist

Before pushing:

```bash
git status
```

Make sure these are **not** staged:

- `backend/.env`
- `frontend/.env`
- `node_modules/`
- `dist/`

The repository intentionally includes `.env.example` files, not real secrets.

Then:

```bash
git add .
git commit -m "Build Dogecoin prediction MERN dashboard"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Production build

Build the frontend with:

```bash
npm run build
```

The generated `frontend/dist/` directory is ignored by Git.

For deployment, set the production `VITE_API_URL` in the frontend environment and set `FRONTEND_ORIGIN`, `MONGODB_URI`, and `COINGECKO_API_KEY` in the backend environment.

## License / attribution

This is a student portfolio project. CoinGecko data is subject to CoinGecko's current API terms and plan limits.
