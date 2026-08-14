import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
import joblib

from ta.momentum import RSIIndicator
from ta.trend import MACD
from ta.volatility import BollingerBands

from sklearn.metrics import r2_score
from sklearn.metrics import mean_absolute_error

# Load Model
model = joblib.load("dogecoin_model.pkl")

st.title("📊 Dogecoin Prediction Dashboard")

# Download Data
doge = yf.download(
    "DOGE-USD",
    period="365d",
    interval="1d",
    auto_adjust=False
)

# Fix MultiIndex Columns
if hasattr(doge.columns, "levels"):
    doge.columns = doge.columns.get_level_values(0)

doge.reset_index(inplace=True)

# Close Price Series
close = doge["Close"]

# Date Features
doge["Year"] = doge["Date"].dt.year
doge["Month"] = doge["Date"].dt.month
doge["Day"] = doge["Date"].dt.day
doge["DayOfWeek"] = doge["Date"].dt.dayofweek

# Lag Features
doge["Price_Lag_1"] = doge["Close"].shift(1)
doge["Price_Lag_7"] = doge["Close"].shift(7)

# Moving Averages
doge["MA_7"] = doge["Close"].rolling(7).mean()
doge["MA_30"] = doge["Close"].rolling(30).mean()

# RSI
doge["RSI"] = RSIIndicator(
    close=close
).rsi()

# MACD
doge["MACD"] = MACD(
    close=close
).macd()

# Bollinger Bands
bb = BollingerBands(
    close=close
)

doge["BB_High"] = bb.bollinger_hband()
doge["BB_Low"] = bb.bollinger_lband()

# Remove Null Values
doge.dropna(inplace=True)

# Feature List
features = [
    "Close",
    "High",
    "Low",
    "Open",
    "Volume",
    "Year",
    "Month",
    "Day",
    "DayOfWeek",
    "Price_Lag_1",
    "Price_Lag_7",
    "MA_7",
    "MA_30",
    "RSI",
    "MACD",
    "BB_High",
    "BB_Low"
]

X = doge[features]

# Latest Row
latest = X.tail(1)

# Prediction
predicted_price = float(
    model.predict(latest)[0]
)

current_price = float(
    doge["Close"].iloc[-1]
)

# Signal Logic
diff = predicted_price - current_price

if diff > 0.02:
    signal = "🟢 STRONG BUY"
elif diff > 0.005:
    signal = "🟢 BUY"
elif diff < -0.02:
    signal = "🔴 STRONG SELL"
elif diff < -0.005:
    signal = "🔴 SELL"
else:
    signal = "🟡 HOLD"

# Model Evaluation
split = int(len(X) * 0.8)

X_test = X.iloc[split:]
y_test = doge["Close"].iloc[split:]

y_pred = model.predict(X_test)

r2 = r2_score(
    y_test,
    y_pred
)

mae = mean_absolute_error(
    y_test,
    y_pred
)

# Output
st.subheader(" Current Dogecoin Price")
st.write(f"${current_price:.4f}")

st.subheader(" Predicted Next Day Dogecoin Price")
st.success(f"${predicted_price:.4f}")

st.subheader(" Trading Signal")
st.info(signal)

st.subheader("Model Performance")

st.write(
    f"R² Score: {r2:.4f}"
)

st.write(
    f"Mean Absolute Error: ${mae:.4f}"
)

# Chart
st.subheader(" Dogecoin Trend (365 Days)")

st.line_chart(
    doge.set_index("Date")["Close"]
)

