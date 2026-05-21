import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './auth/middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ── Request Logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  next();
});

// ── Health probe (no auth required) ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', gateway: 'neuronex-bff', uptime: process.uptime() });
});

// ── Auth-guarded API proxy ────────────────────────────────────────────────────
app.use(
  '/api',
  authMiddleware({ strict: process.env.NODE_ENV === 'production' }),
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // Preserve the /api prefix so FastAPI routes match
    pathRewrite: { '^/api': '/api' },
    on: {
      error: (err, _req, res) => {
        console.error('[PROXY] Backend unreachable:', err.message);
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'NeuroNex backend is not reachable.',
          target: BACKEND_URL,
        });
      },
    },
  })
);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found on BFF gateway.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 NeuroNex BFF Gateway running on port ${PORT}`);
  console.log(`   Proxying /api → ${BACKEND_URL}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});