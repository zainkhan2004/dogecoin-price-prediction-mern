import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import apiRouter from './routes/api.js';
import dns from "node:dns";
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.disable('x-powered-by');
app.use(cors({
  origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRouter);

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      console.log('Continuing without MongoDB persistence.');
    }
  } else {
    console.log('MONGODB_URI not set — running without MongoDB persistence.');
  }

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

start();
