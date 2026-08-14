// Coefficients extracted from the supplied dogecoin_model.pkl LinearRegression model.
// Feature order must remain identical to the original Streamlit project.
export const FEATURE_NAMES = [
  'Close', 'High', 'Low', 'Open', 'Volume', 'Year', 'Month', 'Day',
  'DayOfWeek', 'Price_Lag_1', 'Price_Lag_7', 'MA_7', 'MA_30', 'RSI',
  'MACD', 'BB_High', 'BB_Low'
];

const INTERCEPT = -0.9540410576818903;
const COEFFICIENTS = [
  1.0895044486893146,
  0.188000644710328,
  -0.3256428194736903,
  0.13036603991523865,
  -1.528512463311103e-12,
  0.0004707139552708864,
  -2.94966838155129e-05,
  1.451273234059689e-05,
  -7.729081218572098e-05,
  0.1390651097672525,
  0.10082953737009281,
  -0.1737962197205656,
  -0.2256413584838039,
  8.677761172961493e-05,
  -0.45425240004761525,
  0.04515158674228016,
  0.003338692788665588
];

export function predictFromFeatures(features) {
  const values = FEATURE_NAMES.map((name) => Number(features[name]));
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Prediction features contain an invalid number.');
  }
  return INTERCEPT + values.reduce((sum, value, i) => sum + value * COEFFICIENTS[i], 0);
}
