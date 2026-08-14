import mongoose from 'mongoose';

const marketSnapshotSchema = new mongoose.Schema({
  coinId: { type: String, default: 'dogecoin', index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  currentPrice: Number,
  predictedPrice: Number,
  signal: String,
  change24h: Number,
  marketCap: Number,
  volume24h: Number
}, { versionKey: false });

export default mongoose.model('MarketSnapshot', marketSnapshotSchema);
